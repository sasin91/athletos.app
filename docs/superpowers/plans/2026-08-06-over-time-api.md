# Over time, part 1: the API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `GET /v1/progress` — everything the progress screen needs, computed in Rust, derived from rows that already exist.

**Architecture:** A pure estimate formula in the training crate; one read-only endpoint in the API assembling four things from queries — per-lift trend points, per-session figures, per-enrolment and overall indicators, and the rep-max grid. No new tables: the training-max line comes from `enrollment_advances.state_before` through `readout()`, which is a pure function of state.

**Tech Stack:** Rust (axum, sqlx, utoipa, chrono, uuid) · Postgres 17.

**Spec:** `docs/superpowers/specs/2026-08-05-over-time-design.md` — read it before Task 1. Sections 1–4, 6 and the vocabulary section are this plan; section 5 (the screen) is a separate plan.

## Why this is split from the screen

The spec covers one screen but two subsystems with a clean seam: an endpoint that can be exercised with `curl`, and a page that draws it. The endpoint is working, testable software on its own. The screen additionally depends on verifying LayerChart's Svelte 5 support — the spec's own stated plan-time check, with hand-rolled SVG as the fallback — and that answer should be known before anything is built on it.

## Global Constraints

- **Additive-only inside `/v1` (D-12).** A new endpoint is additive. Never remove a field, change a type, or tighten validation on anything existing. CI runs `oasdiff`.
- **No new tables and no new writes.** Every figure is derived from `workouts`, `workout_sets` and `enrollment_advances`. If you find yourself writing a migration, stop — the spec argues at length why not.
- **All business logic in Rust (D-11).** The client formats and compares; it computes nothing.
- **`State` is opaque (D-03).** The training max is obtained by calling `program.readout(&state)`, never by reading a key out of the JSON.
- **Weights are bare numbers with kg semantics.** No unit is written into any domain type; formatting lives at the UI edge.
- **An indicator with nothing to say is omitted, never sent as zero.** A median across no sessions is not zero.
- **The estimate is `Estimate` in prose and on the wire — never "Estimated 1RM".** `CONTEXT.md` already rules out *PR*, *personal best*, and flags *Max* as ambiguous; putting two things called a 1RM on one screen is the confusion that section exists to prevent.
- **Bests are "at least N reps", never "exactly N".** Every cell must be backed by a set that actually happened.
- **The repo's comment style is dense and argues its decisions.** Doc comments carrying the reasoning are part of the deliverable.

**Commands.** `cd backend && DATABASE_URL=postgres://postgres:athletos@127.0.0.1:5433/athletos cargo test -p athletos-api`. Note **port 5433**; `docs/DEVELOPMENT.md` says 5432 and is stale — do not edit it. Gates, both hard in CI: `cargo fmt --all --check` and `cargo clippy --workspace --all-targets -- -D warnings`. Both have caught real failures on this repo.

---

### Task 1: The estimate

**Files:**
- Create: `backend/crates/training/src/estimate.rs`
- Modify: `backend/crates/training/src/lib.rs` (declare the module and re-export)
- Test: inline `#[cfg(test)] mod tests` in `estimate.rs`

**Interfaces:**
- Consumes: nothing.
- Produces: `athletos_training::{estimate, ESTIMATE_REP_CEILING}` where `pub fn estimate(weight: f64, reps: u32) -> Option<f64>`. Task 3 calls it.

- [ ] **Step 1: Write the failing tests**

Create `backend/crates/training/src/estimate.rs` with the module doc and tests only:

```rust
//! What a set implies about a single (D-13, D-19's sibling in *Over time*).
//!
//! The trend that answers "is this program working?" cannot be drawn from
//! prescribed weights — those move because the program says so. It is drawn
//! from what the athlete actually lifted, which means turning a set of reps
//! into the one-rep max it implies.
//!
//! # Epley, and why not Brzycki
//!
//! `weight × (1 + reps / 30)`. A single returns the weight itself, which is
//! the property that matters most: the heaviest thing the athlete has actually
//! done must never be understated by an estimate of it.
//!
//! Brzycki — `weight × 36 / (37 − reps)` — is the usual alternative and is
//! slightly kinder at low reps. It is not used here because it has a pole at
//! 37 reps and goes negative past it, so it is a formula that must be guarded
//! rather than one that degrades. Epley grows without a discontinuity; it
//! merely grows optimistic, and [`ESTIMATE_REP_CEILING`] is where that stops
//! being tolerable.
//!
//! # The ceiling is a rule, not input validation
//!
//! An estimate off a set of twenty is not evidence about a single, and Epley's
//! error grows monotonically with reps. A set above the ceiling contributes
//! **no estimate at all** rather than a clamped one — the same instinct as
//! `timing.rs` discarding an interval it cannot believe instead of folding it
//! in at an invented value. A number that is present but untrustworthy is
//! worse than an absent one, because only one of the two is visible.

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_single_estimates_itself() {
        // The property that chose Epley over its alternatives.
        assert_eq!(estimate(140.0, 1), Some(140.0));
    }

    #[test]
    fn more_reps_at_one_weight_imply_more() {
        let three = estimate(100.0, 3).expect("within the ceiling");
        let five = estimate(100.0, 5).expect("within the ceiling");

        assert!(five > three);
        assert!((three - 110.0).abs() < 1e-9, "100 x (1 + 3/30) = 110");
        assert!((five - 116.666_666_666_666_67).abs() < 1e-9);
    }

    #[test]
    fn a_set_above_the_ceiling_estimates_nothing() {
        assert_eq!(estimate(60.0, ESTIMATE_REP_CEILING + 1), None);
        assert!(estimate(60.0, ESTIMATE_REP_CEILING).is_some());
    }

    #[test]
    fn a_set_of_no_reps_estimates_nothing() {
        // Not done, or done and failed. Either way it says nothing about a
        // single, and zero reps through Epley would return the weight itself —
        // claiming a lift that did not happen.
        assert_eq!(estimate(140.0, 0), None);
    }

    #[test]
    fn a_weightless_set_estimates_nothing() {
        // Bodyweight work. Its record is reps, not kilograms, and Epley over
        // zero would report an athlete's best squat as zero.
        assert_eq!(estimate(0.0, 5), None);
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && cargo test -p athletos-training estimate`
Expected: FAIL — module not declared, `estimate` and `ESTIMATE_REP_CEILING` not found.

- [ ] **Step 3: Implement it**

Add `pub mod estimate;` to `backend/crates/training/src/lib.rs` beside `pub mod exercise;`, and `pub use estimate::{estimate, ESTIMATE_REP_CEILING};` beside the other re-exports. Then, above the test module:

```rust
/// The most reps an estimate will be taken from.
///
/// Ten. Every program in the catalogue prescribes within it — 5/3/1's Boring
/// But Big sets of ten are the ceiling exactly, and its AMRAP top sets are
/// where estimates will actually come from. Beyond ten, Epley is describing
/// muscular endurance and reporting it as a single.
pub const ESTIMATE_REP_CEILING: u32 = 10;

/// The one-rep max a set implies, or `None` when it implies nothing.
///
/// `None` for zero reps, for no weight, and for anything above
/// [`ESTIMATE_REP_CEILING`] — see the module documentation for why each of
/// those is an absence rather than a number.
pub fn estimate(weight: f64, reps: u32) -> Option<f64> {
    if reps == 0 || reps > ESTIMATE_REP_CEILING || weight <= 0.0 {
        return None;
    }

    Some(weight * (1.0 + f64::from(reps) / 30.0))
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && cargo test -p athletos-training estimate`
Expected: PASS, all five.

- [ ] **Step 5: Gates and commit**

```bash
cd backend && cargo fmt --all --check && cargo clippy --workspace --all-targets -- -D warnings
git add backend/crates/training/src/estimate.rs backend/crates/training/src/lib.rs
git commit -m "training: what a set implies about a single"
```

---

### Task 2: `progress.rs` — the shapes and the pure parts

**Files:**
- Create: `backend/crates/api/src/routes/progress.rs`
- Modify: `backend/crates/api/src/routes/mod.rs` (declare the module)
- Test: inline `#[cfg(test)] mod tests` in `progress.rs`

**Interfaces:**
- Consumes: `athletos_training::estimate` from Task 1.
- Produces: `Indicator`, `LiftTrend`, `TrendPoint`, `Best`, `SessionFigures`, `ProgramTotals`, `ProgressView`, and the pure helpers `indicators_from(totals: &Totals) -> Vec<Indicator>` and `median(values: &mut [i64]) -> Option<i64>`. Task 3 fills these from queries.

- [ ] **Step 1: Write the failing tests**

Create `backend/crates/api/src/routes/progress.rs` with the module doc and tests only:

```rust
//! Where a year of training went (D-13, amended).
//!
//! One endpoint, everything derived. There is no table behind this: the
//! estimate is computed from stored sets, load and drift are sums over the
//! same rows, and the training max comes from `readout()` applied to the
//! `state_before` that [`crate::advances`] already records — because
//! `readout()` is a pure function of state, and storing its output as well
//! would materialise a fact another table implies.
//!
//! # Indicators are a shape, not a store
//!
//! Every figure that renders as a card travels as `{ key, label, value, unit }`
//! so the client has one card component and a new metric touches no client
//! code. `unit` is a semantic tag rather than a display string; formatting
//! lives at the UI edge, as D-04 requires of every weight in this system.
//!
//! An indicator with nothing to say is **omitted**, never sent as zero. A
//! median session duration across no sessions is not zero minutes, and the
//! card should be absent rather than wrong — the same rule `timing` follows in
//! omitting itself rather than serving an empty breakdown.

#[cfg(test)]
mod tests {
    use super::*;

    fn totals() -> Totals {
        Totals {
            sessions: 4,
            load_moved_kg: 20_000.0,
            sets_over: 6,
            sets_under: 1,
            durations: vec![3_600, 3_300, 4_200],
            intervals: vec![120, 180, 90],
        }
    }

    #[test]
    fn every_indicator_carries_a_unit_the_client_can_format() {
        let indicators = indicators_from(&totals());

        assert!(indicators
            .iter()
            .all(|indicator| matches!(indicator.unit, Unit::Kg | Unit::Count | Unit::Seconds)));
    }

    #[test]
    fn an_indicator_with_nothing_to_say_is_absent_rather_than_zero() {
        // No sessions at all: there is no median duration, and a card reading
        // "0:00" would be a claim about training that never happened.
        let empty = Totals {
            sessions: 0,
            load_moved_kg: 0.0,
            sets_over: 0,
            sets_under: 0,
            durations: Vec::new(),
            intervals: Vec::new(),
        };

        let keys: Vec<&str> = indicators_from(&empty)
            .iter()
            .map(|indicator| indicator.key.as_str())
            .collect();

        assert!(!keys.contains(&"median_duration"));
        assert!(!keys.contains(&"median_interval"));
    }

    #[test]
    fn the_shipped_set_is_present_when_there_is_data() {
        let keys: Vec<&str> = indicators_from(&totals())
            .iter()
            .map(|indicator| indicator.key.as_str())
            .collect();

        for expected in [
            "sessions",
            "load_moved",
            "sets_over",
            "sets_under",
            "median_duration",
            "median_interval",
        ] {
            assert!(keys.contains(&expected), "missing {expected}");
        }
    }

    #[test]
    fn the_median_takes_the_middle_pair_when_the_sample_is_even() {
        // Matching `pace::median`: an even sample has no single middle, and
        // taking either neighbour would make the figure depend on which side
        // of the list the tie fell.
        assert_eq!(median(&mut [60, 120]), Some(90));
        assert_eq!(median(&mut [90, 60, 120]), Some(90));
        assert_eq!(median(&mut []), None);
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && cargo test -p athletos-api progress`
Expected: FAIL — module not declared, none of the types exist.

- [ ] **Step 3: Implement the shapes and helpers**

Add `pub mod progress;` to `backend/crates/api/src/routes/mod.rs` beside the other route modules, then above the test module in `progress.rs`:

```rust
use chrono::{DateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

/// What a figure is measured in. A tag, not a display string — the client
/// decides whether 3600 seconds reads as "1:00" or "60 min" (D-04).
#[derive(Debug, Clone, Copy, Serialize, ToSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Unit {
    Kg,
    Count,
    Seconds,
}

/// One card. Every figure on the screen is one of these, so the client has one
/// component and a new metric touches no client code.
#[derive(Debug, Clone, Serialize, ToSchema, PartialEq)]
pub struct Indicator {
    #[schema(example = "load_moved")]
    pub key: String,
    #[schema(example = "Load moved")]
    pub label: String,
    pub value: f64,
    pub unit: Unit,
}

/// One session's contribution to a lift's trend.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct TrendPoint {
    pub workout_id: Uuid,
    pub at: DateTime<Utc>,
    /// The best estimate across that session's done sets of this lift. `None`
    /// when every set was skipped, or every set was above the rep ceiling.
    pub estimate: Option<f64>,
    /// What the program was prescribing from during that session. `None` for
    /// every session logged before `enrollment_advances` existed — the chart
    /// must draw a gap rather than a zero.
    pub training_max: Option<f64>,
    /// Signed: positive is heavier than prescribed, negative lighter. Summed
    /// over that session's done sets of this lift, against the same sets'
    /// prescriptions, so it is weight drift uncontaminated by work not done.
    pub drift_kg: f64,
    pub sets_over: u32,
    pub sets_under: u32,
    /// Every reason the athlete gave on this lift that session. Travels on
    /// every point; the screen renders them only on downward moves, and that
    /// test is presentation rather than a fact about training.
    pub reasons: Vec<String>,
}

/// One cell of the rep-max grid: the heaviest weight lifted for **at least**
/// `reps` reps, and the set it came from.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct Best {
    /// The bucket, not the reps performed.
    pub reps: u32,
    pub weight: f64,
    /// What was actually done at that weight — always at least `reps`.
    pub actual_reps: u32,
    pub at: DateTime<Utc>,
    pub workout_id: Uuid,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct LiftTrend {
    #[schema(example = "squat")]
    pub exercise: String,
    #[schema(example = "Squat")]
    pub label: String,
    pub points: Vec<TrendPoint>,
    pub bests: Vec<Best>,
}

/// One session, for the load panel and the drift band.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct SessionFigures {
    pub workout_id: Uuid,
    pub enrollment_id: Uuid,
    pub at: DateTime<Utc>,
    pub load_moved_kg: f64,
    pub load_prescribed_kg: f64,
    pub sets_over: u32,
    pub sets_under: u32,
    pub duration_seconds: Option<i64>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ProgramTotals {
    pub enrollment_id: Uuid,
    #[schema(example = "wendler-531-bbb")]
    pub program_key: String,
    #[schema(example = "5/3/1 Boring But Big")]
    pub program_name: String,
    #[schema(example = "active")]
    pub status: String,
    pub indicators: Vec<Indicator>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ProgressView {
    pub lifts: Vec<LiftTrend>,
    pub sessions: Vec<SessionFigures>,
    pub programs: Vec<ProgramTotals>,
    pub overall: Vec<Indicator>,
}

/// What an indicator set is built from. Not serialised — this is the
/// accumulator, and `indicators_from` is the only thing that reads it.
#[derive(Debug, Default, Clone)]
pub struct Totals {
    pub sessions: u32,
    pub load_moved_kg: f64,
    pub sets_over: u32,
    pub sets_under: u32,
    /// One per session that has both stamps.
    pub durations: Vec<i64>,
    /// Every believable gap between two answered sets, across every session.
    pub intervals: Vec<i64>,
}

fn indicator(key: &str, label: &str, value: f64, unit: Unit) -> Indicator {
    Indicator {
        key: key.to_owned(),
        label: label.to_owned(),
        value,
        unit,
    }
}

/// The shipped set of cards, in the order they are offered.
///
/// A server-side constant rather than a contract the screen depends on:
/// adding one here makes a card appear, removing one makes it vanish, and the
/// client never learns what any particular metric means (D-11).
pub fn indicators_from(totals: &Totals) -> Vec<Indicator> {
    let mut indicators = vec![
        indicator("sessions", "Sessions", f64::from(totals.sessions), Unit::Count),
        indicator("load_moved", "Load moved", totals.load_moved_kg, Unit::Kg),
        indicator("sets_over", "Sets over", f64::from(totals.sets_over), Unit::Count),
        indicator("sets_under", "Sets under", f64::from(totals.sets_under), Unit::Count),
    ];

    // Omitted rather than zeroed: a median across nothing is not a number, and
    // an absent card is the honest way to say so.
    let mut durations = totals.durations.clone();
    if let Some(seconds) = median(&mut durations) {
        indicators.push(indicator(
            "median_duration",
            "Typical session",
            seconds as f64,
            Unit::Seconds,
        ));
    }

    let mut intervals = totals.intervals.clone();
    if let Some(seconds) = median(&mut intervals) {
        indicators.push(indicator(
            "median_interval",
            "Typical gap between sets",
            seconds as f64,
            Unit::Seconds,
        ));
    }

    indicators
}

/// Median, sorting in place. `None` for an empty sample.
///
/// Median rather than mean throughout this module, for the reason `pace` gives:
/// the tail of these distributions is not signal. An even sample takes the
/// mean of the middle pair, matching `pace::median`, so the figure does not
/// depend on which side of the list a tie fell.
pub fn median(values: &mut [i64]) -> Option<i64> {
    if values.is_empty() {
        return None;
    }

    values.sort_unstable();
    let middle = values.len() / 2;

    Some(if values.len() % 2 == 1 {
        values[middle]
    } else {
        (values[middle - 1] + values[middle]) / 2
    })
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && cargo test -p athletos-api progress`
Expected: PASS, all four.

- [ ] **Step 5: Gates and commit**

```bash
cd backend && cargo fmt --all --check && cargo clippy --workspace --all-targets -- -D warnings
git add backend/crates/api/src/routes/progress.rs backend/crates/api/src/routes/mod.rs
git commit -m "progress: one card shape, and the medians behind it"
```

---

### Task 3: The handler

**Files:**
- Modify: `backend/crates/api/src/routes/progress.rs` (the handler and its queries)
- Modify: `backend/crates/api/src/lib.rs` (route registration)
- Modify: `backend/crates/api/src/openapi.rs` (schema components and the path)
- Modify: `backend/openapi.json` (regenerated)
- Test: `backend/crates/api/tests/training.rs`

**Interfaces:**
- Consumes: everything from Tasks 1 and 2; `crate::timing` for interval extraction; `athletos_training::programs::find` and `Program::readout` for the training max.
- Produces: `GET /v1/progress`.

- [ ] **Step 1: Write the failing integration tests**

Append to `backend/crates/api/tests/training.rs`, using the file's existing helpers (`server`, `register`, `set_maxes`, `full_maxes`, `enrol`, `next_session`, `logged_as_prescribed`, `log_a_session`, `log_a_session_lasting`):

```rust
async fn progress(server: &TestServer, token: &str) -> serde_json::Value {
    server
        .get("/v1/progress")
        .authorization_bearer(token)
        .await
        .json()
}

#[sqlx::test]
async fn progress_is_empty_for_an_athlete_who_has_logged_nothing(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;

    let view = progress(&server, &token).await;

    assert_eq!(view["lifts"].as_array().unwrap().len(), 0);
    assert_eq!(view["sessions"].as_array().unwrap().len(), 0);
    assert_eq!(view["programs"].as_array().unwrap().len(), 0);
    // No sessions means no median to report — the card is absent, not zero.
    let overall: Vec<String> = view["overall"]
        .as_array()
        .unwrap()
        .iter()
        .map(|indicator| indicator["key"].as_str().unwrap().to_owned())
        .collect();
    assert!(!overall.contains(&"median_duration".to_owned()));
}

#[sqlx::test]
async fn a_logged_session_produces_a_trend_point_with_a_training_max(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    log_a_session(&server, &token, enrollment).await;

    let view = progress(&server, &token).await;

    let lifts = view["lifts"].as_array().unwrap();
    assert!(!lifts.is_empty(), "one session should produce one lift");

    let point = &lifts[0]["points"][0];
    // Logged exactly as prescribed, so the estimate exists and drift is zero.
    assert!(point["estimate"].as_f64().is_some());
    assert_eq!(point["drift_kg"].as_f64(), Some(0.0));
    assert_eq!(point["sets_over"].as_u64(), Some(0));
    // The training max comes from readout(state_before), which this session
    // recorded — so it is present rather than a gap.
    assert!(point["training_max"].as_f64().is_some());
}

#[sqlx::test]
async fn a_best_is_the_heaviest_weight_for_at_least_that_many_reps(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    // One set taken well past its prescription, so there is an unambiguous
    // best: heavier than anything else that day, at five reps.
    let mut body = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);
    body["sets"][0]["actual_weight"] = json!(200.0);
    body["sets"][0]["actual_reps"] = json!(5);

    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::CREATED);

    let view = progress(&server, &token).await;
    let bests = view["lifts"][0]["bests"].as_array().unwrap();

    let at_three = bests
        .iter()
        .find(|best| best["reps"].as_u64() == Some(3))
        .expect("a 3-rep bucket");
    let at_five = bests
        .iter()
        .find(|best| best["reps"].as_u64() == Some(5))
        .expect("a 5-rep bucket");

    // Five reps at 200 proves three reps at 200: "at least", not "exactly".
    assert_eq!(at_three["weight"].as_f64(), Some(200.0));
    assert_eq!(at_five["weight"].as_f64(), Some(200.0));
    assert_eq!(at_five["actual_reps"].as_u64(), Some(5));
}

#[sqlx::test]
async fn drift_is_signed_and_counted_per_direction(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    let mut body = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);
    let first = body["sets"][0]["prescribed_weight"].as_f64().unwrap();
    body["sets"][0]["actual_weight"] = json!(first + 5.0);

    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::CREATED);

    let view = progress(&server, &token).await;
    let point = &view["lifts"][0]["points"][0];

    assert_eq!(point["drift_kg"].as_f64(), Some(5.0));
    assert_eq!(point["sets_over"].as_u64(), Some(1));
    assert_eq!(point["sets_under"].as_u64(), Some(0));
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && DATABASE_URL=postgres://postgres:athletos@127.0.0.1:5433/athletos cargo test -p athletos-api --test training progress`
Expected: FAIL — 404, the route does not exist.

- [ ] **Step 3: Write the handler**

> **This step is specified at the level of queries and assembly rather than as
> code, and that is a weakness in this plan rather than a style choice.** Tasks
> 1 and 2 give you exact code because I could verify it; the handler is five
> queries against a schema whose exact column types and join shapes I would be
> guessing at, and a plausible-looking SQL block I could not run would be worse
> than an honest specification. Expect more latitude here than elsewhere, and
> **ask if any of the five is ambiguous** — that is cheaper than building the
> wrong thing. Whoever reviews this task should know it carries design
> decisions the others did not.

Append to `backend/crates/api/src/routes/progress.rs`. Build it from these queries, all scoped to the authenticated athlete and all inside the twelve-month window:

1. **Sessions** — `workouts` joined to `enrollments` on `athlete_id`, `started_at >= now() - interval '12 months'`, newest last. Gives `SessionFigures` minus the sums.
2. **Sets** — `workout_sets` joined to those workouts, ordered by `workout_id, "position"`. One pass over this yields, per workout and per exercise: the best estimate (via `athletos_training::estimate` over done sets), signed drift, over/under counts, and the collected `drift_reason` values. The same pass yields per-session load moved and prescribed.
3. **Training maxes** — `enrollment_advances` for those workouts. For each, `programs::find(program_key)` then `program.readout(&State::from_json(state_before))`, and take the `Readout` whose `exercise` matches the lift. A workout with no advance row contributes `None` — a gap, never a zero.
4. **Bests** — for each exercise the athlete has done and each bucket in `[1, 2, 3, 5, 8, 10]`, the heaviest `actual_weight` over `status = 'done'` and `actual_reps >= bucket`, with the workout and reps it came from. `order by actual_weight desc, logged_at asc limit 1` per bucket, or one query with `distinct on`. **Exclude sets whose `actual_weight` is zero** — a bodyweight lift's record is reps, not kilograms, and six cells all reading zero would be worse than no grid.
5. **Intervals** — reuse `crate::timing`. Do not write a second interval walk; that module owns the discard-rather-than-clamp rule and its ceiling.

Assemble `ProgressView`. Exercise labels come from `athletos_training::exercise::find`, falling back to the key — the same fallback `routes::workouts` already uses for a program name, so a lift removed from the registry does not erase the athlete's history.

Write the handler with the `#[utoipa::path]` attribute in the same shape as `routes::workouts::history` (`workouts.rs:832`), `operation_id = "athlete_progress"`, tag `progress`, responses 200 and 401.

- [ ] **Step 4: Register the route**

In `backend/crates/api/src/lib.rs`, beside the other authenticated routes:

```rust
        // Read-only, and derived: no table stands behind this (D-13, amended).
        .route("/v1/progress", get(routes::progress::show))
```

- [ ] **Step 5: Register the schemas**

`backend/crates/api/src/openapi.rs` lists every component explicitly. Add `Indicator`, `Unit`, `TrendPoint`, `Best`, `LiftTrend`, `SessionFigures`, `ProgramTotals` and `ProgressView`, and add the handler to the `paths(...)` list. A referenced-but-unregistered component generates as `unknown` on the TypeScript side.

- [ ] **Step 6: Run to verify it passes**

Run: `cd backend && DATABASE_URL=postgres://postgres:athletos@127.0.0.1:5433/athletos cargo test -p athletos-api --test training progress`
Expected: PASS, all four.

- [ ] **Step 7: Regenerate the contract**

```bash
cd backend && cargo run --bin openapi > openapi.json
```

Then check it additively. **`npx oasdiff` is not a real package** — CI installs the Go binary via `install.sh` (`.github/workflows/ci.yml:119-132`). If you have the Go binary, run it with `--fail-on ERR` as CI does; if not, say so in your report rather than claiming a check you did not run. A new endpoint is additive by construction, so the risk here is low.

- [ ] **Step 8: Full suite, gates, commit**

```bash
cd backend
DATABASE_URL=postgres://postgres:athletos@127.0.0.1:5433/athletos cargo test --workspace
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
git add backend/crates/api/src/routes/progress.rs backend/crates/api/src/lib.rs \
        backend/crates/api/src/openapi.rs backend/crates/api/tests/training.rs \
        backend/openapi.json
git commit -m "progress: a year of training, derived"
```

---

### Task 4: The amendments

**Files:**
- Modify: `docs/DESIGN.md` (D-13, and D-11's e1RM aside)
- Modify: `CONTEXT.md` (the Training and athlete's-numbers vocabulary)

A decision in `docs/DESIGN.md` is binding until amended there. D-13 currently ends *"Three things, and no dashboard"*, and this branch builds the endpoint behind a dashboard.

- [ ] **Step 1: Read the voice**

Read D-13, then two existing amendment blocks — D-04's and D-10's. Note that they name what they reverse, quote it, and record what the change costs.

- [ ] **Step 2: Amend D-13**

The amendment must:

- **Name the reversal.** Quote *"Three things, and no dashboard"*. Argue the distinction rather than waving at it: what D-13 refused was a grid of whatever happens to be countable, on the screen the athlete opens. This endpoint serves a screen navigated to on purpose, carrying exactly D-13's three things — e1RM trend, drift, session duration — plus a table of bests it did not ask for.
- **Record that D-13's own rule survived contact**: progress is never shown without its cost, and the drift band shares the trend's axis rather than sitting a tap away. A rule about not showing progress without its cost is kept by layout or not at all.
- **Address D-13's other sentence**, because this walks into it: *"The reference writes a `lift_records` table that nothing reads back."* The bests grid is the same idea and the opposite construction — nothing is written, the numbers are a query over sets already stored, and it exists because a screen renders it.
- **Record what it costs.** Every figure is recomputed on every request; the derivation is the definition, and there is no record of what a number was once believed to be. Adding a metric is a deploy rather than a row.
- **Record the no-celebration rule and attribute it.** Asked directly, the athlete said *no celebratory stuff, just the facts and data*. A rule with a person behind it survives a redesign; one derived from principles gets re-derived the other way by the next reader who wants a badge.

- [ ] **Step 3: Correct D-11's aside**

D-11 lists "e1RM formulas" among the TypeScript a future Expo client would share, contradicting the same decision's *"All business logic and authorization live in Rust."* Record that the rule wins and the example was written before the formula existed.

- [ ] **Step 4: Amend `CONTEXT.md`**

Add to the athlete's-numbers section:

```markdown
**Estimate**:
The one-rep max a set that was actually performed implies. Evidence of
capability, computed rather than entered. Distinct from the Entered 1RM, which
the athlete owns and types, and which never appears on the progress screen.
_Avoid_: Estimated 1RM, e1RM in prose
```

And to the Training section:

```markdown
**Load**:
Kilograms moved: sets times reps times weight, over work actually done.

**Best**:
The heaviest weight lifted for at least a given number of reps. An observed
fact, never an estimate.
_Avoid_: PR, personal best, rep max
```

The avoidances are not arbitrary — `CONTEXT.md` already rules out *PR* and *personal best* under **Entered 1RM** and flags *Max* as ambiguous, so the three obvious names were spoken for before the feature existed.

- [ ] **Step 5: Commit**

```bash
git add docs/DESIGN.md CONTEXT.md
git commit -m "The dashboard D-13 refused, and the one it did not"
```

---

## Verification before calling it done

- [ ] `cd backend && DATABASE_URL=... cargo test --workspace` — green.
- [ ] `cargo fmt --all --check` and `cargo clippy --workspace --all-targets -- -D warnings` — both silent.
- [ ] `backend/openapi.json` regenerated and committed; `GET /v1/progress` present in it.
- [ ] No migration was written, and `git diff --stat` shows no file under `migrations/`.
- [ ] `curl` the endpoint against the development database with a real token and paste the response into the report — a shape that type-checks is not a shape that is right.
