//! A Smolov-inspired bench and row block: three loading weeks, then two
//! deload sessions. See docs/programs/bench-row-specialization.md for pacing,
//! optional deadlifts, and when to hold or reduce the scheduled progression.
//!
//! Each exercise uses percentages of its own entered 1RM. Bench and rows add
//! 2.5 percentage points per loading week; lower-body percentages stay fixed.
//! Every target passes through the exercise's standard round-down rule.

use crate::error::Result;
use crate::exercise::{Exercise, BARBELL_ROW, BENCH, DEADLIFT, SQUAT};
use crate::meta::{Equipment, Experience, Length, ProgramMeta, RecoveryDemand};
use crate::{Block, Catalogued, Lift, Maxes, Prescriptive, Session};

const META: ProgramMeta = ProgramMeta {
    key: "bench-row-specialization",
    name: "Bench & Row Specialization",
    days_per_week: 4,
    equipment: &[Equipment::Barbell, Equipment::SquatRack, Equipment::Bench],
    experience_floor: Experience::Advanced,
    length: Length::Fixed {
        weeks: 4,
        sessions: 14,
    },
    recovery_demand: RecoveryDemand::High,
    estimated_session_minutes: 90,
    required_maxes: &[BENCH.key, BARBELL_ROW.key, SQUAT.key, DEADLIFT.key],
    weighted_exercises: &[BENCH.key, BARBELL_ROW.key, SQUAT.key, DEADLIFT.key],
};

#[derive(Debug, Clone, Copy, Default)]
pub struct BenchRowSpecialization;

impl Catalogued for BenchRowSpecialization {
    fn meta(&self) -> &ProgramMeta {
        &META
    }
}

/// One working prescription at a percentage of this exercise's entered 1RM.
fn work(exercise: &Exercise, sets: u32, reps: u32, max: f64, percentage: f64) -> Block {
    Block {
        exercise: exercise.key.to_owned(),
        lifts: vec![Lift::new(
            sets,
            reps,
            exercise.loading.round_down(max * percentage / 100.0),
        )],
    }
}

impl Prescriptive for BenchRowSpecialization {
    fn schemas(&self, maxes: &Maxes) -> Result<Vec<Session>> {
        let bench = maxes.require(BENCH.key)?;
        let row = maxes.require(BARBELL_ROW.key)?;
        let squat = maxes.require(SQUAT.key)?;
        let deadlift = maxes.require(DEADLIFT.key)?;
        let mut sessions = Vec::with_capacity(14);

        for week in 1..=3 {
            let percentage_points = f64::from(week - 1) * 2.5;
            let days = [
                ((4, 6, 67.5), (3, 8, 65.0)),
                ((5, 5, 72.5), (4, 5, 72.5)),
                ((6, 4, 77.5), (3, 8, 60.0)),
                ((7, 3, 82.5), (4, 3, 77.5)),
            ];

            for (index, (bench_work, row_work)) in days.into_iter().enumerate() {
                let (bench_sets, bench_reps, bench_percentage) = bench_work;
                let (row_sets, row_reps, row_percentage) = row_work;
                let day = index as u32 + 1;
                let mut blocks = vec![
                    work(
                        &BENCH,
                        bench_sets,
                        bench_reps,
                        bench,
                        bench_percentage + percentage_points,
                    ),
                    work(
                        &BARBELL_ROW,
                        row_sets,
                        row_reps,
                        row,
                        row_percentage + percentage_points,
                    ),
                ];
                match day {
                    1 => blocks.push(work(&SQUAT, 3, 5, squat, 65.0)),
                    // Optional: delete this block in Edit this session when
                    // recovery is limited. Omit it entirely in the peak week.
                    2 if week < 3 => {
                        blocks.push(work(&DEADLIFT, 2, 2, deadlift, 70.0));
                    }
                    3 => blocks.push(work(&SQUAT, 3, 3, squat, 75.0)),
                    _ => {}
                }
                sessions.push(Session {
                    week,
                    day,
                    focus: Some(BENCH.key.to_owned()),
                    blocks,
                });
            }
        }

        for day in 1..=2 {
            let mut blocks = vec![
                work(&BENCH, 3, 3, bench, 60.0),
                work(&BARBELL_ROW, 2, 5, row, 57.5),
            ];
            if day == 1 {
                blocks.push(work(&SQUAT, 2, 3, squat, 60.0));
            }
            sessions.push(Session {
                week: 4,
                day,
                focus: Some(BENCH.key.to_owned()),
                blocks,
            });
        }

        Ok(sessions)
    }
}
