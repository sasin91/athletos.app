//! Loads what `verify-advances` needs to check (D-19): every recorded advance
//! for one enrolment, each refolded by today's engine.
//!
//! This is the database-facing half of the verifier — `sqlx`, a pool, a
//! `Program` — split out from [`crate::audit`] on purpose. `audit` is the
//! rules and is pure; this is the fetching, and it is not. Splitting them is
//! also what makes the round trip testable at all: a `main` cannot be
//! `use`d by an integration test, so as long as this lived only in the
//! binary, the reconstruction — the only half of the verifier that can turn a
//! healthy history into a false divergence — had no automated coverage.

use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

use athletos_training::{CutReason, LoggedSession, LoggedSet, Program, SetStatus, State};

use crate::audit::RecordedAdvance;

/// Every recorded advance for one enrolment, in fold order, each refolded by
/// today's engine.
pub async fn load_advances(
    db: &PgPool,
    enrollment_id: Uuid,
    program: &dyn Program,
) -> Result<Vec<RecordedAdvance>, sqlx::Error> {
    // `advanced_at, workout_id` rather than `advanced_at` alone. The column's
    // default is `clock_timestamp()` (statement time), not `now()`
    // (transaction start time) — ordering by `advanced_at` only matches
    // lock-acquisition order, and therefore fold order, because the insert
    // that stamps it can only run while holding the enrolment's `for update`
    // lock (see `routes/workouts.rs`'s module header). Changing that default
    // back to `now()` for tidiness would silently break this ordering: two
    // overlapping submits could then be stamped out of lock order, and this
    // walk would read a healthy chain backwards. Even so, two rows sharing a
    // timestamp is implausible rather than impossible, so the walk still
    // wants a deterministic tiebreak — an arbitrary order among tied rows is
    // exactly the shape of a false `ChainBroken`.
    let rows: Vec<(Uuid, Value, Value, String, DateTime<Utc>)> = sqlx::query_as(
        "select workout_id, state_before, state_after, engine_version, advanced_at
         from enrollment_advances
         where enrollment_id = $1
         order by advanced_at, workout_id",
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
) -> Result<Option<LoggedSession>, sqlx::Error> {
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

    // `week` and `day` decline the same way: a value the column's own check
    // constraint should have kept non-negative but that this binary has no
    // business assuming. `unwrap_or_default` here would fabricate a `0` where
    // a real number belongs, and an invented input can only ever produce a
    // false `FoldDiverged` — the one outcome this tool exists to never
    // manufacture.
    let Ok(week) = u32::try_from(week) else {
        return Ok(None);
    };
    let Ok(day) = u32::try_from(day) else {
        return Ok(None);
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

        let Ok(position) = u16::try_from(row.position) else {
            return Ok(None);
        };
        let Ok(prescribed_reps) = u32::try_from(row.prescribed_reps) else {
            return Ok(None);
        };
        let actual_reps = match row.actual_reps {
            None => None,
            Some(reps) => match u32::try_from(reps) {
                Ok(reps) => Some(reps),
                Err(_) => return Ok(None),
            },
        };

        sets.push(LoggedSet {
            exercise: row.exercise,
            position,
            prescribed_weight: row.prescribed_weight,
            prescribed_reps,
            actual_weight: row.actual_weight,
            actual_reps,
            status,
        });
    }

    Ok(Some(LoggedSession {
        week,
        day,
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
