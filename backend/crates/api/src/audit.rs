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
            vec![Finding::HeadDiverged { workout_id: id(1) }]
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
