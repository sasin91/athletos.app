//! What a set implies about a single (D-13, D-19's sibling in *Over time*).
//!
//! The trend that answers "is this program working?" cannot be drawn from
//! prescribed weights — those move because the program says so. It is drawn
//! from what the athlete actually lifted, which means turning a set of reps
//! into the one-rep max it implies.
//!
//! # Brzycki, and why not Epley
//!
//! `weight × 36 / (37 − reps)`. A single returns the weight itself —
//! `36 / 36` — and that is the property that decided it: an estimate is
//! evidence about what the athlete can do, and a formula that reports a 140 kg
//! single as 144.7 is inventing 4.7 kg of evidence that does not exist. On a
//! screen built for an athlete whose failure mode is over-reaching (D-01),
//! a systematic overstatement is the wrong direction to be wrong in.
//!
//! Epley — `weight × (1 + reps / 30)` — is the usual alternative and is the
//! one this module was first written around, on the mistaken belief that it
//! had the property above. It does not: at one rep it returns 31/30 of the
//! weight. It is also the more optimistic of the two everywhere between,
//! which compounds the same objection.
//!
//! Brzycki's known flaw is a pole at 37 reps, where the denominator reaches
//! zero and the estimate goes negative past it. [`ESTIMATE_REP_CEILING`] puts
//! that at more than three times the highest rep count this will ever see, so
//! the one argument against Brzycki is unreachable here by construction.
//!
//! The two agree exactly at ten reps — `36/27` and `1 + 10/30` are both 4/3 —
//! so the choice costs nothing at the ceiling and only matters in between,
//! where Brzycki is the more conservative and this product prefers that.
//!
//! # The ceiling is a rule, not input validation
//!
//! An estimate off a set of twenty is not evidence about a single, and Epley's
//! error grows monotonically with reps. A set above the ceiling contributes
//! **no estimate at all** rather than a clamped one — the same instinct as
//! `timing.rs` discarding an interval it cannot believe instead of folding it
//! in at an invented value. A number that is present but untrustworthy is
//! worse than an absent one, because only one of the two is visible.

/// The most reps an estimate will be taken from.
///
/// Ten. Every program in the catalogue prescribes within it — 5/3/1's Boring
/// But Big sets of ten are the ceiling exactly, and its AMRAP top sets are
/// where estimates will actually come from. Beyond ten, the formula is
/// describing muscular endurance and reporting it as a single.
///
/// It also keeps Brzycki's pole at 37 reps more than three times out of reach,
/// which is what makes that formula's one flaw irrelevant here.
pub const ESTIMATE_REP_CEILING: u32 = 10;

/// The one-rep max a set implies, or `None` when it implies nothing.
///
/// `None` for zero reps, for no weight, and for anything above
/// [`ESTIMATE_REP_CEILING`] — see the module documentation for why each of
/// those is an absence rather than a number.
pub fn estimate(weight: f64, reps: u32) -> Option<f64> {
    if reps == 0 || reps > ESTIMATE_REP_CEILING || weight <= 0.0 {
        return None;
    }

    Some(weight * 36.0 / (37.0 - f64::from(reps)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_single_estimates_itself() {
        // The property that chose Brzycki: 36 / (37 - 1) is exactly 1, so an
        // estimate never invents evidence about a set that was performed.
        assert_eq!(estimate(140.0, 1), Some(140.0));
    }

    #[test]
    fn more_reps_at_one_weight_imply_more() {
        let three = estimate(100.0, 3).expect("within the ceiling");
        let five = estimate(100.0, 5).expect("within the ceiling");

        assert!(five > three);
        assert!((three - 105.882_352_941_176_47).abs() < 1e-9, "100 x 36/34");
        assert!((five - 112.5).abs() < 1e-9, "100 x 36/32");
    }

    #[test]
    fn it_agrees_with_epley_at_the_ceiling_and_is_kinder_below_it() {
        // 36/27 and 1 + 10/30 are both 4/3, so the choice of formula costs
        // nothing at the ceiling. Below it the two genuinely differ — Brzycki
        // is strictly the more conservative, never merely tied — which is the
        // whole reason to prefer it (D-01): a non-strict bound here would
        // still pass if this formula were ever reverted to literal Epley.
        let epley = |weight: f64, reps: u32| weight * (1.0 + f64::from(reps) / 30.0);

        let at_ceiling = estimate(100.0, ESTIMATE_REP_CEILING).expect("at the ceiling");
        assert!((at_ceiling - epley(100.0, ESTIMATE_REP_CEILING)).abs() < 1e-9);

        for reps in 1..ESTIMATE_REP_CEILING {
            let ours = estimate(100.0, reps).expect("within the ceiling");
            assert!(ours < epley(100.0, reps), "at {reps} reps");
        }
    }

    #[test]
    fn a_set_above_the_ceiling_estimates_nothing() {
        assert_eq!(estimate(60.0, ESTIMATE_REP_CEILING + 1), None);
        assert!(estimate(60.0, ESTIMATE_REP_CEILING).is_some());
    }

    #[test]
    fn a_set_of_no_reps_estimates_nothing() {
        // Not done, or done and failed. Either way it says nothing about a
        // single, and zero reps through Epley would return the weight itself —
        // claiming a lift that did not happen.
        assert_eq!(estimate(140.0, 0), None);
    }

    #[test]
    fn a_weightless_set_estimates_nothing() {
        // Bodyweight work. Its record is reps, not kilograms, and Epley over
        // zero would report an athlete's best squat as zero.
        assert_eq!(estimate(0.0, 5), None);
    }
}
