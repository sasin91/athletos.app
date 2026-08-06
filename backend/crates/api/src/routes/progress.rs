//! Where a year of training went (D-13, amended).
//!
//! One endpoint, everything derived. There is no table behind this: the
//! estimate is computed from stored sets, load and drift are sums over the
//! same rows, and the training max comes from `readout()` applied to the
//! `state_before` that [`crate::advances`] already records — because
//! `readout()` is a pure function of state, and storing its output as well
//! would materialise a fact another table implies.
//!
//! # Indicators are a shape, not a store
//!
//! Every figure that renders as a card travels as `{ key, label, value, unit }`
//! so the client has one card component and a new metric touches no client
//! code. `unit` is a semantic tag rather than a display string; formatting
//! lives at the UI edge, as D-04 requires of every weight in this system.
//!
//! An indicator with nothing to say is **omitted**, never sent as zero. A
//! median session duration across no sessions is not zero minutes, and the
//! card should be absent rather than wrong — the same rule `timing` follows in
//! omitting itself rather than serving an empty breakdown.

use chrono::{DateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

/// What a figure is measured in. A tag, not a display string — the client
/// decides whether 3600 seconds reads as "1:00" or "60 min" (D-04).
#[derive(Debug, Clone, Copy, Serialize, ToSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Unit {
    Kg,
    Count,
    Seconds,
}

/// One card. Every figure on the screen is one of these, so the client has one
/// component and a new metric touches no client code.
#[derive(Debug, Clone, Serialize, ToSchema, PartialEq)]
pub struct Indicator {
    #[schema(example = "load_moved")]
    pub key: String,
    #[schema(example = "Load moved")]
    pub label: String,
    pub value: f64,
    pub unit: Unit,
}

/// One session's contribution to a lift's trend.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct TrendPoint {
    pub workout_id: Uuid,
    pub at: DateTime<Utc>,
    /// The best estimate across that session's done sets of this lift. `None`
    /// when every set was skipped, or every set was above the rep ceiling.
    pub estimate: Option<f64>,
    /// What the program was prescribing from during that session. `None` for
    /// every session logged before `enrollment_advances` existed — the chart
    /// must draw a gap rather than a zero.
    pub training_max: Option<f64>,
    /// Signed: positive is heavier than prescribed, negative lighter. Summed
    /// over that session's done sets of this lift, against the same sets'
    /// prescriptions, so it is weight drift uncontaminated by work not done.
    pub drift_kg: f64,
    pub sets_over: u32,
    pub sets_under: u32,
    /// Every reason the athlete gave on this lift that session. Travels on
    /// every point; the screen renders them only on downward moves, and that
    /// test is presentation rather than a fact about training.
    pub reasons: Vec<String>,
}

/// One cell of the rep-max grid: the heaviest weight lifted for **at least**
/// `reps` reps, and the set it came from.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct Best {
    /// The bucket, not the reps performed.
    pub reps: u32,
    pub weight: f64,
    /// What was actually done at that weight — always at least `reps`.
    pub actual_reps: u32,
    pub at: DateTime<Utc>,
    pub workout_id: Uuid,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct LiftTrend {
    #[schema(example = "squat")]
    pub exercise: String,
    #[schema(example = "Squat")]
    pub label: String,
    pub points: Vec<TrendPoint>,
    pub bests: Vec<Best>,
}

/// One session, for the load panel and the drift band.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct SessionFigures {
    pub workout_id: Uuid,
    pub enrollment_id: Uuid,
    pub at: DateTime<Utc>,
    pub load_moved_kg: f64,
    pub load_prescribed_kg: f64,
    pub sets_over: u32,
    pub sets_under: u32,
    pub duration_seconds: Option<i64>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ProgramTotals {
    pub enrollment_id: Uuid,
    #[schema(example = "wendler-531-bbb")]
    pub program_key: String,
    #[schema(example = "5/3/1 Boring But Big")]
    pub program_name: String,
    #[schema(example = "active")]
    pub status: String,
    pub indicators: Vec<Indicator>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ProgressView {
    pub lifts: Vec<LiftTrend>,
    pub sessions: Vec<SessionFigures>,
    pub programs: Vec<ProgramTotals>,
    pub overall: Vec<Indicator>,
}

/// What an indicator set is built from. Not serialised — this is the
/// accumulator, and `indicators_from` is the only thing that reads it.
#[derive(Debug, Default, Clone)]
pub struct Totals {
    pub sessions: u32,
    pub load_moved_kg: f64,
    pub sets_over: u32,
    pub sets_under: u32,
    /// One per session that has both stamps.
    pub durations: Vec<i64>,
    /// Every believable gap between two answered sets, across every session.
    pub intervals: Vec<i64>,
}

fn indicator(key: &str, label: &str, value: f64, unit: Unit) -> Indicator {
    Indicator {
        key: key.to_owned(),
        label: label.to_owned(),
        value,
        unit,
    }
}

/// The shipped set of cards, in the order they are offered.
///
/// A server-side constant rather than a contract the screen depends on:
/// adding one here makes a card appear, removing one makes it vanish, and the
/// client never learns what any particular metric means (D-11).
pub fn indicators_from(totals: &Totals) -> Vec<Indicator> {
    let mut indicators = vec![
        indicator(
            "sessions",
            "Sessions",
            f64::from(totals.sessions),
            Unit::Count,
        ),
        indicator("load_moved", "Load moved", totals.load_moved_kg, Unit::Kg),
        indicator(
            "sets_over",
            "Sets over",
            f64::from(totals.sets_over),
            Unit::Count,
        ),
        indicator(
            "sets_under",
            "Sets under",
            f64::from(totals.sets_under),
            Unit::Count,
        ),
    ];

    // Omitted rather than zeroed: a median across nothing is not a number, and
    // an absent card is the honest way to say so.
    let mut durations = totals.durations.clone();
    if let Some(seconds) = median(&mut durations) {
        indicators.push(indicator(
            "median_duration",
            "Typical session",
            seconds as f64,
            Unit::Seconds,
        ));
    }

    let mut intervals = totals.intervals.clone();
    if let Some(seconds) = median(&mut intervals) {
        indicators.push(indicator(
            "median_interval",
            "Typical gap between sets",
            seconds as f64,
            Unit::Seconds,
        ));
    }

    indicators
}

/// Median, sorting in place. `None` for an empty sample.
///
/// Median rather than mean throughout this module, for the reason `pace` gives:
/// the tail of these distributions is not signal. An even sample takes the
/// mean of the middle pair, matching `pace::median`, so the figure does not
/// depend on which side of the list a tie fell.
pub fn median(values: &mut [i64]) -> Option<i64> {
    if values.is_empty() {
        return None;
    }

    values.sort_unstable();
    let middle = values.len() / 2;

    Some(if values.len() % 2 == 1 {
        values[middle]
    } else {
        (values[middle - 1] + values[middle]) / 2
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn totals() -> Totals {
        Totals {
            sessions: 4,
            load_moved_kg: 20_000.0,
            sets_over: 6,
            sets_under: 1,
            durations: vec![3_600, 3_300, 4_200],
            intervals: vec![120, 180, 90],
        }
    }

    #[test]
    fn every_indicator_carries_a_unit_the_client_can_format() {
        let indicators = indicators_from(&totals());

        assert!(indicators
            .iter()
            .all(|indicator| matches!(indicator.unit, Unit::Kg | Unit::Count | Unit::Seconds)));
    }

    #[test]
    fn an_indicator_with_nothing_to_say_is_absent_rather_than_zero() {
        // No sessions at all: there is no median duration, and a card reading
        // "0:00" would be a claim about training that never happened.
        let empty = Totals {
            sessions: 0,
            load_moved_kg: 0.0,
            sets_over: 0,
            sets_under: 0,
            durations: Vec::new(),
            intervals: Vec::new(),
        };

        // Bound to a local first: borrowing `&str` out of an unbound temporary
        // `Vec<Indicator>` is E0716, since the vector dies at the end of the
        // statement while `keys` outlives it.
        let indicators = indicators_from(&empty);
        let keys: Vec<&str> = indicators
            .iter()
            .map(|indicator| indicator.key.as_str())
            .collect();

        assert!(!keys.contains(&"median_duration"));
        assert!(!keys.contains(&"median_interval"));
    }

    #[test]
    fn the_shipped_set_is_present_when_there_is_data() {
        let indicators = indicators_from(&totals());
        let keys: Vec<&str> = indicators
            .iter()
            .map(|indicator| indicator.key.as_str())
            .collect();

        for expected in [
            "sessions",
            "load_moved",
            "sets_over",
            "sets_under",
            "median_duration",
            "median_interval",
        ] {
            assert!(keys.contains(&expected), "missing {expected}");
        }
    }

    #[test]
    fn the_median_takes_the_middle_pair_when_the_sample_is_even() {
        // Matching `pace::median`: an even sample has no single middle, and
        // taking either neighbour would make the figure depend on which side
        // of the list the tie fell.
        assert_eq!(median(&mut [60, 120]), Some(90));
        assert_eq!(median(&mut [90, 60, 120]), Some(90));
        assert_eq!(median(&mut []), None);
    }
}
