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

// `main` is a thin exit-code translator and nothing else. `run`'s `?` covers
// every way this tool can fail to run at all — no `DATABASE_URL`, no
// connection, a query that errors — and all of those are the same outcome:
// exit `2`, because none of them means anything was found to be wrong with a
// fold, only that the question could not be asked. Letting `main` itself
// return `Result` would make that indistinguishable from the `findings > 0`
// case: `Termination`'s `Err` arm is exit `1`, the same code this tool uses
// for "here is what does not hold".
#[tokio::main]
async fn main() {
    match run().await {
        Ok(exit_code) => std::process::exit(exit_code),
        Err(err) => {
            eprintln!("error: {err}");
            std::process::exit(2);
        }
    }
}

async fn run() -> Result<i32, Box<dyn std::error::Error>> {
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
            println!(
                "enrolment {enrollment_id}: program {program_key} is not in the registry — skipped"
            );
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
        return Ok(1);
    }

    Ok(0)
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

    // An unrecognised `cut_reason` here, or an unrecognised `status` below, is
    // reconstruction failing — the same outcome `Ok(None)` already reports for
    // a workout with no row at all, and `Finding::FoldNotRun` is the variant
    // the design has for exactly this: "a stored session that will not
    // reconstruct". D-12 makes this vocabulary additive, so the day a new
    // value ships, an older binary must report that one workout could not be
    // refolded, not abort every other enrolment's audit with it. A genuine
    // `sqlx` error — a dropped connection, a missing table — is not a per-row
    // problem and still propagates with `?`.
    let cut_reason = match cut_reason {
        None => None,
        Some(reason) => match serde_json::from_value::<CutReason>(Value::String(reason)) {
            Ok(reason) => Some(reason),
            Err(_) => return Ok(None),
        },
    };

    let rows: Vec<WorkoutSetRow> = sqlx::query_as(
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
    for row in rows {
        // Through serde rather than a hand-written match: these enums already
        // derive `Deserialize` with `rename_all = "snake_case"`, which is the
        // same mapping the column's check constraint uses. A second match
        // here would be a second place for the vocabulary to drift.
        let Ok(status) = serde_json::from_value::<SetStatus>(Value::String(row.status)) else {
            return Ok(None);
        };

        sets.push(LoggedSet {
            exercise: row.exercise,
            position: u16::try_from(row.position).unwrap_or_default(),
            prescribed_weight: row.prescribed_weight,
            prescribed_reps: u32::try_from(row.prescribed_reps).unwrap_or_default(),
            actual_weight: row.actual_weight,
            actual_reps: row
                .actual_reps
                .map(|reps| u32::try_from(reps).unwrap_or_default()),
            status,
        });
    }

    Ok(Some(LoggedSession {
        week: u32::try_from(week).unwrap_or_default(),
        day: u32::try_from(day).unwrap_or_default(),
        sets,
        cut_reason,
    }))
}

/// One row of `workout_sets`, named rather than a seven-element tuple so the
/// query's columns read back as fields instead of positions.
#[derive(sqlx::FromRow)]
struct WorkoutSetRow {
    position: i16,
    exercise: String,
    prescribed_weight: f64,
    prescribed_reps: i16,
    actual_weight: Option<f64>,
    actual_reps: Option<i16>,
    status: String,
}
