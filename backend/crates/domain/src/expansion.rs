//! On-the-fly expansion of a [`Series`] over a bounded window.
//!
//! ADR-0007 rules out a materialised occurrence table, so every read path — the
//! month view, the Display's upcoming slice — calls [`expand`] with the window it
//! is about to render. Nothing here is cached; the safety limit below is what
//! keeps an unbounded rule from turning a wide window into an unbounded loop.

use std::collections::HashMap;

use chrono::{DateTime, Utc};

use crate::error::{DomainError, DomainResult};
use crate::occurrence::{Exception, ExceptionKind, Occurrence, OccurrenceId, Override};
use crate::recurrence::{carrier, from_carrier, RecurrenceRule};
use crate::schedule::Series;
use crate::time::{TimeZoneId, WallClock};

/// A half-open instant range `[from, to)`.
///
/// Half-open so adjacent windows (month after month, page after page) tile
/// without duplicating the Occurrence that sits exactly on the seam.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Window {
    from: DateTime<Utc>,
    to: DateTime<Utc>,
}

impl Window {
    pub fn new(from: DateTime<Utc>, to: DateTime<Utc>) -> DomainResult<Self> {
        if to < from {
            return Err(DomainError::InvertedWindow { from, to });
        }
        Ok(Self { from, to })
    }

    #[must_use]
    pub const fn from(self) -> DateTime<Utc> {
        self.from
    }

    #[must_use]
    pub const fn to(self) -> DateTime<Utc> {
        self.to
    }

    #[must_use]
    pub fn contains(self, instant: DateTime<Utc>) -> bool {
        instant >= self.from && instant < self.to
    }

    #[must_use]
    pub fn is_empty(self) -> bool {
        self.from >= self.to
    }
}

/// Ceiling on Occurrences produced from one series in one window. A month view
/// of a minutely rule is a mistake somewhere upstream, and it should surface as
/// an error rather than as a slow request.
pub const EXPANSION_LIMIT: u16 = 10_000;

/// Slack applied when translating the window's instants into wall-clock terms.
/// One day comfortably covers every UTC offset plus any DST shift, so no
/// Occurrence whose instant falls in the window can have a wall-clock outside
/// the widened band.
const BAND_SLACK_DAYS: i64 = 1;

/// Expands `series` over `window`, applying `exceptions`, sorted by start
/// instant.
///
/// An Occurrence is included when its *start* instant lies in `[from, to)`;
/// an Occurrence that began before the window and is still running is not
/// returned, because the calendar surfaces this feeds key off start.
///
/// A rule's `UNTIL` bounds the slots the *rule* produces, so it is applied to
/// each original slot before Exceptions are considered: moving an Occurrence past
/// the boundary reschedules it, it does not delete it.
pub fn expand(
    series: &Series,
    exceptions: &[Exception],
    window: Window,
) -> DomainResult<Vec<Occurrence>> {
    if window.is_empty() {
        return Ok(Vec::new());
    }

    let tzid = series.tzid();
    let by_id = index_exceptions(exceptions)?;
    let band = wall_clock_band(tzid, window, exceptions)?;

    let mut occurrences = Vec::new();
    for original_start in candidate_starts(series, band)? {
        let id = OccurrenceId::new(original_start);

        let (wall_clock_start, duration, overridden) = match by_id.get(&id).map(|e| &e.kind) {
            Some(ExceptionKind::Cancelled) => continue,
            Some(ExceptionKind::Moved { start, duration }) => (
                *start,
                duration.unwrap_or(series.duration()),
                Override::Moved,
            ),
            Some(ExceptionKind::Modified) => {
                (original_start, series.duration(), Override::Modified)
            }
            None => (original_start, series.duration(), Override::None),
        };

        let resolved = tzid.resolve(wall_clock_start)?;
        if !window.contains(resolved.instant) {
            continue;
        }

        occurrences.push(Occurrence {
            id,
            wall_clock_start,
            start: resolved.instant,
            end: resolved.instant + duration.as_delta(),
            resolution: resolved.resolution,
            overridden,
        });
    }

    occurrences.sort_by_key(|occurrence| (occurrence.start, occurrence.id));
    Ok(occurrences)
}

fn index_exceptions(exceptions: &[Exception]) -> DomainResult<HashMap<OccurrenceId, &Exception>> {
    let mut by_id = HashMap::with_capacity(exceptions.len());
    for exception in exceptions {
        if by_id.insert(exception.occurrence_id, exception).is_some() {
            return Err(DomainError::DuplicateException(
                exception.occurrence_id.original_start().naive(),
            ));
        }
    }
    Ok(by_id)
}

/// The wall-clock range the series must be expanded over to be sure of catching
/// every Occurrence whose instant lands in the window.
///
/// The window is translated into local terms and padded, then widened again to
/// reach the original slot of any Exception that *moves* an Occurrence into the
/// window from outside it — without that, rescheduling Tuesday's swimming to
/// Saturday would make it vanish from the Saturday view.
fn wall_clock_band(
    tzid: TimeZoneId,
    window: Window,
    exceptions: &[Exception],
) -> DomainResult<(WallClock, WallClock)> {
    let slack = chrono::Duration::days(BAND_SLACK_DAYS);
    let mut start = WallClock::new(tzid.wall_clock_at(window.from()).naive() - slack);
    let mut end = WallClock::new(tzid.wall_clock_at(window.to()).naive() + slack);

    for exception in exceptions {
        let ExceptionKind::Moved {
            start: moved_to, ..
        } = exception.kind
        else {
            continue;
        };
        if !window.contains(tzid.resolve(moved_to)?.instant) {
            continue;
        }
        let original = exception.occurrence_id.original_start();
        start = start.min(original);
        end = end.max(original);
    }

    Ok((start, end))
}

/// The unmodified wall-clock starts the series produces inside `band`
/// (inclusive at both ends — the band is already padded, and being generous here
/// is cheaper than losing an Occurrence at the edge), with the rule's `UNTIL`
/// boundary applied.
///
/// `UNTIL` is an RFC 5545 UTC instant (see [`crate::RecurrenceRule`]), so it
/// cannot be handed to the engine: the engine iterates the DST-free wall-clock
/// carrier and would compare it against wall-clocks. It is therefore stripped at
/// parse time and enforced here, *after* [`TimeZoneId::resolve`] has produced the
/// instant each wall-clock actually denotes.
///
/// The bound is applied as a filter and not as a truncation of the iteration.
/// The offset pushes the boundary in whichever direction the zone sits: east of
/// UTC an Occurrence whose wall-clock is past `UNTIL` may still be at or before
/// it as an instant, and west of UTC one whose wall-clock is before `UNTIL` may
/// already be past it. Truncating on the first wall-clock that looks late would
/// get both wrong, and a DST transition inside the band can make the instants
/// non-monotonic by an hour anyway.
fn candidate_starts(series: &Series, band: (WallClock, WallClock)) -> DomainResult<Vec<WallClock>> {
    let (band_start, band_end) = band;

    let Some(rule) = series.validated_rule() else {
        let start = series.start();
        return Ok(if start >= band_start && start <= band_end {
            vec![start]
        } else {
            Vec::new()
        });
    };

    let result = rrule::RRuleSet::new(carrier(series.start()))
        .rrule(rule.clone())
        .after(carrier(band_start))
        .before(carrier(band_end))
        .all(EXPANSION_LIMIT);

    if result.limited {
        return Err(DomainError::ExpansionLimitExceeded {
            limit: EXPANSION_LIMIT,
        });
    }

    let until = series.recurrence().and_then(RecurrenceRule::until);
    let tzid = series.tzid();
    let mut starts = Vec::with_capacity(result.dates.len());
    for start in result.dates.into_iter().map(from_carrier) {
        // `UNTIL` is inclusive: an Occurrence landing exactly on the boundary
        // instant is the last one of the series.
        if let Some(until) = until {
            if tzid.resolve(start)?.instant > until {
                continue;
            }
        }
        starts.push(start);
    }

    Ok(starts)
}
