//! Fixtures shared by this crate's tests, its integration tests, and — from
//! phase 3 — the API's.
//!
//! Compiled unconditionally rather than behind `#[cfg(test)]`, because an
//! integration test is a separate crate and cannot see this one's test-only
//! items. It is a handful of numbers; the alternative is the same numbers
//! copied into three places and drifting.

use crate::{LoggedSession, LoggedSet, Session, SetStatus};

/// An athlete with a max for every lift the compiled-in programs ask about.
///
/// Deliberately round numbers that are *not* all loadable at every percentage,
/// so that a test which accidentally stops rounding shows it.
pub fn maxes() -> crate::Maxes {
    [
        ("squat", 140.0),
        ("bench", 100.0),
        ("deadlift", 180.0),
        ("military-press", 60.0),
    ]
    .into_iter()
    .collect()
}

/// A session logged exactly as prescribed: every set done, every rep made.
pub fn logged_as_prescribed(session: &Session) -> LoggedSession {
    log_session(session, |_, _| true)
}

/// A session logged as prescribed except that the heaviest set of `exercise`
/// came up short — the AMRAP miss an adaptive program has to react to.
pub fn logged_missing_top_set(session: &Session, exercise: &str) -> LoggedSession {
    let heaviest = session
        .blocks
        .iter()
        .filter(|block| block.exercise == exercise)
        .flat_map(|block| block.lifts.iter())
        .map(|lift| lift.load.weight)
        .fold(f64::MIN, f64::max);

    log_session(session, |set_exercise, weight| {
        set_exercise != exercise || weight < heaviest
    })
}

/// Expands a prescription into logged sets, one per prescribed set, deciding
/// per set whether it was made.
fn log_session(session: &Session, made: impl Fn(&str, f64) -> bool) -> LoggedSession {
    let mut sets = Vec::new();
    let mut position = 0u16;

    for block in &session.blocks {
        for lift in &block.lifts {
            for _ in 0..lift.sets {
                let hit = made(&block.exercise, lift.load.weight);

                sets.push(LoggedSet {
                    exercise: block.exercise.clone(),
                    position,
                    prescribed_weight: lift.load.weight,
                    prescribed_reps: lift.reps,
                    actual_weight: Some(lift.load.weight),
                    // One rep short is the smallest failure that still counts.
                    actual_reps: Some(if hit {
                        lift.reps
                    } else {
                        lift.reps.saturating_sub(1)
                    }),
                    status: SetStatus::Done,
                });

                position += 1;
            }
        }
    }

    LoggedSession {
        week: session.week,
        day: session.day,
        sets,
        cut_reason: None,
    }
}
