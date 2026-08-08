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
//! # The ceiling caps, and it used to refuse
//!
//! An estimate off a set of twenty is not evidence about a single, and Epley's
//! error grows monotonically with reps — but refusing the set outright, as
//! this module first did, broke a stronger property than it protected: eleven
//! reps at a weight is at least as good a single as ten at it, so a set that
//! crossed the ceiling should never estimate *less* than one that stopped
//! short of it. Refusal did exactly that. On the progress screen the estimate
//! feeds, the AMRAP top set of 5/3/1 week one landing at eleven reps instead
//! of ten made the headline number fall by a quarter for doing more work — a
//! drop the screen then invited the athlete to explain, as if it were
//! training rather than an artifact of this file. [`ESTIMATE_REP_CEILING`] now
//! caps the reps the formula sees instead of rejecting the set, so
//! [`estimate`] is monotone non-decreasing in reps by construction: more work
//! can raise the number or leave it, never lower it.
//!
//! **This reverses the module's original rule, and the reversal is worth
//! naming rather than quietly overwritten.** That rule read: *a number that is
//! present but untrustworthy is worse than an absent one, because only one of
//! the two is visible.* True of a guess. Not true of a cap. A capped estimate
//! is not a guess at what the eleventh rep was worth — it is exactly what the
//! first ten reps of that same set demonstrably implied, which the athlete
//! proved by lifting one more on top of them. It understates a long set
//! rather than inventing anything about it, and understating is the direction
//! this product wants its arithmetic to be wrong in (D-01): the failure mode
//! this guards against is over-reaching, and a lower bound can only undersell
//! a big set, never flatter one.

/// The most reps the formula is trusted to read directly.
///
/// Ten. Every program's fixed-rep sets in the catalogue prescribe within it —
/// 5/3/1's Boring But Big sets of ten are the ceiling exactly. Its AMRAP top
/// sets are the opposite case, not an example of this working well: the whole
/// point of AMRAP is reps left unconstrained, so those are the sets most
/// likely to land past ten and be capped rather than read exactly — not the
/// sets a precise estimate will reliably come from. Beyond ten, the formula is
/// describing muscular endurance, and a capped estimate reports only what the
/// first ten of those reps already proved, not what all of them did.
///
/// It also keeps Brzycki's pole at 37 reps more than three times out of reach,
/// which is what makes that formula's one flaw irrelevant here.
pub const ESTIMATE_REP_CEILING: u32 = 10;

/// The one-rep max a set implies, or `None` when the set says nothing.
///
/// Reps above [`ESTIMATE_REP_CEILING`] are capped at it rather than refused —
/// see the module documentation for why that is a lower bound and not a
/// guess. `None` only for zero reps and for weight at or below zero: a set
/// that did not happen, or one with no kilograms to speak of, is an absence a
/// cap cannot rescue, which is a different thing from a set the cap can.
pub fn estimate(weight: f64, reps: u32) -> Option<f64> {
    if reps == 0 || weight <= 0.0 {
        return None;
    }

    let reps = reps.min(ESTIMATE_REP_CEILING);
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
    fn a_set_above_the_ceiling_estimates_from_the_ceiling() {
        // Reversed: this asserted `None` before the ceiling capped instead of
        // refused. Eleven reps and twenty reps at the same weight both read as
        // exactly what ten reps at that weight would — the cap, not a guess at
        // what the extra reps were worth.
        let at_ceiling = estimate(60.0, ESTIMATE_REP_CEILING).expect("within the ceiling");
        assert_eq!(estimate(60.0, ESTIMATE_REP_CEILING + 1), Some(at_ceiling));
        assert_eq!(estimate(60.0, 20), Some(at_ceiling));
    }

    #[test]
    fn more_reps_never_estimate_less() {
        // The property that motivated capping instead of refusing: the trend
        // this feeds cannot be allowed to fall because the athlete did more
        // work. Spans the ceiling deliberately, 1 through 15 — this is the
        // regression guard for that reversal. Reinstating the old refusal
        // would fail it: reps 11 through 15 would drop to `None` and every
        // comparison against reps 10 would break.
        let mut previous = estimate(100.0, 1).expect("a single estimates itself");
        for reps in 2..=15 {
            let current =
                estimate(100.0, reps).expect("zero reps and zero weight are the only absences");
            assert!(
                current >= previous,
                "reps {reps} estimated {current}, less than reps {} at {previous}",
                reps - 1
            );
            previous = current;
        }
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
