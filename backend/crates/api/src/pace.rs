//! How long this session will take, measured from the athlete's own history
//! (D-10).
//!
//! The session header shows elapsed time and sets remaining. Once roughly three
//! sessions are logged it also projects a finish — not from an estimate baked
//! into the program, and not shown at all before there is data to compute it
//! from. The number it is computed from is the athlete's **median seconds per
//! set**.
//!
//! Median rather than mean, because the distribution has a long right tail that
//! a mean would follow: one session interrupted by a phone call would push every
//! projection out for weeks. That is the whole reason this rule is not "total
//! time over total sets".
//!
//! ## Why this is in Rust
//!
//! It was in the SvelteKit BFF until this change, where it cost six requests to
//! draw one header — the history list, plus a detail request per session because
//! a history row carries `duration_seconds` but not how many sets were in it.
//! Both halves of that were wrong. A median-seconds-per-set rule is a rule, and
//! anything implemented in a `+page.server.ts` is something the future native
//! client has to reimplement in another language (D-11). The request count was
//! only the symptom.
//!
//! ## What the client still does
//!
//! Multiplies. The logger's header re-projects every second against a clock and
//! a set list that live on the phone and that the server has never seen (D-09),
//! so [`PaceProjection::median_seconds_per_set`] travels with the session and the
//! logger multiplies it by the sets it has left. That is arithmetic over a
//! measurement, not a decision about training: the rule — which sessions count,
//! what a set is worth, how few is too few — is settled here.

use serde::Serialize;
use sqlx::PgPool;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::ApiResult;

/// How many recent sessions the pace is measured over.
///
/// A window rather than the athlete's whole history, so the number reflects how
/// they are training now: a block of heavy triples and a block of accessory
/// volume are different sports as far as seconds-per-set is concerned, and a
/// pace averaged over both describes neither.
const SAMPLE_SIZE: i64 = 5;

/// How many *usable* sessions there must be before a projection is honest.
///
/// D-10 says "roughly three". Two would let a single long session be the median
/// rather than merely be in it.
const SAMPLE_FLOOR: usize = 3;

/// One past session as the query returns it: how long it took, and how many sets
/// were actually performed in it.
///
/// The duration is optional because `workouts.ended_at` is — a session still
/// open, or one that will be closed by the stale sweep (D-08), has no wall clock
/// yet.
type Sample = (Option<f64>, i64);

/// What the session header needs, with the arithmetic already done.
///
/// Every field is a fact about *this* athlete and *this* session. There is
/// deliberately nothing here that would let a client recompute the median for
/// itself, because a client that could would eventually be asked to.
#[derive(Debug, Serialize, ToSchema)]
pub struct PaceProjection {
    /// Whether the athlete has logged enough to project from (D-10).
    ///
    /// Not the same question as `projected_seconds != null`, though today they
    /// answer together: this one is about the athlete's history, and a session
    /// with nothing prescribed in it would have a pace to project *from* and
    /// nothing to project *onto*. A client branching on "do I show the finish
    /// time" wants this one, and a name reads better at the call site than a
    /// null check whose meaning has to be looked up.
    pub can_project: bool,

    /// The athlete's median seconds per set, or `null` when there is not enough
    /// history to say.
    ///
    /// Carried so the logger can re-project as sets are logged, with no network
    /// (D-09). It is a measurement the server made, not an input the client is
    /// expected to reason about.
    #[schema(example = 96.0)]
    pub median_seconds_per_set: Option<f64>,

    /// How long this whole session should take at that pace, in seconds.
    ///
    /// Whole seconds, and every prescribed set counted — this is the number the
    /// peek screen shows before a single set exists to be remaining. `null`
    /// whenever there is no pace, because an invented finish time is worse than
    /// none, for the same reason an invented progress denominator is (D-03).
    #[schema(example = 3264)]
    pub projected_seconds: Option<i64>,

    /// How many of the recent sessions were usable — the number the floor is
    /// compared against, not the number of sessions looked at.
    ///
    /// Sent because "not yet" is a more useful answer with a count attached: a
    /// client can say "one more session" rather than going quiet for reasons the
    /// athlete cannot see.
    #[schema(example = 5)]
    pub sample_size: u32,
}

/// Measures the athlete's pace and projects it onto a session of `sets` sets.
///
/// # The query, and the index that does not serve it
///
/// One round trip. The scope is the athlete, which `workouts` cannot express —
/// it has no `athlete_id` — so it arrives through the join on `enrollments`, and
/// no index over `workouts` can then answer the ordering. This is the same sort
/// of one athlete's whole history that `routes::workouts::history` documents and
/// accepts, bounded by how many sessions one person has logged, and the same fix
/// (denormalising `athlete_id` onto `workouts`) would serve both if either ever
/// justifies it.
///
/// What *is* served by an index: `enrollments_athlete_id_idx` finds the
/// athlete's enrolments, and `workout_sets`' `unique (workout_id, "position")`
/// is the lookup for the set counts.
///
/// The window is applied in the subquery, **before** the unusable sessions are
/// dropped. So a session with nothing logged in it costs a slot rather than
/// pulling an older session in behind it, and the pace stays a statement about
/// the last five sessions instead of about the last five that happened to be
/// measurable — which could reach back a year.
pub async fn measure(db: &PgPool, athlete_id: Uuid, sets: usize) -> ApiResult<PaceProjection> {
    let samples: Vec<Sample> = sqlx::query_as(
        "select extract(epoch from (recent.ended_at - recent.started_at))::float8,
                count(*) filter (where s.status = 'done')
         from (
             select w.id, w.started_at, w.ended_at
             from workouts w
             join enrollments e on e.id = w.enrollment_id
             where e.athlete_id = $1
             order by w.started_at desc, w.id desc
             limit $2
         ) recent
         left join workout_sets s on s.workout_id = recent.id
         group by recent.id, recent.started_at, recent.ended_at",
    )
    .bind(athlete_id)
    .bind(SAMPLE_SIZE)
    .fetch_all(db)
    .await?;

    Ok(project(samples, sets))
}

/// The rule itself, with the database left outside.
///
/// Separated for the reason D-15 gives for the engine crate: this is the part
/// that is genuinely easy to get subtly wrong — the floor, the even-length
/// median, which samples are dropped — and it is testable in microseconds here,
/// case for case against the same table of examples the TypeScript it replaces
/// was tested against.
fn project(samples: Vec<Sample>, sets: usize) -> PaceProjection {
    // A session with no duration or no sets is dropped rather than counted as
    // zero. An auto-closed session (D-08) or one abandoned before a single set
    // was logged would otherwise drag the median toward a pace nobody ever
    // lifted at — and unlike a long session, which the median is chosen to
    // survive, a zero is not a slow session at all. It is the absence of one.
    let mut rates: Vec<f64> = samples
        .into_iter()
        .filter(|(seconds, sets)| seconds.is_some_and(|seconds| seconds > 0.0) && *sets > 0)
        .map(|(seconds, sets)| seconds.unwrap_or_default() / sets as f64)
        .collect();

    let median = median(&mut rates);

    PaceProjection {
        can_project: median.is_some(),
        median_seconds_per_set: median,
        projected_seconds: median.map(|rate| (rate * sets as f64).round() as i64),
        sample_size: u32::try_from(rates.len()).unwrap_or(u32::MAX),
    }
}

/// The middle rate, or `None` when there are too few to have a middle worth
/// trusting.
fn median(rates: &mut [f64]) -> Option<f64> {
    if rates.len() < SAMPLE_FLOOR {
        return None;
    }

    // `total_cmp` rather than `partial_cmp().unwrap()`: every rate here is a
    // positive finite quotient, since the filter above admits nothing else, but
    // a sort that cannot panic is worth more than a comment saying it will not.
    rates.sort_by(|left, right| left.total_cmp(right));

    let middle = rates.len() / 2;

    Some(if rates.len() % 2 == 1 {
        rates[middle]
    } else {
        // The mean of the middle pair. An even sample has no single middle, and
        // taking either neighbour would make the projection depend on which side
        // of the list the tie fell.
        (rates[middle - 1] + rates[middle]) / 2.0
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A session of `seconds` seconds in which `sets` sets were performed.
    fn session(seconds: f64, sets: i64) -> Sample {
        (Some(seconds), sets)
    }

    /// The projection over one prescribed set, so the assertion is about the
    /// pace and not about the multiplication.
    fn pace(samples: Vec<Sample>) -> Option<f64> {
        project(samples, 1).median_seconds_per_set
    }

    #[test]
    fn says_nothing_until_there_are_three_sessions_to_say_it_from() {
        assert_eq!(pace(vec![]), None);
        assert_eq!(pace(vec![session(3000.0, 30), session(3000.0, 30)]), None);
    }

    #[test]
    fn takes_the_middle_of_an_odd_number_of_sessions() {
        let samples = vec![
            session(300.0, 3), // 100 s/set
            session(300.0, 5), // 60
            session(300.0, 4), // 75
        ];

        assert_eq!(pace(samples), Some(75.0));
    }

    #[test]
    fn averages_the_middle_pair_of_an_even_number() {
        let samples = vec![
            session(300.0, 3), // 100
            session(300.0, 5), // 60
            session(300.0, 4), // 75
            session(300.0, 6), // 50
        ];

        assert_eq!(pace(samples), Some(67.5));
    }

    /// The median is the median and not the mean. The mean of these four is
    /// 491.7 s/set, which would project a two-hour session out of a one-hour one.
    #[test]
    fn is_not_dragged_by_the_session_that_ran_long() {
        let ordinary = || {
            vec![
                session(3000.0, 30),
                session(3000.0, 30),
                session(3000.0, 30),
            ]
        };

        assert_eq!(pace(ordinary()), Some(100.0));

        let mut with_outlier = ordinary();
        with_outlier.push(session(50_000.0, 30));

        assert_eq!(pace(with_outlier), Some(100.0));
    }

    #[test]
    fn drops_sessions_with_no_duration_or_no_sets_rather_than_counting_them_as_zero() {
        let samples = vec![
            session(300.0, 3),
            session(300.0, 3),
            (None, 3),
            session(300.0, 0),
        ];

        // Two usable samples out of four, which is below the floor.
        let projection = project(samples, 10);

        assert_eq!(projection.median_seconds_per_set, None);
        assert!(!projection.can_project);
        assert_eq!(projection.sample_size, 2);
    }

    #[test]
    fn projects_the_whole_session_at_the_measured_pace() {
        let samples = vec![session(300.0, 3), session(300.0, 5), session(300.0, 4)];

        let projection = project(samples, 34);

        assert!(projection.can_project);
        assert_eq!(projection.sample_size, 3);
        assert_eq!(projection.projected_seconds, Some(75 * 34));
    }

    /// Nothing prescribed is nothing to wait for, and that is not the same
    /// answer as "we cannot say".
    #[test]
    fn a_session_with_no_sets_projects_to_no_time_rather_than_to_nothing() {
        let samples = vec![session(300.0, 3), session(300.0, 5), session(300.0, 4)];

        let projection = project(samples, 0);

        assert!(projection.can_project);
        assert_eq!(projection.projected_seconds, Some(0));
    }
}
