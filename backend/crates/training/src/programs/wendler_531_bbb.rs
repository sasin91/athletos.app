//! 5/3/1 Boring But Big — open-ended, and the reason the adaptive trait exists.
//!
//! The reference cannot express this program at all. Its `Program` interface is
//! `schemas(array $maxes): array<Schema>` — a pure function of the entered maxes
//! — so every weight it can ever prescribe is fixed at enrolment. 5/3/1's whole
//! mechanism is that the number the percentages are taken from *moves*, and
//! moves as a consequence of how the athlete actually performed. There is
//! nowhere in the reference's shape to put that.
//!
//! Here it lives in [`State`](crate::State), which only this module reads.
//!
//! # The cycle
//!
//! Four days, four weeks, four main lifts — press, deadlift, bench, squat, in
//! Wendler's order. Every percentage is of the **training max**, which starts at
//! 90% of the entered 1RM. Working from a deliberately understated number is the
//! program's own governor, and it is the same instinct as D-01.
//!
//! | Week | Sets                          |
//! |------|-------------------------------|
//! | 1    | 65%×5, 75%×5, 85%×5+          |
//! | 2    | 70%×3, 80%×3, 90%×3+          |
//! | 3    | 75%×5, 85%×3, 95%×1+          |
//! | 4    | 40%×5, 50%×5, 60%×5 (deload)  |
//!
//! The last set of weeks 1–3 is AMRAP: the rep count is a floor, not a target.
//! Then Boring But Big — five sets of ten of the same lift, after the main work.

use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};

use crate::error::{ProgramError, Result};
use crate::exercise::{Exercise, BENCH, DEADLIFT, MILITARY_PRESS, SQUAT};
use crate::meta::{Equipment, Experience, Length, ProgramMeta, RecoveryDemand};
use crate::program::{Progress, Readout, State};
use crate::{Block, Catalogued, Lift, LoggedSession, Maxes, Program, Session};

/// The training max is 90% of what the athlete entered.
const TRAINING_MAX_FRACTION: f64 = 0.90;

/// Boring But Big volume: five sets of ten, at the bottom of the usual 50–60%
/// range.
///
/// Parked at 50 rather than tuned upward per cycle. Fifty sets of squats a week
/// on top of the main work is already the most a recreational athlete will
/// recover from, and the athlete this product is built for is the one who
/// over-reaches (D-01). Raising it is the sort of thing that should be a
/// deliberate v2 variant, not a default.
const BBB_PERCENTAGE: f64 = 50.0;
const BBB_SETS: u32 = 5;
const BBB_REPS: u32 = 10;

const WEEKS_PER_CYCLE: u32 = 4;
const DAYS_PER_WEEK: u32 = 4;
const SESSIONS_PER_CYCLE: u32 = WEEKS_PER_CYCLE * DAYS_PER_WEEK;

/// A main lift, and what its training max gains at the end of a cycle.
///
/// +2.5 kg upper body, +5 kg lower. The asymmetry is not arbitrary: an
/// overhead press adding 5 kg a month would be adding most of a beginner's
/// entire press in a year.
struct MainLift(&'static Exercise, f64);

/// Day 1 through day 4, in Wendler's order.
static MAIN_LIFTS: [MainLift; 4] = [
    MainLift(&MILITARY_PRESS, 2.5),
    MainLift(&DEADLIFT, 5.0),
    MainLift(&BENCH, 2.5),
    MainLift(&SQUAT, 5.0),
];

/// `percentage` of training max × `reps`, and whether the set is AMRAP.
struct WorkSet(f64, u32, bool);

#[rustfmt::skip]
static WEEKS: [&[WorkSet]; 4] = [
    &[WorkSet(65.0, 5, false), WorkSet(75.0, 5, false), WorkSet(85.0, 5, true)],
    &[WorkSet(70.0, 3, false), WorkSet(80.0, 3, false), WorkSet(90.0, 3, true)],
    &[WorkSet(75.0, 5, false), WorkSet(85.0, 3, false), WorkSet(95.0, 1, true)],
    // Deload. No AMRAP — the point of the week is to not find out.
    &[WorkSet(40.0, 5, false), WorkSet(50.0, 5, false), WorkSet(60.0, 5, false)],
];

/// The week whose AMRAP decides whether the training max moves.
const TEST_WEEK: u32 = 3;

const META: ProgramMeta = ProgramMeta {
    key: "wendler-531-bbb",
    name: "5/3/1 Boring But Big",
    days_per_week: 4,
    equipment: &[Equipment::Barbell, Equipment::SquatRack, Equipment::Bench],
    // Starting from 90% of a conservative max and adding 2.5 kg a month is
    // about as forgiving as a barbell program gets.
    experience_floor: Experience::Novice,
    length: Length::OpenEnded,
    // The main work is easy. Five sets of ten immediately after it is not.
    recovery_demand: RecoveryDemand::High,
    estimated_session_minutes: 55,
    // Four, in Wendler's day order — which is the fourth lift Smolov Jr does
    // not need, and the reason this is a list rather than three named fields.
    required_maxes: &[MILITARY_PRESS.key, DEADLIFT.key, BENCH.key, SQUAT.key],
};

/// This program's private memory (D-03).
///
/// The training max lives here and moves only through [`Program::advance`].
/// There is deliberately no "edit my training max" field anywhere in the
/// product (D-04): an athlete who can nudge the number upward whenever a
/// session felt easy has removed the only governor the program has.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct Cycle {
    /// 1-based.
    cycle: u32,
    /// 1..=4 within the cycle.
    week: u32,
    /// 1..=4 within the week.
    day: u32,
    training_max: BTreeMap<String, f64>,
    /// Lifts whose week-3 AMRAP did not make the minimum, and which therefore
    /// do not gain at the end of this cycle. Cleared at every rollover.
    missed: BTreeSet<String>,
}

#[derive(Debug, Clone, Copy, Default)]
pub struct Wendler531Bbb;

impl Catalogued for Wendler531Bbb {
    fn meta(&self) -> &ProgramMeta {
        &META
    }
}

impl Wendler531Bbb {
    fn main_lift(day: u32) -> Result<&'static MainLift> {
        MAIN_LIFTS
            .get(day.wrapping_sub(1) as usize)
            .ok_or_else(|| ProgramError::unreadable(format!("day {day} is not in 1..=4")))
    }

    fn training_max(state: &Cycle, exercise: &str) -> Result<f64> {
        state.training_max.get(exercise).copied().ok_or_else(|| {
            ProgramError::unreadable(format!("no training max recorded for {exercise}"))
        })
    }
}

impl Program for Wendler531Bbb {
    fn start(&self, maxes: &Maxes) -> Result<State> {
        let mut training_max = BTreeMap::new();

        for MainLift(exercise, _) in &MAIN_LIFTS {
            let entered = maxes.require(exercise.key)?;
            training_max.insert(exercise.key.to_owned(), entered * TRAINING_MAX_FRACTION);
        }

        State::encode(&Cycle {
            cycle: 1,
            week: 1,
            day: 1,
            training_max,
            missed: BTreeSet::new(),
        })
    }

    fn session(&self, state: &State) -> Result<Session> {
        let state: Cycle = state.decode()?;

        let MainLift(exercise, _) = Self::main_lift(state.day)?;
        let training_max = Self::training_max(&state, exercise.key)?;

        let week = WEEKS
            .get(state.week.wrapping_sub(1) as usize)
            .ok_or_else(|| {
                ProgramError::unreadable(format!("week {} is not in 1..=4", state.week))
            })?;

        let main = Block {
            exercise: exercise.key.to_owned(),
            lifts: week
                .iter()
                .map(|WorkSet(percentage, reps, amrap)| {
                    let load = exercise
                        .loading
                        .round_down(training_max * percentage / 100.0);

                    if *amrap {
                        Lift::amrap(1, *reps, load)
                    } else {
                        Lift::new(1, *reps, load)
                    }
                })
                .collect(),
        };

        // No Boring But Big in the deload week. Adding fifty reps of the lift
        // to the week that exists to remove fatigue would defeat it.
        let mut blocks = vec![main];
        if state.week != WEEKS_PER_CYCLE {
            blocks.push(Block {
                exercise: exercise.key.to_owned(),
                lifts: vec![Lift::new(
                    BBB_SETS,
                    BBB_REPS,
                    exercise
                        .loading
                        .round_down(training_max * BBB_PERCENTAGE / 100.0),
                )],
            });
        }

        Ok(Session {
            week: state.week,
            day: state.day,
            focus: Some(exercise.key.to_owned()),
            blocks,
        })
    }

    fn advance(&self, state: State, logged: &LoggedSession) -> Result<State> {
        let mut state: Cycle = state.decode()?;

        let MainLift(exercise, _) = Self::main_lift(state.day)?;

        // Week 3 is the week that decides. The 95% single is the only set whose
        // outcome the program acts on; everything else is recorded for drift
        // (D-07) and otherwise left alone.
        if state.week == TEST_WEEK && !made_the_minimum(logged, exercise.key) {
            state.missed.insert(exercise.key.to_owned());
        }

        state.day += 1;
        if state.day > DAYS_PER_WEEK {
            state.day = 1;
            state.week += 1;
        }

        if state.week > WEEKS_PER_CYCLE {
            state.week = 1;
            state.cycle += 1;

            // The one moment the training max moves.
            //
            // A lift that missed its week-3 AMRAP **holds** its training max
            // rather than gaining, and rather than being cut. Wendler's own
            // rule is a 10% reset, but that is a response to repeated failure
            // over several cycles, and applying it to a single bad day would
            // punish an athlete who slept badly by deleting a month of
            // progress. Holding repeats the cycle at a weight already shown to
            // be at the edge, which is the conservative reading and the one
            // D-01 asks for. If this turns out to be too permissive in
            // practice, the fix is to count consecutive misses in `missed` —
            // the state is already the right shape for it.
            for MainLift(lift, increment) in &MAIN_LIFTS {
                if state.missed.contains(lift.key) {
                    continue;
                }
                if let Some(training_max) = state.training_max.get_mut(lift.key) {
                    *training_max += increment;
                }
            }

            state.missed.clear();
        }

        State::encode(&state)
    }

    /// Always `None`. The program does not end, so there is no plan to show and
    /// no denominator that would not be invented (D-03).
    fn preview(&self, _state: &State) -> Result<Option<Vec<Session>>> {
        Ok(None)
    }

    fn progress(&self, state: &State) -> Result<Progress> {
        let state: Cycle = state.decode()?;

        Ok(Progress {
            completed: (state.cycle - 1) * SESSIONS_PER_CYCLE
                + (state.week - 1) * DAYS_PER_WEEK
                + (state.day - 1),
            total: None,
        })
    }

    /// The four training maxes, in Wendler's day order.
    ///
    /// This is the number every percentage in the program is taken from, and
    /// after a few cycles it is nothing like the 1RM the athlete entered — a
    /// 160 kg squat starts at 144 and is past 160 within four months. Watching
    /// it climb is the legitimate read D-13 asks for, and until this method
    /// existed the number was visible only as a weight on a set.
    ///
    /// `MAIN_LIFTS` order rather than the `BTreeMap`'s, because that is the
    /// order the athlete meets the lifts in the week. Nothing downstream sorts
    /// this, so the order is part of the answer.
    fn readout(&self, state: &State) -> Result<Vec<Readout>> {
        let state: Cycle = state.decode()?;

        MAIN_LIFTS
            .iter()
            .map(|MainLift(exercise, _)| {
                Ok(Readout {
                    exercise: exercise.key.to_owned(),
                    label: Readout::TRAINING_MAX,
                    weight: Self::training_max(&state, exercise.key)?,
                })
            })
            .collect()
    }
}

/// Whether the AMRAP set of this session's main lift made its minimum.
///
/// The top set is identified as the heaviest prescribed set of the main lift,
/// which separates it from the Boring But Big work at 50% without the logged
/// payload having to carry a flag that says which set mattered.
///
/// A session that never logged the lift at all — cut short before the main work
/// (D-08) — counts as a miss. The training max moves on evidence, and there is
/// none.
fn made_the_minimum(logged: &LoggedSession, exercise: &str) -> bool {
    logged
        .sets
        .iter()
        .filter(|set| set.exercise == exercise)
        .max_by(|left, right| left.prescribed_weight.total_cmp(&right.prescribed_weight))
        .is_some_and(|top| top.reps_performed() >= top.prescribed_reps)
}
