# My workouts and editable sessions — implementation plan

**Status:** Implemented and locally verified on 2026-09-07. Deployment pending.

**Goal:** Let athletes define reusable workouts, optionally share them, and add,
remove, or edit exercises and sets in an individual session, including sessions
from existing programs. Keep offline logging, accurate history, and program
progression reliable.

**Product language:** “My workouts”, “Create workout”, “Start workout”, “Edit
workout”, “Share workout”, and “Save a copy”. Internally use `WorkoutDefinition`
for reusable content, `WorkoutRevision` for a saved version, and the existing
`Workout` concept for the recorded result. “Dynamic” describes session editing;
it is not a generator, a separate workout source, or a navigation category.

**Related decisions:** [Design](../../DESIGN.md), especially D-03, D-07, D-08,
D-09, D-11, D-12, and D-19; [language](../../../CONTEXT.md).

## 1. Scope and product defaults

The agreed direction is user-defined workouts with optional sharing and edits
to individual sessions. The following are implementation defaults for the first
release, rather than additional requirements supplied by the athlete.

- Custom workouts contain a title, optional description, ordered exercises,
  and set prescriptions: reps, weight/bodyweight, and AMRAP. Repeated exercise
  blocks are supported. Use the existing exercise catalogue and loading modes.
- Athletes can create from scratch, duplicate a saved workout, or save an edited
  session as a workout. A saved workout is reusable without an enrollment.
- Sharing is private by default. An owner can create and revoke an unlisted
  link to a specific revision. Anyone with the link can preview that revision;
  an authenticated athlete can save an independent copy. There is no public
  discovery feed, recipient inbox, or collaborative editing in this release.
- Copies belong to the recipient. Author edits and link revocation do not alter
  copies, active sessions, or history. A link continues to show its pinned
  revision until revoked; sharing a newer revision is explicit.
- Starting a saved workout copies its revision into a session. Editing that
  session never silently edits the saved definition. “Save as workout” creates
  a new definition; updating an owned definition is a separate explicit action.
- Editing a program session keeps its enrollment association and advances that
  program once when eligible. Starting a separate custom workout does not
  advance any active program. “Save as workout” copies content without copying
  program progression or enrollment adjustments as ongoing rules.
- Athletes may add, remove, reorder, or change pending work before or during
  training. Already logged work is not deleted by structural edits; existing
  explicit undo/correction actions remain available on the addressed set.
- Defer custom exercise authoring, arbitrary progression formulas, multiweek
  user-authored programs, supersets/circuits, timed/distance prescriptions, and
  automatic synchronization of someone else's workout changes.

## 2. Current implementation and constraints

| Area | Current behavior | Required change |
|---|---|---|
| Training domain | `Session` / `Block` / `Lift` carry reusable prescription data | Introduce owned workout definitions and revisions that materialize through shared Rust helpers |
| Session payload | `NextSession` requires enrollment, program, week/day, and progress | Add a source-aware contract without inventing those fields for custom sessions |
| Submission | `validate_session_semantics` requires the current program's exact positions, exercises, reps, and set count | Validate edits against a captured baseline and explicit set provenance |
| Persistence | Workout ownership comes through a required enrollment | Store athlete ownership directly and support standalone workouts |
| Progression | 5/3/1 selects its top set by exercise and prescribed weight | Reconstruct only original program sets for progression; same-exercise additions must not count |
| Logger | `LocalSession` uses `position` for identity and ordering | Separate stable identity from mutable display order |
| Technique evidence | Clips and review targets refer to a session and set | Preserve those references through insertions, removals, and reordering |
| Offline storage | IndexedDB holds one active session and a submission queue | Version documents, cache the exercise catalogue, and migrate without dropping pending work |
| Reporting | History, pace, progress, and averages assume enrollments | Include standalone sessions with explicit source and comparison semantics |
| Replay | `advances.rs` reconstructs progression input from recorded sets | Reconstruct the same baseline projection used at submission, with a stored projection version |

Key files include `backend/crates/api/src/routes/{enrollments,workouts,progress}.rs`,
`backend/crates/api/src/{advances,pace,report,timing}.rs`,
`backend/crates/training/src/session.rs`, `frontend/src/lib/{session,storage,queue,submit}.ts`,
and `frontend/src/routes/session/+page.svelte`.

The published `/v1` contract is additive-only. Making existing response fields
nullable, extending closed enums, or inventing an enrollment for a custom workout
would undermine that contract. Use new DTOs and endpoints for generalized session
submission/history, retaining the existing endpoints for older clients.

## 3. Domain and persistence

### Reusable content

Create `workout_definitions` with athlete ownership, current revision, timestamps,
and an archive marker. Create append-only `workout_revisions` with a revision
number, schema version, title, description, and validated prescription document.
Use JSONB for ordered prescription content; it is read as a whole and does not
need a new relational authoring framework. Store input weights and exercise keys;
computed plates and rounded display payloads come from Rust materialization.

Edits create revisions with optimistic concurrency against the expected current
revision. A stale editor receives a conflict and retains its draft. Copying
creates a new owner-controlled definition and first revision, optionally carrying
source attribution. Archiving removes a definition from the active library but
preserves referenced revisions and historical names.

Create `workout_shares` with a pinned revision, owner, hashed opaque token, and
revocation timestamp. Preview exposes workout content and deliberately chosen
attribution only, never email, history, entered numbers, or technique recordings.
Sharing publishes the weights actually present in that revision; make this clear
in the share preview. Token-bearing responses must not enter general public
caches or application logs. Revocation stops subsequent preview/copy requests;
it cannot retract content already copied or seen.

### Session baseline and edits

Represent source as `program`, `saved_workout`, or `ad_hoc`, with source-specific
metadata. Modification is a separate property, derived from differences.

Retain three distinct facts:

1. The source prescription before session edits, including the enrollment
   adjustments already applied when it was shown.
2. The athlete's intended work for this session, including additions, removals,
   and target edits.
3. Actual results, with status, timestamps, notes, and drift reasons.

Give blocks and sets stable IDs. Baseline sets have immutable origin references;
added sets have no baseline origin. Substitution is removal plus addition, even
when the exercise label happens to be the same. Display order is a separate
field. Preserve the original program order for replay.

At local commit, freeze the session's initial intended targets. Later edits can
change pending work but must retain those initial targets and the original source
prescription. After logging, an edit to actual numbers never overwrites either
prescription. Store the final structure plus sufficient before/after metadata to
explain changes; a general event-sourcing framework is unnecessary.

Removal hides a pending set from the active queue but retains its baseline and
removal marker. It has no fabricated Log/Skip timestamp. Completion means no
active pending work remains; removed work is reported separately. Removing a
whole exercise affects pending rows only. Removing an added, unperformed row
need not create prescribed work that was never part of the baseline.

### Recorded workouts

Backfill `workouts.athlete_id` through enrollments, then require it on every row
and index `(athlete_id, started_at desc, id)`. Retain the enrollment FK, make it
optional for standalone sources, and enforce matching athlete ownership for
enrollment-linked records. Make week/day optional for standalone records and
keep source-specific constraints for program records.

Add provenance, captured title, schema version, and baseline/revision references.
Persist baseline and edit metadata with the workout so archiving a definition
does not erase the explanation of a recorded session. Introduce stable set IDs,
origin references, and explicit display order alongside existing legacy
positions. Keep enough legacy mapping for existing technique evidence and `/v1`
records; new code must not use display position as a durable reference.

Database and API validation must bound total baseline plus added/removed rows,
blocks, text, and expanded sets, not just the visible queue. Preserve the current
500-set submission limit and numeric limits unless a separate change justifies
new values. Validate known exercise keys, positive reps/set counts, unique IDs,
valid origin references, AMRAP, finite weights, and loading semantics.

## 4. Program progression and offline reconciliation

Capture an authoritative program baseline and enrollment revision before editing.
Recommended first implementation: a `POST` that prepares a session draft and
persists its baseline, program state reference, and adjusted prescription. Invoke
it on the deliberate Edit/Start action while online. It does not start the clock,
create a completed workout, or advance the program. Existing GET peeks stay
read-only. Local Start still stamps `started_at` only after durable device storage.

This introduces server-side preparation to the existing local-commit design;
document that amendment explicitly. Once prepared and cached, editing, starting,
resuming, and finishing that session work offline. New program preparation
requires a connection; it must never strand an already committed legacy session.
Preparation retries use a client-minted ID. Unused drafts are separate from workout
history and cannot be expired in a way that rejects a delayed offline submission.

The baseline records the exact state revision, not merely week/day, since adaptive
programs repeat those coordinates. Increment the enrollment revision on every
advance, including legacy submissions. Later adjustment changes do not mutate an
already prepared baseline.

For an eligible submission, lock the enrollment and construct `LoggedSession`
from baseline sets in original order. Map actual outcomes by origin ID. Removed
baseline rows become not performed. Exclude all added rows, including heavier
sets of the same main exercise. Preserve original reps and weights for the
progression calculation; lowering an edited target must not redefine success.

The workout, its sets, state update, and `enrollment_advances` row commit in one
transaction. Store the projection version and make `advances.rs` use that same
projection so verification reproduces what actually drove progression.

If another device has already advanced or closed the enrollment, preserve the
submitted workout and record `not_applied_stale` as its progression disposition.
Do not apply yesterday's session to today's state. Return a receipt explaining
that the workout was recorded but did not move the program. Duplicate submissions
return the stored disposition and never attempt advancement again. This is the
explicit exception to normal advance-on-finish behavior for edited program work.

Standalone saved/ad-hoc sessions have no progression. Their revision snapshot can
be cached in advance; they do not need a program preparation request. Full offline
creation and syncing of the reusable library is deferred, but a local session can
be retained for “Save as workout” when connectivity returns.

## 5. API and compatibility

Proposed endpoint families:

| Endpoint | Purpose |
|---|---|
| `GET/POST /v1/workout-definitions` | List owned workouts; create a definition |
| `GET/PATCH/DELETE /v1/workout-definitions/{id}` | Read, create a new revision, or archive an owned definition |
| `GET /v1/workout-definitions/{id}/revisions/{revision}/session` | Materialize an accessible saved revision without starting training |
| `POST /v1/workout-definitions/{id}/copies` | Copy an accessible owned definition/revision |
| `POST /v1/workout-definitions/{id}/shares` | Create an unlisted link to a revision |
| `DELETE /v1/workout-definitions/{id}/shares/{share_id}` | Revoke an owned link |
| `GET /v1/shared-workouts/{token}` | Read a limited shared revision preview |
| `POST /v1/shared-workouts/{token}/copies` | Save a shared revision into the authenticated athlete's library |
| `POST /v2/session-drafts` | Prepare and return a program baseline for editing/logging |
| `POST /v2/workouts` | Record a session from any supported source |
| `GET /v2/workouts` and `GET /v2/workouts/{id}` | Source-aware history and details |
| `GET /v2/progress` | Generalized progress data with optional program associations |

New workout/session DTOs carry source, stable IDs, baseline references, and edits;
program context is optional and grouped. Responses return recorded results and
progression disposition, without a fabricated program progress denominator.
Use explicit unique OpenAPI operation IDs and regenerate both committed schemas.

Both API versions use the same workout-ID namespace and ownership checks. A retry
is recognized before current semantic validation; IDs owned by another athlete
must not disclose that athlete's data. New standalone IDs cannot be interpreted
as legacy enrollment workouts. Keep legacy reads scoped to legacy-compatible
records; v2 history reads both generations. Explicitly test these boundaries.

Queue entries persist their submission version and destination. Deploy support
for both versions before releasing the new frontend. Existing active sessions
and queued submissions retain their legacy path and semantics; new sessions use
the new contract. Do not rewrite queued bodies during an IndexedDB upgrade.

## 6. Interface, device storage, and reports

Add `/workouts` for My workouts, `/workouts/new`, `/workouts/{id}`, an editor,
and `/shared/workouts/{token}`. History remains `/history`. Train offers My
workouts/Create workout alongside program actions and always prioritizes Resume
when an active session exists. A shared preview offers Save a copy, then Start.

The definition editor and session editor share exercise/set controls. Explain
the save target through action labels: changes to “this session” versus changes
to a saved workout. Provide accessible move-up/down controls as well as any drag
interaction. Show title/exercise summaries instead of invented week/day labels.

Cache catalogue keys, labels, cues, and loading metadata before a new session
starts. Adding an exercise offline uses that cache. Rust performs prescription
rounding and plate calculation during online materialization. Offline additions
and target edits retain explicit athlete-entered values; the client must not
invent plate instructions or silently round to a loadable weight. Show numeric
weight without a plate diagram when a valid server calculation is unavailable.
Invalidate sequence-dependent plate changes after edits/reordering until valid
again. Submission preserves what was shown rather than retroactively correcting
the logged prescription. Document this bounded offline exception to materialized
prescription handling in D-11.

Migrate active local documents non-destructively, preserving legacy identity.
Move new technique targets to stable set IDs; maintain a resolver for old
session/position references. Saving edits must preserve completed results, notes,
and clips. Hand off active session to queue in one IndexedDB transaction before
clearing it from the screen; test storage failure and refresh at this boundary.
Account-scope new caches, drafts, and queue processing so switching accounts does
not submit or display another athlete's work; preserve older data for recovery.

Report actual work across all sources. Separate changes from the source
prescription, changes from the committed session plan, and added work. Do not
count added sets as prescribed program volume or let removed rows disappear from
the original workload. Avoid the word “compliance” in interface copy; use “drift”.

Pace and athlete-wide estimates include qualifying performed custom work using
existing eligibility rules. Program views include only their associated sessions
and label modified sessions. Duration comparisons use the same saved definition
when enough comparable history exists; ad-hoc work may return no comparison.
Maintain explicit comparison scope and sample counts in the new report contract.
Timing follows actual answer order with the existing invalid-clock handling;
removed rows have no event, and reordering must not invent or reverse intervals.

## 7. Delivery sequence

### Task 1 — Settle contracts and capture fixtures

- [x] Amend `CONTEXT.md` and the affected `docs/DESIGN.md` sections with the new
  vocabulary, ownership model, preparation boundary, and offline editing rules.
- [x] Define domain/DTO schemas and examples for saved, ad-hoc, unmodified
  program, modified program, removed main lift, and stale program submissions.
- [x] Add representative legacy active/queued document fixtures and baseline program
  fixtures, including repeated exercises and 5/3/1 top-set ties.
- [x] Specify stable ID mapping and progression projection before changing the
  logger. Add a focused contract test for each invariant the next tasks implement.

### Task 2 — Workout definitions and private library

- [x] Add definition/revision/share migrations and validated owned content types
  in new training/API modules; reuse `Loading` and existing session expansion.
- [x] Implement private CRUD, revision conflicts, archive, copy, and materialize.
- [x] Add ownership and revision tests; prove editing/archiving cannot mutate a
  materialized revision or another athlete's copy.
- [x] Register routes and schemas in `api/src/lib.rs`, `routes/mod.rs`, and
  `openapi.rs`; regenerate API artifacts.

### Task 3 — Generalized workout recording

- [x] Add the athlete backfill, source/identity/baseline schema, constraints, and
  indexes. Update legacy writes to populate ownership and enrollment revisions.
- [x] Implement program preparation, v2 validation, recording, stored receipts,
  stale-session disposition, and versioned progression projection.
- [x] Update `advances.rs` and `verify_advances` behavior for projected inputs;
  distinguish a valid stale/non-program record from a missing expected advance.
- [x] Verify rollback, retry, concurrent submissions, archived source content,
  legacy recording, and unchanged unmodified program progression.

### Task 4 — Source-aware history and reporting

- [x] Implement v2 history/progress and ownership-scoped pace queries. Extract
  shared query/report helpers where needed while preserving legacy contracts.
- [x] Compute baseline omissions, session-plan changes, added work, and actual
  totals separately; update timing for stable identity and actual event order.
- [x] Adapt history/dashboard/finish UI, including custom titles and the stale
  progression explanation. Analytics failures must not hide training actions.

### Task 5 — Library and session editor

- [x] Build My workouts, creation/edit/detail routes, and Train entry points.
- [x] Add shared editor components and pure local operations for blocks/sets.
- [x] Extend `LocalSession`, storage, queue, submit/BFF handling, and service
  worker caching for source-aware sessions and versioned submissions.
- [x] Add before/during-session editing, offline catalogue selection, correct
  plate-display invalidation, stable technique references, and save-as-workout.
- [x] Verify reload recovery, account separation, old IndexedDB fixtures,
  storage failure, and atomic queue handoff in browser tests.

### Task 6 — Optional sharing

- [x] Implement owner-controlled share creation/revocation and pinned preview.
- [x] Build limited shared preview and authenticated Save a copy flow; preserve
  the intended link through sign-in without exposing it to unrelated requests.
- [x] Test private-by-default behavior, token revocation, archive behavior
  (archive revokes active links), pinned revisions, and independent recipient
  edits. Copies already saved must remain usable.

### Task 7 — Release verification and rollout

- [x] Complete database-backed acceptance tests and browser flows below.
- [x] Regenerate OpenAPI, run operation-ID checks and breaking-change comparison.
- [x] Run backend fmt/clippy/tests and frontend check/lint/unit/build/browser
  checks using the repository's existing commands and CI configuration.
- [ ] Deploy schema/API support before enabling new frontend entry points.
  Disabling entry points must leave v2 submission/history available for queued
  work. Treat migrations as forward-compatible; do not drop new data on rollback.

Tasks 1–5 deliver private custom workouts and session editing. Task 6 adds the
optional sharing capability. Complete Task 7 for each enabled release slice.

## 8. Acceptance scenarios

- Create “Pull day”, start it, add an exercise offline, remove pending work,
  log sets, reload, finish offline, reconnect: exactly one recorded workout;
  no enrollment or training max changes.
- Start a saved revision, then edit/archive the saved workout elsewhere:
  the active session and its eventual history retain the captured content.
- Edit a program session before Start: history retains the original program
  targets as well as the athlete's chosen session plan.
- Add a heavier squat set to 5/3/1: it appears in actual work but cannot replace
  the original top set when computing progression. Removing that original top
  set supplies the existing not-performed outcome to the program.
- Remove a pending exercise after logging one of its sets: the logged result,
  note, timing, and technique clip remain attached to that same set.
- Reorder or insert pending sets: no existing set is renumbered as identity,
  no clip changes owner, and stale plate-change instructions disappear.
- Finish while another device has advanced: workout is recorded once with
  `not_applied_stale`; repeated submits cannot advance the current program.
- Verify recorded advances: reconstruction produces exactly the input used
  during submission, including omitted baseline work and excluded additions.
- Upgrade with a legacy active workout and older queued bodies: resume and
  submission still succeed through their original API contract.
- Share a revision, save a copy as another athlete, edit the original, then
  revoke the link: new preview/copy requests fail; the saved copy and its logs
  remain usable and privately owned by the recipient.
- Retry a definition save after a concurrent edit: no silent overwrite; the
  athlete's draft remains available to resolve the conflict.
- History and progress show custom and program work with accurate titles,
  source labels, drift, and totals, without fake week/day or program progress.

Release is complete when these scenarios pass and both older installed clients
and the new editor can record workouts against the deployed API. Local
implementation and verification are complete; production rollout is not part of
this change.

## 9. Implementation and verification record

Implemented the private workout library, immutable revisions, independent
copies, revocable pinned shares, source-aware session preparation/recording,
offline editing, account-scoped recovery, and source-aware history. Program
progression uses only captured original sets, never heavier added work. Stored
receipts make retries idempotent; stale program sessions remain recorded without
advancing newer enrollment state.

Verification completed locally against isolated PostgreSQL and Chromium:

- Backend: `cargo fmt --all --check`, workspace clippy with warnings denied, and
  `cargo test --workspace`: **267 tests passed**, including 18 new
  database-backed definition/editable-workout tests.
- Frontend: `npm run check` (zero errors/warnings), `npm run lint`,
  `npm run test:unit` (**265 passed**), and `npm run build` passed.
- Browser regression suite: **33 passed**. The four live-only tests are skipped
  in that run and were run separately against the isolated API: **4 passed**.
  Coverage includes offline edit/reload/queue handoff, an injected storage
  transaction failure, legacy document migration/submission, account separation,
  existing logger/technique behavior, CRUD, stale editor recovery, sharing/copy/
  revocation, and an actual ad-hoc submission appearing in history.
- OpenAPI regenerated byte-identically; all **40 operation IDs** are unique.
  All **18 existing paths and 62 existing schemas** compare structurally equal
  to `HEAD`, preserving the published contract. Generated TypeScript updated.
- A populated legacy database was upgraded through the two new migrations:
  existing ownership was backfilled, recorded loads remained unchanged, and old
  writers still populate ownership and increment enrollment revisions.
- Mobile library/editor/session/shared/history screenshots were inspected.
  Shared links and authenticated responses are excluded from service-worker
  caching; decimal input such as `20,25` records `20.25 kg` without rounding.
- `git diff --check` passed. No production deployment or commit was made.

See [Development](../../DEVELOPMENT.md) for the opt-in live browser command.
Deploy the migrations and API before the frontend. Keep v2 submission and history
available if frontend entry points need to be rolled back: queued sessions must
remain recoverable, and recorded data must not be dropped.
