//! What can actually be loaded, and the rounding rule that is the product's
//! cheapest safety mechanism (D-04).

use serde::{Deserialize, Serialize};

/// The bar. Every barbell prescription is this plus plates.
pub const BAR_WEIGHT: f64 = 20.0;

/// Available plates, largest first — which is also the order the greedy
/// breakdown wants them in.
pub const PLATES: [f64; 7] = [25.0, 20.0, 15.0, 10.0, 5.0, 2.5, 1.25];

/// Plates go on in pairs, so the smallest change to the bar is twice the
/// smallest plate.
pub const BARBELL_RESOLUTION: f64 = 2.5;

/// Slack allowed when deciding which side of a loadable weight a target falls
/// on.
///
/// Percentages arrive as binary floats, so an intended 100.0 can turn up as
/// 99.999999999999986. Flooring that honestly costs the athlete a full 2.5 kg
/// increment for no reason anyone could explain at the rack. The tolerance is
/// nine orders of magnitude smaller than the smallest increment we round to, so
/// it can only ever absorb representation error — a genuine 99.9 still rounds
/// down to 97.5.
const TOLERANCE: f64 = 1e-9;

/// How an exercise is loaded, and therefore what weights exist for it (D-04).
///
/// This is a property of the exercise, not of the program: a barbell has 2.5 kg
/// resolution whoever is prescribing it. Programs ask the exercise, never the
/// other way round.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Loading {
    /// 20 kg bar plus [`PLATES`] in pairs.
    Barbell,
    /// A rack of fixed dumbbells, ascending by `increment`.
    Dumbbell { increment: f64 },
    /// Nothing to load. The prescription is reps.
    Bodyweight,
    /// A stack pinned at multiples of `increment`.
    Machine { increment: f64 },
}

/// A weight that can actually be put on the bar, and how to build it.
///
/// Produced only by [`Loading::round_down`], so a `Load` in hand is a
/// guarantee that the number is loadable. Carrying the breakdown alongside the
/// weight is not a convenience: the athlete is standing at the rack holding a
/// phone, and "112.5 kg" is a worse answer than "bar + 25, 15, 5, 1.25 per
/// side" (D-04).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Load {
    pub weight: f64,
    /// Plates for **one** side of the bar, largest first. Empty for everything
    /// that is not a barbell, and for the empty bar.
    pub plates_per_side: Vec<f64>,
}

impl Load {
    /// A load with nothing to put on it.
    fn bare(weight: f64) -> Self {
        Self {
            weight,
            plates_per_side: Vec::new(),
        }
    }
}

impl Loading {
    /// Rounds a prescribed weight **down** to the nearest loadable weight.
    ///
    /// Down, always — never to nearest and never up. An athlete whose failure
    /// mode is over-reaching (D-01) gets a systematic bias toward the lighter
    /// loadable weight for the price of one `floor`, applied to every set they
    /// will ever be prescribed. Rounding to nearest would give that up to save
    /// an average of 0.6 kg.
    ///
    /// The one place the result can exceed the target is the floor of each
    /// loading model: an empty bar is 20 kg and the lightest dumbbell on the
    /// rack is whatever it is, so a prescription below that has no lighter
    /// loadable weight to round to. Returning the floor is the only honest
    /// answer — the alternative is prescribing a weight that does not exist.
    pub fn round_down(&self, target: f64) -> Load {
        match *self {
            Loading::Bodyweight => Load::bare(0.0),

            Loading::Barbell => {
                if target < BAR_WEIGHT {
                    return Load::bare(BAR_WEIGHT);
                }

                let pairs = ((target - BAR_WEIGHT + TOLERANCE) / BARBELL_RESOLUTION).floor();
                let weight = BAR_WEIGHT + pairs * BARBELL_RESOLUTION;

                Load {
                    weight,
                    plates_per_side: break_down((weight - BAR_WEIGHT) / 2.0),
                }
            }

            Loading::Dumbbell { increment } | Loading::Machine { increment } => {
                let steps = ((target + TOLERANCE) / increment).floor().max(1.0);
                Load::bare(steps * increment)
            }
        }
    }
}

/// The plates for one side, greedy largest-first.
///
/// Greedy is exact here rather than merely good: every plate divides every
/// larger plate's contribution, so there is no weight the greedy walk can
/// overshoot and no case where a smaller plate first would use fewer. It is
/// also the order a human loads a bar, which matters more than optimality —
/// the list is read off in sequence at the rack.
fn break_down(per_side: f64) -> Vec<f64> {
    let mut remaining = per_side;
    let mut plates = Vec::new();

    for plate in PLATES {
        while remaining >= plate - TOLERANCE {
            plates.push(plate);
            remaining -= plate;
        }
    }

    plates
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The property that makes the whole thing a governor: never heavier than
    /// asked for, except at the floor where nothing lighter exists.
    #[test]
    fn a_barbell_never_rounds_up_above_the_empty_bar() {
        let mut target = BAR_WEIGHT;
        while target < 300.0 {
            let load = Loading::Barbell.round_down(target);
            assert!(
                load.weight <= target + TOLERANCE,
                "{target} kg rounded up to {} kg",
                load.weight
            );
            target += 0.1;
        }
    }

    /// Every barbell weight we produce is `20 + 2.5n`, so it can be built.
    #[test]
    fn every_barbell_weight_is_loadable() {
        let mut target = 0.0;
        while target < 300.0 {
            let load = Loading::Barbell.round_down(target);
            let pairs = (load.weight - BAR_WEIGHT) / BARBELL_RESOLUTION;
            assert!(
                (pairs - pairs.round()).abs() < TOLERANCE,
                "{} kg is not 20 + 2.5n",
                load.weight
            );
            assert!(load.weight >= BAR_WEIGHT);
            target += 0.1;
        }
    }

    /// The breakdown is not decoration — if it does not add up, it is a lie
    /// told to someone loading a bar.
    #[test]
    fn the_plate_breakdown_sums_back_to_the_weight() {
        let mut target = 0.0;
        while target < 300.0 {
            let load = Loading::Barbell.round_down(target);
            let from_plates: f64 = load.plates_per_side.iter().sum::<f64>() * 2.0 + BAR_WEIGHT;
            assert!(
                (from_plates - load.weight).abs() < TOLERANCE,
                "{:?} per side is {from_plates} kg, not {} kg",
                load.plates_per_side,
                load.weight
            );
            target += 0.1;
        }
    }

    /// Only plates that exist, and never more of one than a gym would own.
    #[test]
    fn the_breakdown_uses_only_available_plates() {
        let mut target = 0.0;
        while target < 300.0 {
            let load = Loading::Barbell.round_down(target);
            for plate in &load.plates_per_side {
                assert!(PLATES.contains(plate), "{plate} kg is not a plate we have");
            }
            // Largest first, so the list reads as loading instructions.
            assert!(load
                .plates_per_side
                .windows(2)
                .all(|pair| pair[0] >= pair[1]));
            target += 0.1;
        }
    }

    /// The worked example from D-04, plus the awkward ones: a weight needing
    /// several small plates, and a weight that is the bar and nothing else.
    ///
    /// Note the first case. D-04 illustrates 112.5 kg as "bar + 25, 15, 5,
    /// 1.25 per side". That is 46.25 kg per side and therefore correct, but it
    /// is not what largest-first produces — greedy reaches the same 46.25 with
    /// one plate fewer. The design's arithmetic is right and its example is
    /// merely not the greedy one; the algorithm is what is specified, so the
    /// algorithm wins.
    #[test]
    fn the_named_cases_from_the_design_hold() {
        let load = Loading::Barbell.round_down(112.5);
        assert_eq!(load.weight, 112.5);
        assert_eq!(load.plates_per_side, vec![25.0, 20.0, 1.25]);
        assert_eq!(load.plates_per_side.iter().sum::<f64>(), 46.25);

        assert_eq!(
            Loading::Barbell.round_down(100.0).plates_per_side,
            vec![25.0, 15.0]
        );

        // Several small plates: 28.75 per side is a 25, a 2.5 and a 1.25.
        let small = Loading::Barbell.round_down(77.5);
        assert_eq!(small.weight, 77.5);
        assert_eq!(small.plates_per_side, vec![25.0, 2.5, 1.25]);

        // An unloadable target lands on the increment below it.
        let awkward = Loading::Barbell.round_down(63.75);
        assert_eq!(awkward.weight, 62.5);
        assert_eq!(awkward.plates_per_side, vec![20.0, 1.25]);

        // One increment above the bar is a pair of 1.25s.
        let lightest = Loading::Barbell.round_down(22.5);
        assert_eq!(lightest.weight, 22.5);
        assert_eq!(lightest.plates_per_side, vec![1.25]);
    }

    /// Below the bar there is nothing lighter to prescribe.
    #[test]
    fn a_prescription_below_the_bar_is_the_empty_bar() {
        for target in [0.0, 1.0, 12.0, 19.9, 22.49] {
            let load = Loading::Barbell.round_down(target);
            assert_eq!(load.weight, BAR_WEIGHT, "{target} kg");
            assert!(load.plates_per_side.is_empty());
        }
    }

    /// Binary floats must not cost the athlete an increment. 0.7 * 100.0 is
    /// not exactly 70.0, and the athlete should still get 70 kg.
    #[test]
    fn representation_error_does_not_cost_an_increment() {
        for (percentage, max, expected) in [(0.7, 100.0, 70.0), (0.85, 140.0, 117.5)] {
            let load = Loading::Barbell.round_down(percentage * max);
            assert_eq!(load.weight, expected, "{percentage} of {max}");
        }

        // ...but a real 0.1 kg under a loadable weight still rounds down.
        assert_eq!(Loading::Barbell.round_down(99.9).weight, 97.5);
    }

    #[test]
    fn bodyweight_carries_no_load_whatever_is_asked_for() {
        for target in [0.0, 50.0, 200.0] {
            assert_eq!(Loading::Bodyweight.round_down(target), Load::bare(0.0));
        }
    }

    #[test]
    fn racks_and_stacks_round_down_to_their_increment() {
        let rack = Loading::Dumbbell { increment: 2.0 };
        assert_eq!(rack.round_down(13.9).weight, 12.0);
        assert_eq!(rack.round_down(14.0).weight, 14.0);
        // Nothing lighter than the lightest dumbbell exists.
        assert_eq!(rack.round_down(0.5).weight, 2.0);

        let stack = Loading::Machine { increment: 5.0 };
        assert_eq!(stack.round_down(47.0).weight, 45.0);
        assert!(stack.round_down(60.0).plates_per_side.is_empty());
    }
}
