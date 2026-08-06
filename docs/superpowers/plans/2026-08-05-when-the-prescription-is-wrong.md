# When the prescription is wrong — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the athlete lifts something other than what was prescribed, the weight they chose carries through the exercise, the bar stops describing a load nobody is building, the change gets an optional reason, and the finish screen says what the session cost.

**Architecture:** One additive migration (`workout_sets.drift_reason`), one new pure Rust module (`report.rs`) whose output rides back on the existing `WorkoutReceipt`, and four client changes — the queue learns to keep the receipt, `session.ts` learns to propagate a weight, and the logger and finish screens render the results. No arithmetic about training moves into the client.

**Tech Stack:** Rust (axum, sqlx, utoipa, chrono) · Postgres 17 · SvelteKit 2 / Svelte 5 runes · Tailwind 4 / DaisyUI 5 · Vitest · `cargo test`.

**Spec:** `docs/superpowers/specs/2026-08-05-when-the-prescription-is-wrong-design.md` — read it before Task 1. Every "why" below is argued there.

## Global Constraints

- **Additive-only inside `/v1` (D-12).** Never remove a field, never change a type, never tighten validation. CI runs `oasdiff` against the committed `backend/openapi.json` and fails on a breaking diff.
- **Migrations are additive, nullable, no default (D-17).** A rolling update runs two releases against one database by design; the previous release must keep submitting valid workouts through the new column's arrival.
- **No business logic in the client (D-11).** Rounding, plate arithmetic, drift totals, aggregation — all Rust. If a client change starts working out a weight, stop.
- **Svelte 5 runes only.** `$state`, `$derived`, `$props`, `$effect`. Never `export let`.
- **The generated API client is never hand-edited.** `npm run generate:api` regenerates `frontend/src/lib/api/schema.d.ts` from `backend/openapi.json`; both are committed.
- **Log stays one tap (D-07).** Nothing added in this plan may block, warn, confirm, or pre-select an answer on the athlete's behalf.
- **The drift vocabulary is exactly four values**, stored as `too_easy`, `too_heavy`, `already_loaded`, `felt_off`, and shown as `too easy`, `too heavy`, `bar was loaded`, `felt off`. Lower case in the UI, as the existing `eyebrow` copy is.
- **Median, never mean**, for the interval spread. Even-length samples take the mean of the middle pair, matching `pace.rs:183`.
- **Weights are bare numbers with kg semantics.** No unit is written into any domain type.

**Commands.** Backend: `cd backend && cargo test`. Integration tests need `DATABASE_URL` pointing at the local Postgres container (see `docs/DEVELOPMENT.md`); pure unit tests do not. Frontend: `cd frontend && npm run test:unit`, `npm run check`, `npm run lint`.

---

### Task 1: `drift_reason` — column, contract, validation

**Files:**
- Create: `backend/crates/api/migrations/20260805120000_drift_reason.sql`
- Modify: `backend/crates/api/src/routes/workouts.rs` (`SubmittedSet`, `LoggedSetView`, `StoredSet`, `validate`, `insert_sets`, `logged_set`, the detail query, and a new `DriftReason` enum beside `CutReason` at :1126)
- Modify: `backend/openapi.json` (regenerated)
- Test: `backend/crates/api/tests/training.rs`

**Interfaces:**
- Consumes: nothing.
- Produces: `pub enum DriftReason { TooEasy, TooHeavy, AlreadyLoaded, FeltOff }` with `fn as_str(self) -> &'static str` and `fn parse(stored: &str) -> ApiResult<Self>`; `SubmittedSet.drift_reason: Option<DriftReason>`; `LoggedSetView.drift_reason: Option<DriftReason>`. Task 4 consumes the regenerated `backend/openapi.json`.

- [ ] **Step 1: Write the migration**

Create `backend/crates/api/migrations/20260805120000_drift_reason.sql`:

```sql
-- Why the athlete lifted something other than what was asked (D-07, amended).
--
-- Additive, nullable, no default (D-12, D-17). A rolling update runs two
-- releases against one database by design, so the previous release must keep
-- submitting valid workouts through this column's arrival — it does, because
-- nothing about it is required.
--
-- `text` with a `check` rather than a Postgres enum, for the reason the
-- training migration already argues at length: D-12 makes these vocabularies
-- grow, widening a check is an ordinary migration, and `alter type ... add
-- value` cannot run in the transaction that adds it.
alter table workout_sets
    add column drift_reason text
        check (drift_reason in ('too_easy', 'too_heavy', 'already_loaded', 'felt_off'));

-- A reason with no deviation to be about is not a reason.
--
-- The client clears it when the weight goes back to the prescription, when the
-- set is skipped, and on undo. This is what makes that a fact rather than a
-- client convention.
--
-- `is distinct from` rather than `<>`: `<>` yields null when either side is
-- null and a check *passes* on null, which is the exact trap
-- `workouts_cut_reason_iff_cut_short` was written to avoid. A pending or
-- skipped set has no `actual_weight` and therefore cannot carry a reason.
alter table workout_sets
    add constraint workout_sets_drift_reason_needs_drift
        check (drift_reason is null
               or (actual_weight is not null
                   and actual_weight is distinct from prescribed_weight));
```

- [ ] **Step 2: Add the enum**

In `backend/crates/api/src/routes/workouts.rs`, beside the `CutReason` declaration (near :157) add:

```rust
/// Why a set was lifted at something other than the prescribed weight (D-07).
///
/// Optional in every direction. The chips that produce it are unselected by
/// default, no tap is a valid answer, and nothing blocks — a default would
/// answer the question on the athlete's behalf and land a claim nobody made in
/// the one signal this product exists to read.
#[derive(Debug, Clone, Copy, Deserialize, Serialize, ToSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DriftReason {
    /// The prescription was light. The first chip offered, and never the
    /// selected one.
    TooEasy,
    TooHeavy,
    /// The bar already held that weight and stripping it was not worth it —
    /// drift the display caused rather than the athlete (D-04).
    AlreadyLoaded,
    FeltOff,
}
```

And beside `impl CutReason` (:1126):

```rust
impl DriftReason {
    fn as_str(self) -> &'static str {
        match self {
            Self::TooEasy => "too_easy",
            Self::TooHeavy => "too_heavy",
            Self::AlreadyLoaded => "already_loaded",
            Self::FeltOff => "felt_off",
        }
    }

    fn parse(stored: &str) -> ApiResult<Self> {
        match stored {
            "too_easy" => Ok(Self::TooEasy),
            "too_heavy" => Ok(Self::TooHeavy),
            "already_loaded" => Ok(Self::AlreadyLoaded),
            "felt_off" => Ok(Self::FeltOff),
            // Read out of the `text` column, so an unknown value means the
            // check constraint and this enum have drifted apart. That is our
            // bug and 500 is the honest answer — unlike an unknown value off a
            // query string, which is the client's typo.
            other => Err(ApiError::Internal(format!(
                "unknown drift reason in the database: {other}"
            ))),
        }
    }
}
```

- [ ] **Step 3: Write the failing integration tests**

Append to `backend/crates/api/tests/training.rs`. It already has every fixture these need: `server`, `register`, `set_maxes`, `full_maxes`, `enrol`, `next_session`, `logged_as_prescribed` (:105). Add one helper beside that last one, then the three tests:

```rust
/// The current session logged as prescribed, except that set 0 was lifted
/// `over` kilograms heavier than asked and says why.
fn logged_with_drift(
    id: Uuid,
    enrollment: Uuid,
    session: &serde_json::Value,
    over: f64,
    reason: &str,
) -> serde_json::Value {
    let mut body = logged_as_prescribed(id, enrollment, session);
    let prescribed = body["sets"][0]["prescribed_weight"]
        .as_f64()
        .expect("a prescribed set carries a weight");

    body["sets"][0]["actual_weight"] = json!(prescribed + over);
    body["sets"][0]["drift_reason"] = json!(reason);
    body
}

#[sqlx::test]
async fn a_drift_reason_round_trips_to_the_history(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    let id = Uuid::now_v7();
    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&logged_with_drift(id, enrollment, &session, 5.0, "too_easy"))
        .await
        .assert_status(StatusCode::CREATED);

    let detail: serde_json::Value = server
        .get(&format!("/v1/workouts/{id}"))
        .authorization_bearer(&token)
        .await
        .json();

    assert_eq!(detail["sets"][0]["drift_reason"], json!("too_easy"));
    assert_eq!(detail["sets"][1]["drift_reason"], json!(null));
}

#[sqlx::test]
async fn a_reason_on_a_set_that_was_not_done_is_refused(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    let mut body = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);
    body["outcome"] = json!("cut_short");
    body["cut_reason"] = json!("out_of_time");
    body["sets"][0]["status"] = json!("pending");
    body["sets"][0]["actual_weight"] = json!(null);
    body["sets"][0]["actual_reps"] = json!(null);
    body["sets"][0]["drift_reason"] = json!("too_easy");

    // 422, not the 500 a raw constraint violation would produce. A client
    // holding a queued offline workout has to be able to learn why it will
    // never be accepted.
    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::UNPROCESSABLE_ENTITY);
}

#[sqlx::test]
async fn a_reason_on_a_set_that_did_not_drift_is_refused(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    // Logged exactly as prescribed, so there is no deviation for a reason to
    // be about.
    let mut body = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);
    body["sets"][0]["drift_reason"] = json!("too_easy");

    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::UNPROCESSABLE_ENTITY);
}
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `cd backend && cargo test -p athletos-api --test training drift`
Expected: FAIL — `drift_reason` is not a field on the submission type.

- [ ] **Step 5: Widen the submission and the view**

In `SubmittedSet` (after `note`, :~170):

```rust
    /// Why this set was lifted at something other than its prescription (D-07).
    ///
    /// Optional and additively so (D-12). **Only a `done` set may carry one**,
    /// and only when its weight actually differs — see `validate`. That is not
    /// tidiness: a reason on a set that was never reached arrives with a null
    /// `actual_weight`, the check constraint refuses it, and the whole
    /// submission goes down over a chip tapped forty minutes earlier.
    #[serde(default)]
    pub drift_reason: Option<DriftReason>,
```

In `LoggedSetView` (after `note`, :329):

```rust
    /// Why this set drifted, if the athlete said. Null for every set logged
    /// before the chips existed, and for every deviation they walked past.
    pub drift_reason: Option<DriftReason>,
```

Extend `StoredSet` (:575) with a tenth element `Option<String>`, extend the detail query's select list (:741) with `drift_reason`, and in `logged_set` (:824) destructure it and map it through `DriftReason::parse` with `.transpose()?`.

- [ ] **Step 6: Validate before the constraint can**

In `validate` (:981), inside the per-set loop that already checks note length, add:

```rust
        if set.drift_reason.is_some() {
            let drifted = matches!(set.status, SetStatus::Done)
                && set
                    .actual_weight
                    .is_some_and(|actual| actual != set.prescribed_weight);

            if !drifted {
                return Err(ApiError::Validation(format!(
                    "set {} carries a reason for a weight that did not change",
                    set.position
                )));
            }
        }
```

If `validate` does not currently walk the sets, add the loop; the note-length check lives in the same place and the two belong together.

- [ ] **Step 7: Bind it on the insert**

In `insert_sets` (:901): declare `let mut drift_reasons: Vec<Option<String>> = Vec::with_capacity(sets.len());`, push `set.drift_reason.map(DriftReason::as_str).map(str::to_owned)` in the loop, add `drift_reason` to the column list and `logged.drift_reason` to the select, add `$11::text[]` to the `unnest` and `drift_reason` to the `as logged(...)` alias list, and `.bind(&drift_reasons)` after `.bind(&notes)`.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `cd backend && cargo test -p athletos-api --test training drift`
Expected: PASS, all three.

- [ ] **Step 9: Register the schema and regenerate the contract**

`backend/crates/api/src/openapi.rs` lists every component explicitly (:63). Add `crate::routes::workouts::DriftReason` beside `CutReason` at :98 — without it the enum is referenced by the generated document but never defined, and the TypeScript generator emits `unknown`.

```bash
cd backend && cargo run --bin openapi > openapi.json
npx --yes oasdiff breaking <(git show HEAD:backend/openapi.json) openapi.json
```
Expected: no breaking changes reported. Two added optional fields and one added schema.

- [ ] **Step 10: Commit**

```bash
git add backend/crates/api/migrations/20260805120000_drift_reason.sql \
        backend/crates/api/src/routes/workouts.rs \
        backend/crates/api/tests/training.rs \
        backend/openapi.json
git commit -m "workouts: a set can say why it drifted"
```

---

### Task 2: `report.rs` — what the ending says

**Files:**
- Create: `backend/crates/api/src/report.rs`
- Modify: `backend/crates/api/src/lib.rs` (add `mod report;` beside `mod timing;`)
- Modify: `backend/crates/api/src/timing.rs` (add `IntervalSpread` and `spread()`)
- Test: inline `#[cfg(test)] mod tests` in both files

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `timing::IntervalSpread { min_seconds: i64, median_seconds: i64, max_seconds: i64, discarded: u32 }`; `timing::spread(started_at: DateTime<Utc>, sets: &[(u16, TimedSet)]) -> Option<IntervalSpread>`; `report::ReportedSet { prescribed_weight: f64, prescribed_reps: u32, actual_weight: Option<f64>, actual_reps: Option<u32>, done: bool }`; `report::SessionReport`; `report::compute(duration_seconds: i64, average_duration_seconds: Option<i64>, sets: &[ReportedSet], intervals: Option<IntervalSpread>) -> SessionReport`.

- [ ] **Step 1: Write the failing test for `spread`**

Append to `timing.rs`'s existing `mod tests`:

```rust
#[test]
fn the_spread_is_min_median_max_of_the_believable_intervals() {
    // Lead-in 0:00 -> 2:00, then gaps of 60, 180, 120 seconds.
    let sets = vec![
        (0_u16, set("squat", Some(at(2, 0)))),
        (1, set("squat", Some(at(3, 0)))),
        (2, set("squat", Some(at(6, 0)))),
        (3, set("squat", Some(at(8, 0)))),
    ];

    let spread = spread(at(0, 0), &sets).expect("stamps exist");

    // The lead-in is not an interval between sets and is excluded — D-10 holds
    // it apart precisely so it cannot be ranked against a lift.
    assert_eq!(spread.min_seconds, 60);
    assert_eq!(spread.median_seconds, 120);
    assert_eq!(spread.max_seconds, 180);
    assert_eq!(spread.discarded, 0);
}

#[test]
fn the_spread_counts_what_it_could_not_believe() {
    // A clock jump backwards, and a gap over the ceiling. Both readings come
    // off the shared walk, so this pins the walk rather than an agreement.
    let sets = vec![
        (0_u16, set("squat", Some(at(1, 0)))),
        (1, set("squat", Some(at(0, 30)))),
        (2, set("squat", Some(at(40, 0)))),
        (3, set("squat", Some(at(42, 0)))),
    ];

    let spread = spread(at(0, 0), &sets).expect("stamps exist");
    let computed = compute(at(0, 0), Some(at(45, 0)), &sets).expect("stamps exist");

    assert_eq!(spread.discarded, 2);
    assert_eq!(spread.discarded, computed.discarded_intervals);
}

#[test]
fn there_is_no_spread_without_a_gap_between_two_sets() {
    let sets = vec![(0_u16, set("squat", Some(at(2, 0))))];
    assert!(spread(at(0, 0), &sets).is_none());
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && cargo test -p athletos-api spread`
Expected: FAIL — `spread` not found.

- [ ] **Step 3: Extract the walk that both readings share**

`compute` currently inlines the cursor rule — which stamps are believable, what a missing stamp does to the cursor, where the lead-in ends. `spread` needs the same rule and must not restate it. Add above `compute`:

```rust
/// One believable gap between two stamps.
struct Interval {
    seconds: i64,
    /// Index into the `sets` slice the walk was given, so a caller that cares
    /// which exercise this belonged to can look it up. The walk itself knows
    /// nothing about exercises.
    index: usize,
    /// True for the gap from the commit to the first stamped set — the
    /// lead-in, which is walking in and changing rather than work, and is
    /// never attributed to a lift (D-10).
    lead_in: bool,
}

/// What one pass over the stamps found.
struct Walk {
    intervals: Vec<Interval>,
    /// Negative, or over [`INTERVAL_CEILING`]. Discarded rather than clamped:
    /// clamping folds a bad measurement in at an invented value with no way to
    /// see it happened.
    discarded: u32,
    /// Sets carrying no stamp at all. Not the same as `discarded` — this is
    /// work that was never measured, that is a measurement not believed.
    unstamped: u32,
    /// The last stamp seen, believable or not. What the tail measures from.
    last_stamp: Option<DateTime<Utc>>,
}

/// The one place the interval rules live.
///
/// Every reading of a session's time comes through here, so there is exactly
/// one definition of what a believable gap is and exactly one cursor
/// discipline. `compute` attributes these to exercises; `spread` takes their
/// shape. Neither restates the rule.
fn walk(started_at: DateTime<Utc>, sets: &[(u16, TimedSet)]) -> Walk {
    let mut intervals = Vec::new();
    let mut discarded = 0_u32;
    let mut unstamped = 0_u32;

    // The cursor is the last stamp, which is not always the previous set's: a
    // set with no stamp leaves it where it was, so the next stamped set
    // measures across the gap rather than losing its interval too.
    let mut cursor = started_at;
    let mut last_stamp: Option<DateTime<Utc>> = None;

    for (index, (_, set)) in sets.iter().enumerate() {
        let Some(logged_at) = set.logged_at else {
            unstamped += 1;
            continue;
        };

        let seconds = (logged_at - cursor).num_seconds();

        if (0..=INTERVAL_CEILING).contains(&seconds) {
            intervals.push(Interval {
                seconds,
                index,
                lead_in: last_stamp.is_none(),
            });
        } else {
            discarded += 1;
        }

        // Advances whether or not the interval was believable. A clock jump
        // corrupts the interval straddling it; the stamps either side are
        // still the best account of when those sets happened, and refusing to
        // advance would corrupt every later interval as well.
        cursor = logged_at;
        last_stamp = Some(logged_at);
    }

    Walk {
        intervals,
        discarded,
        unstamped,
        last_stamp,
    }
}
```

- [ ] **Step 4: Rewrite `compute` on top of it**

Replace `compute`'s body — its doc comment stays as it is. The `if !sets.iter().any(...)` early return stays. Everything between that and the `Some(SessionTiming { ... })` becomes:

```rust
    let found = walk(started_at, sets);

    // Insertion-ordered: `order` remembers where each exercise was first seen
    // so the output can be walked back in the order the athlete performed it,
    // while the map does the accumulating.
    let mut totals: HashMap<String, (i64, u32)> = HashMap::new();
    let mut order: Vec<(String, String)> = Vec::new();

    let mut lead_in = None;
    let mut longest: Option<LongestInterval> = None;

    for interval in &found.intervals {
        let (position, set) = &sets[interval.index];

        if interval.lead_in {
            // The first stamped set closes the lead-in, and the lead-in is not
            // work: it is not attributed to any exercise.
            lead_in = Some(interval.seconds);
            continue;
        }

        let key = set.exercise.clone();
        let entry = totals.entry(key.clone()).or_insert_with(|| {
            order.push((key.clone(), set.label.clone()));
            (0, 0)
        });
        entry.0 += interval.seconds;
        entry.1 += 1;

        if longest
            .as_ref()
            .is_none_or(|best| interval.seconds > best.seconds)
        {
            longest = Some(LongestInterval {
                seconds: interval.seconds,
                position: *position,
                label: set.label.clone(),
            });
        }
    }
```

and the returned struct takes `discarded_intervals: found.discarded`, `unstamped_sets: found.unstamped`, and a tail built from `found.last_stamp` exactly as before.

The existing `mod tests` in this file is the guard on this refactor: run it before moving on and expect every case to still pass unchanged.

- [ ] **Step 5: Implement `spread`**

In `timing.rs`, after `compute`:

```rust
/// The shape of one session's intervals: fastest, typical, slowest.
#[derive(Debug, Serialize, ToSchema, PartialEq)]
pub struct IntervalSpread {
    pub min_seconds: i64,
    /// Median, not mean. One interval spent talking to somebody moves a mean
    /// of twelve by a minute, and the tail of this distribution is not signal —
    /// the same rule, and the same reason, as [`crate::pace`].
    pub median_seconds: i64,
    pub max_seconds: i64,
    /// Intervals thrown away as impossible, so a screen showing these figures
    /// can say why they account for less than the wall clock.
    pub discarded: u32,
}

/// The min, median and max of the intervals between answered sets.
///
/// `None` when fewer than one interval survives — a session with a single
/// stamp has no gap between two sets to describe, and an empty spread would be
/// a shape drawn around nothing.
///
/// **The lead-in is excluded.** It is walking in, changing and warming up
/// rather than a gap between two lifts, and D-10 holds it apart so it cannot
/// be ranked against work.
///
/// Reads the same [`walk`] [`compute`] does, so there is one definition of a
/// believable gap and one cursor discipline. This function only takes the
/// shape of what that walk found.
pub fn spread(started_at: DateTime<Utc>, sets: &[(u16, TimedSet)]) -> Option<IntervalSpread> {
    let found = walk(started_at, sets);

    let mut intervals: Vec<i64> = found
        .intervals
        .iter()
        .filter(|interval| !interval.lead_in)
        .map(|interval| interval.seconds)
        .collect();

    if intervals.is_empty() {
        return None;
    }

    intervals.sort_unstable();
    let middle = intervals.len() / 2;
    let median = if intervals.len() % 2 == 1 {
        intervals[middle]
    } else {
        // The mean of the middle pair, matching `pace::median`. An even sample
        // has no single middle and taking either neighbour would make the
        // figure depend on which side of the list the tie fell.
        (intervals[middle - 1] + intervals[middle]) / 2
    };

    Some(IntervalSpread {
        min_seconds: intervals[0],
        median_seconds: median,
        max_seconds: intervals[intervals.len() - 1],
        discarded: found.discarded,
    })
}
```

- [ ] **Step 6: Run to verify the refactor held and `spread` works**

Run: `cd backend && cargo test -p athletos-api timing`
Expected: PASS — every pre-existing `timing` test unchanged, plus the three new `spread` cases. A pre-existing failure here means the extraction changed behaviour and must be fixed before going on.

- [ ] **Step 7: Write the failing tests for `report::compute`**

Create `backend/crates/api/src/report.rs` with the module doc and a test module only:

```rust
//! What the ending says (D-08, amended).
//!
//! D-08's finish-screen section refused a drift total and a timing breakdown
//! here, on two grounds. Both are answered rather than overridden.
//!
//! **Drift no longer appears alone.** It arrives beside the load actually
//! moved and beside the athlete's own average for this enrolment, which is the
//! counterweight D-13 requires: progress is never shown without its cost, and
//! here the cost is on the same line as the progress.
//!
//! **Nothing is invented in a client.** This module is the arithmetic, it runs
//! in Rust, and the answer rides back on the receipt the phone already reads.
//!
//! Pure, and takes only what it uses — no view model, no database, no clock —
//! for the same reason [`crate::timing`] is.

#[cfg(test)]
mod tests {
    use super::*;

    fn done(prescribed: f64, actual: f64, reps: u32) -> ReportedSet {
        ReportedSet {
            prescribed_weight: prescribed,
            prescribed_reps: reps,
            actual_weight: Some(actual),
            actual_reps: Some(reps),
            done: true,
        }
    }

    fn not_done(prescribed: f64, reps: u32) -> ReportedSet {
        ReportedSet {
            prescribed_weight: prescribed,
            prescribed_reps: reps,
            actual_weight: None,
            actual_reps: None,
            done: false,
        }
    }

    #[test]
    fn load_is_summed_over_done_sets_only() {
        // Two done sets at 100x5, one skipped. The skipped set contributes to
        // neither total, so the gap between them is pure weight drift and not
        // contaminated by work not done — D-08's two axes stay apart.
        let sets = [done(95.0, 100.0, 5), done(95.0, 100.0, 5), not_done(95.0, 5)];
        let report = compute(3_600, None, &sets, None);

        assert_eq!(report.load_moved_kg, 1_000.0);
        assert_eq!(report.load_prescribed_kg, 950.0);
    }

    #[test]
    fn over_and_under_are_counted_separately() {
        let sets = [done(95.0, 100.0, 5), done(95.0, 90.0, 5), done(95.0, 95.0, 5)];
        let report = compute(3_600, None, &sets, None);

        assert_eq!(report.sets_over, 1);
        assert_eq!(report.sets_under, 1);
    }

    #[test]
    fn a_session_with_nothing_done_reports_zero_rather_than_panicking() {
        let sets = [not_done(95.0, 5), not_done(95.0, 5)];
        let report = compute(600, None, &sets, None);

        assert_eq!(report.load_moved_kg, 0.0);
        assert_eq!(report.load_prescribed_kg, 0.0);
        assert_eq!(report.sets_over, 0);
        assert_eq!(report.sets_under, 0);
    }

    #[test]
    fn reps_count_toward_load_as_performed() {
        // Prescribed 5, did 8 — an AMRAP that went well. Load moved follows
        // what happened; load prescribed follows what was asked.
        let sets = [ReportedSet {
            prescribed_weight: 100.0,
            prescribed_reps: 5,
            actual_weight: Some(100.0),
            actual_reps: Some(8),
            done: true,
        }];
        let report = compute(3_600, None, &sets, None);

        assert_eq!(report.load_moved_kg, 800.0);
        assert_eq!(report.load_prescribed_kg, 500.0);
        // Same weight, so nothing drifted on the axis this counts.
        assert_eq!(report.sets_over, 0);
    }

    #[test]
    fn the_average_travels_through_untouched() {
        let report = compute(3_600, Some(3_120), &[], None);
        assert_eq!(report.duration_seconds, 3_600);
        assert_eq!(report.average_duration_seconds, Some(3_120));
    }
}
```

- [ ] **Step 8: Run to verify it fails**

Run: `cd backend && cargo test -p athletos-api report`
Expected: FAIL — `report` module not declared, `ReportedSet` and `compute` not found.

- [ ] **Step 9: Implement it**

Add `mod report;` to `backend/crates/api/src/lib.rs` beside `mod timing;`, and above the test module in `report.rs`:

```rust
use serde::Serialize;
use utoipa::ToSchema;

use crate::timing::IntervalSpread;

/// One set as this module needs it. Deliberately not a view model, so the
/// arithmetic can be tested without constructing one.
#[derive(Debug, Clone)]
pub struct ReportedSet {
    pub prescribed_weight: f64,
    pub prescribed_reps: u32,
    pub actual_weight: Option<f64>,
    pub actual_reps: Option<u32>,
    pub done: bool,
}

/// What the finish screen says, computed here so no client has to (D-11).
#[derive(Debug, Serialize, ToSchema, PartialEq)]
pub struct SessionReport {
    /// Summed over **done sets only**, as performed.
    pub load_moved_kg: f64,
    /// Summed over the same done sets, as asked for. The gap between the two
    /// is weight drift, uncontaminated by work not done.
    pub load_prescribed_kg: f64,
    /// Done sets lifted heavier than prescribed. The count is the part that
    /// can be acted on: a kilogram total alone does not distinguish one wild
    /// set from twelve small ones.
    pub sets_over: u32,
    pub sets_under: u32,
    pub duration_seconds: i64,
    /// The athlete's average across this **enrolment's** other recorded
    /// sessions — same block, same training max, so it compares like with
    /// like. `None` below three of them, the same rule and the same reason as
    /// [`crate::pace`]: not shown before there is data to compute it from.
    pub average_duration_seconds: Option<i64>,
    /// `None` when no two sets carry believable stamps.
    pub intervals: Option<IntervalSpread>,
}

pub fn compute(
    duration_seconds: i64,
    average_duration_seconds: Option<i64>,
    sets: &[ReportedSet],
    intervals: Option<IntervalSpread>,
) -> SessionReport {
    let mut load_moved_kg = 0.0;
    let mut load_prescribed_kg = 0.0;
    let mut sets_over = 0_u32;
    let mut sets_under = 0_u32;

    for set in sets.iter().filter(|set| set.done) {
        let (Some(actual_weight), Some(actual_reps)) = (set.actual_weight, set.actual_reps) else {
            // A done set with no numbers cannot reach here — the schema
            // refuses it — but reporting nothing is better than guessing.
            continue;
        };

        load_moved_kg += actual_weight * f64::from(actual_reps);
        load_prescribed_kg += set.prescribed_weight * f64::from(set.prescribed_reps);

        if actual_weight > set.prescribed_weight {
            sets_over += 1;
        } else if actual_weight < set.prescribed_weight {
            sets_under += 1;
        }
    }

    SessionReport {
        load_moved_kg,
        load_prescribed_kg,
        sets_over,
        sets_under,
        duration_seconds,
        average_duration_seconds,
        intervals,
    }
}
```

- [ ] **Step 10: Run to verify it passes**

Run: `cd backend && cargo test -p athletos-api report`
Expected: PASS, all five.

- [ ] **Step 11: Commit**

```bash
git add backend/crates/api/src/report.rs backend/crates/api/src/timing.rs backend/crates/api/src/lib.rs
git commit -m "report: what an hour cost, computed where it can be checked"
```

---

### Task 3: The receipt carries the report

**Files:**
- Modify: `backend/crates/api/src/routes/workouts.rs` (`WorkoutReceipt`, `submit`, `receipt`)
- Modify: `backend/openapi.json` (regenerated)
- Test: `backend/crates/api/tests/training.rs`

**Interfaces:**
- Consumes: `report::{compute, ReportedSet, SessionReport}` and `timing::spread` from Task 2. Reads `workout_sets` back inside the submit transaction, so it also depends on Task 1 having landed the rows it selects.
- Produces: `WorkoutReceipt.summary: SessionReport` on the wire as `summary`. Task 7 renders it.

- [ ] **Step 1: Write the failing test**

Append to `backend/crates/api/tests/training.rs`, using `logged_with_drift` from Task 1 and `log_a_session_lasting` (:896):

```rust
#[sqlx::test]
async fn a_retry_reports_the_same_ending_as_the_first_submit(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    let body = logged_with_drift(Uuid::now_v7(), enrollment, &session, 5.0, "too_easy");

    let first: serde_json::Value = server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .json();

    let response = server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    response.assert_status(StatusCode::OK);
    let retry: serde_json::Value = response.json();

    assert_eq!(first["duplicate"], json!(false));
    assert_eq!(retry["duplicate"], json!(true));

    // A session that finally lands three days later is exactly the one whose
    // numbers the athlete has not seen. A blank ending on the retry would be
    // the worst possible time to have one.
    assert_eq!(first["summary"], retry["summary"]);
    assert_eq!(first["summary"]["sets_over"], json!(1));
    assert_eq!(first["summary"]["sets_under"], json!(0));
}

#[sqlx::test]
async fn the_ending_has_no_average_before_three_sessions(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    for day in 1..=2 {
        let session = next_session(&server, &token, enrollment).await;
        let sets = session["prescribed_sets"].as_array().unwrap().len();
        log_a_session_lasting(&server, &token, enrollment, &session, day, 3_600, sets).await;
    }

    let session = next_session(&server, &token, enrollment).await;
    let receipt: serde_json::Value = server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&logged_as_prescribed(Uuid::now_v7(), enrollment, &session))
        .await
        .json();

    // Two prior sessions would let one long day *be* the average rather than
    // merely be in it — D-10's rule for pace, here for the same reason.
    assert_eq!(receipt["summary"]["average_duration_seconds"], json!(null));
}

#[sqlx::test]
async fn the_ending_compares_against_the_sessions_before_it(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    for day in 1..=3 {
        let session = next_session(&server, &token, enrollment).await;
        let sets = session["prescribed_sets"].as_array().unwrap().len();
        log_a_session_lasting(&server, &token, enrollment, &session, day, 3_600, sets).await;
    }

    // The fourth runs ninety minutes. `logged_as_prescribed` hard-codes an
    // hour, so both stamps are replaced.
    let session = next_session(&server, &token, enrollment).await;
    let mut body = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);
    body["started_at"] = json!("2026-08-04T09:00:00Z");
    body["ended_at"] = json!("2026-08-04T10:30:00Z");

    let receipt: serde_json::Value = server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .json();

    assert_eq!(receipt["summary"]["duration_seconds"], json!(5_400));
    // The average of the three before it, and not diluted by its own ninety
    // minutes — the comparison is against history.
    assert_eq!(receipt["summary"]["average_duration_seconds"], json!(3_600));
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && cargo test -p athletos-api --test training ending average`
Expected: FAIL — no `summary` on the receipt.

- [ ] **Step 3: Widen the receipt**

In `WorkoutReceipt` (:229), after `progress`:

```rust
    /// What this session cost, and how it compares (D-08, amended).
    ///
    /// Present on a retry too, and computed the same way — see `summary_for`.
    pub summary: SessionReport,
```

Add `use crate::report::{self, ReportedSet, SessionReport};` to the imports.

- [ ] **Step 4: Query the average and build the report**

Add above `fn receipt`:

```rust
/// The athlete's average session length on this enrolment, in seconds.
///
/// Excludes the session being reported, so the comparison is against history
/// rather than diluted by itself, and excludes `auto_closed` sessions — a
/// three-hour workout closed by the stale-session sweep is a measurement of an
/// afternoon, not of a session (D-08).
///
/// `None` below three, which is D-10's rule for pace and is here for the same
/// reason: two would let one long session *be* the average rather than merely
/// be in it.
async fn average_duration(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    enrollment_id: Uuid,
    excluding: Uuid,
) -> ApiResult<Option<i64>> {
    let row: Option<(i64, Option<f64>)> = sqlx::query_as(
        "select count(*), avg(extract(epoch from (ended_at - started_at)))
         from workouts
         where enrollment_id = $1
           and id <> $2
           and ended_at is not null
           and outcome <> 'auto_closed'",
    )
    .bind(enrollment_id)
    .bind(excluding)
    .fetch_optional(&mut **tx)
    .await?;

    Ok(match row {
        Some((count, Some(average))) if count >= 3 => Some(average.round() as i64),
        _ => None,
    })
}

/// The ending, built from what is recorded rather than from what was sent.
///
/// Read back inside the same transaction, on every path including both retry
/// branches. One piece of code and one guarantee: the ending describes the
/// workout that is in the database. Building it from `body` would have saved a
/// query and cost that guarantee — a client reusing an id for different content
/// would be shown numbers about something that was never stored.
async fn recorded_report(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    workout_id: Uuid,
    enrollment_id: Uuid,
) -> ApiResult<SessionReport> {
    let (started_at, ended_at): (DateTime<Utc>, Option<DateTime<Utc>>) =
        sqlx::query_as("select started_at, ended_at from workouts where id = $1")
            .bind(workout_id)
            .fetch_one(&mut **tx)
            .await?;

    // `unique (workout_id, "position")` is both the ordering and the index —
    // and the order matters, because the walk that produces intervals is a
    // walk in performed order.
    let rows: Vec<(i16, String, f64, i16, Option<f64>, Option<i16>, String, Option<DateTime<Utc>>)> =
        sqlx::query_as(
            "select \"position\", exercise, prescribed_weight::float8, prescribed_reps,
                    actual_weight::float8, actual_reps, status, logged_at
             from workout_sets
             where workout_id = $1
             order by \"position\"",
        )
        .bind(workout_id)
        .fetch_all(&mut **tx)
        .await?;

    let reported: Vec<ReportedSet> = rows
        .iter()
        .map(|(_, _, prescribed_weight, prescribed_reps, actual_weight, actual_reps, status, _)| {
            ReportedSet {
                prescribed_weight: *prescribed_weight,
                prescribed_reps: u32::try_from(*prescribed_reps).unwrap_or_default(),
                actual_weight: *actual_weight,
                actual_reps: actual_reps.map(|reps| u32::try_from(reps).unwrap_or_default()),
                done: status == "done",
            }
        })
        .collect();

    // `label` is the raw key and is never read: `spread` takes the shape of the
    // intervals and does not attribute them to exercises. Resolving labels from
    // the registry here would be work with no consumer.
    let timed: Vec<(u16, TimedSet)> = rows
        .iter()
        .map(|(position, exercise, _, _, _, _, _, logged_at)| {
            (
                u16::try_from(*position).unwrap_or_default(),
                TimedSet {
                    exercise: exercise.clone(),
                    label: exercise.clone(),
                    logged_at: *logged_at,
                },
            )
        })
        .collect();

    let average = average_duration(tx, enrollment_id, workout_id).await?;

    Ok(report::compute(
        ended_at
            .map(|end| (end - started_at).num_seconds())
            .unwrap_or_default(),
        average,
        &reported,
        timing::spread(started_at, &timed),
    ))
}
```

- [ ] **Step 5: Thread it through all three returns**

`fn receipt` gains a `summary: SessionReport` parameter and sets the field. Each of the three call sites in `submit` — the closed-enrolment path (:~430), the conflict path (:~470), and the success path (:~520) — calls

```rust
    let summary = recorded_report(&mut tx, body.id, body.enrollment_id).await?;
```

**before its `tx.commit()`**, and passes `summary` to `receipt`. On the success path this must come **after `insert_sets`**, or it reads a workout with no sets and reports an empty session. Placing it immediately before `tx.commit()` on all three paths satisfies that by construction.

- [ ] **Step 6: Run to verify it passes**

Run: `cd backend && cargo test -p athletos-api`
Expected: PASS, whole suite.

- [ ] **Step 7: Register the schemas and regenerate the contract**

In `backend/crates/api/src/openapi.rs`, add `crate::report::SessionReport` and `crate::timing::IntervalSpread` to the `components(schemas(...))` list beside `crate::timing::SessionTiming` (:107). A component that is referenced but not registered generates as `unknown` on the TypeScript side, which Task 4 would then have to work around.

```bash
cd backend && cargo run --bin openapi > openapi.json
npx --yes oasdiff breaking <(git show HEAD:backend/openapi.json) openapi.json
```
Expected: no breaking changes. `summary` is an added response field and the two schemas are additions.

- [ ] **Step 8: Commit**

```bash
git add backend/crates/api/src/routes/workouts.rs backend/crates/api/tests/training.rs backend/openapi.json
git commit -m "workouts: the receipt says what the session cost"
```

---

### Task 4: The queue keeps the receipt

**Files:**
- Modify: `frontend/src/lib/api/schema.d.ts` (regenerated, never hand-edited)
- Modify: `frontend/src/lib/queue.ts:38` (`SendOutcome`), `:83` (`FlushReport`), `:113`, `:124`
- Modify: `frontend/src/lib/submit.ts:23` (`send`)
- Test: `frontend/src/lib/queue.test.ts`

**Interfaces:**
- Consumes: `backend/openapi.json` from Task 3.
- Produces: `export type WorkoutReceipt = Schemas['WorkoutReceipt']` from `session.ts`; `SendOutcome` accepted variant gains `receipt: WorkoutReceipt | null`; `FlushReport` gains `receipts: Record<string, WorkoutReceipt>`. Task 7 reads `report.receipts[id]`.

- [ ] **Step 1: Regenerate the client**

```bash
cd frontend && npm run generate:api
```
Expected: `schema.d.ts` gains `SessionReport`, `IntervalSpread`, `DriftReason`, and `summary` on `WorkoutReceipt`.

- [ ] **Step 2: Write the failing test**

The file already has `submission(id)` (:7) and `memoryStore(items)` (:22). Add one fixture beside them:

```typescript
function receipt(id: string): WorkoutReceipt {
	return {
		id,
		enrollment_id: '00000000-0000-7000-8000-000000000001',
		week: 1,
		day: 4,
		duplicate: false,
		progress: { completed: 3, total: null },
		summary: {
			load_moved_kg: 1000,
			load_prescribed_kg: 950,
			sets_over: 1,
			sets_under: 0,
			duration_seconds: 3300,
			average_duration_seconds: null,
			intervals: null
		}
	};
}
```

Then append:

```typescript
describe('receipts', () => {
	const first = '00000000-0000-7000-8000-0000000000a1';
	const second = '00000000-0000-7000-8000-0000000000a2';

	it('attributes each receipt to the workout it came back for', async () => {
		// A flush sends everything outstanding, so an older session landing
		// beside this one must not put its numbers on this one's ending.
		const store = memoryStore([
			enqueued(submission(first), '2026-08-05T10:00:00Z'),
			enqueued(submission(second), '2026-08-05T11:00:00Z')
		]);

		const report = await flushQueue(store, async (body) => ({
			kind: 'accepted',
			duplicate: false,
			receipt: receipt(body.id)
		}));

		expect(report.accepted).toEqual([first, second]);
		expect(report.receipts[first].id).toBe(first);
		expect(report.receipts[second].id).toBe(second);
	});

	it('records no receipt for a submission that did not land', async () => {
		const store = memoryStore([enqueued(submission(first), '2026-08-05T10:00:00Z')]);

		const report = await flushQueue(store, async () => ({
			kind: 'retry',
			reason: 'offline'
		}));

		expect(report.receipts).toEqual({});
	});
});
```

Import `WorkoutReceipt` as a type from `./session`.

**The two existing `classifyStatus` assertions at :35-36 will now fail** — the accepted variant has a third field. Update them to `{ kind: 'accepted', duplicate: false, receipt: null }` and `{ kind: 'accepted', duplicate: true, receipt: null }`. That is the intended consequence of the default parameter, not a regression to work around.

- [ ] **Step 3: Run to verify it fails**

Run: `cd frontend && npm run test:unit -- queue`
Expected: FAIL — `receipts` is not a property of `FlushReport`.

- [ ] **Step 4: Widen the queue**

In `session.ts`, beside the other schema re-exports (:21-25):

```typescript
export type WorkoutReceipt = Schemas['WorkoutReceipt'];
```

In `queue.ts`:

```typescript
/** What one attempt at sending came to. */
export type SendOutcome =
	| { kind: 'accepted'; duplicate: boolean; receipt: WorkoutReceipt | null }
	| { kind: 'retry'; reason: string }
	| { kind: 'rejected'; reason: string };
```

```typescript
/** How one flush went, per workout id. */
export type FlushReport = {
	accepted: string[];
	duplicate: string[];
	retrying: string[];
	rejected: string[];
	/**
	 * What the server said about each workout that landed, keyed by its id.
	 *
	 * Keyed rather than a single field, because a flush sends everything
	 * outstanding: an older session landing alongside this one would otherwise
	 * have its numbers shown on the ending of the session just finished.
	 *
	 * A landed workout with no entry is possible and not an error — the
	 * response body may not have parsed, and losing the numbers is not losing
	 * the session.
	 */
	receipts: Record<string, WorkoutReceipt>;
};
```

`classifyStatus` gains a `receipt` parameter:

```typescript
export function classifyStatus(
	status: number,
	detail: string | null,
	receipt: WorkoutReceipt | null = null
): SendOutcome {
	if (status === 200 || status === 201) {
		return { kind: 'accepted', duplicate: status === 200, receipt };
	}
	// ... unchanged below
```

In `flushQueue`, initialise `receipts: {}` on the report, and inside the accepted branch:

```typescript
		if (outcome.kind === 'accepted') {
			await store.remove(item.id);
			if (outcome.receipt) report.receipts[item.id] = outcome.receipt;
			(outcome.duplicate ? report.duplicate : report.accepted).push(item.id);
			continue;
		}
```

- [ ] **Step 5: Read the body on success**

In `submit.ts`, `send` currently parses the body only far enough to find `detail`. Replace the parse block with one that keeps the whole object and passes it on:

```typescript
	let detail: string | null = null;
	let receipt: WorkoutReceipt | null = null;

	try {
		const body: unknown = await response.json();

		if (typeof body === 'object' && body !== null) {
			if ('detail' in body && typeof body.detail === 'string') {
				detail = body.detail;
			}
			// Trusted as far as the generated type goes and no further: this is
			// our own API through our own BFF, and a body that is not the shape
			// it claims is a bug we want loud rather than silently swallowed.
			if ('summary' in body) receipt = body as WorkoutReceipt;
		}
	} catch {
		// A body that is not JSON tells us nothing the status has not already.
	}

	return classifyStatus(response.status, detail, receipt);
```

- [ ] **Step 6: Run to verify it passes**

Run: `cd frontend && npm run test:unit -- queue && npm run check`
Expected: PASS, and svelte-check clean.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/api/schema.d.ts frontend/src/lib/queue.ts frontend/src/lib/submit.ts \
        frontend/src/lib/queue.test.ts frontend/src/lib/session.ts
git commit -m "queue: keep what the server said, per workout"
```

---

### Task 5: `session.ts` — the weight carries, and says why

**Files:**
- Modify: `frontend/src/lib/session.ts` (`LocalSet`, `commitSession`, `editSet`, `resetSet`, `skipSet`, `toSubmission`, and two new exports)
- Test: `frontend/src/lib/session.test.ts`

**Interfaces:**
- Consumes: `DriftReason` from the regenerated schema (Task 4).
- Produces: `LocalSet.driftReason: DriftReason | null`; `setDriftReason(session, position, reason: DriftReason | null): LocalSession`; `barUnchangedFrom(session, position): boolean`; `DRIFT_REASONS` and `DRIFT_REASON_LABELS`. Task 6 calls all of them; Task 8 reads `DRIFT_REASON_LABELS`.

- [ ] **Step 1: Write the failing tests**

Append to `frontend/src/lib/session.test.ts`. The file's `fixture()` (:108) returns a committed `LocalSession` built from `peeked` — squat at 97.5 kg across positions 0–2, hanging leg raise at position 3. Add `barUnchangedFrom` and `setDriftReason` to the imports.

```typescript
const committed = fixture();

describe('a weight edit carries through the exercise', () => {
	it('rewrites every later pending set of the same exercise', () => {
		const edited = editSet(committed, 0, { weight: 100 });

		expect(edited.sets[0].actualWeight).toBe(100);
		expect(edited.sets[1].actualWeight).toBe(100);
		expect(edited.sets[2].actualWeight).toBe(100);
	});

	it('stops at the next exercise, which is a different bar', () => {
		const edited = editSet(committed, 0, { weight: 100 });

		// Position 3 is the hanging leg raise.
		expect(edited.sets[3].actualWeight).toBe(committed.sets[3].actualWeight);
	});

	it('leaves a set that has already been answered alone', () => {
		const logged = logSet(committed, 1, '2026-08-05T10:05:00Z');
		const edited = editSet(logged, 0, { weight: 100 });

		expect(edited.sets[1].actualWeight).toBe(97.5);
		expect(edited.sets[2].actualWeight).toBe(100);
	});

	it('never touches the prescription, because drift is measured against it', () => {
		const edited = editSet(committed, 0, { weight: 100 });

		expect(edited.sets.map((set) => set.prescribedWeight)).toEqual(
			committed.sets.map((set) => set.prescribedWeight)
		);
	});

	it('does not carry a rep edit, which is about one set', () => {
		const edited = editSet(committed, 0, { reps: 3 });

		expect(edited.sets[0].actualReps).toBe(3);
		expect(edited.sets[1].actualReps).toBe(5);
	});

	it('re-propagates on a second edit, last edit winning', () => {
		const once = editSet(committed, 0, { weight: 100 });
		const tweaked = editSet(once, 2, { weight: 102.5 });
		const again = editSet(tweaked, 0, { weight: 105 });

		expect(again.sets[2].actualWeight).toBe(105);
	});
});

describe('the reason for a drift', () => {
	it('carries with the weight it is about', () => {
		const edited = editSet(committed, 0, { weight: 100 });
		const reasoned = setDriftReason(edited, 0, 'too_easy');

		expect(reasoned.sets[1].driftReason).toBe('too_easy');
		expect(reasoned.sets[3].driftReason).toBeNull();
	});

	it('clears when the weight goes back to the prescription', () => {
		const reasoned = setDriftReason(editSet(committed, 0, { weight: 100 }), 0, 'too_easy');
		const back = editSet(reasoned, 0, { weight: 97.5 });

		expect(back.sets[0].driftReason).toBeNull();
		expect(back.sets[1].driftReason).toBeNull();
	});

	it('clears on undo and on skip', () => {
		const reasoned = setDriftReason(editSet(committed, 0, { weight: 100 }), 0, 'too_easy');

		expect(resetSet(reasoned, 0).sets[0].driftReason).toBeNull();
		expect(skipSet(reasoned, 1, '2026-08-05T10:05:00Z').sets[1].driftReason).toBeNull();
	});

	it('is sent only for a set that was done', () => {
		const reasoned = setDriftReason(editSet(committed, 0, { weight: 100 }), 0, 'too_easy');
		const logged = logSet(reasoned, 0, '2026-08-05T10:05:00Z');
		const body = toSubmission(logged, { endedAt: '2026-08-05T11:00:00Z', cutReason: 'enough' });

		expect(body.sets[0].drift_reason).toBe('too_easy');
		// Position 1 carries the reason locally but was never reached. Sending
		// it would arrive with a null actual_weight, the check constraint would
		// refuse it, and the whole session would be lost over a chip.
		expect(body.sets[1].drift_reason).toBeNull();
	});
});

describe('barUnchangedFrom', () => {
	it('is true when the previous answered set of the exercise is the same weight', () => {
		const edited = editSet(committed, 0, { weight: 100 });
		const logged = logSet(edited, 0, '2026-08-05T10:05:00Z');

		expect(barUnchangedFrom(logged, 1)).toBe(true);
	});

	it('is false at the first set of an exercise, which has no predecessor', () => {
		expect(barUnchangedFrom(editSet(committed, 0, { weight: 100 }), 0)).toBe(false);
	});

	it('is false for an exercise that is not loaded with plates', () => {
		// Position 3 is the hanging leg raise: no plate change, so "the bar is
		// already loaded" would be a statement about a bar that is not there.
		const logged = logSet(committed, 3, '2026-08-05T10:30:00Z');
		expect(barUnchangedFrom(logged, 3)).toBe(false);
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend && npm run test:unit -- session`
Expected: FAIL — `setDriftReason` and `barUnchangedFrom` are not exported.

- [ ] **Step 3: Widen `LocalSet` and the commit**

Add to the type re-exports: `export type DriftReason = Schemas['DriftReason'];`

In `LocalSet`, after `note`:

```typescript
	/**
	 * Why this set is not being lifted as prescribed, or `null`.
	 *
	 * Never asked for and never defaulted: an unanswered edit stays `null`
	 * rather than becoming "too easy", which would be a claim nobody made on
	 * the one signal the product exists to read (D-07).
	 */
	driftReason: DriftReason | null;
```

`commitSession` sets `driftReason: null` on every set.

- [ ] **Step 4: Make the edit carry**

Replace `editSet` (:156):

```typescript
/**
 * Records what the athlete actually lifted.
 *
 * A **weight** edit carries to every later *pending* set of the same exercise,
 * and stops at the next exercise — which is a different bar, and possibly not
 * even the same bar, the boundary D-04 already draws for the plate chain.
 * Retyping the same correction five times is the app making an honest answer
 * cost more than a dishonest one (D-07).
 *
 * A **rep** edit does not carry. It is about that set — an AMRAP that went
 * well, a set cut short at eight — whereas a weight edit is about the bar, and
 * the bar is still loaded when the next set starts.
 *
 * Only pending sets are rewritten. A set already logged or skipped is a record
 * of what happened, and rewriting it would falsify the log.
 *
 * `prescribedWeight` is never touched, so drift is still measured against the
 * number the athlete was actually shown.
 */
export function editSet(
	session: LocalSession,
	position: number,
	values: { weight?: number; reps?: number }
): LocalSession {
	const target = session.sets.find((set) => set.position === position);
	if (!target) return session;

	const carried = values.weight;

	return {
		...session,
		sets: session.sets.map((set) => {
			if (set.position === position) {
				const actualWeight = values.weight ?? set.actualWeight;
				return {
					...set,
					actualWeight,
					actualReps: values.reps ?? set.actualReps,
					driftReason: actualWeight === set.prescribedWeight ? null : set.driftReason
				};
			}

			const carries =
				carried !== undefined &&
				set.exercise === target.exercise &&
				set.position > position &&
				set.status === 'pending';

			if (!carries) return set;

			return {
				...set,
				actualWeight: carried,
				driftReason: carried === set.prescribedWeight ? null : target.driftReason
			};
		})
	};
}
```

- [ ] **Step 5: Add the reason, and clear it where drift ends**

```typescript
/**
 * Records why this set is not being lifted as prescribed, or clears it.
 *
 * Carries with the weight, to every later pending set of the same exercise
 * holding that same weight — it is one decision continuing, and recording four
 * of five carried sets as unanswered would misreport it.
 */
export function setDriftReason(
	session: LocalSession,
	position: number,
	reason: DriftReason | null
): LocalSession {
	const target = session.sets.find((set) => set.position === position);
	if (!target) return session;

	return {
		...session,
		sets: session.sets.map((set) => {
			const carries =
				set.position === position ||
				(set.exercise === target.exercise &&
					set.position > position &&
					set.status === 'pending' &&
					set.actualWeight === target.actualWeight);

			return carries ? { ...set, driftReason: reason } : set;
		})
	};
}
```

`resetSet` adds `driftReason: null` beside its existing `actualWeight` restoration — the deviation is gone, so there is nothing left for a reason to be about. `skipSet` adds `driftReason: null` for the same reason: a set that was not done has no weight to explain.

- [ ] **Step 6: Add `barUnchangedFrom`**

```typescript
/**
 * Whether the bar already holds this set's weight (D-04).
 *
 * True when the previous *answered* set of the same exercise was lifted at the
 * same weight as this one is about to be. Pure equality between two numbers
 * this module already holds — no plate arithmetic reaches the client and none
 * is coming (D-11).
 *
 * This is what keeps the plate guidance alive once a weight has been edited
 * and carried: `plateChangeFor` goes `null` for every deviated set, and
 * "bar is already loaded" is the true instruction for all of them but the
 * first.
 *
 * Guarded on `plateChange` being present, which is how this module knows the
 * exercise is loaded with plates at all. A pair of dumbbells at the same weight
 * must not be told the bar is loaded.
 */
export function barUnchangedFrom(session: LocalSession, position: number): boolean {
	const set = session.sets.find((candidate) => candidate.position === position);
	if (!set?.plateChange) return false;

	const previous = session.sets
		.filter(
			(candidate) =>
				candidate.exercise === set.exercise &&
				candidate.position < position &&
				candidate.status !== 'pending'
		)
		.sort((a, b) => a.position - b.position)
		.at(-1);

	return previous !== undefined && previous.actualWeight === set.actualWeight;
}
```

- [ ] **Step 7: Name the four reasons once**

The logger offers these words and the history page reads them back, so they live in one place rather than two that can drift apart:

```typescript
/**
 * What each reason is called on screen (D-07).
 *
 * Lower case, matching the `eyebrow` copy the logger already uses. Note that
 * `already_loaded` reads as "bar was loaded" — the stored value names the
 * state, the label names what the athlete did about it.
 */
export const DRIFT_REASON_LABELS: Record<DriftReason, string> = {
	too_easy: 'too easy',
	too_heavy: 'too heavy',
	already_loaded: 'bar was loaded',
	felt_off: 'felt off'
};

/** The four answers, in the order they are offered. "too easy" leads. */
export const DRIFT_REASONS: { value: DriftReason; label: string }[] = (
	['too_easy', 'too_heavy', 'already_loaded', 'felt_off'] as const
).map((value) => ({ value, label: DRIFT_REASON_LABELS[value] }));
```

- [ ] **Step 8: Send the reason only for done sets**

In `toSubmission`'s set mapping, beside `note`:

```typescript
			drift_reason: set.status === 'done' ? set.driftReason : null,
```

- [ ] **Step 9: Run to verify it passes**

Run: `cd frontend && npm run test:unit -- session && npm run check`
Expected: PASS, and svelte-check clean.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/lib/session.ts frontend/src/lib/session.test.ts
git commit -m "session: the weight you chose carries, and can say why"
```

---

### Task 6: The logger — chips, and a bar that stops lying

**Files:**
- Modify: `frontend/src/routes/session/+page.svelte:230-289` (the plate block) and `:322-360` (below the weight input)

**Interfaces:**
- Consumes: `barUnchangedFrom`, `setDriftReason`, `DriftReason` from Task 5.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Import what Task 5 produced**

Add `barUnchangedFrom`, `setDriftReason` and `DRIFT_REASONS` to the existing `$lib/session` import. Nothing about the vocabulary is declared here — the words live in `session.ts` so the history page cannot disagree with the chips about what `already_loaded` is called.

- [ ] **Step 2: Replace the plate block**

Replace the `{#if change || set.platesPerSide.length > 0}` block (:245-289) with the four-way branch. The first arm is the existing `{#if change}` body, unchanged:

```svelte
								{@const unchanged = barUnchangedFrom(session, set.position)}
								{@const showPrescribed =
									set.actualWeight === set.prescribedWeight && set.platesPerSide.length > 0}

								{#if change || unchanged || showPrescribed}
									<div class="mt-1 mb-1">
										{#if change}
											<!-- ...existing body, unchanged... -->
										{:else if unchanged}
											<!--
												The plan is gone because this weight was edited, but
												the bar is where the last set left it and that is the
												whole instruction. No stack is drawn: nobody computed
												one for an edited weight, and the words were always
												the instruction while the picture was the nicety
												(D-04, D-11).
											-->
											<p class="eyebrow">bar is already loaded</p>
										{:else}
											<!--
												Stale for one of the *other* reasons — an earlier set
												of this exercise skipped, or logged at a weight other
												than its own. This set still sits at its own
												prescription, so the breakdown is true about the
												weight it names, and it stays dimmed and labelled.
											-->
											<div class="opacity-60">
												<Plates plates={set.platesPerSide} />
												<p class="text-xs">for the prescribed {set.prescribedWeight} kg</p>
											</div>
										{/if}
									</div>
								{/if}
```

The dimmed fallback is now reachable only when this set is at its own prescription, which is the whole change: a breakdown labelled *for the prescribed 100 kg* beside a bar being loaded to 105 is a false instruction at a rack.

- [ ] **Step 3: Add the chips**

Immediately after the closing `</div>` of the weight-and-reps row (:360):

```svelte
							<!--
								Why the weight changed. Appears only on the set being performed
								and only once it actually differs; vanishes if it goes back.
								Nothing is selected, no tap is a valid answer, and Log stays one
								tap either way — honesty must never cost more than dishonesty
								(D-07).
							-->
							{#if set.position === current && set.actualWeight !== set.prescribedWeight}
								<fieldset class="flex flex-wrap items-baseline gap-2">
									<legend class="eyebrow">why</legend>
									{#each DRIFT_REASONS as reason (reason.value)}
										<button
											class="btn btn-xs"
											class:btn-primary={set.driftReason === reason.value}
											class:btn-outline={set.driftReason !== reason.value}
											type="button"
											aria-pressed={set.driftReason === reason.value}
											onclick={() =>
												apply((s) =>
													setDriftReason(
														s,
														set.position,
														set.driftReason === reason.value ? null : reason.value
													)
												)}
										>
											{reason.label}
										</button>
									{/each}
								</fieldset>
							{/if}
```

- [ ] **Step 4: Verify it type-checks and lints**

Run: `cd frontend && npm run check && npm run lint`
Expected: both clean.

- [ ] **Step 5: Verify the four arms by hand**

Run `npm run dev`, commit a 5/3/1 session, and confirm at the rack-eye view:
1. an untouched set shows *add …* as before;
2. editing set 1's weight leaves set 1 with no plate block at all;
3. logging set 1 and moving to set 2 shows *bar is already loaded*;
4. skipping set 1 without editing leaves set 2 showing the dimmed *for the prescribed …* breakdown.

Record what you saw in the commit message. This is the step where a wrong arm becomes a false instruction in a gym, and no unit test covers rendering.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/routes/session/+page.svelte
git commit -m "session: say why, and stop drawing a bar nobody is building"
```

---

### Task 7: The ending

**Files:**
- Modify: `frontend/src/routes/session/+page.svelte:85-111` (`finishSession`) and `:130-178` (the finish screen)

`formatElapsed` is already imported on this page and takes milliseconds; every figure below is seconds and is multiplied by 1000 at the call. No new formatter is needed.

**Interfaces:**
- Consumes: `FlushReport.receipts` from Task 4.
- Produces: nothing.

- [ ] **Step 1: Keep the receipt**

Add `WorkoutReceipt` to the type import from `$lib/session`. Then beside `summary` and `recordId` (:82-83):

```typescript
	// What the server said about this session, when it landed. Asked for by id
	// rather than taken off the report as a whole: a flush sends everything
	// outstanding, and an older session landing at the same moment would
	// otherwise put its numbers on this ending.
	let receipt = $state<WorkoutReceipt | null>(null);
```

and after the report is read:

```typescript
		receipt = report.receipts[body.id] ?? null;
```

- [ ] **Step 2: Render it in the `sent` branch**

Inside `{#if phase === 'sent'}`, above the existing *Recorded. The program has moved on.* line:

```svelte
					{#if receipt}
						{@const ending = receipt.summary}
						<dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
							<!--
								Load and drift on the same screen, deliberately. D-08 refused a
								drift total here because it would have been the first place in
								the product drift appeared alone; beside the load actually
								moved and the athlete's own average, it is not alone (D-13).
							-->
							<dt class="eyebrow">load moved</dt>
							<dd class="tabular">{Math.round(ending.load_moved_kg)} kg</dd>

							{#if ending.sets_over > 0 || ending.sets_under > 0}
								<dt class="eyebrow">against the prescription</dt>
								<dd class="tabular">
									{Math.round(ending.load_moved_kg - ending.load_prescribed_kg)} kg
									{#if ending.sets_over > 0}· over on {ending.sets_over}{/if}
									{#if ending.sets_under > 0}· under on {ending.sets_under}{/if}
								</dd>
							{/if}

							{#if ending.average_duration_seconds !== null}
								<dt class="eyebrow">against your average</dt>
								<dd class="tabular">
									{formatElapsed(
										Math.abs(ending.duration_seconds - ending.average_duration_seconds) * 1000
									)}
									{ending.duration_seconds >= ending.average_duration_seconds
										? 'longer'
										: 'shorter'}
								</dd>
							{/if}

							{#if ending.intervals}
								<dt class="eyebrow">between sets</dt>
								<dd class="tabular">
									{formatElapsed(ending.intervals.min_seconds * 1000)} ·
									{formatElapsed(ending.intervals.median_seconds * 1000)} ·
									{formatElapsed(ending.intervals.max_seconds * 1000)}
								</dd>
								<!--
									The middle figure is a median, not a mean: one interval spent
									talking to somebody moves a mean of twelve by a minute, and
									the tail of this distribution is not signal (D-10).
								-->
								<dt class="sr-only">what those three are</dt>
								<dd class="col-span-2 text-xs opacity-50">
									fastest · typical · slowest
									{#if ending.intervals.discarded > 0}
										· {ending.intervals.discarded} gap{ending.intervals.discarded === 1
											? ''
											: 's'} too long to believe, left out
									{/if}
								</dd>
							{/if}
						</dl>
					{/if}
```

- [ ] **Step 3: Leave `queued` and `refused` exactly as they are**

No change. *Saved on this device and not sent yet* and the disabled *The full breakdown needs a connection* become more true, not less, and there is no baseline cached at commit and no aggregation on the phone — which is what stops this becoming a second implementation the native client has to reproduce (D-11).

- [ ] **Step 4: Verify**

Run: `cd frontend && npm run check && npm run lint && npm run test:unit`
Expected: all clean.

Then by hand: finish a session online and read the block; finish one with the network disabled and confirm the `queued` branch is untouched.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/routes/session/+page.svelte frontend/src/lib/time.ts
git commit -m "session: an ending that says what the hour cost"
```

---

### Task 8: The history page shows the reason

**Files:**
- Modify: `frontend/src/routes/(app)/history/[id]/+page.svelte:41-60`

**Interfaces:**
- Consumes: `LoggedSetView.drift_reason` from Task 1.

- [ ] **Step 1: Render it beside the drift it explains**

Inside the `{#each data.detail.sets}` list item, after the `{#if set.note}` block:

```svelte
			{#if set.drift_reason}
				<!--
					Shown beside the drift rather than under the note: it is the answer
					to "why is this row bold", not a sentence the athlete wrote.
				-->
				<p class="mt-1 w-full text-xs opacity-60">
					{DRIFT_REASON_LABELS[set.drift_reason]}
				</p>
			{/if}
```

Import `DRIFT_REASON_LABELS` from `$lib/session` (Task 5, Step 7). Read through the map rather than reformatting the stored value: `already_loaded` would print as *already loaded*, while the chip the athlete tapped said *bar was loaded*, and two names for one answer is how a vocabulary rots.

- [ ] **Step 2: Verify**

Run: `cd frontend && npm run check && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/\(app\)/history/\[id\]/+page.svelte
git commit -m "history: show the reason beside the drift it explains"
```

---

### Task 9: Amend the binding decisions

**Files:**
- Modify: `docs/DESIGN.md` (D-07 and D-08)
- Modify: `CONTEXT.md` (the Training vocabulary section)

A decision in `docs/DESIGN.md` is binding until it is amended there. This task is not documentation cleanup — it is the part of the change that makes the rest of it legitimate.

- [ ] **Step 1: Amend D-07**

Add an amendment block at the end of D-07, in the house style (`> **Amended after …**`), covering:

- the chips exist, and why they are not the mid-session warning D-07 forbids: nothing blocks, nothing warns, no tap is a valid answer, Log stays one tap, and the row is invisible until the weight actually differs;
- nothing is pre-selected, and why a default would have been the worst version of this — every edit the athlete walked past landing as *too easy*, a claim nobody made, in the one signal the product exists to read;
- drift now has a stated reason, a third column of first-class drift data beside weight and work not done;
- the fifth chip that is not there — *couldn't load it* — and that it was weighed against D-04's recorded plate-supply gap rather than missed.

- [ ] **Step 2: Amend D-08**

Add an amendment block to the finish-screen section that **names the refusal it reverses** and says what changed:

- drift no longer appears alone, because load moved and the enrolment average sit beside it (D-13);
- no number is invented in a client — the arithmetic is `report.rs` and it arrives on the receipt the phone already reads;
- the offline behaviour the section describes is unchanged, and the history link stays because the per-exercise breakdown is not duplicated here;
- the median-not-mean choice, and that it is D-10's rule applied in D-10's units.

- [ ] **Step 3: Amend D-07's set-carry rule**

In the same D-07 amendment or a second one, record that a weight edit carries through the exercise and resets at the next one, that `prescribed_weight` is untouched, and that carrying it into *future sessions* was asked for and declined — with the athlete's own reason (a bump taken on a light day would push a heavy day too far) and the mechanical one (a prescriptive program snapshots its maxes at enrolment per D-03, and 5/3/1's training max moves only through `advance()`, so the three available mechanisms are all worse than they look).

- [ ] **Step 4: Add the vocabulary**

In `CONTEXT.md`, under **Training**, after **Drift**:

```markdown
**Drift reason**:
Why a Set was lifted at a weight other than the one prescribed — too easy, too
heavy, the bar was already loaded, or it felt off. Offered as one optional tap
at the moment of the change, never asked for, never defaulted, and never
blocking.
_Avoid_: Excuse, justification, override reason
```

- [ ] **Step 5: Commit**

```bash
git add docs/DESIGN.md CONTEXT.md
git commit -m "Two decisions this week's work moved"
```

---

## Verification before calling it done

- [ ] `cd backend && cargo fmt --check && cargo clippy -- -D warnings && cargo test` — all clean, with `DATABASE_URL` set.
- [ ] `cd frontend && npm run check && npm run lint && npm run test:unit` — all clean.
- [ ] `npx oasdiff breaking` against `main`'s `backend/openapi.json` reports nothing.
- [ ] The four plate arms were seen in a browser, not merely type-checked (Task 6, Step 5).
- [ ] An offline finish still shows the `queued` branch with no summary and no error.
