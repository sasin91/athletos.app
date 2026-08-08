# Session adjustments and training-first dashboard

Design, 2026-08-08. This spec joins three independently shippable slices:
session logging corrections, enrollment-specific exercise adjustments, and the
training-first analytics dashboard. They share one principle: the prescription
shown to the athlete is the historical fact. Changes may affect pending work,
but never rewrite a committed session or a completed set.

The completion-report and progress backend already exist. This work extends
those contracts and builds the missing dashboard UI rather than introducing a
second analytics implementation.

---

## 1 · Session behavior

### Exact-weight carry within one run of sets

When the athlete edits the weight of a pending set, copy the exact edited
weight into later pending sets while both of these remain equal to the edited
set:

- `exercise`
- `prescribed_weight`

The carry stops at the first set whose exercise or prescribed weight differs.
For four barbell-row sets prescribed at 85 kg, editing the first to 100 kg
prefills the remaining three at 100 kg. A later set prescribed at 90 kg remains
90 kg.

Status does not change the run boundary. A done or skipped set is not rewritten,
but a later pending set in the same exercise/prescription run still receives
the edit. This preserves historical answers without making one skip reset the
bar for the set after it.

Only weight carries. Reps remain specific to one set. `prescribedWeight` is
never changed, so drift remains measured against the number originally shown.
Editing an answered set changes only that set and does not propagate.

This replaces the current delta-based rule. Applying a delta to every later set
of the same exercise is too broad: the athlete asked for repeated equal working
sets to stay equal, not for a correction on one intensity to alter a different
intensity or a backoff block.

### Optional reason, with a suggestion rather than a default

When the current set's actual weight differs from its prescription, reveal the
existing reason choices in this order:

1. too easy
2. too heavy
3. bar was loaded
4. felt off

Nothing is preselected. “Too easy” is the first suggestion, not an answer made
on the athlete's behalf. Logging remains one tap and a missing reason remains
valid.

A selected reason travels to the same pending sets that received the exact
weight. Returning a set to its prescribed weight, skipping it, or undoing it
clears the reason.

### Collapsed exercise cues

The current set renders cues inside native `<details>` with a summary such as
“Exercise cues”. It has no `open` attribute, so it starts collapsed. Native
semantics supply keyboard interaction and expanded/collapsed accessibility
state without client-side state.

Non-current set cards do not render cue controls. Moving to a new current set
creates a newly collapsed details element.

### A skipped set is an answer

The current root cause of the skip bug is `isComplete()`: it requires every set
to have status `done`. Consequently, any `skipped` set permanently leaves only
the “End session early” path.

A session is normally finishable when it has no `pending` sets. Both `done` and
`skipped` are answered states. “End session early” appears only while at least
one pending set remains. Skipped counts still travel in the submission and are
shown on the completion page.

The backend outcome remains `completed` when all sets were answered and no cut
reason was supplied, even if one or more answers were skips. A cut reason is
required only when pending sets remain.

---

## 2 · Completion statistics

The completion screen retains:

- wall-clock duration;
- done, skipped, and not-reached counts;
- load moved and load prescribed over done sets;
- sets above and below prescription;
- queued/refused/accepted state and the history link.

It adds two views of the completed work.

### Changed working weights

The backend groups done, drifted sets by exercise and by the exact
`(prescribed_weight, actual_weight)` pair. Each group is:

```text
WeightChange {
    exercise,
    label,
    prescribed_weight,
    actual_weight,
    sets
}
```

Groups appear in first-performance order. The client renders, for example:

```text
Barbell row  85 → 100 kg  (+15 kg) × 4 sets
```

An exercise with two actual working weights produces two honest rows rather
than one invented average. Sets performed as prescribed produce no row. Skipped
and pending sets never contribute.

### Between-set timing

The completion screen shows minimum, arithmetic average, and maximum seconds
between consecutive answered sets. The interval from session start to the first
answered set is a lead-in and is excluded. A skip is an answered set, so it
remains a boundary in the sequence.

The existing timing ceiling and discard-rather-than-clamp rule remain. The
discarded count travels beside the figures. If no answer-to-answer interval
survives, the timing block is absent.

The API retains the existing median field for additive compatibility but adds
`average_seconds`; this screen renders min/average/max. No total-time comparison
is introduced.

Duplicate submissions recompute and return the complete summary from stored
rows, including weight changes and timing.

---

## 3 · Enrollment-specific exercise adjustments

### Ownership and scope

An adjustment belongs to one enrollment, and therefore to one athlete running
one specific instance of a program. It does not affect another enrollment of
the same program.

Adjustments are whole percentages from `-50` through `50`. Missing exercises
mean `0`. Positive values boost the prescription; negative values reduce it.
The UI shows a non-blocking message when `abs(adjustment) > 30`:

> A large adjustment may mean your entered max needs updating.

The API continues to accept the value through the hard `±50` boundary.

### Persistence

Add a table keyed by `(enrollment_id, exercise)`:

```text
enrollment_exercise_adjustments
    enrollment_id       uuid references enrollments(id) on delete cascade
    exercise            text
    adjustment_percent  smallint check (-50 <= value and value <= 50)
```

Zero values are omitted from storage. The exercise key is validated against the
training catalogue before a row is written.

The authenticated contract is:

```text
GET /v1/enrollments/{id}/exercise-adjustments
PUT /v1/enrollments/{id}/exercise-adjustments

ExerciseAdjustments {
    enrollment_id,
    adjustments: { exercise_key: integer }
}
```

`PUT` is a full, idempotent replacement. An empty map clears every adjustment.
Another athlete's enrollment is a `404`. Unknown exercises, bodyweight
exercises, fractional values, and out-of-range values are `422`. Finished and
abandoned enrollments are readable but reject writes with `409 Conflict`.

Program metadata gains the weighted exercises that the program can prescribe,
including accessory exercises rather than only entered-max sources. The UI
lists this bounded set instead of the entire exercise catalogue. The backend
still validates every submitted key.

### Applying an adjustment

The program first generates its ordinary session. For each weighted lift with
an adjustment, the training layer computes:

```text
adjusted_target = generated_weight × (1 + adjustment_percent / 100)
```

It then rounds down through that exercise's existing loading model and rebuilds
the plate breakdown and within-exercise plate-change chain from the adjusted
loads. The generated, already-loadable weight is the multiplier's base. The
adjustment is applied exactly once.

Bodyweight exercises are unchanged. Program state, entered maxes, training
maxes, and progression arithmetic are unchanged.

The session preview contains the adjusted prescriptions. Committing a session
copies that preview into IndexedDB; later adjustment edits never mutate that
local snapshot. Only future, uncommitted previews see the new value. Workout
rows persist the adjusted prescription that the athlete actually saw.

Consequently:

- drift compares actual weight with the adjusted stored prescription;
- load prescribed uses the adjusted stored prescription;
- estimates use actual performed work;
- the chart's training-max line remains the program's underlying training max,
  not an adjustment or an adjusted prescription.

### Editing UI

An active enrollment's existing program screen gains an “Exercise adjustments”
section. Each weighted exercise has a compact signed whole-percent input and
reset-to-zero action. Saving replaces the entire map. The controls explain that
changes affect the next uncommitted session.

Finished and abandoned enrollments show their stored adjustments read-only so
historical context is not lost.

---

## 4 · Training-first dashboard

The existing authenticated Train page becomes the dashboard. Its mobile-first
order is:

1. active session resume action, when present;
2. active program and “What am I doing today?” action;
3. progress chart;
4. per-enrollment statistics;
5. overall statistics;
6. finished enrollments.

Training remains the first task. Analytics are visible without displacing the
thing the athlete opened the app to do.

### Chart

The chart shows one selected exercise over the existing 12-month progress
window. `?lift=<exercise>` holds the selection. An absent or invalid lift falls
back to the most recent lift with an estimate.

Three vertically aligned panels share the time axis:

1. estimated strength as a solid line and underlying training max as a dashed
   line, on one kilogram scale;
2. signed kilograms above or below prescription as a drift band;
3. kilograms moved per session as load bars on their own scale.

The summary beside the chart states the first-to-latest estimate change in
kilograms and percent. It is absent when fewer than two estimates exist.

A focused server-rendered SVG component draws the panels. It takes typed points
and owns scales, empty-series behavior, and accessible labels. It adds no chart
dependency and follows the existing code-native `Plates.svelte` precedent.
Text values and legends remain outside the SVG so the information does not
depend on interpreting the graphic.

### Per-enrollment and overall statistics

Each enrollment has a collapsed native `<details>` block. Repeated runs of the
same program remain separate because their maxes, adjustments, and training
context differ. An Overall block follows.

Both render the same indicator shape and contain:

- sessions logged;
- total load moved;
- average session duration;
- minimum between-set interval;
- average between-set interval;
- maximum between-set interval;
- sets completed above prescription;
- sets completed below prescription.

Intervals never bridge two workouts and exclude each workout's lead-in. Values
cover only the endpoint's 12-month window. A statistic with no observations is
omitted rather than rendered as zero.

The existing `/v1/progress` endpoint remains the single source. Its generic
indicator collection gains interval minimum, average, and maximum. Existing
median indicators remain on the wire for compatibility but are not rendered in
the new dashboard blocks.

### Failure isolation

Enrollment loading and progress loading are independent. If analytics fail,
the active-session and active-program controls still render; the chart area
shows “Statistics unavailable.” A failure to load enrollments continues to use
the route's ordinary error handling because there is then no safe training
entry point to show.

---

## 5 · Contract compatibility and data flow

All database and response changes are additive. The checked-in OpenAPI document
and generated frontend schema change in the same slice as each API contract.

The end-to-end flows are:

```text
adjustment edit
  → authenticated full replacement
  → enrollment_exercise_adjustments
  → next preview generation
  → adjusted and rounded prescription + rebuilt plate plan
  → immutable local commit
  → persisted workout prescription
```

```text
workout submit
  → stored workout and set rows
  → Rust completion report
  → receipt with grouped weight changes and between-set spread
  → completion screen
```

```text
dashboard request
  → enrollments (required) + progress (failure-isolated)
  → selected-lift SVG and summary
  → shared indicator renderer for each enrollment and Overall
```

No browser computes a training prescription, plate plan, workout summary, or
aggregate statistic.

---

## 6 · Verification

Every behavior change follows red-green-refactor.

### Session state and UI

- Exact weight copies through a same-exercise/same-prescription run.
- Carry stops at a changed prescription or exercise.
- Done and skipped rows are not rewritten; later pending rows in the same run
  still receive the carry.
- Rep edits do not carry.
- The optional reason is unselected, ordered with “too easy” first, and carries
  only with copied drift.
- Cues start collapsed and remain natively operable.
- A mix of done and skipped sets enables normal completion.
- Pending sets retain the early-ending reason flow.

### Training and API

- Positive and negative adjustments are applied once and rounded down through
  barbell, dumbbell, and machine loading rules.
- Plate breakdowns and plate-change chains match adjusted prescriptions.
- Bodyweight, unknown, fractional, and out-of-range adjustments are rejected.
- Ownership and active-enrollment write rules hold.
- Full replacement inserts, updates, removes, and clears rows atomically.
- An already committed session remains unchanged after an adjustment edit.
- Submitted workout rows store the adjusted prescription from the preview.

### Reports and dashboard

- Changed weights group by exercise and exact prescribed/actual pair in first
  performance order.
- Only done, drifted sets contribute to changed-weight groups.
- Min/average/max excludes lead-in, includes skips as boundaries, and reports
  discarded intervals.
- Duplicate submissions return the same complete summary.
- Per-enrollment and overall indicators use the same definitions and never
  bridge workouts.
- Estimate change needs two points and handles a zero starting estimate by
  omitting the percentage.
- An invalid lift query falls back deterministically.
- A progress failure leaves training actions available.
- SVG empty, one-point, and multi-point states have accessible text.

Run the focused Rust and frontend tests after each red-green cycle, then the
full Rust workspace, frontend unit, type-check, and browser suites before
completion.

---

## 7 · Delivery slices

### Slice 1 — Session correctness and completion

Ship exact-weight carry, optional reason presentation, collapsed cues, the skip
completion fix, grouped working-weight changes, and answer-to-answer
min/average/max.

### Slice 2 — Enrollment exercise adjustments

Ship persistence, contracts, training-layer application, regenerated API types,
and the active-program editing UI.

### Slice 3 — Training-first dashboard

Extend progress indicators, add failure-isolated loading, and ship the selected
lift chart plus per-enrollment and overall statistics.

Each slice leaves independently testable, deployable software.

---

## 8 · Amendments to existing decisions

Implementation must update `docs/DESIGN.md` alongside code:

- D-07's current delta carry across all later same-exercise sets is replaced by
  exact-weight carry across the same-prescription run.
- D-08's definition of normal completion changes from every set done to every
  set answered; skips remain first-class work not done without forcing a cut
  reason.
- D-10 retains median for existing historical views but permits the explicitly
  requested arithmetic average in completion and dashboard interval spreads;
  both continue to discard impossible measurements.
- D-13's separate `/progress` placement is replaced by a training-first
  dashboard order. The training action remains above analytics, preserving the
  governor intent while making requested data visible.
- D-04 gains enrollment-specific exercise adjustment as a multiplier over a
  generated prescription. It does not make entered maxes, training maxes, or
  program state editable and never rewrites committed sessions.

The earlier specs
`2026-08-05-when-the-prescription-is-wrong-design.md` and
`2026-08-05-over-time-design.md` remain historical records. Where their carry,
timing-display, or dashboard-placement decisions conflict with this document,
this newer approved design supersedes them.

---

## 9 · Non-goals

- No cross-program or athlete-global exercise adjustment.
- No adjustment of reps, set counts, or progression state.
- No mutation of an active session already committed to the device.
- No recommendation engine or automatic max update.
- No default drift reason.
- No total-time comparison on completion.
- No charting library dependency.
- No per-set analytics chart and no celebratory records UI.
