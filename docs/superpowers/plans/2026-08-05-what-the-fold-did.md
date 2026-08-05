# What the fold did — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record every `advance()` so a wrong fold can be found and recomputed, and ship a binary that finds one.

**Architecture:** One additive table written inside the transaction that already advances the program; one pure comparison module with no database and no registry; one offline binary that loads, recomputes and reports. The pure module is where the rules live, exactly as `timing.rs` and `report.rs` are for theirs.

**Tech Stack:** Rust (axum, sqlx, serde_json, chrono, uuid) · Postgres 17.

**Spec:** `docs/superpowers/specs/2026-08-05-what-the-fold-did-design.md` — read it before Task 1. Every "why" below is argued there.

## Global Constraints

- **Additive-only inside `/v1` (D-12).** This change adds no endpoint and no response field. If you find yourself editing a DTO, stop — it is out of scope.
- **The migration is additive, nullable where it can be, and never backfilled (D-17).** A rolling deploy runs two releases against one database by design.
- **`State` is opaque (D-03).** Nothing outside a program may read it to make a decision. Comparing two states for equality is not reading them: `audit.rs` compares `serde_json::Value`s structurally and never inspects a key.
- **All comparisons are structural, over parsed JSON — never string equality.** `jsonb` normalises key order and whitespace on the way in and `serde_json::Value` compares by structure on the way out. A string comparison anywhere makes this tool cry wolf on every row it reads.
- **The verifier reports and never repairs.** No `--fix`, no writes, no `migrate()`. It is read-only against a database it is inspecting.
- **`engine_version` is the API crate's `CARGO_PKG_VERSION`.** Coarse on purpose — a hint for a human investigating a divergence, not a dispatch key.
- **The repo's comment style is dense and argues its decisions.** Doc comments carrying the reasoning are part of the deliverable, not decoration.
- **Weights and states are stored as they are.** No rounding, no normalising, no "tidying" of stored JSON.

**Commands.** Backend: `cd backend && DATABASE_URL=postgres://postgres:athletos@127.0.0.1:5433/athletos cargo test -p athletos-api`. Note **port 5433** — `docs/DEVELOPMENT.md` says 5432 and is stale; do not edit it. Gates, both hard in CI: `cargo fmt --all --check` and `cargo clippy --workspace --all-targets -- -D warnings`.

---

### Task 1: The table, and writing to it

**Files:**
- Create: `backend/crates/api/migrations/20260805130000_enrollment_advances.sql`
- Modify: `backend/crates/api/src/routes/workouts.rs` (the `submit` handler's advance branch)
- Test: `backend/crates/api/tests/training.rs`

**Interfaces:**
- Consumes: nothing.
- Produces: the `enrollment_advances` table with columns `workout_id`, `enrollment_id`, `state_before`, `state_after`, `engine_version`, `advanced_at`. Tasks 2 and 3 read it.

- [ ] **Step 1: Write the migration**

Create `backend/crates/api/migrations/20260805130000_enrollment_advances.sql`:

```sql
-- What every fold did, so a wrong one can be found (D-19).
--
-- `advance(state, logged) -> state` is a pure fold and `enrollments.state`
-- keeps only its latest result. D-09 already names the fear — "a 5/3/1 training
-- max jumping 5 kg instead of 2.5, silently, permanently" — and answers only
-- the half where it happens twice. Without this table a wrong advance is not
-- merely undetected, it is unfixable: the inputs are gone and the repair is
-- editing JSON in production.
--
-- Additive, no backfill (D-12, D-17). Enrolments already running have advanced
-- many times with no record and never will have one. `verify-advances` must
-- read "no rows" as *nothing to check*, never as *nothing wrong*.
create table enrollment_advances (
    -- The workout that caused this advance, and the primary key: one advance
    -- per workout is a schema fact rather than a convention, so a retry that
    -- somehow reached the advancing branch would be refused by the database
    -- rather than quietly appending a second row.
    workout_id     uuid        primary key references workouts (id) on delete cascade,
    enrollment_id  uuid        not null references enrollments (id),

    -- The fold's input and output, verbatim. Opaque here exactly as they are in
    -- `enrollments.state` (D-03): this table stores them and never reads them.
    state_before   jsonb       not null,
    state_after    jsonb       not null,

    -- The API crate's version at the moment of the fold. Coarse on purpose —
    -- two builds of one version can differ — because it is a hint for a person
    -- investigating a divergence the verifier has already found, not the
    -- mechanism that finds it.
    engine_version text        not null,

    advanced_at    timestamptz not null default now()
);

-- The verifier walks one enrolment at a time, in fold order.
create index enrollment_advances_enrollment_idx
    on enrollment_advances (enrollment_id, advanced_at);
```

- [ ] **Step 2: Write the failing tests**

Append to `backend/crates/api/tests/training.rs`. The file already has `server`, `register`, `set_maxes`, `full_maxes`, `enrol`, `next_session`, `logged_as_prescribed` (:105) and `log_a_session` (:152).

```rust
/// The enrolment's state as Postgres holds it, for tests that need to see the
/// fold from outside the engine.
async fn stored_state(pool: &PgPool, enrollment: Uuid) -> serde_json::Value {
    sqlx::query_scalar("select state from enrollments where id = $1")
        .bind(enrollment)
        .fetch_one(pool)
        .await
        .expect("the enrolment exists")
}

#[sqlx::test]
async fn advancing_records_what_the_fold_did(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    let before = stored_state(&pool, enrollment).await;
    let workout = log_a_session(&server, &token, enrollment).await;
    let after = stored_state(&pool, enrollment).await;

    let (recorded_workout, recorded_enrollment, state_before, state_after, engine_version): (
        Uuid,
        Uuid,
        serde_json::Value,
        serde_json::Value,
        String,
    ) = sqlx::query_as(
        "select workout_id, enrollment_id, state_before, state_after, engine_version
         from enrollment_advances",
    )
    .fetch_one(&pool)
    .await
    .expect("exactly one advance was recorded");

    assert_eq!(recorded_workout, workout);
    assert_eq!(recorded_enrollment, enrollment);
    // The fold's input is the state as it stood *before* the submit, and its
    // output is what the submit persisted. Both compared structurally.
    assert_eq!(state_before, before);
    assert_eq!(state_after, after);
    assert!(!engine_version.is_empty());
}

#[sqlx::test]
async fn a_retried_submit_records_no_second_advance(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    let body = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);

    for _ in 0..2 {
        server
            .post("/v1/workouts")
            .authorization_bearer(&token)
            .json(&body)
            .await;
    }

    // A retry does not advance, so it has nothing to record. The primary key
    // would refuse a second row anyway, which is the belt to this braces.
    let advances: i64 = sqlx::query_scalar("select count(*) from enrollment_advances")
        .fetch_one(&pool)
        .await
        .unwrap();

    assert_eq!(advances, 1);
}
```

- [ ] **Step 3: Run to verify it fails**

Run: `cd backend && DATABASE_URL=postgres://postgres:athletos@127.0.0.1:5433/athletos cargo test -p athletos-api --test training advance`
Expected: FAIL — `relation "enrollment_advances" does not exist`, or a row count of 0.

- [ ] **Step 4: Record the advance**

In `submit` in `backend/crates/api/src/routes/workouts.rs`, in the branch that actually inserted — after `let advanced = program.advance(program_state, &logged)?;` and its `progress` call, beside the `update enrollments` write and **before** `tx.commit()`.

You need the state as it was before the fold. `program_state` is moved into `advance()`, so capture its JSON first:

```rust
    // Captured before the fold consumes it. Cloning an already-decoded value is
    // cheaper than reading the row again, and reading it again would be reading
    // it at a different moment.
    let state_before = program_state.as_json().clone();

    let advanced = program.advance(program_state, &logged)?;
    let progress = program.progress(&advanced)?;
```

Then, after the `update enrollments` statement:

```rust
    // What the fold did, so a wrong one can be found later (D-19).
    //
    // Inside the transaction that already holds this enrolment's `for update`
    // lock, beside the state write it describes — so the record and the state
    // it records can never disagree. Only this branch advances; the two retry
    // branches have nothing to record.
    sqlx::query(
        "insert into enrollment_advances
             (workout_id, enrollment_id, state_before, state_after, engine_version)
         values ($1, $2, $3::jsonb, $4::jsonb, $5)",
    )
    .bind(body.id)
    .bind(body.enrollment_id)
    .bind(&state_before)
    .bind(advanced.as_json())
    .bind(env!("CARGO_PKG_VERSION"))
    .execute(&mut *tx)
    .await?;
```

- [ ] **Step 5: Run to verify it passes**

Run: `cd backend && DATABASE_URL=postgres://postgres:athletos@127.0.0.1:5433/athletos cargo test -p athletos-api --test training advance`
Expected: PASS, both.

- [ ] **Step 6: Run the whole suite and both gates**

```bash
cd backend
DATABASE_URL=postgres://postgres:athletos@127.0.0.1:5433/athletos cargo test --workspace
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
```
Expected: all green and both gates silent. If `cargo fmt --all` moves a file this branch has not touched, stop and report rather than committing.

- [ ] **Step 7: Commit**

```bash
git add backend/crates/api/migrations/20260805130000_enrollment_advances.sql \
        backend/crates/api/src/routes/workouts.rs \
        backend/crates/api/tests/training.rs
git commit -m "workouts: keep what the fold did"
```

---

### Task 2: `audit.rs` — the comparison rules

**Files:**
- Create: `backend/crates/api/src/audit.rs`
- Modify: `backend/crates/api/src/lib.rs` (add `pub mod audit;` beside `pub mod report;`)
- Test: inline `#[cfg(test)] mod tests` in `audit.rs`

**Interfaces:**
- Consumes: nothing from Task 1 at compile time — this module never touches a database.
- Produces: `audit::RecordedAdvance { workout_id: Uuid, engine_version: String, state_before: Value, state_after: Value, recomputed: Option<Value> }`; `audit::Finding`; `audit::Audit { enrollment_id: Uuid, advances: usize, findings: Vec<Finding> }`; `audit::audit(enrollment_id: Uuid, current_state: &Value, advances: &[RecordedAdvance]) -> Audit`. Task 3 calls `audit`.

**These tests are the spec's fabricated-damage cases**, at the level where the
rules actually live: a clean history reports clean, a hand-corrupted
`state_after` is reported, a deleted middle row is caught by the *chain* check
rather than the fold check — which is what distinguishes the two — and an
enrolment with no advances reports *nothing recorded* rather than *clean*. No
database is needed to prove any of them, which is why the module is pure.

- [ ] **Step 1: Write the failing tests**

Create `backend/crates/api/src/audit.rs` containing the module doc and a test module only:

```rust
//! Whether the folds an enrolment recorded still hold (D-19).
//!
//! Three checks, and they fail differently — which is why there are three
//! rather than one:
//!
//!  * **the chain** — each advance's `state_before` must equal the previous
//!    advance's `state_after`. Runs no program code and catches a *missing*
//!    row, a workout that advanced without being recorded, even when the
//!    engine is perfect.
//!  * **the fold** — today's `advance()`, run from the stored `state_before`
//!    over the stored session, must reproduce the stored `state_after`.
//!  * **the head** — the last `state_after` must equal the enrolment's current
//!    state. Catches a state changed by something that was not a fold.
//!
//! Pure, and takes only what it uses: no database, no registry, no clock. The
//! recompute happens in the caller, which is the thing that holds a `Program`,
//! and arrives here as a value to be compared. That is what keeps these rules
//! testable with plain JSON.
//!
//! Every comparison is **structural**, over parsed values. `jsonb` normalises
//! key order and whitespace on the way in and `serde_json::Value` compares by
//! structure on the way out, so neither side can report a difference that is
//! only formatting — and comparing as strings anywhere would make this cry
//! wolf on every row it reads.
//!
//! Nothing here reads *into* a state. Comparing two opaque blobs for equality
//! is not interpreting them, which is what keeps this the right side of D-03.

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn id(n: u8) -> Uuid {
        Uuid::from_bytes([n; 16])
    }

    fn advance(n: u8, before: serde_json::Value, after: serde_json::Value) -> RecordedAdvance {
        RecordedAdvance {
            workout_id: id(n),
            engine_version: "0.1.0".to_owned(),
            recomputed: Some(after.clone()),
            state_before: before,
            state_after: after,
        }
    }

    #[test]
    fn a_clean_history_reports_nothing() {
        let advances = [
            advance(1, json!({ "cycle": 1 }), json!({ "cycle": 2 })),
            advance(2, json!({ "cycle": 2 }), json!({ "cycle": 3 })),
        ];

        let result = audit(id(9), &json!({ "cycle": 3 }), &advances);

        assert_eq!(result.advances, 2);
        assert!(result.findings.is_empty(), "{:?}", result.findings);
    }

    #[test]
    fn nothing_recorded_is_not_the_same_as_nothing_wrong() {
        // The most dangerous output this tool can produce is a clean report
        // over an empty table, so the count is part of the result rather than
        // something the caller has to infer from an empty findings list.
        let result = audit(id(9), &json!({ "cycle": 3 }), &[]);

        assert_eq!(result.advances, 0);
        assert!(result.findings.is_empty());
    }

    #[test]
    fn a_gap_in_the_chain_is_found_without_running_the_engine() {
        // The middle advance is missing: the second row's `state_before` is a
        // state no recorded advance produced. `recomputed` agrees with
        // `state_after` on both rows, so only the chain check can see this.
        let advances = [
            advance(1, json!({ "cycle": 1 }), json!({ "cycle": 2 })),
            advance(2, json!({ "cycle": 3 }), json!({ "cycle": 4 })),
        ];

        let result = audit(id(9), &json!({ "cycle": 4 }), &advances);

        assert_eq!(
            result.findings,
            vec![Finding::ChainBroken {
                workout_id: id(2),
                previous_workout_id: id(1),
            }]
        );
    }

    #[test]
    fn the_first_advance_is_exempt_from_the_chain() {
        // It has no predecessor, which is the same fact as the table starting
        // mid-history: there is nothing before the first row we ever wrote.
        let advances = [advance(1, json!({ "cycle": 7 }), json!({ "cycle": 8 }))];

        let result = audit(id(9), &json!({ "cycle": 8 }), &advances);

        assert!(result.findings.is_empty(), "{:?}", result.findings);
    }

    #[test]
    fn a_fold_that_no_longer_reproduces_is_found() {
        let mut advances = [advance(1, json!({ "cycle": 1 }), json!({ "cycle": 2 }))];
        advances[0].recomputed = Some(json!({ "cycle": 99 }));

        let result = audit(id(9), &json!({ "cycle": 2 }), &advances);

        assert_eq!(
            result.findings,
            vec![Finding::FoldDiverged {
                workout_id: id(1),
                engine_version: "0.1.0".to_owned(),
            }]
        );
    }

    #[test]
    fn a_fold_that_could_not_be_run_is_reported_as_that_and_not_as_agreement() {
        let mut advances = [advance(1, json!({ "cycle": 1 }), json!({ "cycle": 2 }))];
        advances[0].recomputed = None;

        let result = audit(id(9), &json!({ "cycle": 2 }), &advances);

        assert_eq!(
            result.findings,
            vec![Finding::FoldNotRun { workout_id: id(1) }]
        );
    }

    #[test]
    fn a_state_that_moved_without_a_fold_is_found_at_the_head() {
        let advances = [advance(1, json!({ "cycle": 1 }), json!({ "cycle": 2 }))];

        let result = audit(id(9), &json!({ "cycle": 50 }), &advances);

        assert_eq!(
            result.findings,
            vec![Finding::HeadDiverged {
                workout_id: id(1),
            }]
        );
    }

    #[test]
    fn key_order_is_not_a_difference() {
        // The one way this tool could be useless: reporting formatting as
        // divergence. `serde_json::Value` compares maps structurally.
        let before = json!({ "cycle": 1, "week": 2 });
        let after = json!({ "week": 3, "cycle": 1 });
        let advances = [advance(1, before, after)];

        let result = audit(id(9), &json!({ "cycle": 1, "week": 3 }), &advances);

        assert!(result.findings.is_empty(), "{:?}", result.findings);
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && cargo test -p athletos-api audit`
Expected: FAIL — the `audit` module is not declared and none of its types exist.

- [ ] **Step 3: Implement it**

Add `pub mod audit;` to `backend/crates/api/src/lib.rs` beside `pub mod report;`, and above the test module in `audit.rs`:

```rust
use serde_json::Value;
use uuid::Uuid;

/// One recorded advance, plus what today's engine makes of it.
///
/// `recomputed` is `None` when the fold could not be run at all — a program no
/// longer in the registry, a stored session that will not reconstruct. That is
/// deliberately a third outcome and not folded into "diverged": one says the
/// engine disagrees, the other says nobody asked it.
#[derive(Debug, Clone)]
pub struct RecordedAdvance {
    pub workout_id: Uuid,
    pub engine_version: String,
    pub state_before: Value,
    pub state_after: Value,
    pub recomputed: Option<Value>,
}

/// Something that does not hold. Never a repair, and never a verdict about
/// whether it is a bug — a deliberate fix to `advance()` makes every prior fold
/// diverge, correctly, which is what `engine_version` exists to make legible.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Finding {
    /// This advance did not start from where the previous one finished.
    ChainBroken {
        workout_id: Uuid,
        previous_workout_id: Uuid,
    },
    /// Today's engine, from the stored input, produces something else.
    FoldDiverged {
        workout_id: Uuid,
        engine_version: String,
    },
    /// The fold could not be run, so nothing is claimed about it either way.
    FoldNotRun { workout_id: Uuid },
    /// The enrolment's current state is not where the last recorded fold left
    /// it — so something other than an advance moved it.
    HeadDiverged { workout_id: Uuid },
}

/// One enrolment's verdict.
#[derive(Debug, Clone, PartialEq)]
pub struct Audit {
    pub enrollment_id: Uuid,
    /// How many advances were examined. Reported separately from `findings`
    /// because zero-and-clean and many-and-clean are different answers, and
    /// only one of them is reassuring.
    pub advances: usize,
    pub findings: Vec<Finding>,
}

/// Checks one enrolment's recorded advances.
///
/// `advances` must be in fold order — which is `advanced_at` order, and which
/// the caller already has because that is the index it walks.
pub fn audit(enrollment_id: Uuid, current_state: &Value, advances: &[RecordedAdvance]) -> Audit {
    let mut findings = Vec::new();

    for (index, advance) in advances.iter().enumerate() {
        if let Some(previous) = index.checked_sub(1).map(|i| &advances[i]) {
            if advance.state_before != previous.state_after {
                findings.push(Finding::ChainBroken {
                    workout_id: advance.workout_id,
                    previous_workout_id: previous.workout_id,
                });
            }
        }

        match &advance.recomputed {
            None => findings.push(Finding::FoldNotRun {
                workout_id: advance.workout_id,
            }),
            Some(recomputed) if *recomputed != advance.state_after => {
                findings.push(Finding::FoldDiverged {
                    workout_id: advance.workout_id,
                    engine_version: advance.engine_version.clone(),
                });
            }
            Some(_) => {}
        }
    }

    if let Some(last) = advances.last() {
        if last.state_after != *current_state {
            findings.push(Finding::HeadDiverged {
                workout_id: last.workout_id,
            });
        }
    }

    Audit {
        enrollment_id,
        advances: advances.len(),
        findings,
    }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && cargo test -p athletos-api audit`
Expected: PASS, all eight.

- [ ] **Step 5: Gates and commit**

```bash
cd backend && cargo fmt --all --check && cargo clippy --workspace --all-targets -- -D warnings
git add backend/crates/api/src/audit.rs backend/crates/api/src/lib.rs
git commit -m "audit: three checks that fail differently"
```

---

### Task 3: `verify-advances`

**Files:**
- Create: `backend/crates/api/src/bin/verify_advances.rs`
- Modify: `backend/crates/api/Cargo.toml` (a fourth `[[bin]]` entry)

**Interfaces:**
- Consumes: `athletos_api::audit::{audit, Audit, Finding, RecordedAdvance}` from Task 2; the `enrollment_advances` table from Task 1.
- Produces: a binary. Nothing depends on it.

- [ ] **Step 1: Register the binary**

Append to `backend/crates/api/Cargo.toml`, matching the three entries already there:

```toml
[[bin]]
name = "verify-advances"
path = "src/bin/verify_advances.rs"
```

- [ ] **Step 2: Write the binary**

Create `backend/crates/api/src/bin/verify_advances.rs`. `set_password.rs` is the shape to follow — `dotenvy`, `DATABASE_URL`, a small pool, no server.

```rust
//! Checks that every recorded fold still holds (D-19).
//!
//! ```text
//! cargo run -p athletos-api --bin verify-advances
//! ```
//!
//! Read-only, and deliberately so. There is no `--fix`: the data needed to
//! recompute an enrolment forward from a known-good `state_before` now exists,
//! and using it is a human act — the same instinct as D-04's *watch it, do not
//! touch it*. A training max moves through `advance()` or it does not move.
//!
//! **It does not run migrations**, unlike `set-password`. A tool whose whole
//! purpose is to inspect a database without changing it has no business
//! altering its schema on the way in.
//!
//! A divergence is not a verdict. Deliberately fixing `advance()` makes every
//! prior fold diverge, correctly; `engine_version` is printed so a person can
//! tell that case from a regression.
//!
//! Exit codes: `0` nothing to report, `1` findings, `2` it could not run.

use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use uuid::Uuid;

use athletos_api::audit::{audit, Finding, RecordedAdvance};
use athletos_training::{CutReason, LoggedSession, LoggedSet, SetStatus, State};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _ = dotenvy::dotenv();

    let database_url = std::env::var("DATABASE_URL").map_err(|_| {
        eprintln!("usage: verify-advances    # DATABASE_URL must be set");
        "DATABASE_URL is not set"
    })?;

    let db = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await?;

    let enrollments: Vec<(Uuid, String, Value)> =
        sqlx::query_as("select id, program_key, state from enrollments order by started_at")
            .fetch_all(&db)
            .await?;

    let mut findings = 0_usize;
    let mut unrecorded = 0_usize;

    for (enrollment_id, program_key, current_state) in enrollments {
        let Some(program) = athletos_training::programs::find(&program_key) else {
            println!("enrolment {enrollment_id}: program {program_key} is not in the registry — skipped");
            findings += 1;
            continue;
        };

        let advances = load_advances(&db, enrollment_id, program).await?;
        let result = audit(enrollment_id, &current_state, &advances);

        if result.advances == 0 {
            // Not the same as clean, and saying so is the point: every
            // enrolment that predates this table reports here, forever.
            println!("enrolment {enrollment_id} ({program_key}): no advances recorded — nothing to check");
            unrecorded += 1;
            continue;
        }

        if result.findings.is_empty() {
            println!(
                "enrolment {enrollment_id} ({program_key}): {} advances, all hold",
                result.advances
            );
            continue;
        }

        println!(
            "enrolment {enrollment_id} ({program_key}): {} advances, {} findings",
            result.advances,
            result.findings.len()
        );
        for finding in &result.findings {
            findings += 1;
            match finding {
                Finding::ChainBroken { workout_id, previous_workout_id } => println!(
                    "  chain: workout {workout_id} does not start where {previous_workout_id} finished"
                ),
                Finding::FoldDiverged { workout_id, engine_version } => println!(
                    "  fold:  workout {workout_id} was folded by engine {engine_version}; today's engine disagrees"
                ),
                Finding::FoldNotRun { workout_id } => println!(
                    "  fold:  workout {workout_id} could not be refolded — nothing is claimed about it"
                ),
                Finding::HeadDiverged { workout_id } => println!(
                    "  head:  the enrolment's state is not where workout {workout_id} left it"
                ),
            }
        }
    }

    if unrecorded > 0 {
        println!("\n{unrecorded} enrolment(s) have no recorded advances. That is not a clean bill of health — it is the absence of one.");
    }

    if findings > 0 {
        println!("\n{findings} finding(s). Nothing has been changed.");
        std::process::exit(1);
    }

    Ok(())
}

/// Every recorded advance for one enrolment, in fold order, each refolded by
/// today's engine.
async fn load_advances(
    db: &PgPool,
    enrollment_id: Uuid,
    program: &'static dyn athletos_training::Program,
) -> Result<Vec<RecordedAdvance>, Box<dyn std::error::Error>> {
    let rows: Vec<(Uuid, Value, Value, String, DateTime<Utc>)> = sqlx::query_as(
        "select workout_id, state_before, state_after, engine_version, advanced_at
         from enrollment_advances
         where enrollment_id = $1
         order by advanced_at",
    )
    .bind(enrollment_id)
    .fetch_all(db)
    .await?;

    let mut advances = Vec::with_capacity(rows.len());

    for (workout_id, state_before, state_after, engine_version, _) in rows {
        let recomputed = match logged_session(db, workout_id).await? {
            Some(logged) => program
                .advance(State::from_json(state_before.clone()), &logged)
                .ok()
                .map(|state| state.as_json().clone()),
            None => None,
        };

        advances.push(RecordedAdvance {
            workout_id,
            engine_version,
            state_before,
            state_after,
            recomputed,
        });
    }

    Ok(advances)
}

/// Reconstructs the fold's other input from the rows it was built from.
///
/// Not stored alongside the states, deliberately: `week`, `day` and
/// `cut_reason` are on `workouts` and the sets are on `workout_sets`, so
/// storing it again would be a copy that can drift from the rows it duplicates.
async fn logged_session(
    db: &PgPool,
    workout_id: Uuid,
) -> Result<Option<LoggedSession>, Box<dyn std::error::Error>> {
    let Some((week, day, cut_reason)): Option<(i16, i16, Option<String>)> =
        sqlx::query_as("select week, day, cut_reason from workouts where id = $1")
            .bind(workout_id)
            .fetch_optional(db)
            .await?
    else {
        return Ok(None);
    };

    let rows: Vec<(i16, String, f64, i16, Option<f64>, Option<i16>, String)> = sqlx::query_as(
        "select \"position\", exercise, prescribed_weight::float8, prescribed_reps,
                actual_weight::float8, actual_reps, status
         from workout_sets
         where workout_id = $1
         order by \"position\"",
    )
    .bind(workout_id)
    .fetch_all(db)
    .await?;

    let mut sets = Vec::with_capacity(rows.len());
    for (position, exercise, prescribed_weight, prescribed_reps, actual_weight, actual_reps, status) in
        rows
    {
        sets.push(LoggedSet {
            exercise,
            position: u16::try_from(position).unwrap_or_default(),
            prescribed_weight,
            prescribed_reps: u32::try_from(prescribed_reps).unwrap_or_default(),
            actual_weight,
            actual_reps: actual_reps.map(|reps| u32::try_from(reps).unwrap_or_default()),
            // Through serde rather than a hand-written match: these enums
            // already derive `Deserialize` with `rename_all = "snake_case"`,
            // which is the same mapping the column's check constraint uses. A
            // second match here would be a second place for the vocabulary to
            // drift.
            status: serde_json::from_value::<SetStatus>(Value::String(status))?,
        });
    }

    Ok(Some(LoggedSession {
        week: u32::try_from(week).unwrap_or_default(),
        day: u32::try_from(day).unwrap_or_default(),
        sets,
        cut_reason: cut_reason
            .map(|reason| serde_json::from_value::<CutReason>(Value::String(reason)))
            .transpose()?,
    }))
}
```

All five imports resolve at the training crate's root — `CutReason`,
`LoggedSession`, `LoggedSet` and `SetStatus` are re-exported from `session` and
`State` from `program`, at `backend/crates/training/src/lib.rs:66-67`. Checked
while writing this plan; you should not need to add a re-export, and if you
think you do, the binary adapts to the crate rather than the other way round.

- [ ] **Step 3: Build it**

Run: `cd backend && cargo build -p athletos-api --bin verify-advances`
Expected: builds clean, no warnings. An unused import is a clippy failure in this repo, so remove anything you added while exploring.

- [ ] **Step 4: Run it against the development database**

```bash
cd backend && DATABASE_URL=postgres://postgres:athletos@127.0.0.1:5433/athletos cargo run -p athletos-api --bin verify-advances
```

Expected: it reports every existing enrolment as having **no advances recorded**, and says plainly that this is not a clean bill of health. Exit code 0.

Then log a session against a fresh enrolment and run it again — that enrolment should report one advance holding. Record both outputs in your report.

- [ ] **Step 5: Gates and commit**

```bash
cd backend && cargo fmt --all --check && cargo clippy --workspace --all-targets -- -D warnings
git add backend/crates/api/Cargo.toml backend/crates/api/src/bin/verify_advances.rs
git commit -m "verify-advances: walk the folds and say what does not hold"
```

---

### Task 4: D-19

**Files:**
- Modify: `docs/DESIGN.md` (a new decision after D-18, before `## Open`)

A decision in `docs/DESIGN.md` is binding until it is amended there, and this change introduces architecture that no decision currently covers. Writing D-19 is not documentation — it is the part that makes the rest legitimate.

- [ ] **Step 1: Read the voice before writing**

Read D-15 and D-18 in `docs/DESIGN.md`. They are the closest in size and shape to what you are writing. Note what they have in common: a claim, the reasoning, the alternative that was rejected and *why it was rejected rather than merely costed*, and an honest statement of what the decision does not solve.

- [ ] **Step 2: Write D-19**

Add `## D-19 · What the fold did` after D-18 and before `## Open`. It must cover, in prose, in that voice:

**The hole.** `advance(state, logged) -> state` is a pure fold and `enrollments.state` keeps only its latest result, with no version and no history. A wrong fold is therefore not merely undetected but unfixable — the inputs are gone. Quote D-09's own words for the fear it already named and answered only half of: *"a 5/3/1 training max jumping 5 kg instead of 2.5, silently, permanently."* Note that nothing else in the system has this property: every other fact is either immutable and stored or derivable from what is stored.

**Event sourcing, evaluated and declined.** Say how well it fits before saying why not, because it fits better than the conclusion suggests: `advance()` is already `apply(state, event)`; `workout_sets` is already append-only and never updated or deleted; the offline client is already an event producer with client-minted ids and idempotent delivery (D-09); and the read model chosen in *Over time* is already CQRS-shaped.

Then the collision, which is the reason and not a cost: replay means running **today's** engine over yesterday's sessions, producing the state today's code would have made rather than the state the athlete trained under — and D-03 already ruled the other way, snapshotting maxes at enrolment so that *"editing a max mid-block must not retroactively rewrite sessions the athlete was already shown"*, because drift is measured against the `prescribed_weight` that was displayed (D-07). Full event sourcing makes current state a function of current code by construction; this product's central measurement is defined against what was on the screen. Reconciling them means versioning the engine and pinning every replay — the expensive half of the pattern, bought to defend a property that costs nothing today because nothing replays.

Add the three lesser objections: a `jsonb` payload carries none of the check constraints this schema leans on; event schema versioning is D-12's additive-only discipline on a second surface, permanently, and an old event can never be retired; and a projection rebuild nobody runs is D-18's untested-backup argument in different clothes. And that the operational wins need scale D-16 refuses.

**What was taken instead.** `enrollment_advances`: one row per advance, keyed by the workout, written inside the transaction that already holds the enrolment's lock. It is **not an event log** — nothing subscribes, nothing projects, nothing is rebuilt from it. It is an audit of one function.

**What it costs and does not solve.** It starts mid-history and always will: enrolments already running have advanced many times with no record, and `verify-advances` reports that as *nothing recorded* rather than as clean, because a clean report over an empty table is the most dangerous output the tool can produce. `engine_version` is coarse — the crate version, not a commit — because it is a hint for a person investigating a divergence the verifier already found, not the mechanism that finds it. And the tool reports rather than repairs, so the fix remains a deliberate human act.

**One thing it turned out to also do.** *Over time* derives its training-max line from `state_before` here, because `readout()` is a pure function of state. Note this as a caution rather than a win: a table justified by one purpose acquiring a second is how tables end up serving neither, and the guard is that nothing about this schema bends toward the chart.

- [ ] **Step 3: Self-review**

Re-read what you wrote against D-15 and D-18. If it reads like a changelog or a summary rather than an argument, rewrite it. Check that every quotation from D-03, D-07, D-09 and D-12 is accurate — open those decisions and compare the words.

- [ ] **Step 4: Do not touch `CONTEXT.md`**

Deliberately unchanged. This introduces no vocabulary the athlete ever sees —
`enrollment_advances` and `verify-advances` are machinery, and adding them to a
glossary of the language the product speaks would be a category error. If you
believe a term is needed, report it rather than adding one.

- [ ] **Step 5: Commit**

```bash
git add docs/DESIGN.md
git commit -m "A decision for the one thing that could not be undone"
```

---

## Verification before calling it done

- [ ] `cd backend && DATABASE_URL=... cargo test --workspace` — green.
- [ ] `cargo fmt --all --check` and `cargo clippy --workspace --all-targets -- -D warnings` — both silent.
- [ ] `cargo run -p athletos-api --bin verify-advances` runs against the development database and distinguishes *no advances recorded* from *all hold*, with both cases actually observed.
- [ ] `git diff --stat` against the branch point touches only: one migration, `workouts.rs`, `training.rs`, `audit.rs`, `lib.rs`, `Cargo.toml`, `verify_advances.rs`, `docs/DESIGN.md`.
- [ ] No API DTO changed, and `backend/openapi.json` is untouched.
