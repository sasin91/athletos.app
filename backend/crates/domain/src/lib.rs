//! PixMyDay's domain: RFC 5545 recurrence with wall-clock/DST resolution, and
//! the purely-positive Points ledger — with no Axum, sqlx, or database anywhere
//! near any of it.
//!
//! The crate exists so the genuinely hard parts of the product — "09:00 every
//! day" staying 09:00 when the clocks change, and a balance that can never fall
//! except by the Person's own Redemption — are testable in isolation, per
//! ADR-0001, ADR-0007 and ADR-0008. See [`points`](crate::permit) for the
//! second. Two rules hold throughout the scheduling half:
//!
//! - An Event's timing is a **wall-clock plus an IANA tzid**, never a UTC
//!   instant. Instants are derived at read time, one place only
//!   ([`TimeZoneId::resolve`]).
//! - Occurrences are **expanded on the fly** over a bounded window. There is no
//!   materialised occurrence table, so [`expand`] is the whole read path.
//!
//! ```
//! use pixmyday_domain::{expand, DurationMinutes, RecurrenceRule, Series, TimeZoneId, WallClock, Window};
//!
//! let series = Series::recurring(
//!     WallClock::from_ymd_hms(2024, 3, 29, 9, 0, 0).unwrap(),
//!     "Europe/Copenhagen".parse::<TimeZoneId>().unwrap(),
//!     DurationMinutes::new(30).unwrap(),
//!     RecurrenceRule::parse("FREQ=DAILY;COUNT=4").unwrap(),
//! )
//! .unwrap();
//!
//! let window = Window::new(
//!     "2024-03-29T00:00:00Z".parse().unwrap(),
//!     "2024-04-02T00:00:00Z".parse().unwrap(),
//! )
//! .unwrap();
//!
//! let occurrences = expand(&series, &[], window).unwrap();
//! // The clocks go forward on the 31st; the local time does not move.
//! assert!(occurrences
//!     .iter()
//!     .all(|o| o.wall_clock_start.naive().time() == "09:00:00".parse().unwrap()));
//! ```

#![forbid(unsafe_code)]

mod error;
mod expansion;
mod occurrence;
mod recurrence;
mod schedule;
mod time;

pub use error::{DomainError, DomainResult};
pub use expansion::{expand, Window, EXPANSION_LIMIT};
pub use occurrence::{Exception, ExceptionKind, Occurrence, OccurrenceId, Override};
pub use pictogram::{
    build_prompt, vocabulary, Appearance, Figure, HairColour, PictogramPrompt, SkinTone,
    UnknownActivity, VERIFIED_SEEDS,
};
pub use points::{
    permit, Direction, LedgerEntry, LedgerReason, Points, PointsError, Wallet, MAX_POINTS_PER_ENTRY,
};
pub use recurrence::RecurrenceRule;
pub use schedule::{DurationMinutes, Series};
pub use time::{Resolution, ResolvedWallClock, TimeZoneId, WallClock};
