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

use serde_json::Value;
use sqlx::postgres::PgPoolOptions;
use uuid::Uuid;

use athletos_api::advances::load_advances;
use athletos_api::audit::{audit, Finding};

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
