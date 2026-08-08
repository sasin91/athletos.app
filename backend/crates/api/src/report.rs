//! What the ending says (D-08, amended).
//!
//! D-08's finish-screen section refused a drift total and a timing breakdown
//! here, on two grounds. Both are answered rather than overridden.
//!
//! **Drift no longer appears alone.** It arrives beside the load actually
//! moved and beside the athlete's own average for this enrolment, which is the
//! counterweight D-13 requires: progress is never shown without its cost, and
//! here the cost is on the same line as the progress.
//!
//! **Nothing is invented in a client.** This module is the arithmetic, it runs
//! in Rust, and the answer rides back on the receipt the phone already reads.
//!
//! Pure, and takes only what it uses — no view model, no database, no clock —
//! for the same reason [`crate::timing`] is.

use serde::Serialize;
use utoipa::ToSchema;

use crate::timing::IntervalSpread;

/// One set as this module needs it. Deliberately not a view model, so the
/// arithmetic can be tested without constructing one.
#[derive(Debug, Clone)]
pub struct ReportedSet {
    pub exercise: String,
    pub label: String,
    pub prescribed_weight: f64,
    pub prescribed_reps: u32,
    pub actual_weight: Option<f64>,
    pub actual_reps: Option<u32>,
    pub done: bool,
}

/// What the finish screen says, computed here so no client has to (D-11).
#[derive(Debug, Serialize, ToSchema, PartialEq)]
pub struct SessionReport {
    /// Summed over **done sets only**, as performed.
    pub load_moved_kg: f64,
    /// Summed over the same done sets, as asked for. The gap between the two
    /// is weight drift, uncontaminated by work not done.
    pub load_prescribed_kg: f64,
    /// Done sets lifted heavier than prescribed. The count is the part that
    /// can be acted on: a kilogram total alone does not distinguish one wild
    /// set from twelve small ones.
    pub sets_over: u32,
    pub sets_under: u32,
    /// Done sets whose actual weight differed from what was prescribed,
    /// grouped in the order each exact change was first performed.
    pub weight_changes: Vec<WeightChange>,
    pub duration_seconds: i64,
    /// The athlete's average across this **enrolment's** other recorded
    /// sessions — same block, same training max, so it compares like with
    /// like. `None` below three of them, the same rule and the same reason as
    /// [`crate::pace`]: not shown before there is data to compute it from.
    pub average_duration_seconds: Option<i64>,
    /// `None` when no two sets carry believable stamps.
    pub intervals: Option<IntervalSpread>,
}

/// One exact weight change, grouped across matching done sets.
#[derive(Debug, Serialize, ToSchema, PartialEq)]
pub struct WeightChange {
    #[schema(example = "barbell-row")]
    pub exercise: String,
    #[schema(example = "Barbell row")]
    pub label: String,
    pub prescribed_weight: f64,
    pub actual_weight: f64,
    pub sets: u32,
}

pub fn compute(
    duration_seconds: i64,
    average_duration_seconds: Option<i64>,
    sets: &[ReportedSet],
    intervals: Option<IntervalSpread>,
) -> SessionReport {
    let mut load_moved_kg = 0.0;
    let mut load_prescribed_kg = 0.0;
    let mut sets_over = 0_u32;
    let mut sets_under = 0_u32;
    let mut weight_changes: Vec<WeightChange> = Vec::new();

    for set in sets.iter().filter(|set| set.done) {
        let (Some(actual_weight), Some(actual_reps)) = (set.actual_weight, set.actual_reps) else {
            // A done set with no numbers cannot reach here — the schema
            // refuses it — but reporting nothing is better than guessing.
            continue;
        };

        load_moved_kg += actual_weight * f64::from(actual_reps);
        load_prescribed_kg += set.prescribed_weight * f64::from(set.prescribed_reps);

        if actual_weight > set.prescribed_weight {
            sets_over += 1;
        } else if actual_weight < set.prescribed_weight {
            sets_under += 1;
        } else {
            continue;
        }

        if let Some(change) = weight_changes.iter_mut().find(|change| {
            change.exercise == set.exercise
                && change.prescribed_weight == set.prescribed_weight
                && change.actual_weight == actual_weight
        }) {
            change.sets += 1;
        } else {
            weight_changes.push(WeightChange {
                exercise: set.exercise.clone(),
                label: set.label.clone(),
                prescribed_weight: set.prescribed_weight,
                actual_weight,
                sets: 1,
            });
        }
    }

    SessionReport {
        load_moved_kg,
        load_prescribed_kg,
        sets_over,
        sets_under,
        weight_changes,
        duration_seconds,
        average_duration_seconds,
        intervals,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn done_for(
        exercise: &str,
        label: &str,
        prescribed: f64,
        actual: f64,
        reps: u32,
    ) -> ReportedSet {
        ReportedSet {
            exercise: exercise.to_owned(),
            label: label.to_owned(),
            prescribed_weight: prescribed,
            prescribed_reps: reps,
            actual_weight: Some(actual),
            actual_reps: Some(reps),
            done: true,
        }
    }

    fn done(prescribed: f64, actual: f64, reps: u32) -> ReportedSet {
        done_for("squat", "Squat", prescribed, actual, reps)
    }

    fn not_done_for(exercise: &str, label: &str, prescribed: f64, reps: u32) -> ReportedSet {
        ReportedSet {
            exercise: exercise.to_owned(),
            label: label.to_owned(),
            prescribed_weight: prescribed,
            prescribed_reps: reps,
            actual_weight: None,
            actual_reps: None,
            done: false,
        }
    }

    fn not_done(prescribed: f64, reps: u32) -> ReportedSet {
        not_done_for("squat", "Squat", prescribed, reps)
    }

    #[test]
    fn load_is_summed_over_done_sets_only() {
        // Two done sets at 100x5, one skipped. The skipped set contributes to
        // neither total, so the gap between them is pure weight drift and not
        // contaminated by work not done — D-08's two axes stay apart.
        let sets = [
            done(95.0, 100.0, 5),
            done(95.0, 100.0, 5),
            not_done(95.0, 5),
        ];
        let report = compute(3_600, None, &sets, None);

        assert_eq!(report.load_moved_kg, 1_000.0);
        assert_eq!(report.load_prescribed_kg, 950.0);
    }

    #[test]
    fn over_and_under_are_counted_separately() {
        let sets = [
            done(95.0, 100.0, 5),
            done(95.0, 90.0, 5),
            done(95.0, 95.0, 5),
        ];
        let report = compute(3_600, None, &sets, None);

        assert_eq!(report.sets_over, 1);
        assert_eq!(report.sets_under, 1);
    }

    #[test]
    fn changed_weights_are_grouped_by_exercise_and_exact_weight_pair_in_performed_order() {
        let sets = vec![
            done_for("barbell-row", "Barbell row", 85.0, 100.0, 5),
            done_for("barbell-row", "Barbell row", 85.0, 100.0, 5),
            done_for("barbell-row", "Barbell row", 85.0, 95.0, 5),
            done_for("squat", "Squat", 100.0, 100.0, 5),
            not_done_for("barbell-row", "Barbell row", 85.0, 5),
        ];

        let report = compute(3_600, None, &sets, None);

        assert_eq!(
            report.weight_changes,
            vec![
                WeightChange {
                    exercise: "barbell-row".into(),
                    label: "Barbell row".into(),
                    prescribed_weight: 85.0,
                    actual_weight: 100.0,
                    sets: 2,
                },
                WeightChange {
                    exercise: "barbell-row".into(),
                    label: "Barbell row".into(),
                    prescribed_weight: 85.0,
                    actual_weight: 95.0,
                    sets: 1,
                },
            ]
        );
    }

    #[test]
    fn a_session_with_nothing_done_reports_zero_rather_than_panicking() {
        let sets = [not_done(95.0, 5), not_done(95.0, 5)];
        let report = compute(600, None, &sets, None);

        assert_eq!(report.load_moved_kg, 0.0);
        assert_eq!(report.load_prescribed_kg, 0.0);
        assert_eq!(report.sets_over, 0);
        assert_eq!(report.sets_under, 0);
    }

    #[test]
    fn reps_count_toward_load_as_performed() {
        // Prescribed 5, did 8 — an AMRAP that went well. Load moved follows
        // what happened; load prescribed follows what was asked.
        let sets = [ReportedSet {
            exercise: "squat".into(),
            label: "Squat".into(),
            prescribed_weight: 100.0,
            prescribed_reps: 5,
            actual_weight: Some(100.0),
            actual_reps: Some(8),
            done: true,
        }];
        let report = compute(3_600, None, &sets, None);

        assert_eq!(report.load_moved_kg, 800.0);
        assert_eq!(report.load_prescribed_kg, 500.0);
        // Same weight, so nothing drifted on the axis this counts.
        assert_eq!(report.sets_over, 0);
    }

    #[test]
    fn the_average_travels_through_untouched() {
        let report = compute(3_600, Some(3_120), &[], None);
        assert_eq!(report.duration_seconds, 3_600);
        assert_eq!(report.average_duration_seconds, Some(3_120));
    }
}
