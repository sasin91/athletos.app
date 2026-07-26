//! Smolov Jr — a 3-week intensification cycle built around high-frequency
//! squatting. Ported from the reference's `Training/Programs/SmolovJr.php`.
//!
//! 4 days per week:
//!   - Odd days (1, 3): Squat · Deadlift or RDL · Shoulders · Core
//!   - Even days (2, 4): Squat · Bench · Barbell Rows · Arms
//!
//! Squat loading follows the Smolov Jr progression — volume week, intensity
//! week, peak week:
//!
//! | Day | Week 1      | Week 2        | Week 3      |
//! |-----|-------------|---------------|-------------|
//! | 1   | 6×6 @ 70%   | 6×6 @ 72.5%   | 6×6 @ 75%   |
//! | 2   | 7×5 @ 75%   | 7×5 @ 77.5%   | 7×5 @ 80%   |
//! | 3   | 8×4 @ 80%   | 8×4 @ 82.5%   | 8×4 @ 85%   |
//! | 4   | 10×3 @ 85%  | 10×3 @ 87.5%  | 10×3 @ 90%  |
//!
//! The percentages below are transcribed from the reference unchanged. They are
//! proven in the sense that matters — the author ran them — and this port is not
//! the place to have opinions about them. The one thing that *is* different is
//! that every weight now passes through [`Loading::round_down`], so the athlete
//! is prescribed a weight that can actually be put on a bar (D-04).
//!
//! [`Loading::round_down`]: crate::Loading::round_down

use crate::error::Result;
use crate::exercise::{
    Exercise, BARBELL_CURL, BARBELL_ROW, BENCH, DEADLIFT, DUMBBELL_TRICEP_EXTENSION, HAMMER_CURL,
    HANGING_LEG_RAISE, INCLINE_DUMBBELL_PRESS, LATERAL_RAISE, MILITARY_PRESS, ROMANIAN_DEADLIFT,
    SQUAT,
};
use crate::meta::{Equipment, Experience, Length, ProgramMeta, RecoveryDemand};
use crate::{Block, Catalogued, Lift, Maxes, Prescriptive, Session};

/// Which entered max a percentage is taken from.
///
/// The reference's `ExtractsPowerliftingMaxes` pulls exactly these three and
/// defaults anything missing to zero. Here they are named so the schedule table
/// reads as it does in the source, and a missing one is an error rather than a
/// zero-kilo prescription.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Source {
    Squat,
    Bench,
    Deadlift,
    /// Loaded by the athlete's own body; no percentage applies.
    None,
}

use Source::{Bench as B, Deadlift as D, None as X, Squat as S};

/// `sets × reps` at `percentage` of the [`Source`] max.
struct Step(u32, u32, Source, f64);

/// One exercise and its steps, in the order they are performed.
struct Work(&'static Exercise, &'static [Step]);

/// `week`, `day`, and the exercises for that session.
struct Day(u32, u32, &'static [Work]);

/// The whole block, exactly as the reference lays it out.
#[rustfmt::skip]
static SCHEDULE: &[Day] = &[
    // ── Week 1 ────────────────────────────────────────────────────────────
    Day(1, 1, &[
        Work(&SQUAT,      &[Step(1, 5, S, 50.0), Step(1, 3, S, 60.0), Step(6, 6, S, 70.0)]),
        Work(&DEADLIFT,   &[Step(1, 5, D, 55.0), Step(1, 3, D, 65.0), Step(4, 4, D, 72.0)]),
        Work(&MILITARY_PRESS,    &[Step(4, 8, B, 40.0)]),
        Work(&LATERAL_RAISE,     &[Step(3, 15, B, 12.0)]),
        Work(&HANGING_LEG_RAISE, &[Step(3, 12, X, 0.0)]),
    ]),
    Day(1, 2, &[
        Work(&SQUAT, &[Step(1, 5, S, 50.0), Step(1, 3, S, 65.0), Step(7, 5, S, 75.0)]),
        Work(&BENCH, &[Step(1, 8, B, 50.0), Step(4, 8, B, 65.0)]),
        Work(&BARBELL_ROW,               &[Step(4, 8, B, 55.0)]),
        Work(&BARBELL_CURL,              &[Step(3, 10, B, 25.0)]),
        Work(&DUMBBELL_TRICEP_EXTENSION, &[Step(3, 12, B, 20.0)]),
        Work(&INCLINE_DUMBBELL_PRESS,    &[Step(3, 12, B, 28.0)]),
    ]),
    Day(1, 3, &[
        Work(&SQUAT, &[Step(1, 5, S, 55.0), Step(1, 3, S, 70.0), Step(8, 4, S, 80.0)]),
        Work(&ROMANIAN_DEADLIFT, &[Step(4, 6, D, 60.0)]),
        Work(&MILITARY_PRESS,    &[Step(4, 6, B, 42.0)]),
        Work(&LATERAL_RAISE,     &[Step(3, 15, B, 12.0)]),
        Work(&HANGING_LEG_RAISE, &[Step(3, 15, X, 0.0)]),
    ]),
    Day(1, 4, &[
        Work(&SQUAT, &[Step(1, 5, S, 55.0), Step(1, 3, S, 70.0), Step(10, 3, S, 85.0)]),
        Work(&BENCH, &[Step(1, 5, B, 55.0), Step(4, 5, B, 72.0)]),
        Work(&BARBELL_ROW,               &[Step(4, 6, B, 60.0)]),
        Work(&HAMMER_CURL,               &[Step(3, 12, B, 18.0)]),
        Work(&DUMBBELL_TRICEP_EXTENSION, &[Step(3, 10, B, 22.0)]),
    ]),

    // ── Week 2 · squat +2.5% ──────────────────────────────────────────────
    Day(2, 1, &[
        Work(&SQUAT,    &[Step(1, 5, S, 50.0), Step(1, 3, S, 62.0), Step(6, 6, S, 72.5)]),
        Work(&DEADLIFT, &[Step(1, 5, D, 55.0), Step(1, 3, D, 67.0), Step(4, 4, D, 74.0)]),
        Work(&MILITARY_PRESS,    &[Step(4, 8, B, 42.0)]),
        Work(&LATERAL_RAISE,     &[Step(3, 15, B, 13.0)]),
        Work(&HANGING_LEG_RAISE, &[Step(3, 12, X, 0.0)]),
    ]),
    Day(2, 2, &[
        Work(&SQUAT, &[Step(1, 5, S, 50.0), Step(1, 3, S, 67.0), Step(7, 5, S, 77.5)]),
        Work(&BENCH, &[Step(1, 8, B, 50.0), Step(4, 8, B, 67.0)]),
        Work(&BARBELL_ROW,               &[Step(4, 8, B, 57.0)]),
        Work(&BARBELL_CURL,              &[Step(3, 10, B, 25.0)]),
        Work(&DUMBBELL_TRICEP_EXTENSION, &[Step(3, 12, B, 22.0)]),
        Work(&INCLINE_DUMBBELL_PRESS,    &[Step(3, 10, B, 30.0)]),
    ]),
    Day(2, 3, &[
        Work(&SQUAT, &[Step(1, 5, S, 55.0), Step(1, 3, S, 72.0), Step(8, 4, S, 82.5)]),
        Work(&ROMANIAN_DEADLIFT, &[Step(4, 6, D, 62.0)]),
        Work(&MILITARY_PRESS,    &[Step(4, 6, B, 44.0)]),
        Work(&LATERAL_RAISE,     &[Step(3, 15, B, 13.0)]),
        Work(&HANGING_LEG_RAISE, &[Step(3, 15, X, 0.0)]),
    ]),
    Day(2, 4, &[
        Work(&SQUAT, &[Step(1, 5, S, 55.0), Step(1, 3, S, 72.0), Step(10, 3, S, 87.5)]),
        Work(&BENCH, &[Step(1, 5, B, 55.0), Step(4, 5, B, 74.0)]),
        Work(&BARBELL_ROW,               &[Step(4, 6, B, 62.0)]),
        Work(&HAMMER_CURL,               &[Step(3, 12, B, 20.0)]),
        Work(&DUMBBELL_TRICEP_EXTENSION, &[Step(3, 10, B, 24.0)]),
    ]),

    // ── Week 3 · squat +5% ────────────────────────────────────────────────
    Day(3, 1, &[
        Work(&SQUAT,    &[Step(1, 5, S, 55.0), Step(1, 3, S, 65.0), Step(6, 6, S, 75.0)]),
        Work(&DEADLIFT, &[Step(1, 5, D, 60.0), Step(1, 3, D, 70.0), Step(4, 3, D, 77.0)]),
        Work(&MILITARY_PRESS,    &[Step(4, 6, B, 45.0)]),
        Work(&LATERAL_RAISE,     &[Step(4, 15, B, 13.0)]),
        Work(&HANGING_LEG_RAISE, &[Step(3, 15, X, 0.0)]),
    ]),
    Day(3, 2, &[
        Work(&SQUAT, &[Step(1, 5, S, 55.0), Step(1, 3, S, 70.0), Step(7, 5, S, 80.0)]),
        Work(&BENCH, &[Step(1, 8, B, 50.0), Step(4, 6, B, 70.0)]),
        Work(&BARBELL_ROW,               &[Step(4, 6, B, 60.0)]),
        Work(&BARBELL_CURL,              &[Step(4, 10, B, 27.0)]),
        Work(&DUMBBELL_TRICEP_EXTENSION, &[Step(4, 10, B, 23.0)]),
        Work(&INCLINE_DUMBBELL_PRESS,    &[Step(3, 10, B, 32.0)]),
    ]),
    Day(3, 3, &[
        Work(&SQUAT, &[Step(1, 5, S, 55.0), Step(1, 3, S, 75.0), Step(8, 4, S, 85.0)]),
        Work(&ROMANIAN_DEADLIFT, &[Step(4, 5, D, 65.0)]),
        Work(&MILITARY_PRESS,    &[Step(4, 5, B, 47.0)]),
        Work(&LATERAL_RAISE,     &[Step(4, 12, B, 14.0)]),
        Work(&HANGING_LEG_RAISE, &[Step(4, 15, X, 0.0)]),
    ]),
    Day(3, 4, &[
        Work(&SQUAT, &[Step(1, 5, S, 60.0), Step(1, 3, S, 75.0), Step(10, 3, S, 90.0)]),
        Work(&BENCH, &[Step(1, 5, B, 60.0), Step(4, 4, B, 77.0)]),
        Work(&BARBELL_ROW,               &[Step(4, 5, B, 65.0)]),
        Work(&HAMMER_CURL,               &[Step(4, 10, B, 22.0)]),
        Work(&DUMBBELL_TRICEP_EXTENSION, &[Step(4, 8, B, 25.0)]),
    ]),
];

const META: ProgramMeta = ProgramMeta {
    key: "smolov-jr",
    name: "Smolov Jr",
    days_per_week: 4,
    equipment: &[
        Equipment::Barbell,
        Equipment::SquatRack,
        Equipment::Bench,
        Equipment::Dumbbells,
        Equipment::PullUpBar,
    ],
    // Not a beginner's block. Ten sets of three at 90% in week three is a
    // squat volume an unprepared athlete will not recover from, which is
    // precisely the failure mode D-01 is built around.
    experience_floor: Experience::Advanced,
    length: Length::Fixed {
        weeks: 3,
        sessions: 12,
    },
    // The warning D-05 asks the card to lead with. Smolov Jr is famous for
    // exactly one thing and it is not the squat numbers.
    recovery_demand: RecoveryDemand::Brutal,
    // Day 4 is ten sets of squats before the bench work even starts. Flagged
    // here, before enrolment, rather than discovered in week three (D-05).
    estimated_session_minutes: 75,
};

#[derive(Debug, Clone, Copy, Default)]
pub struct SmolovJr;

impl Catalogued for SmolovJr {
    fn meta(&self) -> &ProgramMeta {
        &META
    }
}

impl Prescriptive for SmolovJr {
    fn schemas(&self, maxes: &Maxes) -> Result<Vec<Session>> {
        // Resolved once, up front, so an athlete missing a deadlift max is told
        // at enrolment rather than on day one of week one.
        let squat = maxes.require(SQUAT.key)?;
        let bench = maxes.require(BENCH.key)?;
        let deadlift = maxes.require(DEADLIFT.key)?;

        let one_rep_max = |source: Source| match source {
            Source::Squat => squat,
            Source::Bench => bench,
            Source::Deadlift => deadlift,
            Source::None => 0.0,
        };

        Ok(SCHEDULE
            .iter()
            .map(|Day(week, day, works)| Session {
                week: *week,
                day: *day,
                // The reference leaves this null for every Smolov Jr session,
                // and a port is not the place to start inventing metadata.
                focus: None,
                blocks: works
                    .iter()
                    .map(|Work(exercise, steps)| Block {
                        exercise: exercise.key.to_owned(),
                        lifts: steps
                            .iter()
                            .map(|Step(sets, reps, source, percentage)| {
                                let target = one_rep_max(*source) * percentage / 100.0;
                                Lift::new(*sets, *reps, exercise.loading.round_down(target))
                            })
                            .collect(),
                    })
                    .collect(),
            })
            .collect())
    }
}
