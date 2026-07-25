//! Occurrences and the Exceptions that override them.

use chrono::{DateTime, Utc};

use crate::schedule::DurationMinutes;
use crate::time::{Resolution, WallClock};

/// Identifies one Occurrence within its Event by the wall-clock the *unmodified*
/// series would have produced — RFC 5545 `RECURRENCE-ID`.
///
/// Identity is deliberately the original slot rather than the effective time: a
/// moved Occurrence must stay the same Occurrence, otherwise moving it twice
/// would leave an orphaned Exception behind, and completion history recorded
/// against it would detach.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct OccurrenceId(WallClock);

impl OccurrenceId {
    #[must_use]
    pub const fn new(original_start: WallClock) -> Self {
        Self(original_start)
    }

    #[must_use]
    pub const fn original_start(self) -> WallClock {
        self.0
    }
}

/// What an Exception does to the Occurrence it targets.
///
/// `Moved` and `Modified` are separate because only `Moved` can pull an
/// Occurrence into or out of a query window; a `Modified` Occurrence keeps its
/// slot and only its content differs, which this crate records but does not
/// interpret.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ExceptionKind {
    /// The Occurrence is skipped — it disappears from every window.
    Cancelled,
    /// The Occurrence happens at a different wall-clock, optionally for a
    /// different length. The zone is always the Event's own.
    Moved {
        start: WallClock,
        duration: Option<DurationMinutes>,
    },
    /// Timing is untouched; something about the Occurrence's content differs.
    Modified,
}

/// A per-Occurrence override of a recurring Event.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Exception {
    pub occurrence_id: OccurrenceId,
    pub kind: ExceptionKind,
}

impl Exception {
    #[must_use]
    pub const fn cancel(occurrence_id: OccurrenceId) -> Self {
        Self {
            occurrence_id,
            kind: ExceptionKind::Cancelled,
        }
    }

    #[must_use]
    pub const fn move_to(occurrence_id: OccurrenceId, start: WallClock) -> Self {
        Self {
            occurrence_id,
            kind: ExceptionKind::Moved {
                start,
                duration: None,
            },
        }
    }

    #[must_use]
    pub const fn modify(occurrence_id: OccurrenceId) -> Self {
        Self {
            occurrence_id,
            kind: ExceptionKind::Modified,
        }
    }
}

/// A single dated instance of an Event, carrying both halves of ADR-0007: the
/// wall-clock a Person and athlete see, and the instant everything else
/// (ordering, notifications, `timestamptz` columns) needs.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Occurrence {
    pub id: OccurrenceId,
    /// The wall-clock this Occurrence actually happens at, which differs from
    /// `id.original_start()` when an Exception moved it.
    pub wall_clock_start: WallClock,
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
    /// How `wall_clock_start` was turned into `start`. Anything other than
    /// [`Resolution::Exact`] means a DST policy was applied.
    pub resolution: Resolution,
    /// Whether an Exception applies to this Occurrence.
    pub overridden: Override,
}

/// Whether the Occurrence came straight from the series or via an Exception.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Override {
    None,
    Moved,
    Modified,
}

impl Occurrence {
    /// True when the Occurrence no longer sits at the slot the series produced.
    #[must_use]
    pub fn is_moved(&self) -> bool {
        self.overridden == Override::Moved
    }
}
