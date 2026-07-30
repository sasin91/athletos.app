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

/// The greedy walk shared by [`break_down`] and [`fill`]: plates placed
/// largest-first and capped at `ceiling`, plus whatever was left over.
///
/// Greedy is exact here rather than merely good: every plate divides every
/// larger plate's contribution, so there is no weight the walk can overshoot
/// and no case where a smaller plate first would use fewer. It is also the
/// order a human loads a bar, which matters more than optimality — the list
/// is read off in sequence at the rack.
///
/// Splitting the leftover out, instead of folding it into a `bool` or an
/// `Option` here, is what lets [`break_down`] and [`fill`] disagree honestly
/// about what a nonzero remainder means: one candidate's rejection is the
/// other's best-effort answer.
fn walk(remainder: f64, ceiling: f64) -> (Vec<f64>, f64) {
    let mut left = remainder;
    let mut plates = Vec::new();

    for plate in PLATES {
        if plate > ceiling + TOLERANCE {
            continue;
        }

        while left >= plate - TOLERANCE {
            plates.push(plate);
            left -= plate;
        }
    }

    (plates, left)
}

/// The plates for one side, greedy largest-first, best effort.
///
/// Best effort: for a weight that cannot be built exactly — not a multiple of
/// 1.25 kg, or negative — this returns the closest the greedy walk gets
/// without ever overshooting, not an error. [`Loading::round_down`] never
/// produces such a weight, so this only matters for a caller that skips
/// rounding, which today is only [`plan`]'s own fallback for a target it
/// cannot plan exactly.
fn break_down(per_side: f64) -> Vec<f64> {
    walk(per_side, f64::INFINITY).0
}

/// The same greedy walk, capped at `ceiling`.
///
/// The cap is what makes [`plan`] possible: a bar is a stack, so anything
/// added on top of retained plates must be no larger than the smallest one
/// still on there.
///
/// `None` when the remainder cannot be built exactly. That cannot happen for a
/// loadable weight — every plate is a multiple of 1.25 and 1.25 is always
/// under any ceiling that exists — but [`PLATES`] is a constant someone will
/// edit one day, and a silently short stack is a lie told to somebody loading
/// a bar.
fn fill(remainder: f64, ceiling: f64) -> Option<Vec<f64>> {
    let (plates, left) = walk(remainder, ceiling);
    (left.abs() < TOLERANCE).then_some(plates)
}

/// What comes off the bar and what goes on, per side, to get from the
/// arrangement currently loaded to the next prescribed weight (D-04).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PlateChange {
    /// Outermost first — the order they actually come off.
    pub remove: Vec<f64>,
    /// Largest first — the order they go on.
    pub add: Vec<f64>,
    /// What this leaves on the bar, largest first. Sums to the target for any
    /// loadable weight, and is deliberately not always the greedy breakdown
    /// for one. For a target that cannot be built exactly it is
    /// [`break_down`]'s best-effort walk instead, which may fall short — see
    /// [`plan`]'s fallback.
    pub plates_per_side: Vec<f64>,
}

/// Plans the change from the arrangement on the bar to `target_per_side`.
///
/// `previous` is one side as it currently stands, largest first; an empty
/// slice is an empty bar.
///
/// # Why a prefix
///
/// A bar is a **stack**. Plates load largest-first from the middle outward, so
/// only the outermost can be removed and nothing larger than the smallest
/// plate kept can go on — a 15 cannot be slid in under a 5. The plates that
/// may be retained are therefore exactly a prefix of `previous`, which leaves
/// `previous.len() + 1` candidates and makes the search exhaustive rather than
/// heuristic.
///
/// # The rule
///
/// Fewest plates handled; among equals, fewest removed.
///
/// The tie-break is the point. Going 85 kg to 100 kg, three candidates all
/// cost three plates handled, and fewest-removed picks the one that takes
/// nothing off — because taking weight off is the friction that makes an
/// athlete put a convenient pair on and lift more than was asked for, which is
/// the drift the product exists to govern (D-01, D-07).
///
/// Cost leads and removals only break ties, because fewest-removals alone
/// degenerates: a bar at `25, 1.25` targeting 40 keeps both plates, caps
/// everything added at 1.25, and asks for eleven of them.
pub fn plan(previous: &[f64], target_per_side: f64) -> PlateChange {
    // (plates handled, plates removed, what goes on)
    let mut best: Option<(usize, usize, Vec<f64>)> = None;

    for keep in (0..=previous.len()).rev() {
        let kept = &previous[..keep];
        let on_bar: f64 = kept.iter().sum();
        if on_bar > target_per_side + TOLERANCE {
            continue;
        }

        // No ceiling with an empty bar: the first plate on can be any of them.
        let ceiling = kept.last().copied().unwrap_or(f64::INFINITY);
        let Some(add) = fill(target_per_side - on_bar, ceiling) else {
            continue;
        };

        let removed = previous.len() - keep;
        let cost = removed + add.len();

        let better = match &best {
            None => true,
            Some((best_cost, best_removed, _)) => {
                cost < *best_cost || (cost == *best_cost && removed < *best_removed)
            }
        };

        if better {
            best = Some((cost, removed, add));
        }
    }

    // Stripping the bar and starting again always plans exactly, for any
    // target that is loadable. The fallback is for a target that is not —
    // not a multiple of 1.25, or negative — which every candidate above
    // rejects, `keep = 0` included: it walks the exact same remainder
    // `break_down` would. So the fallback calls `break_down` for what it
    // actually is: the best-effort greedy walk, which may fall short of
    // `target_per_side` rather than reproducing that same rejection.
    // `Loading::round_down` never produces a target `plan` cannot build
    // exactly, so this only fires for a caller upstream of it that skipped
    // rounding — an honest short stack beats panicking on a number somebody's
    // future program produced.
    let (_, removed, add) = best.unwrap_or_else(|| {
        let add = break_down(target_per_side);
        (previous.len() + add.len(), previous.len(), add)
    });

    let keep = previous.len() - removed;

    let mut remove = previous[keep..].to_vec();
    remove.reverse();

    let mut plates_per_side = previous[..keep].to_vec();
    plates_per_side.extend(add.iter().copied());

    PlateChange {
        remove,
        add,
        plates_per_side,
    }
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

    /// Every loadable per-side weight, for sweeps. 1.25 kg is the smallest
    /// plate, so these are exactly the reachable arrangements.
    fn loadable_per_side() -> impl Iterator<Item = f64> {
        (0..=80).map(|step| f64::from(step) * 1.25)
    }

    fn holds(previous: &[f64], target: f64, change: &PlateChange) {
        // Applying the instructions must produce the stated arrangement.
        let kept = previous.len() - change.remove.len();
        let mut applied = previous[..kept].to_vec();
        applied.extend(change.add.iter().copied());
        assert_eq!(
            applied, change.plates_per_side,
            "{previous:?} -> {target}: instructions do not build the stated stack"
        );

        // The plates removed are the ones that were on there, outermost first.
        let mut expected_removed = previous[kept..].to_vec();
        expected_removed.reverse();
        assert_eq!(change.remove, expected_removed, "{previous:?} -> {target}");

        // It sums to the target, uses only real plates, and can be loaded.
        let sum: f64 = change.plates_per_side.iter().sum();
        assert!(
            (sum - target).abs() < TOLERANCE,
            "{previous:?} -> {target}: stack sums to {sum}"
        );
        for plate in &change.plates_per_side {
            assert!(PLATES.contains(plate), "{plate} is not a plate we have");
        }
        assert!(
            change
                .plates_per_side
                .windows(2)
                .all(|pair| pair[0] >= pair[1]),
            "{previous:?} -> {target}: {:?} cannot be loaded in that order",
            change.plates_per_side
        );
    }

    /// The case that prompted the whole thing. 85 kg is `25, 5, 2.5` a side
    /// and 100 kg is greedily `25, 15` — so the naive screen says strip two
    /// plates to add one, and the athlete puts a convenient pair on instead.
    #[test]
    fn adding_beats_restacking_when_they_cost_the_same() {
        let change = plan(&[25.0, 5.0, 2.5], 40.0);

        assert_eq!(change.remove, Vec::<f64>::new());
        assert_eq!(change.add, vec![2.5, 2.5, 2.5]);
        assert_eq!(change.plates_per_side, vec![25.0, 5.0, 2.5, 2.5, 2.5, 2.5]);
    }

    /// Cost leads and removals only break ties. With removals as the primary
    /// rule this keeps the 1.25, which caps everything added at 1.25 and asks
    /// for eleven of them.
    #[test]
    fn cost_leads_so_a_trapped_small_plate_comes_off() {
        let change = plan(&[25.0, 1.25], 40.0);

        assert_eq!(change.remove, vec![1.25]);
        assert_eq!(change.add, vec![15.0]);
        assert_eq!(change.plates_per_side, vec![25.0, 15.0]);
    }

    /// The 5/3/1 top single into Boring But Big. This drop genuinely is four
    /// plates off, and a planner that pretended otherwise would be lying.
    #[test]
    fn the_big_drop_is_reported_honestly() {
        // 147.5 kg -> 63.75 a side; 87.5 kg -> 33.75 a side.
        let change = plan(&[25.0, 20.0, 15.0, 2.5, 1.25], 33.75);

        assert_eq!(change.remove, vec![1.25, 2.5, 15.0, 20.0]);
        assert_eq!(change.add, vec![5.0, 2.5, 1.25]);
        assert_eq!(change.plates_per_side, vec![25.0, 5.0, 2.5, 1.25]);
    }

    #[test]
    fn an_unchanged_weight_is_a_no_op() {
        let change = plan(&[25.0, 15.0], 40.0);

        assert!(change.remove.is_empty());
        assert!(change.add.is_empty());
        assert_eq!(change.plates_per_side, vec![25.0, 15.0]);
    }

    /// From an empty bar there is nothing to keep, so the plan is the greedy
    /// breakdown and the screen simply says "add".
    #[test]
    fn an_empty_bar_plans_the_greedy_breakdown() {
        for target in loadable_per_side() {
            let change = plan(&[], target);

            assert!(change.remove.is_empty());
            assert_eq!(change.add, break_down(target));
            assert_eq!(change.plates_per_side, break_down(target));
        }
    }

    /// Never worse than stripping the bar and starting again, which is the
    /// baseline the display had before this existed.
    #[test]
    fn no_plan_costs_more_than_a_full_restack() {
        for from in loadable_per_side() {
            let previous = break_down(from);
            for to in loadable_per_side() {
                let change = plan(&previous, to);
                let cost = change.remove.len() + change.add.len();
                let restack = previous.len() + break_down(to).len();

                assert!(
                    cost <= restack,
                    "{from} -> {to}: {cost} plates handled beats {restack} how?"
                );
                holds(&previous, to, &change);
            }
        }
    }

    /// A tripwire for a regression to removals-first, which answers some
    /// targets with a fistful of the smallest plate — a bar at `25, 1.25`
    /// reaching 40 a side by adding eleven 1.25s.
    ///
    /// Deliberately loose, and five is where the sweep says it has to sit.
    /// This is a consequence of cost leading rather than a structural
    /// property, so the bound is a tripwire and not a claim about the answer.
    /// Two legitimate cases set it: 85 → 100 adds three of one plate, and a
    /// bar holding a single 15 reaching 90 a side adds five more — tied at
    /// five plates handled against stripping it for `25, 25, 25, 15`, and the
    /// tie-break takes the one that removes nothing, exactly as asked.
    #[test]
    fn no_plan_asks_for_a_fistful_of_one_plate() {
        for from in loadable_per_side() {
            let previous = break_down(from);
            for to in loadable_per_side() {
                let change = plan(&previous, to);

                for plate in PLATES {
                    let count = change.add.iter().filter(|added| **added == plate).count();
                    assert!(
                        count <= 5,
                        "{from} -> {to} asks for {count} plates of {plate}: {:?}",
                        change.add
                    );
                }
            }
        }
    }

    /// The arrangement a plan leaves is the input to the next plan, so the
    /// invariants have to survive being chained rather than only holding
    /// against canonical breakdowns.
    #[test]
    fn the_invariants_survive_a_whole_session_chained() {
        // A 5/3/1 squat day: 65/75/85% of a 140 kg training max, then five
        // sets of Boring But Big at 50%. Per side, from a 20 kg bar.
        let day = [35.0, 42.5, 48.75, 25.0, 25.0, 25.0, 25.0, 25.0];

        let mut on_bar: Vec<f64> = Vec::new();
        for target in day {
            let change = plan(&on_bar, target);
            holds(&on_bar, target, &change);
            on_bar = change.plates_per_side;
        }
    }

    /// No caller reaches `plan` with a target that is not a multiple of
    /// 1.25 today — `Loading::round_down` sees to that — but `plan` is public
    /// and takes a bare `f64`, so the degenerate case has to degrade honestly
    /// rather than lie about what it built. It strips to the same best-effort
    /// walk the display used before `plan` existed, which can fall short of
    /// the target rather than reproduce the exact-match rejection every
    /// candidate gave it.
    #[test]
    fn an_unloadable_target_degrades_to_the_best_effort_breakdown() {
        let change = plan(&[25.0, 15.0], 10.3);

        assert_eq!(change.remove, vec![15.0, 25.0]);
        assert_eq!(change.add, break_down(10.3));
        assert_eq!(change.plates_per_side, break_down(10.3));

        // The honest part: it does not sum to the target it was asked for.
        let sum: f64 = change.plates_per_side.iter().sum();
        assert!((sum - 10.3).abs() > TOLERANCE, "{sum} should not be 10.3");
    }
}
