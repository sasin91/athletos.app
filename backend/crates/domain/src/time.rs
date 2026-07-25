//! Wall-clock time, IANA time zones, and the DST resolution policies.
//!
//! Per ADR-0007 an Event stores a *local wall-clock* time plus a tzid, never a
//! UTC instant. Resolution to an instant happens here and only here, so the two
//! awkward cases — a wall-clock that does not exist, and one that happens twice
//! — have exactly one documented answer each instead of one per call site.

use std::fmt;
use std::str::FromStr;

use chrono::{DateTime, MappedLocalTime, NaiveDate, NaiveDateTime, TimeZone, Utc};
use chrono_tz::Tz;

use crate::error::{DomainError, DomainResult};

/// A local date and time with no offset attached — meaningless until paired with
/// a [`TimeZoneId`]. The newtype exists to stop a naive local time being mistaken
/// for a naive *UTC* time, which is the mistake that silently drifts a schedule.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct WallClock(NaiveDateTime);

impl WallClock {
    #[must_use]
    pub const fn new(value: NaiveDateTime) -> Self {
        Self(value)
    }

    /// Builds a wall-clock from calendar fields, rejecting impossible dates such
    /// as 31 February. Nothing here knows about time zones yet, so a time inside
    /// a DST gap is perfectly constructible — it is rejected, or shifted, only at
    /// [`TimeZoneId::resolve`].
    pub fn from_ymd_hms(
        year: i32,
        month: u32,
        day: u32,
        hour: u32,
        minute: u32,
        second: u32,
    ) -> Option<Self> {
        NaiveDate::from_ymd_opt(year, month, day)
            .and_then(|date| date.and_hms_opt(hour, minute, second))
            .map(Self)
    }

    #[must_use]
    pub const fn naive(self) -> NaiveDateTime {
        self.0
    }
}

impl fmt::Display for WallClock {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0.format("%Y-%m-%dT%H:%M:%S"))
    }
}

/// An IANA time zone identifier, validated on construction.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct TimeZoneId(Tz);

impl TimeZoneId {
    #[must_use]
    pub const fn from_tz(tz: Tz) -> Self {
        Self(tz)
    }

    #[must_use]
    pub const fn as_tz(self) -> Tz {
        self.0
    }

    #[must_use]
    pub fn name(self) -> &'static str {
        self.0.name()
    }

    /// Resolves a wall-clock to the instant it denotes, applying the ADR-0007
    /// policies: a time inside a spring-forward gap moves **forward** to the
    /// first instant the clock is valid again, and a time inside an autumn
    /// overlap takes the **first** of its two instants.
    ///
    /// Both policies favour "the Person's day does not silently move backwards":
    /// forward-shifting keeps a morning routine in the morning, and picking the
    /// first of an ambiguous pair keeps the Occurrence where the calendar
    /// already showed it before the clocks changed.
    pub fn resolve(self, wall_clock: WallClock) -> DomainResult<ResolvedWallClock> {
        match self.0.from_local_datetime(&wall_clock.naive()) {
            MappedLocalTime::Single(instant) => Ok(ResolvedWallClock {
                wall_clock,
                instant: instant.with_timezone(&Utc),
                resolution: Resolution::Exact,
            }),
            MappedLocalTime::Ambiguous(first, _second) => Ok(ResolvedWallClock {
                wall_clock,
                instant: first.with_timezone(&Utc),
                resolution: Resolution::OverlapFirst,
            }),
            MappedLocalTime::None => self.resolve_gap(wall_clock),
        }
    }

    /// Walks forward a minute at a time until the local clock exists again.
    ///
    /// A search rather than arithmetic on the transition delta: gap lengths are
    /// not universally one hour (Lord Howe shifts 30 minutes, Troll two hours)
    /// and stepping is trivially correct for all of them. The cap is a guard
    /// against a corrupt tzdata rather than a real scenario — no real gap comes
    /// close to a day.
    fn resolve_gap(self, wall_clock: WallClock) -> DomainResult<ResolvedWallClock> {
        let mut probe = wall_clock.naive();
        for _ in 0..MAX_GAP_SEARCH_MINUTES {
            probe += chrono::Duration::minutes(1);
            let instant = match self.0.from_local_datetime(&probe) {
                MappedLocalTime::Single(instant) => instant,
                MappedLocalTime::Ambiguous(first, _) => first,
                MappedLocalTime::None => continue,
            };
            return Ok(ResolvedWallClock {
                wall_clock,
                instant: instant.with_timezone(&Utc),
                resolution: Resolution::GapShiftedForward,
            });
        }

        Err(DomainError::UnresolvableWallClock {
            wall_clock: wall_clock.naive(),
            tzid: self.name().to_owned(),
        })
    }

    /// The wall-clock reading in this zone at a given instant — the inverse of
    /// [`Self::resolve`], used to translate a query window into local terms.
    #[must_use]
    pub fn wall_clock_at(self, instant: DateTime<Utc>) -> WallClock {
        WallClock(instant.with_timezone(&self.0).naive_local())
    }
}

/// One day of minutes. See [`TimeZoneId::resolve_gap`].
const MAX_GAP_SEARCH_MINUTES: u32 = 24 * 60;

impl FromStr for TimeZoneId {
    type Err = DomainError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        s.parse::<Tz>()
            .map(Self)
            .map_err(|_| DomainError::UnknownTimeZone(s.to_owned()))
    }
}

impl fmt::Display for TimeZoneId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.name())
    }
}

/// Which of the DST policies (if any) was needed to reach an instant.
///
/// Carried through to the Occurrence so a athlete-facing surface can explain
/// why a 02:30 routine shows up at 03:00 twice a year.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Resolution {
    /// The wall-clock maps to exactly one instant.
    Exact,
    /// The wall-clock did not exist; it was moved forward out of the gap.
    GapShiftedForward,
    /// The wall-clock happened twice; the first instant was taken.
    OverlapFirst,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ResolvedWallClock {
    /// The wall-clock as requested — *not* the shifted one, so the series can
    /// still be recognised by its original local time.
    pub wall_clock: WallClock,
    pub instant: DateTime<Utc>,
    pub resolution: Resolution,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cph() -> TimeZoneId {
        "Europe/Copenhagen".parse().unwrap()
    }

    fn wall(y: i32, m: u32, d: u32, h: u32, min: u32) -> WallClock {
        WallClock::from_ymd_hms(y, m, d, h, min, 0).unwrap()
    }

    #[test]
    fn unknown_time_zone_is_rejected() {
        let err = "Mars/Olympus_Mons".parse::<TimeZoneId>().unwrap_err();
        assert!(matches!(err, DomainError::UnknownTimeZone(name) if name == "Mars/Olympus_Mons"));
    }

    #[test]
    fn ordinary_time_resolves_exactly() {
        let resolved = cph().resolve(wall(2024, 1, 15, 9, 0)).unwrap();
        assert_eq!(resolved.resolution, Resolution::Exact);
        assert_eq!(resolved.instant.to_rfc3339(), "2024-01-15T08:00:00+00:00");
    }

    #[test]
    fn gap_shifts_forward_to_the_first_valid_instant() {
        // 2024-03-31 02:00 -> 03:00 in Copenhagen: 02:30 never happens.
        let resolved = cph().resolve(wall(2024, 3, 31, 2, 30)).unwrap();
        assert_eq!(resolved.resolution, Resolution::GapShiftedForward);
        assert_eq!(resolved.instant.to_rfc3339(), "2024-03-31T01:00:00+00:00");
        assert_eq!(
            cph().wall_clock_at(resolved.instant),
            wall(2024, 3, 31, 3, 0)
        );
        // The requested wall-clock is preserved for identity purposes.
        assert_eq!(resolved.wall_clock, wall(2024, 3, 31, 2, 30));
    }

    #[test]
    fn every_minute_of_the_gap_lands_on_the_same_instant() {
        for minute in 0..60 {
            let resolved = cph().resolve(wall(2024, 3, 31, 2, minute)).unwrap();
            assert_eq!(resolved.resolution, Resolution::GapShiftedForward);
            assert_eq!(resolved.instant.to_rfc3339(), "2024-03-31T01:00:00+00:00");
        }
    }

    #[test]
    fn overlap_takes_the_first_instant() {
        // 2024-10-27 03:00 -> 02:00 in Copenhagen: 02:30 happens twice.
        let resolved = cph().resolve(wall(2024, 10, 27, 2, 30)).unwrap();
        assert_eq!(resolved.resolution, Resolution::OverlapFirst);
        // First pass is still CEST (+02:00), so 00:30 UTC — not 01:30 UTC.
        assert_eq!(resolved.instant.to_rfc3339(), "2024-10-27T00:30:00+00:00");
    }

    #[test]
    fn half_hour_gap_is_handled() {
        // Lord Howe shifts by 30 minutes, not an hour.
        let lord_howe: TimeZoneId = "Australia/Lord_Howe".parse().unwrap();
        let resolved = lord_howe.resolve(wall(2024, 10, 6, 2, 15)).unwrap();
        assert_eq!(resolved.resolution, Resolution::GapShiftedForward);
        assert_eq!(
            lord_howe.wall_clock_at(resolved.instant),
            wall(2024, 10, 6, 2, 30)
        );
    }

    #[test]
    fn utc_has_no_transitions() {
        let utc: TimeZoneId = "UTC".parse().unwrap();
        let resolved = utc.resolve(wall(2024, 3, 31, 2, 30)).unwrap();
        assert_eq!(resolved.resolution, Resolution::Exact);
        assert_eq!(resolved.instant.to_rfc3339(), "2024-03-31T02:30:00+00:00");
    }

    #[test]
    fn impossible_calendar_dates_are_rejected() {
        assert!(WallClock::from_ymd_hms(2024, 2, 31, 9, 0, 0).is_none());
        assert!(WallClock::from_ymd_hms(2023, 2, 29, 9, 0, 0).is_none());
        assert!(WallClock::from_ymd_hms(2024, 1, 1, 24, 0, 0).is_none());
    }
}
