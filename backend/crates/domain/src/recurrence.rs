//! The RFC 5545 `RRULE` wrapper.
//!
//! Recurrence is evaluated against a *floating* wall-clock carrier rather than
//! real instants (see [`crate::schedule`]), so everything in this module works in
//! `rrule::Tz::UTC` — a zone chosen precisely because it never shifts. The real
//! time zone is applied afterwards.

use std::fmt;
use std::str::FromStr;

use chrono::{DateTime, NaiveDateTime, TimeZone as _, Utc};
use rrule::{RRule, Tz as CarrierTz, Unvalidated, Validated};

use crate::error::{DomainError, DomainResult};
use crate::time::WallClock;

/// A syntactically valid `RRULE`, not yet checked against any start date.
///
/// Parsing and validation are separate because a rule is entered before it is
/// attached to an Event in most UIs, and because RFC 5545 validity genuinely
/// depends on `DTSTART` (`BYMONTHDAY=31` with a monthly frequency is fine; some
/// combinations are not).
///
/// # `UNTIL` is a UTC instant, `DTSTART` is a wall-clock
///
/// The two look like the same kind of value and are deliberately not. `DTSTART`
/// is a *recurring anchor*: storing it as an instant would make "09:00 every day"
/// drift by an hour every time the clocks change, which is the whole reason
/// ADR-0007 stores wall-clock plus tzid. `UNTIL` is a single *boundary*,
/// evaluated once, so it has no drift to suffer — and reading it the way RFC 5545
/// §3.3.10 requires (a `Z`-suffixed UTC instant, mandatory whenever `DTSTART` is
/// a local time with a timezone reference, as ours always is) makes future
/// iCalendar/CalDAV interop free. That interop is part of why ADR-0007 chose
/// `RRULE` in the first place.
///
/// Concretely: the series ends at that absolute instant. An Occurrence is kept
/// when the instant its wall-clock resolves to is less than or equal to `UNTIL`
/// — `UNTIL` is inclusive. A value without the `Z` suffix is rejected at
/// [`RecurrenceRule::parse`] with [`DomainError::NonUtcUntil`] rather than
/// silently guessed at.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RecurrenceRule {
    text: String,
    /// The rule with any `UNTIL` part removed, because the engine iterates over
    /// the DST-free wall-clock carrier and would therefore compare `UNTIL`
    /// against a wall-clock. The bound is applied at expansion instead, against
    /// each Occurrence's resolved instant.
    rule: RRule<Unvalidated>,
    until: Option<DateTime<Utc>>,
}

impl RecurrenceRule {
    /// Parses an `RRULE` value, with or without the `RRULE:` property name.
    ///
    /// An `UNTIL` part must be an RFC 5545 UTC instant (`YYYYMMDDTHHMMSSZ`);
    /// anything else is a [`DomainError::NonUtcUntil`].
    pub fn parse(text: &str) -> DomainResult<Self> {
        let trimmed = text.trim();
        let value = trimmed
            .strip_prefix("RRULE:")
            .or_else(|| trimmed.strip_prefix("rrule:"))
            .unwrap_or(trimmed);

        let (without_until, until) = split_until(value)?;

        let rule = without_until
            .parse::<RRule<Unvalidated>>()
            .map_err(|err| DomainError::InvalidRecurrence(err.to_string()))?;

        Ok(Self {
            text: value.to_owned(),
            rule,
            until,
        })
    }

    /// The instant the series ends at, inclusive. `None` for an open-ended rule
    /// (or one bounded by `COUNT` instead, which this does not touch).
    pub(crate) const fn until(&self) -> Option<DateTime<Utc>> {
        self.until
    }

    /// The rule as it should be persisted — normalised to the bare value, so a
    /// round-trip through the database does not accumulate `RRULE:` prefixes.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.text
    }

    pub(crate) fn validate(&self, start: WallClock) -> DomainResult<RRule<Validated>> {
        self.rule.clone().validate(carrier(start)).map_err(|err| {
            DomainError::IncompatibleRecurrence {
                start: start.naive(),
                reason: err.to_string(),
            }
        })
    }
}

impl FromStr for RecurrenceRule {
    type Err = DomainError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::parse(s)
    }
}

impl fmt::Display for RecurrenceRule {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.text)
    }
}

/// Splits an `UNTIL` part out of an `RRULE` value, returning the rest of the
/// rule and the boundary instant it named.
///
/// The part is removed rather than left in place because everything the engine
/// sees is expressed in the wall-clock carrier: an `UNTIL` left in the rule would
/// be compared against wall-clocks and so be read in the Event's own zone, which
/// is precisely the reading RFC 5545 forbids here.
fn split_until(value: &str) -> DomainResult<(String, Option<DateTime<Utc>>)> {
    let mut kept: Vec<&str> = Vec::new();
    let mut until = None;

    for part in value.split(';') {
        let Some((name, raw)) = part.split_once('=') else {
            kept.push(part);
            continue;
        };
        if !name.trim().eq_ignore_ascii_case("UNTIL") {
            kept.push(part);
            continue;
        }
        if until.is_some() {
            return Err(DomainError::InvalidRecurrence(
                "rule names UNTIL more than once".to_owned(),
            ));
        }
        until = Some(parse_until(raw.trim())?);
    }

    Ok((kept.join(";"), until))
}

/// Reads the one form of `UNTIL` this crate accepts: an RFC 5545 UTC
/// `DATE-TIME`. A floating or date-only value is refused, not guessed at.
fn parse_until(raw: &str) -> DomainResult<DateTime<Utc>> {
    raw.strip_suffix('Z')
        .or_else(|| raw.strip_suffix('z'))
        .and_then(|stamp| NaiveDateTime::parse_from_str(stamp, "%Y%m%dT%H%M%S").ok())
        .map(|naive| Utc.from_utc_datetime(&naive))
        .ok_or_else(|| DomainError::NonUtcUntil(raw.to_owned()))
}

/// Lifts a wall-clock into the DST-free carrier the recurrence engine iterates
/// over.
///
/// Everything the engine sees is a bare wall-clock wearing a UTC label, so no
/// value inside the carrier may be compared against a real instant. That is why
/// `UNTIL` is stripped from the rule at parse time and applied afterwards, once
/// [`crate::TimeZoneId::resolve`] has turned each wall-clock into the instant it
/// actually denotes.
pub(crate) fn carrier(wall_clock: WallClock) -> DateTime<CarrierTz> {
    CarrierTz::UTC.from_utc_datetime(&wall_clock.naive())
}

/// Drops a carrier datetime back to the bare wall-clock it stood for.
pub(crate) fn from_carrier(value: DateTime<CarrierTz>) -> WallClock {
    WallClock::new(value.naive_utc())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_a_bare_value_and_a_prefixed_one() {
        assert_eq!(
            RecurrenceRule::parse("RRULE:FREQ=DAILY").unwrap().as_str(),
            "FREQ=DAILY"
        );
        assert_eq!(
            RecurrenceRule::parse("  FREQ=DAILY  ").unwrap().as_str(),
            "FREQ=DAILY"
        );
    }

    #[test]
    fn rejects_nonsense() {
        assert!(matches!(
            RecurrenceRule::parse("FREQ=FORTNIGHTLY"),
            Err(DomainError::InvalidRecurrence(_))
        ));
        assert!(matches!(
            RecurrenceRule::parse(""),
            Err(DomainError::InvalidRecurrence(_))
        ));
    }

    #[test]
    fn until_is_lifted_out_of_the_rule_as_a_utc_instant() {
        let rule = RecurrenceRule::parse("FREQ=DAILY;UNTIL=20240703T100000Z").unwrap();
        assert_eq!(
            rule.until().map(|until| until.to_rfc3339()),
            Some("2024-07-03T10:00:00+00:00".to_owned())
        );
        // The stored text is untouched, so a round-trip through the database
        // still yields a rule an iCalendar client would recognise.
        assert_eq!(rule.as_str(), "FREQ=DAILY;UNTIL=20240703T100000Z");
    }

    #[test]
    fn an_until_without_the_z_suffix_is_rejected() {
        // Silently reading this as local time is the ambiguity the RFC forbids.
        assert!(matches!(
            RecurrenceRule::parse("FREQ=DAILY;UNTIL=20240703T100000"),
            Err(DomainError::NonUtcUntil(value)) if value == "20240703T100000"
        ));
        // Date-only is legal RFC 5545 only when DTSTART is a DATE; ours never is.
        assert!(matches!(
            RecurrenceRule::parse("FREQ=DAILY;UNTIL=20240703"),
            Err(DomainError::NonUtcUntil(_))
        ));
        assert!(matches!(
            RecurrenceRule::parse("FREQ=DAILY;UNTIL=not-a-date"),
            Err(DomainError::NonUtcUntil(_))
        ));
    }

    #[test]
    fn a_rule_without_until_has_no_boundary() {
        assert_eq!(RecurrenceRule::parse("FREQ=DAILY").unwrap().until(), None);
        assert_eq!(
            RecurrenceRule::parse("FREQ=DAILY;COUNT=3").unwrap().until(),
            None
        );
    }

    #[test]
    fn stripping_until_leaves_the_rest_of_the_rule_intact() {
        let rule = RecurrenceRule::parse("FREQ=WEEKLY;UNTIL=20240703T100000Z;BYDAY=MO,WE").unwrap();
        assert_eq!(rule.rule, "FREQ=WEEKLY;BYDAY=MO,WE".parse().unwrap());
    }

    #[test]
    fn carrier_round_trips() {
        let wall = WallClock::from_ymd_hms(2024, 3, 31, 2, 30, 0).unwrap();
        assert_eq!(from_carrier(carrier(wall)), wall);
    }
}
