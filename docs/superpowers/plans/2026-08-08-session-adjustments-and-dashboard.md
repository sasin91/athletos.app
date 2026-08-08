# Session adjustments and training-first dashboard — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the approved session-correction, enrollment-adjustment, and training-first dashboard design on top of the current `/v1/progress` and completion-report foundations.

**Architecture:** Keep workout truth in the existing immutable preview → IndexedDB → workout submission path. Extend the Rust report/progress contracts additively, apply enrollment adjustments to a freshly generated engine `Session` before API view construction, and render the dashboard with pure presentation helpers plus code-native SSR SVG components. The Train page remains the entry point and isolates analytics failure from training actions.

**Tech Stack:** Rust 2024 · Axum · sqlx/Postgres 17 · utoipa/OpenAPI · SvelteKit 2.63 · Svelte 5 runes · TypeScript 6 · Vitest · Playwright · Tailwind 4 · DaisyUI 5.

**Spec:** `docs/superpowers/specs/2026-08-08-session-adjustments-and-dashboard-design.md`.

## Global Constraints

- The prescription shown to the athlete is historical fact. Never rewrite a committed session or completed/skipped set.
- Every behavior change follows red-green-refactor: run each named focused test and observe the expected failure before production edits.
- `/v1` changes are additive only (D-12). Regenerate `backend/openapi.json` and `frontend/src/lib/api/schema.d.ts`; never hand-edit generated contract files.
- Business arithmetic stays in Rust (D-11). TypeScript may select, join by identifier, scale SVG coordinates, and format values; it may not calculate training prescriptions, reports, or aggregate statistics.
- No chart dependency. The chart is a focused server-rendered SVG component following `Plates.svelte`.
- Adjustments are enrollment-specific whole percentages in `-50..=50`, affect only future uncommitted previews, and are applied exactly once to the already-generated load.
- Bodyweight prescriptions, program state, entered maxes, training maxes, progression arithmetic, reps, and set counts are never adjusted.
- Existing median fields remain on the wire. Completion and dashboard add arithmetic averages without removing compatibility fields.
- Analytics failure must not hide the resume action or active-program training action.
- Preserve Svelte 5 runes, the server-only API client, httpOnly token handling, and the offline `/session` route.
- Do not add unrelated refactors or speculative abstractions.

---

### Task 1: Exact-run carry and answered-session completion

**Files:**
- Modify: `frontend/src/lib/session.ts`
- Modify: `frontend/src/lib/session.test.ts`

**Interfaces:**
- Consumes: existing `LocalSession`, `editSet`, `setDriftReason`, `isComplete`.
- Produces: unchanged public signatures; corrected exact-run semantics for all callers.

- [ ] **Step 1: Replace the delta-specific tests with failing exact-run tests**

Keep the existing `bbbFixture()` and write assertions equivalent to:

```ts
it('copies the exact weight only through the equal-prescription run', () => {
	const edited = editSet(bbbFixture(), 0, { weight: 95 });
	expect(edited.sets.map((set) => set.actualWeight)).toEqual([95, 95, 50, 50]);
});

it('an answered row is preserved without breaking the pending run', () => {
	const answered = logSet(committed, 1, '2026-08-05T10:05:00Z');
	const edited = editSet(answered, 0, { weight: 100 });
	expect(edited.sets[1].actualWeight).toBe(97.5);
	expect(edited.sets[2].actualWeight).toBe(100);
});

it('a reason stops at the same changed-prescription boundary', () => {
	const edited = editSet(bbbFixture(), 0, { weight: 95 });
	const reasoned = setDriftReason(edited, 0, 'too_easy');
	expect(reasoned.sets.map((set) => set.driftReason)).toEqual([
		'too_easy', 'too_easy', null, null
	]);
});

it('done plus skipped is complete while any pending set is not', () => {
	let answered = committed;
	answered = logSet(answered, 0, '2026-08-05T10:01:00Z');
	answered = skipSet(answered, 1, '2026-08-05T10:02:00Z');
	answered = logSet(answered, 2, '2026-08-05T10:03:00Z');
	answered = skipSet(answered, 3, '2026-08-05T10:04:00Z');
	expect(isComplete(answered)).toBe(true);
	expect(isComplete(resetSet(answered, 3))).toBe(false);
});
```

- [ ] **Step 2: Run the focused test and observe RED**

Run: `cd frontend && npx vitest run src/lib/session.test.ts`

Expected failures: backoff rows currently receive delta-adjusted weights/reasons, and a skipped row keeps `isComplete` false.

- [ ] **Step 3: Implement the minimal corrected run boundary**

In `editSet`, locate the addressed set's array index. When it is pending and weight was edited, scan only later rows until the first row where either `exercise` or `prescribedWeight` differs. Within that bounded run, copy `values.weight` only into pending rows; leave done/skipped rows unchanged and continue scanning. Preserve every row's `prescribedWeight`. Rep edits remain local.

Use the same bounded-run predicate in `setDriftReason`; apply the reason only to the addressed set and deviated pending rows within that run. Returning to prescription, skip, and reset continue clearing it.

Implement completion as:

```ts
export function isComplete(session: LocalSession): boolean {
	return session.sets.every((set) => set.status !== 'pending');
}
```

- [ ] **Step 4: Run GREEN and the complete frontend unit suite**

Run:

```text
cd frontend
npx vitest run src/lib/session.test.ts
npm run test:unit
```

Expected: all focused and existing tests pass.

- [ ] **Step 5: Commit**

Commit message: `session: carry exact weight through one prescription run`

---

### Task 2: Completion report weight changes and interval average

**Files:**
- Modify: `backend/crates/api/src/report.rs`
- Modify: `backend/crates/api/src/timing.rs`
- Modify: `backend/crates/api/src/routes/workouts.rs`
- Modify: `backend/crates/api/src/openapi.rs`
- Modify: `backend/crates/api/tests/training.rs`
- Modify generated: `backend/openapi.json`

**Interfaces:**
- Produces additive `WeightChange`, `SessionReport.weight_changes`, and `IntervalSpread.average_seconds` fields.
- `WeightChange`: `{ exercise, label, prescribed_weight, actual_weight, sets }`.
- Existing `median_seconds` remains unchanged.

- [ ] **Step 1: Write failing pure report and timing tests**

Extend `ReportedSet` test fixtures with `exercise` and `label`, then add tests with ordered rows equivalent to:

```rust
let sets = vec![
    done_for("barbell-row", "Barbell row", 85.0, 100.0, 5),
    done_for("barbell-row", "Barbell row", 85.0, 100.0, 5),
    done_for("barbell-row", "Barbell row", 85.0, 95.0, 5),
    done_for("squat", "Squat", 100.0, 100.0, 5),
    not_done_for("barbell-row", "Barbell row", 85.0, 5),
];
let report = compute(3600, None, &sets, None);
assert_eq!(report.weight_changes, vec![
    WeightChange { exercise: "barbell-row".into(), label: "Barbell row".into(), prescribed_weight: 85.0, actual_weight: 100.0, sets: 2 },
    WeightChange { exercise: "barbell-row".into(), label: "Barbell row".into(), prescribed_weight: 85.0, actual_weight: 95.0, sets: 1 },
]);
```

In `timing.rs`, use three surviving answer-to-answer intervals `[60, 90, 120]` and assert:

```rust
assert_eq!(spread.average_seconds, 90.0);
assert_eq!(spread.median_seconds, 90);
```

Use `[60, 61]` to prove arithmetic average is `60.5`, not integer-truncated.

- [ ] **Step 2: Run focused Rust tests and observe RED**

Run:

```text
cd backend
cargo test -p athletos-api report::tests
cargo test -p athletos-api timing::tests
```

Expected: missing fields/types.

- [ ] **Step 3: Implement pure grouping and average**

Add exercise identity to `ReportedSet`. In `report::compute`, iterate done rows with actual numbers in original order. Ignore rows performed as prescribed. Maintain a `Vec<WeightChange>`; increment the first existing exact `(exercise, prescribed_weight, actual_weight)` match, otherwise push a new group. This preserves first-performance order without an unordered map.

Add `average_seconds: f64` to `IntervalSpread`, computed as `sum as f64 / len as f64` over the same sorted surviving intervals used by min/median/max.

- [ ] **Step 4: Write failing API integration coverage**

In `training.rs`, submit one session containing two `85 → 100` done sets, one `85 → 95` done set, one as-prescribed done set, and one skipped set. Assert the 201 receipt contains exactly two ordered `weight_changes` groups. Retry the identical client-generated workout id and assert the 200 duplicate receipt has the same report.

Also assert `intervals.average_seconds` from stamped done/skipped boundaries and that discarded intervals remain reported.

- [ ] **Step 5: Populate report identity from stored rows and pass integration tests**

Extend the stored-set query used by `recorded_report` to carry exercise. Resolve labels with the existing exercise registry fallback used by workout detail. Preserve position ordering. Do not compute this in the submission handler from request JSON; both first and duplicate responses must recompute from stored rows.

Run with the repository development database:

```text
cd backend
$env:DATABASE_URL='postgres://postgres:athletos@127.0.0.1:5433/athletos'
cargo test -p athletos-api --test training completion_report
```

If local Postgres is unavailable, run pure tests and record integration tests as pending for CI; do not claim they ran locally.

- [ ] **Step 6: Register schemas, regenerate OpenAPI, and commit**

Run from `backend`:

```text
cargo run --bin openapi -- openapi.json
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
```

Commit message: `report: show changed weights and average intervals`

---

### Task 3: Completion and logger UI

**Files:**
- Modify generated: `frontend/src/lib/api/schema.d.ts`
- Modify: `frontend/src/routes/session/+page.svelte`
- Modify: `frontend/src/routes/session/page.e2e.ts`
- Modify fixtures: `frontend/src/lib/queue.test.ts`

**Interfaces:**
- Consumes Task 1's answered-session semantics and Task 2's additive receipt fields.

- [ ] **Step 1: Regenerate the client and write failing browser assertions**

Run `cd frontend && npm run generate:api` after Task 2's OpenAPI generation.

Extend the seeded session e2e coverage:

```ts
await page.getByRole('button', { name: 'Skip set' }).click();
// Answer every remaining set, mixing log and skip.
await expect(page.getByRole('button', { name: 'Finish session' })).toBeVisible();
await expect(page.getByText('End session early')).not.toBeVisible();
```

Keep a separate case with at least one pending row and assert the early-ending reason flow remains visible.

Add a completion receipt fixture and assert visible text for:

```text
Load moved
Load prescribed
Barbell row
85 → 100 kg
+15 kg
2 sets
Fastest
Average
Longest
```

- [ ] **Step 2: Run the focused browser test and observe RED**

Run: `cd frontend && npx playwright test src/routes/session/page.e2e.ts`

Expected: skip completion and new receipt labels are absent under current code.

- [ ] **Step 3: Render the corrected controls and receipt**

The normal submit action appears whenever `isComplete(session)` is true. The early-ending flow appears only while a pending set remains.

Retain duration, done/skipped/not-reached counts, queue/refusal/accepted state, and history link. Show load moved and load prescribed as separate values. Render each `weight_changes` row without averaging. Render interval min/average/max; do not render median in the new block even though it remains typed.

- [ ] **Step 4: Run frontend gates and commit**

Run:

```text
cd frontend
npm run test:unit
npm run check
npm run lint
npx playwright test src/routes/session/page.e2e.ts
```

Commit message: `session: finish answered work with an honest receipt`

---

### Task 4: Training-engine adjustment transform and program metadata

**Files:**
- Modify: `backend/crates/training/src/loading.rs`
- Modify: `backend/crates/training/src/session.rs`
- Modify: `backend/crates/training/src/meta.rs`
- Modify: `backend/crates/training/src/programs/wendler_531_bbb.rs`
- Modify: `backend/crates/training/src/programs/smolov_jr.rs`
- Modify: `backend/crates/training/src/programs/mod.rs`
- Modify: `backend/crates/training/src/lib.rs`
- Modify: `backend/crates/training/tests/engine.rs`

**Interfaces:**
- Produces `adjusted_load(load: &Load, loading: Loading, percent: i16) -> Load`.
- Produces `apply_exercise_adjustments(session: &mut Session, adjustments: &BTreeMap<String, i16>)`.
- Adds `ProgramMeta.weighted_exercises: &'static [&'static str]`.

- [ ] **Step 1: Write failing loading and session tests**

Cover these exact properties:

```rust
let barbell_100 = Loading::Barbell.round_down(100.0);
assert_eq!(adjusted_load(&barbell_100, Loading::Barbell, 10).weight, 110.0);
assert_eq!(adjusted_load(&barbell_100, Loading::Barbell, -7).weight, 92.5);

let rack = Loading::Dumbbell { increment: 2.0 };
let dumbbell_22 = rack.round_down(22.5);
assert_eq!(adjusted_load(&dumbbell_22, rack, 10).weight, 24.0);

let stack = Loading::Machine { increment: 5.0 };
let machine_40 = stack.round_down(43.0);
assert_eq!(adjusted_load(&machine_40, stack, -10).weight, 35.0);

let bodyweight = Loading::Bodyweight.round_down(100.0);
assert_eq!(adjusted_load(&bodyweight, Loading::Bodyweight, 50).weight, 0.0);
```

Expected values must be the existing `round_down` result, never ordinary floating rounding. Assert the barbell plate breakdown sums back to the adjusted weight.

Generate a real session, adjust one exercise, and assert sets/reps/AMRAP/state are unchanged while every matching lift's `Load` changes once.

- [ ] **Step 2: Run focused engine tests and observe RED**

Run: `cd backend && cargo test -p athletos-training adjustment`

Expected: missing helpers and metadata.

- [ ] **Step 3: Implement the pure transform**

Compute only from the generated load:

```rust
let target = load.weight * (1.0 + f64::from(percent) / 100.0);
loading.round_down(target)
```

Resolve each block's exercise through the registry to obtain its loading model. Ignore missing adjustments and bodyweight. Replace the load object so plate breakdowns are rebuilt by the loading model. Do not inspect or mutate opaque program state.

- [ ] **Step 4: Declare and verify weighted exercise metadata**

List every non-bodyweight exercise each program can prescribe, including Smolov Jr accessory lifts. Add registry tests proving every key resolves, none are bodyweight, required-max sources are included when weighted, and `hanging-leg-raise` is excluded.

- [ ] **Step 5: Run gates and commit**

Run:

```text
cd backend
cargo test -p athletos-training
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
```

Commit message: `training: adjust future loads per enrollment`

---

### Task 5: Exercise-adjustment persistence, API, and preview application

**Files:**
- Create: `backend/crates/api/migrations/20260808120000_enrollment_exercise_adjustments.sql`
- Create: `backend/crates/api/src/routes/adjustments.rs`
- Modify: `backend/crates/api/src/routes/mod.rs`
- Modify: `backend/crates/api/src/routes/enrollments.rs`
- Modify: `backend/crates/api/src/routes/programs.rs`
- Modify: `backend/crates/api/src/lib.rs`
- Modify: `backend/crates/api/src/openapi.rs`
- Modify: `backend/crates/api/tests/health.rs`
- Modify: `backend/crates/api/tests/training.rs`
- Modify generated: `backend/openapi.json`

**Interfaces:**
- `GET /v1/enrollments/{id}/exercise-adjustments` → `ExerciseAdjustments`.
- `PUT /v1/enrollments/{id}/exercise-adjustments` body `ReplaceExerciseAdjustments` → `ExerciseAdjustments`.
- `ProgramSummary.weighted_exercises: Vec<WeightedExercise>`.

- [ ] **Step 1: Write the migration and failing schema guard**

Create the table exactly as:

```sql
create table enrollment_exercise_adjustments (
    enrollment_id uuid not null references enrollments(id) on delete cascade,
    exercise text not null,
    adjustment_percent smallint not null,
    primary key (enrollment_id, exercise),
    constraint enrollment_adjustment_nonzero check (adjustment_percent <> 0),
    constraint enrollment_adjustment_range check (adjustment_percent between -50 and 50)
);
```

Add a migration test asserting the composite primary key, cascade FK, and both checks exist.

- [ ] **Step 2: Write failing endpoint integration tests**

Cover: GET empty; PUT insert/update/remove; empty map clears; zero omitted; invalid mixed replacement leaves old data; unknown exercise, exercise outside program metadata, bodyweight, fractional JSON number, and ±51 return 422; another athlete sees 404; closed enrollment remains readable but PUT returns 409.

Add preview tests proving positive/negative values are rounded through the engine and plate changes remain internally consistent. Capture a preview before changing adjustments, submit that old preview afterward, and assert stored workout prescriptions equal the old preview—not the new setting.

- [ ] **Step 3: Run endpoint tests and observe RED**

Run with `DATABASE_URL` on port 5433:

```text
cd backend
cargo test -p athletos-api --test health enrollment_exercise_adjustments
cargo test -p athletos-api --test training exercise_adjustments
```

Expected: route/table/types absent.

- [ ] **Step 4: Implement validated full replacement**

Use DTOs:

```rust
pub struct ReplaceExerciseAdjustments {
    pub adjustments: BTreeMap<String, i16>,
}

pub struct ExerciseAdjustments {
    pub enrollment_id: Uuid,
    pub adjustments: BTreeMap<String, i16>,
}
```

Deserialize into a representation that can distinguish fractional values and return RFC 9457 422 rather than truncating. Validate all keys and values before deleting anything. Inside one transaction, select enrollment by `(id, athlete_id) FOR UPDATE`, reject non-active writes, normalize zeros away, delete rows absent from the normalized map, upsert remaining rows, and read back the canonical map before commit.

GET uses the same ownership predicate but permits every enrollment status.

- [ ] **Step 5: Apply adjustments at the preview seam**

In `next_session`, generate the ordinary session, load the enrollment's map, call Task 4's pure transform, then build `blocks` and `prescribed_sets`. Do not alter `workouts.rs`; submission already persists the committed preview.

Expose labelled weighted exercises from program metadata using the exercise registry.

- [ ] **Step 6: Register OpenAPI, regenerate, run gates, and commit**

Run:

```text
cd backend
cargo run --bin openapi -- openapi.json
cargo test --workspace
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
```

Commit message: `api: persist exercise adjustments per enrollment`

---

### Task 6: Exercise-adjustment editing UI

**Files:**
- Create: `frontend/src/lib/adjustments.ts`
- Create: `frontend/src/lib/adjustments.test.ts`
- Modify generated: `frontend/src/lib/api/schema.d.ts`
- Modify: `frontend/src/routes/(app)/+page.server.ts`
- Modify: `frontend/src/routes/(app)/+page.svelte`

**Interfaces:**
- Consumes Task 5's `weighted_exercises` and adjustment endpoints.
- Produces pure `adjustmentRows(...)` and `serializeAdjustments(...)` helpers for page actions/components.

- [ ] **Step 1: Regenerate client and write failing pure tests**

Run `cd frontend && npm run generate:api`, then define the wished-for behavior:

```ts
expect(adjustmentRows(weighted, {})).toEqual([
	{ exercise: 'squat', label: 'Squat', value: 0 },
	{ exercise: 'bench-press', label: 'Bench press', value: 0 }
]);
expect(serializeAdjustments([
	{ exercise: 'squat', raw: '+10' },
	{ exercise: 'bench-press', raw: '0' },
	{ exercise: 'barbell-row', raw: '' }
])).toEqual({ squat: 10 });
```

Also reject fractions, non-numbers, and values outside `-50..=50` without sending a request.

- [ ] **Step 2: Run pure tests and observe RED**

Run: `cd frontend && npx vitest run src/lib/adjustments.test.ts`

Expected: module absent.

- [ ] **Step 3: Implement pure form normalization**

Bound rows to program `weighted_exercises`; missing map entries are zero. Serialize signed base-10 whole values, omit zero/blank, and return a typed validation result rather than silently coercing invalid text.

- [ ] **Step 4: Add server load and full-replacement action**

For each enrollment, resolve its program summary and GET its adjustment document. Add a named action that parses `enrollment_id` plus keyed values, uses the pure validation rules at the server boundary, calls PUT through `locals.api`, and returns `fail(422, ...)` with field state on invalid input. The API remains authoritative.

- [ ] **Step 5: Render active and historical controls**

Within each active enrollment card, add native collapsed `<details>` titled “Exercise adjustments”. Render compact signed whole-percent inputs, reset-to-zero actions, the exact explanation “Changes affect the next uncommitted session.”, and the warning when `Math.abs(value) > 30`:

```text
A large adjustment may mean your entered max needs updating.
```

Finished/abandoned enrollment adjustments render read-only. Missing statistics or adjustments never remove the training action.

- [ ] **Step 6: Run frontend gates and commit**

Run:

```text
cd frontend
npx vitest run src/lib/adjustments.test.ts
npm run test:unit
npm run check
npm run lint
npm run build
```

Commit message: `frontend: edit future loads on the active enrollment`

---

### Task 7: Dashboard progress contract additions

**Files:**
- Modify: `backend/crates/api/src/routes/progress.rs`
- Modify: `backend/crates/api/src/openapi.rs`
- Modify: `backend/crates/api/tests/training.rs`
- Modify generated: `backend/openapi.json`

**Interfaces:**
- Adds indicators: `average_duration`, `interval_min`, `interval_average`, `interval_max`.
- Retains `median_duration`, `median_interval`.
- Adds `LiftTrend.estimate_change: Option<EstimateChange>` where `EstimateChange { kg: f64, percent: Option<f64> }`.

- [ ] **Step 1: Write failing pure indicator and estimate-change tests**

Use `Totals` with durations `[3000, 3600, 4200]` and intervals `[60, 90, 120]`. Assert the new seconds indicators contain values 3600, 60, 90, and 120. For empty samples, assert all observation-dependent indicators are omitted while count/load indicators preserve existing behavior.

Construct lift points and assert:

```rust
assert_eq!(estimate_change(&[]), None);
assert_eq!(estimate_change(&[point(100.0)]), None);
assert_eq!(estimate_change(&[point(100.0), point(110.0)]), Some(EstimateChange { kg: 10.0, percent: Some(10.0) }));
assert_eq!(estimate_change(&[point(0.0), point(10.0)]).unwrap().percent, None);
```

Ignore points whose estimate is absent; use first and latest present estimate in chronological point order.

- [ ] **Step 2: Run focused tests and observe RED**

Run: `cd backend && cargo test -p athletos-api progress::tests`

Expected: new keys/type/helper absent.

- [ ] **Step 3: Implement arithmetic in Rust**

Add a small mean helper returning `Option<f64>`. Min/max use the pooled raw interval sample already produced per workout; never take a mean of per-workout means and never bridge workouts. Attach `estimate_change` while assembling each `LiftTrend`.

- [ ] **Step 4: Add integration assertions and regenerate**

Extend progress endpoint tests across two workouts to prove per-enrollment separation and pooled interval min/average/max. Include stamped skipped sets as boundaries. Assert estimate-change shape and units.

Run:

```text
cd backend
cargo run --bin openapi -- openapi.json
cargo test -p athletos-api progress
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
```

Commit message: `progress: serve the dashboard spread and estimate change`

---

### Task 8: Pure dashboard selection and code-native chart components

**Files:**
- Create: `frontend/src/lib/dashboard.ts`
- Create: `frontend/src/lib/dashboard.test.ts`
- Create: `frontend/src/lib/ProgressChart.svelte`
- Create: `frontend/src/lib/ProgressChart.svelte.test.ts`
- Create: `frontend/src/lib/IndicatorGrid.svelte`
- Modify generated: `frontend/src/lib/api/schema.d.ts`

**Interfaces:**
- `selectLift(progress: ProgressView, requested: string | null): LiftTrend | null`.
- `chartPoints(lift: LiftTrend, sessions: SessionFigures[]): DashboardPoint[]` joins by `workout_id`.
- `ProgressChart` accepts `{ label: string; points: DashboardPoint[] }`.
- `IndicatorGrid` accepts `{ indicators: Indicator[] }` and renders only dashboard-approved keys.

- [ ] **Step 1: Regenerate types and write failing selection tests**

Run `cd frontend && npm run generate:api`.

Test that an exact requested exercise wins; absent/invalid request chooses the lift whose latest present estimate has the most recent `at`; ties break by exercise key for deterministic SSR; no lift with an estimate returns `null`. Test joining by `workout_id` preserves lift-point order and leaves a missing session load absent rather than zero.

- [ ] **Step 2: Run selection tests and observe RED**

Run: `cd frontend && npx vitest run src/lib/dashboard.test.ts`

Expected: module absent.

- [ ] **Step 3: Implement selection and joining only**

Do not calculate estimate deltas, percentages, aggregates, prescriptions, or timing statistics. The helper only chooses a series and joins server facts by id.

- [ ] **Step 4: Write failing SSR chart tests**

Use `render` from `svelte/server` to cover empty, one-point, and multi-point props. Assert every result contains an accessible chart label; one point produces a visible point without `NaN`/`Infinity`; multiple points produce a solid estimate path, dashed training-max path, drift panel, load bars, and no invalid coordinates.

- [ ] **Step 5: Implement the three-panel SVG**

Use one shared chronological x-scale. Panel 1 uses one kg scale for estimate and training max. Panel 2 has a centered zero line and symmetric signed-drift scale. Panel 3 has its own zero-based load scale. Handle equal min/max domains with deterministic padding. Keep visible values, selected-lift control, legends, and estimate-change copy outside SVG; the SVG owns geometry and an accessible summary only.

- [ ] **Step 6: Implement the indicator renderer**

Allow only these keys in this order: `sessions`, `load_moved`, `average_duration`, `interval_min`, `interval_average`, `interval_max`, `sets_over`, `sets_under`. Format `kg`, count, and seconds at the UI edge. Legacy median indicators stay typed but are intentionally not rendered.

- [ ] **Step 7: Run component gates and commit**

Run:

```text
cd frontend
npx vitest run src/lib/dashboard.test.ts src/lib/ProgressChart.svelte.test.ts
npm run check
npm run lint
```

Commit message: `frontend: draw progress without a chart dependency`

---

### Task 9: Training-first dashboard composition, failure isolation, and decisions

**Files:**
- Create: `frontend/src/lib/server/dashboard.ts`
- Create: `frontend/src/lib/server/dashboard.test.ts`
- Modify: `frontend/src/routes/(app)/+page.server.ts`
- Modify: `frontend/src/routes/(app)/+page.svelte`
- Create: `frontend/src/routes/(app)/page.test.ts`
- Modify: `docs/DESIGN.md`

**Interfaces:**
- Consumes Tasks 6–8 and the existing active-session IndexedDB lookup.
- Produces the approved Train-page order and `?lift=<exercise>` selection.

- [ ] **Step 1: Write failing failure-isolation and rendering tests**

Define this exact server-only seam:

```ts
export async function optionalProgress(
	call: () => Promise<ApiResult<ProgressView>>
): Promise<ProgressView | null>;
```

It calls the supplied progress request. A response with data returns data; a 401 delegates to `unwrap` so the existing login redirect survives; every other missing-data response and a thrown network error return `null`.

Test these branches with real response-shaped values:

1. enrollment success + progress success returns both;
2. enrollment success + non-auth progress failure returns enrollments and `progress: null`;
3. progress `401` throws the existing login redirect rather than being swallowed;
4. a rejected request promise returns `null`.

The page load itself keeps enrollment on the existing `unwrap` path, so enrollment failure remains covered by that helper's existing contract rather than duplicated here.

SSR-render the page with an active enrollment and `progress: null`; assert both “What am I doing today?” and “Statistics unavailable” are present.

- [ ] **Step 2: Run focused tests and observe RED**

Run: `cd frontend && npx vitest run 'src/routes/(app)/page.test.ts'`

Expected: progress is not loaded and failure isolation does not exist.

- [ ] **Step 3: Load independently and preserve authentication semantics**

Start enrollment and progress requests concurrently. Enrollment remains required and goes through existing `unwrap`. Convert only non-auth progress errors/network failures to `null`; do not turn authentication failure into an anonymous analytics error.

Read `url.searchParams.get('lift')` and return it as the requested selection; selection/fallback remains in `dashboard.ts`.

- [ ] **Step 4: Compose the page in approved order**

Render:

1. active local resume action;
2. active enrollment and “What am I doing today?” action, including Task 6 adjustments;
3. lift selector, textual legend/values, estimate-change summary, and `ProgressChart`;
4. one collapsed native `<details>` per enrollment, looked up by `enrollment_id`;
5. collapsed Overall block;
6. finished enrollments.

If an enrollment has no observations, omit statistics rather than displaying zero. If progress is `null`, render “Statistics unavailable.” in the analytics region while leaving items 1–2 usable. If fewer than two estimates exist, omit estimate-change copy. If percentage is absent, show kg change only.

- [ ] **Step 5: Amend binding decisions**

Update `docs/DESIGN.md` exactly as the approved spec requires:

- D-07: exact weight through one same-exercise/same-prescription run replaces delta carry.
- D-08: a session completes when every set is answered; skips remain explicit work not done.
- D-10: median remains for historical compatibility while completion/dashboard may render arithmetic average and spread.
- D-13: the Train page becomes training-first dashboard; training controls stay above analytics and progress never appears without load/drift cost.
- D-04: enrollment adjustment multiplies an already-generated load once and never edits state, maxes, or committed sessions.

- [ ] **Step 6: Run full verification**

Run:

```text
cd backend
cargo test --workspace
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings

cd ../frontend
npm run test:unit
npm run check
npm run lint
npm run build
npx playwright test
```

Run database integration tests with the documented port 5433 when Postgres is available. Confirm `cargo run --bin openapi -- openapi.json` and `npm run generate:api` reproduce committed files byte-for-byte. Run the repository's `oasdiff` gate when the binary is available; otherwise rely on CI and state that explicitly.

- [ ] **Step 7: Commit**

Commit message: `dashboard: keep training first and make progress visible`

---

## Completion checklist

- [ ] Every task has a recorded RED command/output and GREEN command/output in its report.
- [ ] Every migration/API path executed against Postgres locally or passed the repository integration CI before release.
- [ ] Generated OpenAPI and TypeScript contract files reproduce byte-for-byte.
- [ ] No browser code computes prescription, report, estimate change, or aggregate timing/load statistics.
- [ ] A committed IndexedDB preview remains unchanged when adjustments are edited.
- [ ] Existing sessions and clients continue decoding additive report/progress fields.
- [ ] Analytics failure leaves resume and training actions visible.
- [ ] Full Rust, frontend unit, type-check, lint, build, and browser suites pass.
- [ ] Final whole-branch review has no open load-bearing findings.
