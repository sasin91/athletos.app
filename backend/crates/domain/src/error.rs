//! The single error type for the domain crate.
//!
//! Parser and validator failures from `rrule` are flattened into strings rather
//! than wrapped: the domain crate is the stable boundary the rest of the backend
//! codes against, and leaking a third-party error type would make swapping the
//! recurrence engine a breaking change for every caller.

use chrono::{DateTime, Utc};

#[derive(Debug, thiserror::Error)]
pub enum DomainError {
    #[error("`{0}` is not a known IANA time zone")]
    UnknownTimeZone(String),

    #[error("recurrence rule is not valid RFC 5545: {0}")]
    InvalidRecurrence(String),

    /// RFC 5545 §3.3.10: when `DTSTART` is a local time with a timezone
    /// reference — which ours always is — `UNTIL` MUST be a UTC instant. A value
    /// without the `Z` suffix is ambiguous, and guessing a zone for it is exactly
    /// the silent boundary error this rejection exists to prevent.
    #[error(
        "UNTIL must be a UTC instant of the form `YYYYMMDDTHHMMSSZ` (RFC 5545 §3.3.10), got `{0}`"
    )]
    NonUtcUntil(String),

    #[error("recurrence rule cannot be applied to a series starting {start}: {reason}")]
    IncompatibleRecurrence {
        start: chrono::NaiveDateTime,
        reason: String,
    },

    #[error("duration of {0} minutes is out of range")]
    DurationOutOfRange(u64),

    #[error("window end {to} is before window start {from}")]
    InvertedWindow {
        from: DateTime<Utc>,
        to: DateTime<Utc>,
    },

    #[error("more than one Exception targets the occurrence at {0}")]
    DuplicateException(chrono::NaiveDateTime),

    #[error("expanding the series over this window would produce more than {limit} Occurrences")]
    ExpansionLimitExceeded { limit: u16 },

    #[error("wall-clock time {wall_clock} has no resolvable instant in {tzid}")]
    UnresolvableWallClock {
        wall_clock: chrono::NaiveDateTime,
        tzid: String,
    },
}

pub type DomainResult<T> = Result<T, DomainError>;
