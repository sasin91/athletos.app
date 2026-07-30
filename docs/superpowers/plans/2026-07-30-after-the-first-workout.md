# After the First Workout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the five changes asked for after the first real session was logged — a light theme with a switch, per-set stamps visible while training, plate *changes* instead of plate breakdowns, an optional note per set, and a finish screen that says whether the record has landed.

**Architecture:** One new pure function in the training crate (`loading::plan`) does the only real domain work; it is exposed as an additive field on `PrescribedSet` and the client renders it without computing anything. One additive migration adds `workout_sets.note`. Everything else is frontend, and every screen change is local-first so `/session` keeps working with no network.

**Tech Stack:** Rust (axum, sqlx, utoipa), Postgres 17, SvelteKit 2.63 with Svelte 5 runes, Tailwind 4, DaisyUI 5, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-30-after-the-first-workout-design.md`. Read it before Task 1 — it carries the reasoning that the code comments cite.

## Global Constraints

- **The API is additive-only inside `/v1` (D-12).** Never remove a field, never change a type, never tighten validation on an existing field. New behaviour is a new optional field. CI runs `oasdiff` against the base branch and fails on a breaking diff.
- **Migrations must be backward-compatible with the previous release (D-17).** Two releases run against one database during a rolling deploy. Add columns; never drop one in the same deploy that stops using it.
- **No business logic in the frontend (D-11).** Rounding, plate arithmetic, drift and timing aggregation are computed in Rust and arrive in the response. If you find yourself working out a weight in TypeScript, stop.
- **The training crate depends on `serde`, `serde_json` and `thiserror` and nothing else (D-15).** No `utoipa`, no `sqlx`, no `axum`. API DTOs are mirrored in `crates/api`.
- **Svelte 5 runes only.** `$state`, `$derived`, `$props`, `$effect`. Never `export let`, never a legacy store.
- **`backend/openapi.json` is committed and must regenerate byte-identically.** Regenerate with `cargo run --bin openapi -- openapi.json` in `backend/`, then `npm run generate:api` in `frontend/`, in the same commit as any DTO change.
- **Vocabulary (CONTEXT.md).** The gap between two logged sets is an **interval**, never *rest*. There is no rest timer and nothing on any screen counts up toward one.
- **Weights are bare numbers with kg semantics.** No unit is written into any domain type.
- **Commit after every task.** Do not skip hooks.

**Commands:**

```
cd backend
cargo check --workspace --all-targets
cargo test  -p athletos-training       # pure, no database, milliseconds
cargo test  --workspace                # needs DATABASE_URL
cargo run   --bin openapi -- openapi.json
cargo fmt --all && cargo clippy --workspace --all-targets -- -D warnings

cd frontend
npm run check        # svelte-check, must be clean
npm run lint         # prettier --check && eslint
npm run test:unit    # vitest
npm run generate:api
```

---

### Task 1: `loading::plan` — the plate change

The only domain work in this plan. Pure, no database, and testable in milliseconds (D-15).

**Files:**
- Modify: `backend/crates/training/src/loading.rs`
- Modify: `backend/crates/training/src/lib.rs:63` (re-export)
- Test: `backend/crates/training/src/loading.rs` (the existing `mod tests`)

**Interfaces:**
- Consumes: `PLATES`, `BAR_WEIGHT`, `TOLERANCE`, `break_down` — all already in `loading.rs`.
- Produces:
  - `pub struct PlateChange { pub remove: Vec<f64>, pub add: Vec<f64>, pub plates_per_side: Vec<f64> }`
  - `pub fn plan(previous: &[f64], target_per_side: f64) -> PlateChange`
  - re-exported from the crate root as `athletos_training::PlateChange` / `plan`.

- [ ] **Step 1: Write the failing tests**

Add to the `mod tests` block at the bottom of `backend/crates/training/src/loading.rs`:

```rust
    /// Every loadable per-side weight, for sweeps. 1.25 kg is the smallest
    /// plate, so these are exactly the reachable arrangements.
    fn loadable_per_side() -> impl Iterator<Item = f64> {
        (0..=80).map(|step| f64::from(step) * 1.25)
    }

    fn holds(previous: &[f64], target: f64, change: &PlateChange) {
        // Applying the instructions must produce the stated arrangement.
        let kept = previous.len() - change.remove.len();
        let mut applied = previous[..kept].to_vec();
        applied.extend(change.add.iter().copied());
        assert_eq!(
            applied, change.plates_per_side,
            "{previous:?} -> {target}: instructions do not build the stated stack"
        );

        // The plates removed are the ones that were on there, outermost first.
        let mut expected_removed = previous[kept..].to_vec();
        expected_removed.reverse();
        assert_eq!(change.remove, expected_removed, "{previous:?} -> {target}");

        // It sums to the target, uses only real plates, and can be loaded.
        let sum: f64 = change.plates_per_side.iter().sum();
        assert!(
            (sum - target).abs() < TOLERANCE,
            "{previous:?} -> {target}: stack sums to {sum}"
        );
        for plate in &change.plates_per_side {
            assert!(PLATES.contains(plate), "{plate} is not a plate we have");
        }
        assert!(
            change
                .plates_per_side
                .windows(2)
                .all(|pair| pair[0] >= pair[1]),
            "{previous:?} -> {target}: {:?} cannot be loaded in that order",
            change.plates_per_side
        );
    }

    /// The case that prompted the whole thing. 85 kg is `25, 5, 2.5` a side
    /// and 100 kg is greedily `25, 15` — so the naive screen says strip two
    /// plates to add one, and the athlete puts a convenient pair on instead.
    #[test]
    fn adding_beats_restacking_when_they_cost_the_same() {
        let change = plan(&[25.0, 5.0, 2.5], 40.0);

        assert_eq!(change.remove, Vec::<f64>::new());
        assert_eq!(change.add, vec![2.5, 2.5, 2.5]);
        assert_eq!(change.plates_per_side, vec![25.0, 5.0, 2.5, 2.5, 2.5, 2.5]);
    }

    /// Cost leads and removals only break ties. With removals as the primary
    /// rule this keeps the 1.25, which caps everything added at 1.25 and asks
    /// for eleven of them.
    #[test]
    fn cost_leads_so_a_trapped_small_plate_comes_off() {
        let change = plan(&[25.0, 1.25], 40.0);

        assert_eq!(change.remove, vec![1.25]);
        assert_eq!(change.add, vec![15.0]);
        assert_eq!(change.plates_per_side, vec![25.0, 15.0]);
    }

    /// The 5/3/1 top single into Boring But Big. This drop genuinely is four
    /// plates off, and a planner that pretended otherwise would be lying.
    #[test]
    fn the_big_drop_is_reported_honestly() {
        // 147.5 kg -> 63.75 a side; 87.5 kg -> 33.75 a side.
        let change = plan(&[25.0, 20.0, 15.0, 2.5, 1.25], 33.75);

        assert_eq!(change.remove, vec![1.25, 2.5, 15.0, 20.0]);
        assert_eq!(change.add, vec![5.0, 2.5, 1.25]);
        assert_eq!(change.plates_per_side, vec![25.0, 5.0, 2.5, 1.25]);
    }

    #[test]
    fn an_unchanged_weight_is_a_no_op() {
        let change = plan(&[25.0, 15.0], 40.0);

        assert!(change.remove.is_empty());
        assert!(change.add.is_empty());
        assert_eq!(change.plates_per_side, vec![25.0, 15.0]);
    }

    /// From an empty bar there is nothing to keep, so the plan is the greedy
    /// breakdown and the screen simply says "add".
    #[test]
    fn an_empty_bar_plans_the_greedy_breakdown() {
        for target in loadable_per_side() {
            let change = plan(&[], target);

            assert!(change.remove.is_empty());
            assert_eq!(change.add, break_down(target));
            assert_eq!(change.plates_per_side, break_down(target));
        }
    }

    /// Never worse than stripping the bar and starting again, which is the
    /// baseline the display had before this existed.
    #[test]
    fn no_plan_costs_more_than_a_full_restack() {
        for from in loadable_per_side() {
            let previous = break_down(from);
            for to in loadable_per_side() {
                let change = plan(&previous, to);
                let cost = change.remove.len() + change.add.len();
                let restack = previous.len() + break_down(to).len();

                assert!(
                    cost <= restack,
                    "{from} -> {to}: {cost} plates handled beats {restack} how?"
                );
                holds(&previous, to, &change);
            }
        }
    }

    /// A tripwire for a regression to removals-first, which answers some
    /// targets with a fistful of the smallest plate — a bar at `25, 1.25`
    /// reaching 40 a side by adding eleven 1.25s.
    ///
    /// Deliberately loose. This is a consequence of cost leading rather than a
    /// structural property, and the assertion exists to catch the
    /// degeneration, not to pin the exact answer: 85 → 100 legitimately adds
    /// three of one plate.
    #[test]
    fn no_plan_asks_for_a_fistful_of_one_plate() {
        for from in loadable_per_side() {
            let previous = break_down(from);
            for to in loadable_per_side() {
                let change = plan(&previous, to);

                for plate in PLATES {
                    let count = change.add.iter().filter(|added| **added == plate).count();
                    assert!(
                        count <= 4,
                        "{from} -> {to} asks for {count} plates of {plate}: {:?}",
                        change.add
                    );
                }
            }
        }
    }

    /// The arrangement a plan leaves is the input to the next plan, so the
    /// invariants have to survive being chained rather than only holding
    /// against canonical breakdowns.
    #[test]
    fn the_invariants_survive_a_whole_session_chained() {
        // A 5/3/1 squat day: 65/75/85% of a 140 kg training max, then five
        // sets of Boring But Big at 50%. Per side, from a 20 kg bar.
        let day = [35.0, 42.5, 48.75, 25.0, 25.0, 25.0, 25.0, 25.0];

        let mut on_bar: Vec<f64> = Vec::new();
        for target in day {
            let change = plan(&on_bar, target);
            holds(&on_bar, target, &change);
            on_bar = change.plates_per_side;
        }
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && cargo test -p athletos-training loading`
Expected: FAIL — `cannot find function 'plan' in this scope`, `cannot find type 'PlateChange'`.

- [ ] **Step 3: Implement `fill`, and route `break_down` through it**

In `backend/crates/training/src/loading.rs`, replace the existing `break_down` function (currently at lines 118–130) with:

```rust
/// The plates for one side, greedy largest-first.
///
/// Greedy is exact here rather than merely good: every plate divides every
/// larger plate's contribution, so there is no weight the greedy walk can
/// overshoot and no case where a smaller plate first would use fewer. It is
/// also the order a human loads a bar, which matters more than optimality —
/// the list is read off in sequence at the rack.
fn break_down(per_side: f64) -> Vec<f64> {
    fill(per_side, f64::INFINITY).unwrap_or_default()
}

/// The same greedy walk, capped at `ceiling`.
///
/// The cap is what makes [`plan`] possible: a bar is a stack, so anything
/// added on top of retained plates must be no larger than the smallest one
/// still on there.
///
/// `None` when the remainder cannot be built exactly. That cannot happen for a
/// loadable weight — every plate is a multiple of 1.25 and 1.25 is always
/// under any ceiling that exists — but [`PLATES`] is a constant someone will
/// edit one day, and a silently short stack is a lie told to somebody loading
/// a bar.
fn fill(remainder: f64, ceiling: f64) -> Option<Vec<f64>> {
    let mut left = remainder;
    let mut plates = Vec::new();

    for plate in PLATES {
        if plate > ceiling + TOLERANCE {
            continue;
        }

        while left >= plate - TOLERANCE {
            plates.push(plate);
            left -= plate;
        }
    }

    (left.abs() < TOLERANCE).then_some(plates)
}
```

- [ ] **Step 4: Implement `PlateChange` and `plan`**

Append to `backend/crates/training/src/loading.rs`, after `fill` and before `mod tests`:

```rust
/// What comes off the bar and what goes on, per side, to get from the
/// arrangement currently loaded to the next prescribed weight (D-04).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PlateChange {
    /// Outermost first — the order they actually come off.
    pub remove: Vec<f64>,
    /// Largest first — the order they go on.
    pub add: Vec<f64>,
    /// What this leaves on the bar, largest first. Sums to the target, and is
    /// deliberately not always the greedy breakdown.
    pub plates_per_side: Vec<f64>,
}

/// Plans the change from the arrangement on the bar to `target_per_side`.
///
/// `previous` is one side as it currently stands, largest first; an empty
/// slice is an empty bar.
///
/// # Why a prefix
///
/// A bar is a **stack**. Plates load largest-first from the middle outward, so
/// only the outermost can be removed and nothing larger than the smallest
/// plate kept can go on — a 15 cannot be slid in under a 5. The plates that
/// may be retained are therefore exactly a prefix of `previous`, which leaves
/// `previous.len() + 1` candidates and makes the search exhaustive rather than
/// heuristic.
///
/// # The rule
///
/// Fewest plates handled; among equals, fewest removed.
///
/// The tie-break is the point. Going 85 kg to 100 kg, three candidates all
/// cost three plates handled, and fewest-removed picks the one that takes
/// nothing off — because taking weight off is the friction that makes an
/// athlete put a convenient pair on and lift more than was asked for, which is
/// the drift the product exists to govern (D-01, D-07).
///
/// Cost leads and removals only break ties, because fewest-removals alone
/// degenerates: a bar at `25, 1.25` targeting 40 keeps both plates, caps
/// everything added at 1.25, and asks for eleven of them.
pub fn plan(previous: &[f64], target_per_side: f64) -> PlateChange {
    // (plates handled, plates removed, what goes on)
    let mut best: Option<(usize, usize, Vec<f64>)> = None;

    for keep in (0..=previous.len()).rev() {
        let kept = &previous[..keep];
        let on_bar: f64 = kept.iter().sum();
        if on_bar > target_per_side + TOLERANCE {
            continue;
        }

        // No ceiling with an empty bar: the first plate on can be any of them.
        let ceiling = kept.last().copied().unwrap_or(f64::INFINITY);
        let Some(add) = fill(target_per_side - on_bar, ceiling) else {
            continue;
        };

        let removed = previous.len() - keep;
        let cost = removed + add.len();

        let better = match &best {
            None => true,
            Some((best_cost, best_removed, _)) => {
                cost < *best_cost || (cost == *best_cost && removed < *best_removed)
            }
        };

        if better {
            best = Some((cost, removed, add));
        }
    }

    // Stripping the bar and starting again always plans, for any target that
    // is loadable at all. The fallback is for a target that is not — it
    // degrades to the breakdown the display showed before this existed rather
    // than panicking on a number somebody's future program produced.
    let (_, removed, add) = best.unwrap_or_else(|| {
        let add = break_down(target_per_side);
        (previous.len() + add.len(), previous.len(), add)
    });

    let keep = previous.len() - removed;

    let mut remove = previous[keep..].to_vec();
    remove.reverse();

    let mut plates_per_side = previous[..keep].to_vec();
    plates_per_side.extend(add.iter().copied());

    PlateChange {
        remove,
        add,
        plates_per_side,
    }
}
```

- [ ] **Step 5: Re-export from the crate root**

In `backend/crates/training/src/lib.rs`, line 63, change:

```rust
pub use loading::{Load, Loading, BARBELL_RESOLUTION, BAR_WEIGHT, PLATES};
```

to:

```rust
pub use loading::{plan, Load, Loading, PlateChange, BARBELL_RESOLUTION, BAR_WEIGHT, PLATES};
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd backend && cargo test -p athletos-training`
Expected: PASS, including the pre-existing `loading` tests — `break_down` now routes through `fill` and must not have changed behaviour for any loadable weight.

- [ ] **Step 7: Lint**

Run: `cd backend && cargo fmt --all && cargo clippy --workspace --all-targets -- -D warnings`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add backend/crates/training/src/loading.rs backend/crates/training/src/lib.rs
git commit -m "$(cat <<'EOF'
loading: plan the change, not the breakdown

Going 85 to 100 kg, the greedy breakdowns are 25, 5, 2.5 and 25, 15 - so
read as instructions they say strip two plates to add one, and the
temptation is to put a convenient pair on and lift more than was asked
for. That is the drift the product exists to govern, manufactured by its
own display. There is more than one way to build 40 kg a side.

A bar is a stack: plates load largest first, only the outermost comes
off, and nothing larger than the smallest plate kept can go on. So the
plates that may be retained are exactly a prefix of what is loaded, which
leaves one candidate per prefix and makes the search exhaustive rather
than heuristic.

Fewest plates handled, and among equals fewest removed. The tie-break is
the point: taking weight off is the friction that was reported, so 85 to
100 answers "add 2.5, 2.5, 2.5" and leaves a six-plate stack. Cost leads
and removals only break ties, because fewest-removals alone degenerates -
a bar at 25, 1.25 targeting 40 keeps both, caps everything added at 1.25
and asks for eleven of them. That case is an assertion, not a comment.

break_down now routes through the capped walk rather than duplicating it.
EOF
)"
```

---

### Task 2: Carry the plate change to the client

**Files:**
- Modify: `backend/crates/api/src/routes/enrollments.rs:334-354` (the `PrescribedSet` DTO) and `:638-664` (`prescribed_sets_of`)
- Modify: `backend/openapi.json` (regenerated)
- Modify: `frontend/src/lib/api/schema.d.ts` (regenerated)
- Test: `backend/crates/api/tests/training.rs`

**Interfaces:**
- Consumes: `athletos_training::{plan, PlateChange, Loading, BAR_WEIGHT}` from Task 1; `exercise::find` and `Exercise::loading`, already in the registry.
- Produces: `PrescribedSet.plate_change: Option<PlateChangeView>` on the `GET /v1/enrollments/{id}/next-session` response. TypeScript sees `plate_change?: { remove: number[]; add: number[]; plates_per_side: number[] } | null`.

- [ ] **Step 1: Write the failing test**

Add to `backend/crates/api/tests/training.rs`, using the helpers already at the top of that file (`server`, `register`, `set_maxes`, `full_maxes`, `enrol`, `next_session`) and its `#[sqlx::test]` style. Responses are `serde_json::Value`, not typed structs.

```rust
/// Plates as loading instructions: chained within an exercise, reset between
/// them (D-04).
///
/// Asserted on the chaining rather than on which plates come out. The
/// arrangement is the training crate's business and is swept exhaustively
/// there; what this endpoint owns is *which bar* each set is planned against,
/// and that is the thing a handler gets wrong.
#[sqlx::test]
async fn the_plate_change_chains_within_an_exercise_and_resets_between_them(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    let plates = |value: &serde_json::Value| -> Vec<f64> {
        value
            .as_array()
            .expect("a plate list")
            .iter()
            .map(|plate| plate.as_f64().expect("a plate is a number"))
            .collect()
    };

    let mut previous_exercise = String::new();
    let mut on_bar: Vec<f64> = Vec::new();

    for set in session["prescribed_sets"]
        .as_array()
        .expect("the session carries its prescribed sets")
    {
        let change = &set["plate_change"];
        assert!(
            !change.is_null(),
            "set {} is a barbell set and should carry a plan",
            set["position"]
        );

        let remove = plates(&change["remove"]);
        let add = plates(&change["add"]);
        let resulting = plates(&change["plates_per_side"]);

        let exercise = set["exercise"].as_str().expect("a set names its exercise");

        // The bar starts empty for each exercise, so the first set of one has
        // nothing to take off.
        if exercise != previous_exercise {
            assert!(
                remove.is_empty(),
                "set {} opens {exercise} and should plan from an empty bar",
                set["position"]
            );
            on_bar.clear();
        }

        // The instructions apply to the bar as the previous set left it.
        let kept = on_bar.len() - remove.len();
        let mut applied = on_bar[..kept].to_vec();
        applied.extend(add.iter().copied());
        assert_eq!(applied, resulting, "set {}", set["position"]);

        // And they build the weight that was prescribed.
        let prescribed = set["prescribed_weight"].as_f64().expect("a weight");
        let from_plates = resulting.iter().sum::<f64>() * 2.0 + 20.0;
        assert!(
            (from_plates - prescribed).abs() < 1e-9,
            "set {} builds {from_plates} kg, not {prescribed}",
            set["position"]
        );

        previous_exercise = exercise.to_owned();
        on_bar = resulting;
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && cargo test --workspace the_plate_change_chains`
Expected: FAIL — no field `plate_change` on `PrescribedSet`. (Needs `DATABASE_URL`; see `docs/DEVELOPMENT.md`.)

- [ ] **Step 3: Add the mirrored DTO**

In `backend/crates/api/src/routes/enrollments.rs`, beside the other view types:

```rust
/// What comes off the bar and what goes on, to get to this set's weight
/// (D-04).
///
/// Mirrored from [`athletos_training::PlateChange`] because the training crate
/// depends on `serde`, `serde_json` and `thiserror` and nothing else (D-15),
/// so it cannot carry a `ToSchema` of its own.
#[derive(Debug, Serialize, ToSchema)]
pub struct PlateChangeView {
    /// Per side, outermost first — the order they actually come off.
    #[schema(example = json!([1.25, 2.5]))]
    pub remove: Vec<f64>,
    /// Per side, largest first — the order they go on.
    #[schema(example = json!([15.0]))]
    pub add: Vec<f64>,
    /// What this leaves on the bar, largest first. Sums to
    /// `prescribed_weight`, and is deliberately not always the greedy
    /// breakdown that `plates_per_side` carries.
    #[schema(example = json!([25.0, 15.0]))]
    pub plates_per_side: Vec<f64>,
}

impl From<athletos_training::PlateChange> for PlateChangeView {
    fn from(change: athletos_training::PlateChange) -> Self {
        Self {
            remove: change.remove,
            add: change.add,
            plates_per_side: change.plates_per_side,
        }
    }
}
```

Register `PlateChangeView` in the OpenAPI component list in `backend/crates/api/src/openapi.rs` alongside the other schemas.

- [ ] **Step 4: Add the field to `PrescribedSet`**

In `backend/crates/api/src/routes/enrollments.rs`, after `plates_per_side` (line 353):

```rust
    /// The change from the bar as the previous set of this exercise left it
    /// (D-04).
    ///
    /// `None` for anything not loaded with plates. Additive (D-12):
    /// `plates_per_side` above is untouched and stays the canonical greedy
    /// breakdown, so `LiftView` and any client already reading it are
    /// unaffected.
    ///
    /// Chained within an exercise and **reset to an empty bar between them** —
    /// across exercises the previous stack is not on the bar being walked to,
    /// and possibly not even the same bar.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plate_change: Option<PlateChangeView>,
```

- [ ] **Step 5: Chain it in `prescribed_sets_of`**

Replace `backend/crates/api/src/routes/enrollments.rs:638-664` with:

```rust
fn prescribed_sets_of(session: &Session) -> Vec<PrescribedSet> {
    let mut sets = Vec::new();
    let mut position = 0u16;

    for block in &session.blocks {
        let known = exercise::find(&block.exercise);
        let label = known
            .map(|found| found.label.to_owned())
            .unwrap_or_else(|| block.exercise.clone());
        let barbell = matches!(known.map(|found| found.loading), Some(Loading::Barbell));

        // The bar starts empty for every exercise (D-04). An unresolvable key
        // is not a barbell as far as this is concerned: without the registry
        // there is no loading model, and inventing one would put plate
        // instructions on a dumbbell.
        let mut on_bar: Vec<f64> = Vec::new();

        for lift in &block.lifts {
            for _ in 0..lift.sets {
                let plate_change = barbell.then(|| {
                    let target = (lift.load.weight - BAR_WEIGHT) / 2.0;
                    let change = training::plan(&on_bar, target.max(0.0));
                    on_bar = change.plates_per_side.clone();
                    PlateChangeView::from(change)
                });

                sets.push(PrescribedSet {
                    position,
                    exercise: block.exercise.clone(),
                    label: label.clone(),
                    prescribed_weight: lift.load.weight,
                    prescribed_reps: lift.reps,
                    amrap: lift.amrap,
                    plates_per_side: lift.load.plates_per_side.clone(),
                    plate_change,
                });
                position = position.saturating_add(1);
            }
        }
    }

    sets
}
```

Import what this needs at the top of the file: `athletos_training::{self as training, Loading, BAR_WEIGHT}` — match the file's existing import style for the training crate rather than introducing a second alias for it.

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd backend && cargo test --workspace`
Expected: PASS, whole suite.

- [ ] **Step 7: Regenerate the contract**

```bash
cd backend && cargo run --bin openapi -- openapi.json
cd ../frontend && npm run generate:api
```

Expected: `backend/openapi.json` gains `PlateChangeView` and the optional `plate_change` on `PrescribedSet`; `frontend/src/lib/api/schema.d.ts` follows. No existing field is removed or retyped — check the diff and confirm it before committing, because this is the property `oasdiff` will fail the build on.

- [ ] **Step 8: Lint and commit**

```bash
cd backend && cargo fmt --all && cargo clippy --workspace --all-targets -- -D warnings
git add backend/crates/api/src/routes/enrollments.rs backend/crates/api/src/openapi.rs \
        backend/crates/api/tests/training.rs backend/openapi.json frontend/src/lib/api/schema.d.ts
git commit -m "$(cat <<'EOF'
session: send the plate change, chained within an exercise

Each prescribed set now carries what comes off the bar and what goes on
to reach it, planned against the arrangement the previous set of the same
exercise left there. Additive (D-12): plates_per_side is untouched and
stays the canonical greedy breakdown, so LiftView and anything already
reading it are unaffected.

Reset to an empty bar between exercises. Across them the previous stack
is not on the bar being walked to and possibly not even the same bar, so
chaining through would be instructions for someone else's rack.

An exercise the registry cannot resolve is not treated as a barbell.
Without the registry there is no loading model, and guessing one puts
plate instructions on a dumbbell.

The test asserts which bar each set is planned against rather than which
plates come out - the arrangement is the training crate's business and is
swept exhaustively there; what this handler owns is the chaining.
EOF
)"
```

---

### Task 3: An optional note on a set

**Files:**
- Create: `backend/crates/api/migrations/20260730120000_set_notes.sql`
- Modify: `backend/crates/api/src/routes/workouts.rs` — `SubmittedSet` (~line 177), `LoggedSetView` (~line 292), the detail query (~line 720), the bulk insert (~line 893-940)
- Modify: `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` (regenerated)
- Test: `backend/crates/api/tests/training.rs`

**Interfaces:**
- Produces: `SubmittedSet.note: Option<String>` accepted on `POST /v1/workouts`; `LoggedSetView.note: Option<String>` returned by `GET /v1/workouts/{id}`. TypeScript sees `note?: string | null`.

- [ ] **Step 1: Write the migration**

Create `backend/crates/api/migrations/20260730120000_set_notes.sql`:

```sql
-- An optional note on one set.
--
-- Additive, nullable, no default (D-12, D-17). A rolling update runs two
-- releases against one database by design, so the previous release must keep
-- submitting valid workouts through this column's arrival — it does, because
-- nothing about it is required.
--
-- Where the athlete says "left shoulder felt off on this one" or "belt on from
-- here". The session already has a `workouts.notes` for the whole thing; this
-- is the one that can name a set, which is the only place a sentence about a
-- twinge is any use later.
--
-- Bounded in the schema as well as in the handler. The check is what is still
-- true after the next client is written, and 500 characters is a note rather
-- than a training diary — the product does not want to become one.
alter table workout_sets
    add column note text
        check (note is null or length(trim(note)) between 1 and 500);
```

The empty-string case is excluded by the check rather than allowed and ignored: a note the athlete cleared is `null`, and the handler normalises it there (Step 4).

- [ ] **Step 2: Write the failing test**

Add to `backend/crates/api/tests/training.rs`, using its existing helpers and `logged_as_prescribed` to build the body:

```rust
/// A note rides along with its set and comes back on the history detail.
#[sqlx::test]
async fn a_set_carries_an_optional_note(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    let id = Uuid::now_v7();
    let mut body = logged_as_prescribed(id, enrollment, &session);
    body["sets"][0]["note"] = json!("left shoulder felt off");
    // Blank is not a note. It normalises to null rather than being refused —
    // a note typed and then cleared is not an error.
    body["sets"][1]["note"] = json!("   ");

    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::CREATED);

    let detail = server
        .get(&format!("/v1/workouts/{id}"))
        .authorization_bearer(&token)
        .await
        .json::<serde_json::Value>();

    assert_eq!(detail["sets"][0]["note"], json!("left shoulder felt off"));
    assert_eq!(detail["sets"][1]["note"], json!(null));
    assert_eq!(detail["sets"][2]["note"], json!(null));
}

/// Over the cap is a 422 naming the position, like every other set-level
/// complaint on this endpoint. Not a truncation: silently storing something
/// other than what was written is worse than refusing it.
#[sqlx::test]
async fn a_note_over_the_cap_is_refused(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    let mut body = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);
    body["sets"][0]["note"] = json!("x".repeat(501));

    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::UNPROCESSABLE_ENTITY);
}
```

Confirm the history detail path against the routes in `crates/api/src/routes/mod.rs` before writing the `get` — use whatever `GET /v1/workouts/{id}` is actually registered as.

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && cargo test --workspace note`
Expected: FAIL — no field `note`.

- [ ] **Step 4: Accept the note**

In `backend/crates/api/src/routes/workouts.rs`, add to `SubmittedSet` after `logged_at`:

```rust
    /// What the athlete wrote about this set, if anything (D-07).
    ///
    /// Optional and additively so (D-12). Blank and whitespace-only strings
    /// normalise to `None` rather than being refused — a note that was typed
    /// and then cleared is not an error, and the athlete is holding a phone
    /// with chalk on their hands.
    ///
    /// Over 500 characters is a 422 naming the position. Truncating would
    /// store something other than what was written, which is worse than
    /// refusing it.
    #[serde(default)]
    pub note: Option<String>,
```

Add to `LoggedSetView` after `logged_at`:

```rust
    /// What the athlete wrote about this set. Null for every set logged
    /// before notes existed, and for every set they had nothing to say about.
    pub note: Option<String>,
```

- [ ] **Step 5: Validate, bind and select**

In `fn validate(body: &WorkoutSubmission) -> ApiResult<()>` (`workouts.rs:951`), inside the existing per-set loop that already rejects a duplicated position and an out-of-range one, add:

```rust
        // Normalised before it is measured, so 500 characters of text with a
        // trailing newline is a note and not a rejection.
        if set
            .note
            .as_deref()
            .map(str::trim)
            .is_some_and(|note| note.chars().count() > NOTE_LIMIT)
        {
            return Err(ApiError::Validation(format!(
                "the note on position {} is longer than {NOTE_LIMIT} characters",
                set.position
            )));
        }
```

`ApiError::Validation` maps to `422 Unprocessable Entity` (`crates/api/src/error.rs:111`), which is what the test asserts.

Add, near the top of the file with the other constants:

```rust
/// Long enough for "left shoulder felt off, dropped the last rep", short
/// enough that this does not become a training diary. Enforced here and in the
/// schema — the constraint is what is still true after the next client.
const NOTE_LIMIT: usize = 500;
```

Note that `length(trim(note))` in Postgres counts characters, so `chars().count()` is the matching measure — `String::len()` counts bytes and would refuse a 400-character note written with any accented characters.

In the bind loop (line ~893), collect the normalised notes beside the existing `logged_ats`:

```rust
    let mut notes: Vec<Option<String>> = Vec::with_capacity(sets.len());
```

```rust
        // Normalised here rather than refused in `validate`: the check
        // constraint forbids a blank note, and a note the athlete typed and
        // then cleared should cost them nothing.
        notes.push(
            set.note
                .as_deref()
                .map(str::trim)
                .filter(|note| !note.is_empty())
                .map(str::to_owned),
        );
```

Bind it as `$10::text[]` after `logged_ats`, and add `note` to both the column list and the `unnest` alias (lines ~913-928):

```rust
        "insert into workout_sets
             (workout_id, exercise, \"position\", prescribed_weight, prescribed_reps,
              actual_weight, actual_reps, status, logged_at, note)
         select $1,
                ...
                logged.logged_at,
                logged.note
         from unnest($2::text[], $3::int2[], $4::float8[], $5::int2[],
                     $6::float8[], $7::int2[], $8::text[], $9::timestamptz[],
                     $10::text[])
              as logged(exercise, slot, prescribed_weight, prescribed_reps,
                        actual_weight, actual_reps, status, logged_at, note)",
```

Add `note` to the detail select at line ~720 and to the `LoggedSetView` construction at ~746.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd backend && cargo test --workspace`
Expected: PASS, whole suite.

- [ ] **Step 7: Regenerate the contract and commit**

```bash
cd backend && cargo run --bin openapi -- openapi.json && cargo fmt --all
cargo clippy --workspace --all-targets -- -D warnings
cd ../frontend && npm run generate:api
git add backend/crates/api/migrations backend/crates/api/src/routes/workouts.rs \
        backend/crates/api/tests/training.rs backend/openapi.json frontend/src/lib/api/schema.d.ts
git commit -m "$(cat <<'EOF'
workouts: a set can carry a note

The session already had notes for the whole thing. This is the one that
can name a set, which is the only place a sentence about a twinge is any
use later - "left shoulder felt off on this one" attached to the third
set of five is a fact about that set, and attached to the session is a
fact about nothing.

Additive and nullable, bounded in the schema as well as the handler
(D-12, D-17). Blank and whitespace-only normalise to null rather than
being refused: a note typed and then cleared is not an error, and the
athlete is holding a phone with chalk on their hands. Over the cap is a
422 naming the position - truncating would store something other than
what was written, which is worse than refusing it.

Measured in characters rather than bytes, matching Postgres's length(),
or a 400-character note with any accented letter in it would be refused.
EOF
)"
```

---

### Task 4: Solarized light, and the switch

**Files:**
- Modify: `frontend/src/routes/layout.css`
- Modify: `frontend/src/app.html`
- Create: `frontend/src/lib/ThemeToggle.svelte`
- Modify: `frontend/src/routes/(app)/+layout.svelte:50-55` (the header)
- Modify: `frontend/src/routes/session/+page.svelte:139-145` (the logger header)
- Modify: `frontend/src/lib/Plates.svelte:69` (the plate border)

**Interfaces:**
- Produces: `data-theme` on `<html>` is `'athletos'` or `'solarized'`; the choice persists in `localStorage` under `athletos:theme`. `ThemeToggle.svelte` takes no props.

- [ ] **Step 1: Add the light theme**

In `frontend/src/routes/layout.css`, after the `athletos` theme block (line 68), add:

```css
/*
 * The same room in daylight.
 *
 * Solarized's light ramp, because the request was for Solarized specifically
 * and its base3/base01 pairing is the part that earns its reputation — a warm
 * surface that does not glare, and body text that is not maximum contrast.
 *
 * Chassis is unchanged: same radii, same borders, same flat depth. This is a
 * change of surface, not a second design. `base-300` is a darker beige rather
 * than Solarized's base1 (#93a1a1), which is a cool grey and reads as a
 * different family when it is a border on base3.
 */
@plugin 'daisyui/theme' {
	name: 'solarized';
	default: false;
	prefersdark: false;
	color-scheme: light;

	--color-base-100: #fdf6e3; /* base3 */
	--color-base-200: #eee8d5; /* base2 */
	--color-base-300: #d9d2bf;
	--color-base-content: #586e75; /* base01 */

	--color-primary: #586e75;
	--color-primary-content: #fdf6e3;

	--color-secondary: #eee8d5;
	--color-secondary-content: #586e75;
	--color-accent: #657b83; /* base00 */
	--color-accent-content: #fdf6e3;
	--color-neutral: #eee8d5;
	--color-neutral-content: #586e75;

	/* Drift keeps its meaning across both themes: over is orange and never
	   red, because going heavier is a choice and not an error (D-07). */
	--color-info: #268bd2;
	--color-info-content: #fdf6e3;
	--color-success: #859900;
	--color-success-content: #fdf6e3;
	--color-warning: #cb4b16;
	--color-warning-content: #fdf6e3;
	--color-error: #dc322f;
	--color-error-content: #fdf6e3;

	--radius-selector: 1rem;
	--radius-field: 0.75rem;
	--radius-box: 1rem;

	--size-selector: 0.28125rem;
	--size-field: 0.28125rem;
	--border: 1px;
	--depth: 0;
	--noise: 0;

	/*
	 * The plates are re-tokenised, and this is a requirement rather than
	 * polish. The 5 kg plate is #e8eaed and the 1.25 is #9aa5ab; on #fdf6e3
	 * the first is invisible and the second is close to it. The plate stack is
	 * the one place this product spends colour and the one thing that has to
	 * be read at a glance while loading a bar, so the two pale plates darken
	 * enough to hold against base3 while staying recognisably white plate and
	 * chrome. The five saturated IWF colours are unchanged — they were chosen
	 * to be read across a gym floor and they still are.
	 */
	--color-plate-5: #b9b4a3;
	--color-plate-1-25: #7d8a90;
	--color-plate-edge: #586e75;
	--color-bar: #93a1a1;
}
```

In the `@theme` block (line 70-90), add the edge token so the dark theme has one too:

```css
	/* The outline that separates two adjacent plates of similar colour. Dark
	   on a dark surface; overridden in the light theme, where black would be
	   the heaviest line on the screen. */
	--color-plate-edge: rgb(0 0 0 / 0.3);
```

- [ ] **Step 2: Use the edge token in `Plates.svelte`**

In `frontend/src/lib/Plates.svelte`, line 69, change:

```svelte
					class="w-[18px] rounded-[3px] border border-black/30"
					style="height: {heightOf(plate)}px; background: {colourOf(plate)}"
```

to:

```svelte
					class="w-[18px] rounded-[3px] border"
					style="height: {heightOf(plate)}px; background: {colourOf(plate)};
					       border-color: var(--color-plate-edge)"
```

- [ ] **Step 3: Stamp the theme before first paint**

In `frontend/src/app.html`, replace the `theme-color` meta line (line 8) and add the script immediately before `%sveltekit.head%`:

```html
		<meta name="theme-color" content="#121211" />
```

```html
		<script>
			// The only inline script in the app, and it earns its place: /session
			// is prerendered (D-11), so a cookie read in hooks.server.ts would run
			// at build time and bake one theme into the one screen that is used in
			// a gym. localStorage works identically on prerendered and
			// server-rendered pages, and running here means the athlete never sees
			// the other theme flash.
			(function () {
				var SURFACES = { athletos: '#121211', solarized: '#fdf6e3' };
				var theme = 'athletos';
				try {
					theme =
						localStorage.getItem('athletos:theme') ||
						(matchMedia('(prefers-color-scheme: light)').matches ? 'solarized' : 'athletos');
				} catch (error) {
					// Private mode, or storage disabled. The default is a working app.
				}
				if (!SURFACES[theme]) theme = 'athletos';
				document.documentElement.dataset.theme = theme;
				document.querySelector('meta[name="theme-color"]').content = SURFACES[theme];
			})();
		</script>
```

Note the existing `theme-color` was `#1d232a`, a DaisyUI default that matched neither theme. It does now.

- [ ] **Step 4: Write the toggle**

Create `frontend/src/lib/ThemeToggle.svelte`:

```svelte
<script lang="ts">
	/**
	 * Light or dark, and nothing else.
	 *
	 * Two states rather than three. The initial value is seeded from
	 * `prefers-color-scheme` by the script in `app.html` on first run and is an
	 * explicit choice from then on — an "auto" that changes the screen at sunset
	 * while the athlete is mid-session is a surprise, not a feature.
	 *
	 * The write is the whole of this component: the *read* happens before first
	 * paint in `app.html`, because a theme applied in a component runs after
	 * hydration and the athlete would watch the page change colour.
	 */
	const SURFACES = { athletos: '#121211', solarized: '#fdf6e3' } as const;
	type Theme = keyof typeof SURFACES;

	let theme = $state<Theme>('athletos');

	// Read back what app.html decided, after hydration. Runs before paint of
	// this component's own update, so the icon does not flicker.
	$effect.pre(() => {
		const stamped = document.documentElement.dataset.theme;
		if (stamped === 'athletos' || stamped === 'solarized') theme = stamped;
	});

	function toggle() {
		theme = theme === 'athletos' ? 'solarized' : 'athletos';

		document.documentElement.dataset.theme = theme;
		document.querySelector('meta[name="theme-color"]')?.setAttribute('content', SURFACES[theme]);

		try {
			localStorage.setItem('athletos:theme', theme);
		} catch (error) {
			// The theme still changed; it just will not survive a reload.
		}
	}
</script>

<button
	class="btn btn-ghost btn-sm"
	type="button"
	onclick={toggle}
	aria-label={theme === 'athletos' ? 'Switch to the light theme' : 'Switch to the dark theme'}
>
	{#if theme === 'athletos'}
		<!-- Sun: what tapping this gets you, not what you are in. A control
		     labelled with its current state is a control nobody can predict. -->
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="size-5">
			<circle cx="12" cy="12" r="4" />
			<path
				stroke-linecap="round"
				d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
			/>
		</svg>
	{:else}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="size-5">
			<path stroke-linecap="round" stroke-linejoin="round" d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
		</svg>
	{/if}
</button>
```

- [ ] **Step 5: Place it in both headers**

In `frontend/src/routes/(app)/+layout.svelte`, import `ThemeToggle from '$lib/ThemeToggle.svelte'` and put it in the header beside Sign out:

```svelte
	<header class="flex items-center justify-between gap-2 border-b p-3">
		<a href={resolve('/')} class="text-lg font-bold">AthletOS</a>
		<div class="flex items-center gap-1">
			<ThemeToggle />
			<form method="POST" action="/logout">
				<button class="btn btn-ghost btn-sm" type="submit">Sign out</button>
			</form>
		</div>
	</header>
```

In `frontend/src/routes/session/+page.svelte`, import it and add it to the logger header, after the projected finish:

```svelte
		<header class="sticky top-0 z-10 flex items-baseline gap-4 border-b bg-base-100 p-3">
			<span class="font-mono text-3xl tabular-nums">{formatElapsed(elapsed)}</span>
			<span class="text-lg">{remaining} left</span>
			{#if finish !== null}
				<span class="ml-auto text-sm opacity-70">~{formatClock(new Date(finish))}</span>
			{/if}
			<!--
				The logger has no nav of its own, and daylight at a rack is exactly
				when the switch is wanted. It is not a mid-set action, so the top of
				the screen is fine for it — unlike Log, which stays under a thumb.
			-->
			<span class="self-center" class:ml-auto={finish === null}><ThemeToggle /></span>
		</header>
```

- [ ] **Step 6: Verify**

Run: `cd frontend && npm run check && npm run lint && npm run test:unit`
Expected: all clean.

Then `npm run dev`, and by hand: toggle on the dashboard, reload — the theme survives with no flash. Check `/session` picks it up too (commit a session first, or visit it with an empty session — the header renders either way). Confirm the plate diagram is legible in the light theme; the 5 kg and 1.25 kg plates are the ones to look at.

If a Content-Security-Policy is configured in `svelte.config.js`, the inline script needs `'unsafe-inline'` or a hash in `script-src`. Check before assuming it works in the built app as well as in dev: `npm run build && npm run preview`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/routes/layout.css frontend/src/app.html frontend/src/lib/ThemeToggle.svelte \
        frontend/src/lib/Plates.svelte "frontend/src/routes/(app)/+layout.svelte" \
        frontend/src/routes/session/+page.svelte
git commit -m "$(cat <<'EOF'
The same room in daylight

A Solarized light theme and a switch. Chassis unchanged - same radii,
same borders, same flat depth, same drift colours meaning the same
things. Over is still orange and never red.

The plates are re-tokenised for the light surface, and that is a
requirement rather than polish: the 5 kg plate is #e8eaed and on #fdf6e3
it is invisible. The plate stack is the one place this product spends
colour and the one thing read at a glance while loading a bar, so the two
pale plates darken enough to hold against base3 while staying
recognisably white plate and chrome. The five IWF colours are untouched.

Persisted in localStorage and stamped by an inline script before first
paint. Not a cookie: /session is prerendered, so a cookie read in
hooks.server.ts runs at build time and bakes one theme into the one
screen that is used in a gym.

The toggle shows the theme it will give you rather than the one you are
in - a control labelled with its current state is one nobody can predict.
It sits in both headers, because the logger has no nav and daylight at a
rack is exactly when the switch is wanted.

theme-color was #1d232a, a DaisyUI default matching neither theme. It now
tracks the real surface.
EOF
)"
```

---

### Task 5: Per-set stamps in the logger

**Files:**
- Modify: `frontend/src/lib/time.ts`
- Modify: `frontend/src/lib/session.ts`
- Test: `frontend/src/lib/time.test.ts`, `frontend/src/lib/session.test.ts`
- Modify: `frontend/src/routes/session/+page.svelte` (the logged-set branch, lines ~272-285)

**Interfaces:**
- Consumes: `LocalSession`, `LocalSet` from `$lib/session`.
- Produces:
  - `INTERVAL_CEILING_SECONDS: number` and `intervalBetween(earlier: string, later: string): number | null` in `$lib/time`
  - `intervalBefore(session: LocalSession, position: number): number | null` in `$lib/session`

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/lib/time.test.ts`:

```ts
describe('intervalBetween', () => {
	it('is the gap in seconds', () => {
		expect(intervalBetween('2026-07-30T10:00:00.000Z', '2026-07-30T10:03:10.000Z')).toBe(190);
	});

	// The phone's clock is not trusted (D-10). It can be corrected by NTP or
	// changed by hand mid-session, and a genuine three-minute gap is
	// indistinguishable from one straddling a three-minute correction.
	it('does not believe a negative gap', () => {
		expect(intervalBetween('2026-07-30T10:03:00.000Z', '2026-07-30T10:00:00.000Z')).toBeNull();
	});

	it('does not believe a gap over the ceiling', () => {
		const later = new Date(Date.parse('2026-07-30T10:00:00.000Z') + 1_201_000).toISOString();
		expect(intervalBetween('2026-07-30T10:00:00.000Z', later)).toBeNull();
	});

	it('believes a gap exactly at the ceiling', () => {
		const later = new Date(Date.parse('2026-07-30T10:00:00.000Z') + 1_200_000).toISOString();
		expect(intervalBetween('2026-07-30T10:00:00.000Z', later)).toBe(INTERVAL_CEILING_SECONDS);
	});

	it('is null for an unparseable stamp', () => {
		expect(intervalBetween('not a time', '2026-07-30T10:00:00.000Z')).toBeNull();
	});
});
```

Add to `frontend/src/lib/session.test.ts` (use the file's existing fixture builder for a `LocalSession`; read it first):

```ts
describe('intervalBefore', () => {
	it('measures the first set from the commit, which is the lead-in', () => {
		let session = fixture({ startedAt: '2026-07-30T10:00:00.000Z' });
		session = logSet(session, 0, '2026-07-30T10:06:20.000Z');

		expect(intervalBefore(session, 0)).toBe(380);
	});

	it('measures a later set from the previous one that was answered', () => {
		let session = fixture({ startedAt: '2026-07-30T10:00:00.000Z' });
		session = logSet(session, 0, '2026-07-30T10:06:00.000Z');
		session = skipSet(session, 1, '2026-07-30T10:07:00.000Z');
		session = logSet(session, 2, '2026-07-30T10:10:00.000Z');

		// From the skip, not from the log before it: a skip is a tap at a moment
		// in time and the gap that spans it belongs to what came after.
		expect(intervalBefore(session, 2)).toBe(180);
	});

	it('is null for a set that has not been answered', () => {
		const session = fixture({ startedAt: '2026-07-30T10:00:00.000Z' });
		expect(intervalBefore(session, 0)).toBeNull();
	});

	it('is null when the gap is one the product does not believe', () => {
		let session = fixture({ startedAt: '2026-07-30T10:00:00.000Z' });
		session = logSet(session, 0, '2026-07-30T11:30:00.000Z');

		expect(intervalBefore(session, 0)).toBeNull();
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm run test:unit`
Expected: FAIL — `intervalBetween is not defined`, `intervalBefore is not defined`.

- [ ] **Step 3: Implement `intervalBetween`**

Append to `frontend/src/lib/time.ts`:

```ts
/**
 * Intervals longer than this are not believed (D-10).
 *
 * The phone's clock can be corrected by NTP or changed by hand mid-session,
 * and a genuine three-minute gap is indistinguishable from one straddling a
 * three-minute correction. Such intervals are **discarded rather than
 * clamped** — clamping folds a bad measurement in at an invented value with no
 * way to see it happened.
 *
 * The authority is `backend/crates/api/src/timing.rs`, which holds the same
 * number as `INTERVAL_CEILING` and does the aggregation for the history page.
 * It is duplicated here knowingly, because the logger draws intervals with no
 * network and cannot fetch it, and it is tested so it cannot drift silently.
 */
export const INTERVAL_CEILING_SECONDS = 20 * 60;

/**
 * The gap between two stamps in whole seconds, or `null` for one this product
 * does not believe.
 *
 * `null` rather than a number the caller has to know to distrust: a figure on
 * the screen is a claim, and the alternative to a claim is silence.
 */
export function intervalBetween(earlier: string, later: string): number | null {
	const from = Date.parse(earlier);
	const to = Date.parse(later);
	if (Number.isNaN(from) || Number.isNaN(to)) return null;

	const seconds = Math.round((to - from) / 1000);
	if (seconds < 0 || seconds > INTERVAL_CEILING_SECONDS) return null;

	return seconds;
}
```

- [ ] **Step 4: Implement `intervalBefore`**

Append to `frontend/src/lib/session.ts`, importing `intervalBetween` from `./time`:

```ts
/**
 * The interval that ended when this set was answered (D-10).
 *
 * Measured from the previous **answered** set — logged or skipped, since both
 * are a tap at a moment in time — or from the commit for the first one, which
 * makes that figure the lead-in exactly as `timing.rs` treats it.
 *
 * `null` when the set has not been answered, or when the gap is one the
 * product does not believe. Deliberately blended and deliberately not called
 * rest: there is one tap per set, so the number contains the pause after the
 * previous set, the loading, and the performance of this one.
 */
export function intervalBefore(session: LocalSession, position: number): number | null {
	const set = session.sets.find((candidate) => candidate.position === position);
	if (!set?.loggedAt) return null;

	const previous = session.sets
		.filter((candidate) => candidate.position < position && candidate.loggedAt !== null)
		.sort((a, b) => a.position - b.position)
		.at(-1);

	return intervalBetween(previous?.loggedAt ?? session.startedAt, set.loggedAt);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd frontend && npm run test:unit`
Expected: PASS.

- [ ] **Step 6: Show it in the logger**

In `frontend/src/routes/session/+page.svelte`, import `intervalBefore` and `formatClock`/`formatElapsed` (the latter two are already imported), and replace the answered-set branch (lines ~272-285):

```svelte
							{:else}
								{@const interval = intervalBefore(session, set.position)}
								<div class="flex grow items-baseline gap-2 self-center">
									<span class="text-sm">
										{set.status === 'done'
											? `Logged ${set.actualWeight} kg × ${set.actualReps}`
											: 'Skipped'}
									</span>
									<!--
										When, and how long the gap before it was. Both describe work
										already done and both stop changing the moment they appear —
										which is the line between this and a rest timer. Nothing on
										this screen counts up toward the set being rested for (D-10).
									-->
									<span class="ml-auto text-xs tabular opacity-50">
										{formatClock(new Date(set.loggedAt!))}
										{#if interval !== null}
											· +{formatElapsed(interval * 1000)}
										{/if}
									</span>
								</div>
								<button
									class="btn btn-ghost"
									type="button"
									onclick={() => apply((s) => resetSet(s, set.position))}
								>
									Undo
								</button>
							{/if}
```

`set.loggedAt` is non-null in this branch by construction, but prefer a `{#if set.loggedAt}` guard over the `!` assertion if `npm run check` complains.

- [ ] **Step 7: Verify and commit**

Run: `cd frontend && npm run check && npm run lint && npm run test:unit`
Expected: clean.

```bash
git add frontend/src/lib/time.ts frontend/src/lib/time.test.ts frontend/src/lib/session.ts \
        frontend/src/lib/session.test.ts frontend/src/routes/session/+page.svelte
git commit -m "$(cat <<'EOF'
session: the stamps were already there, now they are visible

Per-set logged_at has existed since the timing work; it could only be
seen on the history page, hours later. Each answered set now shows the
clock time it was answered at and the interval that ended there, measured
from the previous answered set - or from the commit for the first, which
makes that figure the lead-in exactly as timing.rs treats it.

Nothing appears on the set being rested for and no figure counts up.
That is the line between this and a rest timer, which was tried in the
predecessor and removed for adding stress. Every number on the screen
describes work already done and stops changing the moment it appears.

The ceiling above which a gap is not believed is duplicated from
timing.rs, knowingly: the logger draws with no network and cannot fetch
it. It is a named constant pointing at its authority, and it is tested,
so it cannot drift in silence.
EOF
)"
```

---

### Task 6: The plate change on the screen

**Files:**
- Modify: `frontend/src/lib/session.ts` (`LocalSet`, `commitSession`, `plateChangeFor`)
- Test: `frontend/src/lib/session.test.ts`
- Modify: `frontend/src/routes/session/+page.svelte` (the current-set block, lines ~178-180)

**Not** the peek page. It walks `session.blocks[].lifts[]`, which is aggregated (`5 × 10 @ 87.5 kg`) and has no per-set sequence to chain a bar through. A plate change is an instruction for the set in front of you and belongs only where sets are performed one at a time.

**Interfaces:**
- Consumes: `plate_change` on `PrescribedSet` from Task 2, via the generated schema.
- Produces: `LocalSet.plateChange: PlateChange | null`; `plateChangeFor(session, position): PlateChange | null` exported from `$lib/session`, where `PlateChange = Schemas['PlateChangeView']`.

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/lib/session.test.ts`:

```ts
describe('plateChangeFor', () => {
	it('is the planned change for an untouched set', () => {
		const session = fixture();
		expect(plateChangeFor(session, 0)).toEqual(session.sets[0].plateChange);
	});

	it('is null once this set has been edited, because the plan is for another weight', () => {
		const session = editSet(fixture(), 0, { weight: 105 });
		expect(plateChangeFor(session, 0)).toBeNull();
	});

	// The plan assumes the previous set was loaded as written, so going heavier
	// on set one invalidates every later plan in that exercise, not just the
	// next one. Instructions for a bar that is not in front of you are worse
	// than no instructions.
	it('is null when an earlier set of the same exercise went heavier', () => {
		let session = fixture();
		session = editSet(session, 0, { weight: 105 });
		session = logSet(session, 0, '2026-07-30T10:06:00.000Z');

		expect(plateChangeFor(session, 1)).toBeNull();
		expect(plateChangeFor(session, 2)).toBeNull();
	});

	// A skipped set means the bar was never loaded to that weight, so the chain
	// is broken in exactly the same way.
	it('is null when an earlier set of the same exercise was skipped', () => {
		const session = skipSet(fixture(), 0, '2026-07-30T10:06:00.000Z');
		expect(plateChangeFor(session, 1)).toBeNull();
	});

	it('is unaffected by what happened in a different exercise', () => {
		// The fixture's sets 0-2 are one exercise and 3+ are another; the bar
		// resets between them, so a mess in the first cannot stale the second.
		let session = fixture();
		session = editSet(session, 0, { weight: 105 });
		session = logSet(session, 0, '2026-07-30T10:06:00.000Z');

		expect(plateChangeFor(session, 3)).toEqual(session.sets[3].plateChange);
	});

	it('is null for a set with no plan, such as a dumbbell', () => {
		const session = fixture();
		session.sets[0].plateChange = null;
		expect(plateChangeFor(session, 0)).toBeNull();
	});
});
```

Extend the test fixture so it has at least two exercises and carries `plateChange` on each set.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm run test:unit`
Expected: FAIL — `plateChangeFor is not defined`.

- [ ] **Step 3: Carry it on the local set**

In `frontend/src/lib/session.ts`, add to the type exports:

```ts
export type PlateChange = Schemas['PlateChangeView'];
```

Add to `LocalSet` after `platesPerSide`:

```ts
	/**
	 * What comes off the bar and what goes on to reach this set, planned by the
	 * server against the previous set of the same exercise (D-04).
	 *
	 * `null` for anything not loaded with plates. Cached at commit like
	 * everything else here: the logger runs with no network and cannot ask for
	 * a plan later.
	 */
	plateChange: PlateChange | null;
```

In `commitSession`, add to the mapped set:

```ts
			plateChange: set.plate_change ?? null,
```

- [ ] **Step 4: Implement the staleness rule**

Append to `frontend/src/lib/session.ts`:

```ts
/**
 * The plate change to show for a set, or `null` when the plan has gone stale.
 *
 * A plan is computed from the prescription and therefore assumes the bar was
 * loaded as written. Three ways that stops being true, and this is all of
 * them:
 *
 *  * the athlete has **edited this set's** weight, so the plan is for a number
 *    they are not loading;
 *  * an **earlier set of the same exercise** was logged at a different weight,
 *    so the bar is not where the server assumed — and every plan after it in
 *    that exercise is stale, not only the next one;
 *  * an earlier set of the same exercise was **skipped**, so the bar was never
 *    loaded to that weight at all.
 *
 * A different exercise cannot stale this one: the plan resets to an empty bar
 * between exercises, server-side.
 *
 * All of it is equality between two numbers this module already holds. Nothing
 * here recomputes a plan — the client has no plate arithmetic and is not
 * getting any (D-11). Instructions for a bar that is not in front of you are
 * worse than no instructions.
 */
export function plateChangeFor(session: LocalSession, position: number): PlateChange | null {
	const set = session.sets.find((candidate) => candidate.position === position);
	if (!set?.plateChange) return null;

	if (set.actualWeight !== set.prescribedWeight) return null;

	const disturbed = session.sets.some(
		(candidate) =>
			candidate.exercise === set.exercise &&
			candidate.position < position &&
			(candidate.status === 'skipped' ||
				(candidate.status === 'done' && candidate.actualWeight !== candidate.prescribedWeight))
	);

	return disturbed ? null : set.plateChange;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd frontend && npm run test:unit`
Expected: PASS.

- [ ] **Step 6: Draw it**

In `frontend/src/routes/session/+page.svelte`, import `plateChangeFor`, and replace the `Plates` block in the current-set branch (lines ~178-180):

```svelte
								{@const change = plateChangeFor(session, set.position)}
								<div class="mt-1 mb-1">
									{#if change}
										<!--
											What to do to the bar, not what the bar should end up
											as. The greedy breakdown of two adjacent weights can
											share almost nothing, so read as instructions it says
											strip two plates to add one — and the temptation is to
											put a convenient pair on instead and lift more than was
											asked for (D-04).
										-->
										{#if change.remove.length > 0}
											<p class="text-sm">
												<span class="eyebrow">take off</span>
												<span class="tabular">{change.remove.join(', ')}</span>
											</p>
										{/if}
										{#if change.add.length > 0}
											<p class="text-sm">
												<span class="eyebrow">add</span>
												<span class="tabular">{change.add.join(', ')}</span>
											</p>
										{/if}
										{#if change.remove.length === 0 && change.add.length === 0 && change.plates_per_side.length > 0}
											<!-- Same weight as the last set. Saying nothing here
											     would read as a screen that failed to load. -->
											<p class="eyebrow">bar is already loaded</p>
										{/if}

										<Plates plates={change.plates_per_side} />
									{:else}
										<!--
											The plan assumed a bar that is not the one in front of
											them, so it is not shown as an instruction. The
											breakdown of the prescribed weight still is, dimmed and
											labelled, because it is true about the prescription even
											when it is not true about the bar.
										-->
										<div class="opacity-60">
											<Plates plates={set.platesPerSide} />
											<p class="text-xs">for the prescribed {set.prescribedWeight} kg</p>
										</div>
									{/if}
								</div>
```

- [ ] **Step 7: Verify and commit**

Run: `cd frontend && npm run check && npm run lint && npm run test:unit`
Expected: clean.

```bash
git add frontend/src/lib/session.ts frontend/src/lib/session.test.ts \
        frontend/src/routes/session/+page.svelte
git commit -m "$(cat <<'EOF'
session: tell the athlete what to change, not what to build

The logger now reads out what comes off the bar and what goes on, and
draws the arrangement the plan actually leaves rather than the canonical
one, so the picture and the instruction above it cannot disagree.

Shown only when it is true. A plan assumes the bar was loaded as written,
so editing this set's weight invalidates it - and going heavier on an
earlier set of the same exercise, or skipping one, invalidates every plan
after it in that exercise rather than only the next. All three fall back
to the prescribed weight's breakdown, dimmed and labelled, which is still
true about the prescription when it is no longer true about the bar.

Instructions for a bar that is not in front of you are worse than none.

Every check here is equality between two numbers the client already
holds. It still does no plate arithmetic and is not getting any.
EOF
)"
```

---

### Task 7: The note affordance

**Files:**
- Modify: `frontend/src/lib/session.ts` (`LocalSet.note`, `commitSession`, `noteSet`, `resetSet`, `toSubmission`)
- Test: `frontend/src/lib/session.test.ts`
- Modify: `frontend/src/routes/session/+page.svelte`
- Modify: `frontend/src/routes/(app)/history/[id]/+page.svelte`

**Interfaces:**
- Consumes: `note` on `SubmittedSet`/`LoggedSetView` from Task 3.
- Produces: `noteSet(session: LocalSession, position: number, note: string): LocalSession`.

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/lib/session.test.ts`:

```ts
describe('noteSet', () => {
	it('records what the athlete wrote', () => {
		const session = noteSet(fixture(), 0, 'left shoulder felt off');
		expect(session.sets[0].note).toBe('left shoulder felt off');
	});

	it('clears back to null rather than storing blank', () => {
		let session = noteSet(fixture(), 0, 'left shoulder felt off');
		session = noteSet(session, 0, '   ');
		expect(session.sets[0].note).toBeNull();
	});

	// Undoing a log takes back the numbers, not the sentence the athlete wrote
	// about their shoulder.
	it('survives an undo', () => {
		let session = noteSet(fixture(), 0, 'left shoulder felt off');
		session = logSet(session, 0, '2026-07-30T10:06:00.000Z');
		session = resetSet(session, 0);

		expect(session.sets[0].note).toBe('left shoulder felt off');
		expect(session.sets[0].status).toBe('pending');
	});

	it('travels with the submission', () => {
		const session = noteSet(fixture(), 0, 'left shoulder felt off');
		const body = toSubmission(session, { endedAt: '2026-07-30T11:00:00.000Z', cutReason: null });

		expect(body.sets[0].note).toBe('left shoulder felt off');
		expect(body.sets[1].note).toBeNull();
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm run test:unit`
Expected: FAIL — `noteSet is not defined`.

- [ ] **Step 3: Implement**

In `frontend/src/lib/session.ts`, add to `LocalSet`:

```ts
	/**
	 * What the athlete wrote about this set, or `null`.
	 *
	 * Where "left shoulder felt off" goes. Attached to the set rather than the
	 * session because attached to the session it is a fact about nothing.
	 */
	note: string | null;
```

Default it in `commitSession`:

```ts
			note: null,
```

Add beside `editSet`:

```ts
/**
 * Records a note on a set, or clears it.
 *
 * Blank normalises to `null` rather than being stored: a note typed and then
 * cleared is not a note, and the API would reject the empty string anyway.
 */
export function noteSet(session: LocalSession, position: number, note: string): LocalSession {
	const trimmed = note.trim();
	return replace(session, position, (set) => ({ ...set, note: trimmed.length > 0 ? trimmed : null }));
}
```

`resetSet` already spreads the set and overwrites only status, weights and `loggedAt`, so a note survives an undo with no change — add a line to its doc comment saying so, because it is deliberate rather than accidental:

```ts
/**
 * Undoes a log or a skip, back to the prescription as written.
 *
 * The note is deliberately left alone. Undoing a log takes back the numbers,
 * not the sentence the athlete wrote about their shoulder.
 */
```

Add to the mapped set in `toSubmission`:

```ts
			note: set.note
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm run test:unit`
Expected: PASS.

- [ ] **Step 5: The affordance**

In `frontend/src/routes/session/+page.svelte`, add state for which set has its note open:

```ts
	// Which set's note field is open. One at a time: the athlete is writing
	// about the set in front of them, and a screen of open textareas is a
	// screen where Log is harder to find.
	let noting = $state<number | null>(null);
```

and inside the card, after the weight/reps inputs and before the Log/Skip row:

```svelte
							<!--
								Invisible until wanted. Logging a set as prescribed stays one
								tap — honesty must never cost more than dishonesty (D-07), and
								a field that is always on screen is a field that asks to be
								filled in.
							-->
							{#if noting === set.position}
								<textarea
									class="textarea-bordered textarea w-full"
									rows="2"
									maxlength="500"
									placeholder="What happened on this set?"
									value={set.note ?? ''}
									oninput={(event) =>
										apply((s) => noteSet(s, set.position, event.currentTarget.value))}
								></textarea>
								<button
									class="btn btn-ghost btn-sm self-start"
									type="button"
									onclick={() => (noting = null)}
								>
									Done
								</button>
							{:else if set.note}
								<button
									class="text-left text-sm opacity-70"
									type="button"
									onclick={() => (noting = set.position)}
								>
									{set.note}
								</button>
							{:else}
								<button
									class="self-start text-sm opacity-50"
									type="button"
									onclick={() => (noting = set.position)}
								>
									Add note
								</button>
							{/if}
```

In `frontend/src/routes/(app)/history/[id]/+page.svelte`, render a note under its row inside the `<li>`:

```svelte
			{#if set.note}
				<p class="mt-1 w-full text-sm opacity-60">{set.note}</p>
			{/if}
```

The row is currently a `flex … justify-between`; wrap the existing two spans in a div or add `flex-wrap` so the note takes its own line rather than squeezing the numbers.

- [ ] **Step 6: Verify and commit**

Run: `cd frontend && npm run check && npm run lint && npm run test:unit`
Expected: clean.

```bash
git add frontend/src/lib/session.ts frontend/src/lib/session.test.ts \
        frontend/src/routes/session/+page.svelte "frontend/src/routes/(app)/history/[id]/+page.svelte"
git commit -m "$(cat <<'EOF'
session: room to say what happened on one set

An optional note per set, invisible until asked for. Logging a set as
prescribed is still one tap: honesty must never cost more than
dishonesty, and a textarea sitting open on every card is a field that
asks to be filled in.

One note open at a time. The athlete is writing about the set in front of
them, and a screen of open textareas is a screen where Log is harder to
find.

The note survives an undo. Taking back a log takes back the numbers, not
the sentence somebody wrote about their shoulder - and that is the case
where the note matters most, because a set undone and redone lighter is
exactly the set worth explaining.
EOF
)"
```

---

### Task 8: The finish screen

**Files:**
- Modify: `frontend/src/lib/session.ts` (`summarise`)
- Test: `frontend/src/lib/session.test.ts`
- Modify: `frontend/src/routes/session/+page.svelte` (`finishSession` and the `sent`/`queued`/`refused` branches, lines ~68-132)

**Interfaces:**
- Consumes: `LocalSession`, `Ending`.
- Produces: `SessionSummary` and `summarise(session: LocalSession, ending: Ending): SessionSummary`.

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/lib/session.test.ts`:

```ts
describe('summarise', () => {
	it('counts the session as it was left', () => {
		let session = fixture({ startedAt: '2026-07-30T10:00:00.000Z' });
		session = logSet(session, 0, '2026-07-30T10:06:00.000Z');
		session = logSet(session, 1, '2026-07-30T10:10:00.000Z');
		session = skipSet(session, 2, '2026-07-30T10:12:00.000Z');

		const summary = summarise(session, {
			endedAt: '2026-07-30T10:52:00.000Z',
			cutReason: 'out_of_time'
		});

		expect(summary.durationSeconds).toBe(3120);
		expect(summary.done).toBe(2);
		expect(summary.skipped).toBe(1);
		expect(summary.pending).toBe(session.sets.length - 3);
		expect(summary.total).toBe(session.sets.length);
		expect(summary.cutReason).toBe('out_of_time');
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm run test:unit`
Expected: FAIL — `summarise is not defined`.

- [ ] **Step 3: Implement**

Append to `frontend/src/lib/session.ts`:

```ts
/**
 * What the finish screen says, counted from the session that was just sent.
 *
 * Counting only. There is deliberately **no drift total and no timing
 * breakdown** here: the history page already marks drift per row and does not
 * total it, on the grounds that a total computed in a client is one the next
 * client has to compute again (D-07, D-11) — and D-13 puts drift beside the
 * e1RM trend on purpose, because progress is never shown without its cost. A
 * drift number invented here would be the first place in the product it
 * appears alone. The timing aggregation belongs to `timing.rs` for the same
 * reason, and both are one tap away.
 */
export type SessionSummary = {
	durationSeconds: number;
	done: number;
	skipped: number;
	pending: number;
	total: number;
	cutReason: CutReason | null;
};

export function summarise(session: LocalSession, ending: Ending): SessionSummary {
	const count = (status: SetStatus) =>
		session.sets.filter((set) => set.status === status).length;

	return {
		durationSeconds: Math.max(
			0,
			Math.round((Date.parse(ending.endedAt) - Date.parse(session.startedAt)) / 1000)
		),
		done: count('done'),
		skipped: count('skipped'),
		pending: count('pending'),
		total: session.sets.length,
		cutReason: ending.cutReason
	};
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Keep the summary through the submit**

In `frontend/src/routes/session/+page.svelte`, add state and change `finishSession` to fill it before the session is cleared:

```ts
	// Kept across the submit so the finish screen has something to show. The
	// session itself is cleared before the send is even attempted — it belongs
	// to the queue from that moment, and leaving it here would offer a "resume"
	// button for a workout already on its way.
	let summary = $state<SessionSummary | null>(null);
	let recordId = $state<string | null>(null);

	async function finishSession(cutReason: CutReason | null) {
		if (!session) return;

		const ending = { endedAt: new Date().toISOString(), cutReason };
		const body = toSubmission(session, ending);

		summary = summarise(session, ending);
		recordId = session.id;

		await clearActiveSession();
		const report = await submitSession(body);
		session = null;

		if (report.accepted.includes(body.id) || report.duplicate.includes(body.id)) {
			phase = 'sent';
		} else if (report.rejected.includes(body.id)) {
			phase = 'refused';
		} else {
			phase = 'queued';
		}
	}
```

- [ ] **Step 6: Draw the finish screen**

Replace the `sent`, `queued` and `refused` branches (lines ~109-132) with one block that shows the summary and differs only in its indicator. Add a `SessionSummaryCard` inline rather than a component — it is used once:

```svelte
	{:else if summary && (phase === 'sent' || phase === 'queued' || phase === 'refused')}
		<main class="space-y-4 p-4">
			<h1 class="text-xl font-bold">
				{summary.cutReason ? 'Session cut short' : 'Session complete'}
			</h1>

			<div class="flex items-baseline gap-4">
				<span class="font-mono text-4xl tabular-nums">
					{formatElapsed(summary.durationSeconds * 1000)}
				</span>
				<span class="text-lg">{summary.done}/{summary.total} sets</span>
			</div>

			{#if summary.skipped > 0 || summary.pending > 0}
				<p class="text-sm opacity-70">
					{#if summary.skipped > 0}{summary.skipped} skipped{/if}
					{#if summary.skipped > 0 && summary.pending > 0} · {/if}
					{#if summary.pending > 0}{summary.pending} not reached{/if}
				</p>
			{/if}

			<!--
				Whether the permanent record exists yet. The full picture — drift
				against the prescription, and where the hour went — is computed in
				Rust and lives on the history page, so this says plainly whether that
				page has anything to show rather than linking into a 404 (D-11).
			-->
			{#if phase === 'sent'}
				<p class="text-sm opacity-70">Recorded. The program has moved on.</p>
				<a class="btn w-full" href={resolve('/history/[id]', { id: recordId! })}>
					See where the hour went
				</a>
			{:else if phase === 'queued'}
				<p class="text-sm opacity-70">
					Saved on this device and not sent yet. It goes up the next time the app opens with a
					connection, and sending it twice is harmless.
				</p>
				<button class="btn w-full" type="button" disabled>
					The full breakdown needs a connection
				</button>
			{:else}
				<p class="alert alert-error text-sm" role="alert">
					The server would not take it. The session is still stored on this device and will not be
					retried on its own — nothing you did was lost.
				</p>
			{/if}

			<a class="btn w-full btn-lg btn-primary" href={resolve('/')}>Back to training</a>
		</main>
```

Keep the existing `loading` and `empty` branches. Delete the three old branches they replace. There is deliberately **no auto-redirect**: a screen that leaves while it is being read is a screen that was not shown.

Check the `resolve('/history/[id]', …)` call signature against how the rest of the codebase calls `resolve` with parameters — match it exactly; `$app/paths`'s `resolve` is typed against the real route table.

- [ ] **Step 7: Verify and commit**

Run: `cd frontend && npm run check && npm run lint && npm run test:unit`
Expected: clean.

```bash
git add frontend/src/lib/session.ts frontend/src/lib/session.test.ts \
        frontend/src/routes/session/+page.svelte
git commit -m "$(cat <<'EOF'
session: finish on something worth reading

The finish screen showed three lines and a button. It now shows the
session: how long it took, how much of it was done, what was skipped and
what was never reached - all counted from the submission the phone
already holds, so it looks the same with a signal and without one.

Then whether the record has landed, which is the part that makes handing
off safe. Recorded, and the link into the full breakdown is live; queued,
and the link says plainly that it needs a connection rather than leading
into a 404; refused, and it says nothing was lost.

No drift total and no timing breakdown here. The history page marks drift
per row and deliberately does not total it - a total computed in a client
is one the next client computes again - and D-13 puts drift beside the
e1RM trend because progress is never shown without its cost. A drift
number invented here would be the first place in the product it appears
alone.

No auto-redirect either. A screen that leaves while it is being read is a
screen that was not shown; the dashboard is one tap away and will still
be there.
EOF
)"
```

---

### Task 9: Record the decisions

The amendments are part of the work, not a follow-up. A decision in `DESIGN.md` is binding until it is amended there, and three of them are no longer accurate.

**Files:**
- Modify: `docs/DESIGN.md` (D-04, D-08, D-10)
- Modify: `CONTEXT.md` (the Training vocabulary)

- [ ] **Step 1: Amend D-04**

Under the *Rounding* section, after the existing plate-breakdown paragraph and its correction, add an amendment in the style already used in that file (a `> **Amended…**` block). It must record:

- that the logger no longer shows the greedy breakdown between sets of one exercise, but what comes off and what goes on;
- **why a prefix**: a bar is a stack, plates load largest-first, only the outermost comes off and nothing larger than the smallest plate kept can go on — so retained plates are a prefix and the search is exhaustive over `n + 1` candidates;
- the rule: fewest plates handled, tie-broken on fewest removed, with the 85 → 100 case (three candidates at equal cost; the tie-break answers *add 2.5, 2.5, 2.5* and leaves a six-plate stack);
- why cost leads: `25, 1.25` → 40 a side keeps both plates under a removals-first rule and asks for eleven 1.25s;
- that the resulting arrangement is deliberately not always the greedy one, and that `plates_per_side` on the wire is unchanged;
- that the chain resets between exercises, and that a plan is not shown once the bar has been disturbed;
- that the light theme re-tokenises the two pale plates, because the palette is part of this decision.

- [ ] **Step 2: Amend D-10**

Under *Where the hour went*, record that the per-set stamp is now shown in the logger as well as on the history page, that it appears only on sets already answered, and that **no figure on that screen counts up** — which is the constraint the rest-timer paragraph above it imposes. Record the duplicated `INTERVAL_CEILING_SECONDS` in `$lib/time.ts`, that `timing.rs` remains the authority, and why it cannot simply be fetched.

- [ ] **Step 3: Amend D-08**

Under *Session lifecycle*, record what the finish screen shows (duration, sets done/skipped/not reached, and a readiness indicator for the permanent record), that it does not redirect on its own, and that drift and timing are deliberately absent from it — with the D-13 reason.

- [ ] **Step 4: Add the vocabulary**

In `CONTEXT.md`, in the Training section, add:

```markdown
**Plate change**:
What comes off the bar and what goes on, per side, to get from the arrangement
currently loaded to the next prescribed weight. Retains a prefix of what is on
there, because plates load largest-first and only the outermost can come off.
Shown only when the bar is where the prescription assumed.
_Avoid_: Delta, diff, adjustment, swap

**Note**:
A sentence the athlete attached to one Set. Optional, and never asked for.
Distinct from the session-level notes field, which nothing writes to.
_Avoid_: Comment, log entry, remark
```

- [ ] **Step 5: Commit**

```bash
git add docs/DESIGN.md CONTEXT.md
git commit -m "$(cat <<'EOF'
Three decisions the last week's work moved

D-04 said the session screen shows the greedy breakdown. Between sets of
one exercise it now shows what comes off and what goes on, from an
arrangement chosen to handle the fewest plates and, at equal cost, to take
the fewest off. The physical reason is worth writing down: a bar is a
stack, so the plates that may be kept are a prefix and the search is
exhaustive rather than clever.

D-10 gains the per-set stamp in the logger, and the constraint that keeps
it from being the rest timer that decision already refused - every figure
describes work already done and stops changing when it appears.

D-08 gains the finish screen, including what it deliberately does not
show and why.

And two words for CONTEXT.md, since the product now has concepts it had
no names for.
EOF
)"
```

---

## Verification

After Task 9, the whole thing:

```bash
cd backend && cargo fmt --all --check && cargo clippy --workspace --all-targets -- -D warnings \
  && cargo test --workspace
cargo run --bin openapi -- openapi.json && git diff --exit-code openapi.json   # must be clean
cd ../frontend && npm run check && npm run lint && npm run test:unit && npm run build
```

The offline round-trip still cannot be verified here — it needs a browser, a phone in airplane mode and a human, and it is listed as open in `docs/DESIGN.md`. The queued branch of Task 8 is exactly that path, so it is worth doing by hand before this is trusted: commit a session, put the phone in airplane mode, log it, finish it, and confirm the finish screen says *saved on this device* rather than offering a dead link.
