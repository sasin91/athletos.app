//! A Smolov-inspired bench and row block: three loading weeks, then two
//! deload sessions. See docs/programs/bench-row-specialization.md for pacing,
//! optional deadlifts, and when to hold or reduce the scheduled progression.
//!
//! The reference prescriptions are scaled independently by each entered 1RM.
//! This preserves the authored loads without pretending a row max is a bench
//! max, or silently treating a five-rep best as a one-rep max. The app does not
//! estimate or overwrite maxes. Only bench and rows add 2.5 kg per loading week.

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

/// One working prescription, scaled from its reference athlete's entered 1RM.
/// Round the base before adding the fixed weekly increment, so changing maxes
/// changes the starting load without turning 2.5 kg into a percentage increase.
fn work(
    exercise: &Exercise,
    sets: u32,
    reps: u32,
    reference_weight: f64,
    scale: f64,
    increment: f64,
) -> Block {
    let base = exercise.loading.round_down(reference_weight * scale);
    Block {
        exercise: exercise.key.to_owned(),
        lifts: vec![Lift::new(
            sets,
            reps,
            exercise.loading.round_down(base.weight + increment),
        )],
    }
}

impl Prescriptive for BenchRowSpecialization {
    fn schemas(&self, maxes: &Maxes) -> Result<Vec<Session>> {
        // Reference entered numbers, not account defaults. Squat and row are
        // conservative reference estimates; the athlete supplies their own.
        let bench = maxes.require(BENCH.key)? / 147.0;
        let row = maxes.require(BARBELL_ROW.key)? / 175.0;
        let squat = maxes.require(SQUAT.key)? / 170.0;
        let deadlift = maxes.require(DEADLIFT.key)? / 245.0;
        let mut sessions = Vec::with_capacity(14);

        for week in 1..=3 {
            let increment = f64::from(week - 1) * 2.5;
            let days = [
                ((4, 6, 97.5), (3, 8, 110.0)),
                ((5, 5, 105.0), (4, 5, 125.0)),
                ((6, 4, 112.5), (3, 8, 105.0)),
                ((7, 3, 120.0), (4, 3, 135.0)),
            ];

            for (index, ((bs, br, bw), (rs, rr, rw))) in days.into_iter().enumerate() {
                let day = index as u32 + 1;
                let mut blocks = vec![
                    work(&BENCH, bs, br, bw, bench, increment),
                    work(&BARBELL_ROW, rs, rr, rw, row, increment),
                ];
                match day {
                    1 => blocks.push(work(&SQUAT, 3, 5, 110.0, squat, 0.0)),
                    // Optional: delete this block in Edit this session when
                    // recovery is limited. Omit it entirely in the peak week.
                    2 if week < 3 => {
                        blocks.push(work(&DEADLIFT, 2, 2, 170.0, deadlift, 0.0));
                    }
                    3 => blocks.push(work(&SQUAT, 3, 3, 125.0, squat, 0.0)),
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
                work(&BENCH, 3, 3, 90.0, bench, 0.0),
                work(&BARBELL_ROW, 2, 5, 100.0, row, 0.0),
            ];
            if day == 1 {
                blocks.push(work(&SQUAT, 2, 3, 100.0, squat, 0.0));
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
