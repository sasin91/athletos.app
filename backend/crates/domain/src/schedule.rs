//! The timing half of an Event: when it starts, in which zone, how long it runs,
//! and how it repeats.
//!
//! Deliberately carries no title, image, or Activity content — ADR-0006 keeps
//! scheduling and content apart, and this crate only owns scheduling.

use crate::error::{DomainError, DomainResult};
use crate::recurrence::RecurrenceRule;
use crate::time::{TimeZoneId, WallClock};

/// An Event's length in whole minutes.
///
/// Minutes rather than a `chrono::Duration` because that is the granularity a
/// athlete actually schedules at, and because it makes the unit impossible to
/// misread at a call site.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct DurationMinutes(u32);

/// A year and a day. Anything longer is far likelier to be a unit mix-up than a
/// real Event.
const MAX_DURATION_MINUTES: u64 = 366 * 24 * 60;

impl DurationMinutes {
    pub fn new(minutes: u64) -> DomainResult<Self> {
        if minutes > MAX_DURATION_MINUTES {
            return Err(DomainError::DurationOutOfRange(minutes));
        }
        // The cast is safe: MAX_DURATION_MINUTES is far below u32::MAX.
        Ok(Self(minutes as u32))
    }

    #[must_use]
    pub const fn get(self) -> u32 {
        self.0
    }

    #[must_use]
    pub(crate) fn as_delta(self) -> chrono::Duration {
        chrono::Duration::minutes(i64::from(self.0))
    }
}

/// An Event's recurring schedule: a wall-clock start, the zone that start is
/// read in, an optional `RRULE`, and a duration.
///
/// The recurrence is validated against the start on construction, so an invalid
/// combination cannot reach expansion.
#[derive(Debug, Clone)]
pub struct Series {
    start: WallClock,
    tzid: TimeZoneId,
    duration: DurationMinutes,
    recurrence: Option<RecurrenceRule>,
    validated: Option<rrule::RRule<rrule::Validated>>,
}

impl Series {
    /// A one-off Event — expansion yields at most a single Occurrence.
    pub fn once(start: WallClock, tzid: TimeZoneId, duration: DurationMinutes) -> Self {
        Self {
            start,
            tzid,
            duration,
            recurrence: None,
            validated: None,
        }
    }

    /// A recurring Event. Fails if the rule cannot apply to `start`.
    pub fn recurring(
        start: WallClock,
        tzid: TimeZoneId,
        duration: DurationMinutes,
        recurrence: RecurrenceRule,
    ) -> DomainResult<Self> {
        let validated = recurrence.validate(start)?;
        Ok(Self {
            start,
            tzid,
            duration,
            recurrence: Some(recurrence),
            validated: Some(validated),
        })
    }

    #[must_use]
    pub const fn start(&self) -> WallClock {
        self.start
    }

    #[must_use]
    pub const fn tzid(&self) -> TimeZoneId {
        self.tzid
    }

    #[must_use]
    pub const fn duration(&self) -> DurationMinutes {
        self.duration
    }

    #[must_use]
    pub const fn recurrence(&self) -> Option<&RecurrenceRule> {
        self.recurrence.as_ref()
    }

    pub(crate) fn validated_rule(&self) -> Option<&rrule::RRule<rrule::Validated>> {
        self.validated.as_ref()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn duration_rejects_implausible_lengths() {
        assert!(DurationMinutes::new(0).is_ok());
        assert!(DurationMinutes::new(MAX_DURATION_MINUTES).is_ok());
        assert!(matches!(
            DurationMinutes::new(MAX_DURATION_MINUTES + 1),
            Err(DomainError::DurationOutOfRange(_))
        ));
    }

    #[test]
    fn a_rule_that_cannot_be_validated_against_the_start_is_rejected() {
        let start = WallClock::from_ymd_hms(2024, 1, 1, 9, 0, 0).unwrap();
        let tzid: TimeZoneId = "Europe/Copenhagen".parse().unwrap();
        // RFC 5545 forbids BYMONTHDAY with a weekly frequency.
        let rule = RecurrenceRule::parse("FREQ=WEEKLY;BYMONTHDAY=1").unwrap();

        assert!(matches!(
            Series::recurring(start, tzid, DurationMinutes::new(30).unwrap(), rule),
            Err(DomainError::IncompatibleRecurrence { .. })
        ));
    }
}
