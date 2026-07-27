//! Where the hour went (D-10).
//!
//! Each set carries a `logged_at`, stamped on the phone when the athlete tapped
//! Log or Skip. The gaps between consecutive stamps are this module's input and
//! the per-exercise totals are its output.
//!
//! ## What an interval is, and what it is not
//!
//! There is **one tap per set**, at the end of it. So the gap between two taps
//! contains the pause after the previous set, the loading and the setup, and
//! the performance of this one, with no way to tell them apart. Splitting them
//! would need a second tap at the start of each set, and that is a rest timer
//! with a different name — tried in the predecessor, removed for adding stress,
//! and listed in `CONTEXT.md` under what this product deliberately has no words
//! for.
//!
//! So the vocabulary here is `interval`, never `rest`. The number is honest at
//! the granularity it is reported: "Back Squat cost you 24 minutes" is true,
//! and it is the question the athlete is actually asking.
//!
//! ## Lead-in and tail
//!
//! The first interval has no predecessor, so it runs from `started_at` — which
//! makes it walking in, changing and warming up rather than a set. Folded into
//! the first exercise it would make whatever came first look enormously
//! expensive, so it is reported separately as the **lead-in**. The **tail** is
//! its counterpart: the last stamp to `ended_at`.
//!
//! ## Why the phone's clock is not trusted
//!
//! `logged_at` comes from a handset that can have its clock corrected by NTP or
//! changed by hand mid-session. A jump makes one interval nonsense and, if it
//! went backwards, the next one nonsense in the other direction. There is no
//! way to detect this from the data — a genuine three-minute gap and a gap
//! straddling a three-minute correction are the same two numbers.
//!
//! So intervals that are negative or longer than [`INTERVAL_CEILING`] are
//! **discarded** rather than clamped, and the count of what was discarded is
//! reported. Clamping would fold a bad measurement into the total at an
//! arbitrary value and there would be no way to see it had happened; dropping
//! it makes the total smaller than the wall clock and says why. This is the
//! same instinct that makes [`crate::pace`] take a median rather than a mean:
//! the tail of this distribution is not signal.

use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;

/// The longest gap counted as one interval, in seconds.
///
/// Twenty minutes. Long enough that a genuinely slow heavy single with a long
/// walk to the water fountain still counts, short enough that a session left
/// half-logged over lunch does not land as work. A session where this triggers
/// has stopped being a measurement of that session's pace and become a
/// measurement of the athlete's afternoon.
const INTERVAL_CEILING: i64 = 20 * 60;

/// One set as the timing calculation needs it.
///
/// Deliberately not [`crate::routes::workouts::LoggedSetView`]: this module is
/// pure and takes only what it uses, so it can be tested without constructing a
/// view model or touching a database.
#[derive(Debug, Clone)]
pub struct TimedSet {
    pub exercise: String,
    pub label: String,
    /// `None` for a set recorded before timing existed, or by a client that
    /// does not send it. Such a set contributes no interval and does not break
    /// the chain — the next stamped set measures from the last stamp there
    /// actually was, which is why this walks a running cursor rather than
    /// zipping neighbouring pairs.
    pub logged_at: Option<DateTime<Utc>>,
}

/// Where one session's time went.
#[derive(Debug, Serialize, ToSchema, PartialEq)]
pub struct SessionTiming {
    /// Commit to the first set logged: walking in, changing, warming up.
    ///
    /// `None` when no set carries a stamp, which is also when the whole
    /// structure is absent — see [`compute`].
    pub lead_in_seconds: Option<i64>,

    /// The last set logged to the end of the session. `None` while the session
    /// is still open, since there is nothing to measure to.
    pub tail_seconds: Option<i64>,

    /// Per exercise, in the order the exercises were first performed.
    ///
    /// Order matters and is not alphabetical: an athlete reading this is
    /// walking back through their own session, and the main lift they opened
    /// with belongs at the top.
    pub exercises: Vec<ExerciseSpend>,

    /// The single longest interval, and which set closed it.
    ///
    /// Worth surfacing on its own because it is usually the answer. An hour
    /// that ran to eighty minutes is rarely uniformly slower; it is one gap
    /// where something else happened.
    pub longest_interval: Option<LongestInterval>,

    /// Intervals thrown away as impossible — negative, or over the ceiling.
    ///
    /// Reported rather than hidden. When this is not zero the totals below add
    /// up to less than the wall clock, and the screen has to be able to say why
    /// instead of leaving the athlete to notice the arithmetic does not work.
    pub discarded_intervals: u32,

    /// How many sets carried no stamp at all.
    ///
    /// Not the same as `discarded_intervals`: this is work that was never
    /// measured, that one is a measurement that could not be believed.
    pub unstamped_sets: u32,
}

/// One exercise's share of the session.
#[derive(Debug, Serialize, ToSchema, PartialEq)]
pub struct ExerciseSpend {
    #[schema(example = "back-squat")]
    pub exercise: String,
    #[schema(example = "Back Squat")]
    pub label: String,
    /// Summed intervals for every set of this exercise that had a believable
    /// one. Excludes the lead-in even for the first exercise.
    pub seconds: i64,
    /// How many of this exercise's sets contributed an interval. Less than the
    /// number of sets performed when stamps were missing or discarded, which is
    /// what stops `seconds` being read as authoritative when it is not.
    pub counted_sets: u32,
}

/// The longest single gap in the session.
#[derive(Debug, Serialize, ToSchema, PartialEq)]
pub struct LongestInterval {
    pub seconds: i64,
    /// The set the interval ended at — the one that was logged late, not the
    /// one before it.
    pub position: u16,
    #[schema(example = "Back Squat")]
    pub label: String,
}

/// Works out where the session's time went.
///
/// `sets` must be in performed order — which is `position` order, and which the
/// caller already has because that is the index the detail query walks.
///
/// Returns `None` when not one set carries a stamp. That is the honest answer
/// for every workout logged before this column existed, and it is a different
/// statement from "this session took no time": the field is absent from the
/// response rather than present and empty, so a client cannot render a
/// breakdown of nothing.
pub fn compute(
    started_at: DateTime<Utc>,
    ended_at: Option<DateTime<Utc>>,
    sets: &[(u16, TimedSet)],
) -> Option<SessionTiming> {
    if !sets.iter().any(|(_, set)| set.logged_at.is_some()) {
        return None;
    }

    // Insertion-ordered: `order` remembers where each exercise was first seen so
    // the output can be walked back in the order the athlete performed it, while
    // the map does the accumulating.
    let mut totals: HashMap<String, (i64, u32)> = HashMap::new();
    let mut order: Vec<(String, String)> = Vec::new();

    let mut lead_in = None;
    let mut longest: Option<LongestInterval> = None;
    let mut discarded = 0_u32;
    let mut unstamped = 0_u32;

    // The cursor is the last *believable* stamp, which is not always the
    // previous set's. A set with no stamp leaves it where it was, so the next
    // stamped set measures across the gap rather than losing its interval too.
    let mut cursor = started_at;
    let mut last_stamp: Option<DateTime<Utc>> = None;

    for (position, set) in sets {
        let Some(logged_at) = set.logged_at else {
            unstamped += 1;
            continue;
        };

        let seconds = (logged_at - cursor).num_seconds();
        let believable = (0..=INTERVAL_CEILING).contains(&seconds);

        if believable {
            if last_stamp.is_none() {
                // The first stamped set closes the lead-in, and the lead-in is
                // not work: it is not attributed to any exercise.
                lead_in = Some(seconds);
            } else {
                let key = set.exercise.clone();
                let entry = totals.entry(key.clone()).or_insert_with(|| {
                    order.push((key.clone(), set.label.clone()));
                    (0, 0)
                });
                entry.0 += seconds;
                entry.1 += 1;

                if longest.as_ref().is_none_or(|best| seconds > best.seconds) {
                    longest = Some(LongestInterval {
                        seconds,
                        position: *position,
                        label: set.label.clone(),
                    });
                }
            }
        } else {
            discarded += 1;
        }

        // The cursor advances to this stamp whether or not the interval was
        // believable. A clock jump corrupts the interval that straddles it; the
        // stamps on either side are still the best account of when those sets
        // happened, and refusing to advance would corrupt every later interval
        // as well.
        cursor = logged_at;
        last_stamp = Some(logged_at);
    }

    let exercises = order
        .into_iter()
        .map(|(exercise, label)| {
            let (seconds, counted_sets) = totals[&exercise];
            ExerciseSpend {
                exercise,
                label,
                seconds,
                counted_sets,
            }
        })
        .collect();

    Some(SessionTiming {
        lead_in_seconds: lead_in,
        tail_seconds: ended_at
            .zip(last_stamp)
            .map(|(end, last)| (end - last).num_seconds())
            .filter(|seconds| *seconds >= 0),
        exercises,
        longest_interval: longest,
        discarded_intervals: discarded,
        unstamped_sets: unstamped,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn at(minute: i64, second: i64) -> DateTime<Utc> {
        DateTime::from_timestamp(minute * 60 + second, 0).expect("in range")
    }

    fn set(exercise: &str, logged_at: Option<DateTime<Utc>>) -> TimedSet {
        TimedSet {
            exercise: exercise.to_owned(),
            label: exercise.to_owned(),
            logged_at,
        }
    }

    #[test]
    fn a_session_with_no_stamps_has_no_timing_at_all() {
        let sets = vec![(1, set("squat", None)), (2, set("squat", None))];

        assert_eq!(compute(at(0, 0), Some(at(60, 0)), &sets), None);
    }

    #[test]
    fn the_lead_in_belongs_to_the_session_and_not_to_the_first_lift() {
        // Commit at 0, first set logged at 6:00, second at 9:00.
        let sets = vec![
            (1, set("squat", Some(at(6, 0)))),
            (2, set("squat", Some(at(9, 0)))),
        ];

        let timing = compute(at(0, 0), Some(at(10, 0)), &sets).expect("stamped");

        assert_eq!(timing.lead_in_seconds, Some(360));
        // Only the 6:00 -> 9:00 gap is squat's. The lead-in is not.
        assert_eq!(timing.exercises[0].seconds, 180);
        assert_eq!(timing.exercises[0].counted_sets, 1);
    }

    #[test]
    fn exercises_come_back_in_the_order_they_were_performed() {
        let sets = vec![
            (1, set("squat", Some(at(1, 0)))),
            (2, set("squat", Some(at(3, 0)))),
            (3, set("abs", Some(at(4, 0)))),
            (4, set("squat", Some(at(6, 0)))),
        ];

        let timing = compute(at(0, 0), None, &sets).expect("stamped");
        let order: Vec<_> = timing
            .exercises
            .iter()
            .map(|spend| spend.exercise.as_str())
            .collect();

        // squat first because it was performed first, even though it is also
        // performed last. Not alphabetical, and not last-seen.
        assert_eq!(order, vec!["squat", "abs"]);
    }

    #[test]
    fn a_clock_that_jumps_backwards_loses_one_interval_and_not_the_rest() {
        let sets = vec![
            (1, set("squat", Some(at(2, 0)))),
            // The phone's clock is corrected backwards here.
            (2, set("squat", Some(at(1, 0)))),
            (3, set("squat", Some(at(4, 0)))),
        ];

        let timing = compute(at(0, 0), None, &sets).expect("stamped");

        assert_eq!(timing.discarded_intervals, 1);
        // The 1:00 -> 4:00 gap survives, because the cursor advanced to the
        // corrected stamp rather than staying at the pre-jump one.
        assert_eq!(timing.exercises[0].seconds, 180);
        assert_eq!(timing.exercises[0].counted_sets, 1);
    }

    #[test]
    fn an_interval_over_the_ceiling_is_dropped_rather_than_clamped() {
        let sets = vec![
            (1, set("squat", Some(at(1, 0)))),
            (2, set("squat", Some(at(2, 0)))),
            // Lunch.
            (3, set("squat", Some(at(90, 0)))),
        ];

        let timing = compute(at(0, 0), None, &sets).expect("stamped");

        assert_eq!(timing.discarded_intervals, 1);
        // 60 seconds, not 60 + a clamped ceiling. The total is smaller than the
        // wall clock and `discarded_intervals` is how the screen explains that.
        assert_eq!(timing.exercises[0].seconds, 60);
    }

    #[test]
    fn an_unstamped_set_does_not_cost_the_next_one_its_interval() {
        let sets = vec![
            (1, set("squat", Some(at(1, 0)))),
            (2, set("squat", None)),
            (3, set("squat", Some(at(4, 0)))),
        ];

        let timing = compute(at(0, 0), None, &sets).expect("stamped");

        assert_eq!(timing.unstamped_sets, 1);
        assert_eq!(timing.discarded_intervals, 0);
        // Measured 1:00 -> 4:00 across the hole rather than being abandoned.
        assert_eq!(timing.exercises[0].seconds, 180);
    }

    #[test]
    fn the_longest_interval_names_the_set_it_ended_at() {
        let sets = vec![
            (1, set("squat", Some(at(1, 0)))),
            (2, set("squat", Some(at(2, 0)))),
            (3, set("squat", Some(at(9, 0)))),
        ];

        let timing = compute(at(0, 0), None, &sets).expect("stamped");
        let longest = timing.longest_interval.expect("three sets, two intervals");

        assert_eq!(longest.seconds, 420);
        // Position 3 — the set logged late, not position 2 which preceded it.
        assert_eq!(longest.position, 3);
    }

    #[test]
    fn an_open_session_has_no_tail() {
        let sets = vec![(1, set("squat", Some(at(1, 0))))];

        assert_eq!(
            compute(at(0, 0), None, &sets)
                .expect("stamped")
                .tail_seconds,
            None
        );
    }

    #[test]
    fn the_tail_runs_from_the_last_stamp_to_the_end() {
        let sets = vec![
            (1, set("squat", Some(at(1, 0)))),
            (2, set("squat", Some(at(3, 0)))),
        ];

        let timing = compute(at(0, 0), Some(at(5, 30)), &sets).expect("stamped");

        assert_eq!(timing.tail_seconds, Some(150));
    }
}
