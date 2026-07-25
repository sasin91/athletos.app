//! Expansion behaviour exercised through the public API only.
//!
//! The DST cases are the reason this crate exists: each one pins down both
//! halves of the invariant — the wall-clock a Person sees stays put, and the
//! instant underneath it moves.

use chrono::{DateTime, NaiveTime, Timelike, Utc};
use pixmyday_domain::{
    expand, DomainError, DurationMinutes, Exception, ExceptionKind, Occurrence, OccurrenceId,
    Override, RecurrenceRule, Resolution, Series, TimeZoneId, WallClock, Window,
};

fn cph() -> TimeZoneId {
    "Europe/Copenhagen".parse().unwrap()
}

fn wall(y: i32, m: u32, d: u32, h: u32, min: u32) -> WallClock {
    WallClock::from_ymd_hms(y, m, d, h, min, 0).unwrap()
}

fn utc(text: &str) -> DateTime<Utc> {
    text.parse().unwrap()
}

fn window(from: &str, to: &str) -> Window {
    Window::new(utc(from), utc(to)).unwrap()
}

fn daily(start: WallClock) -> Series {
    series(start, "FREQ=DAILY")
}

fn series(start: WallClock, rule: &str) -> Series {
    series_in(cph(), start, rule)
}

fn series_in(tzid: TimeZoneId, start: WallClock, rule: &str) -> Series {
    Series::recurring(
        start,
        tzid,
        DurationMinutes::new(60).unwrap(),
        RecurrenceRule::parse(rule).unwrap(),
    )
    .unwrap()
}

fn instants(occurrences: &[Occurrence]) -> Vec<String> {
    occurrences
        .iter()
        .map(|o| o.start.to_rfc3339())
        .collect::<Vec<_>>()
}

fn wall_clocks(occurrences: &[Occurrence]) -> Vec<String> {
    occurrences
        .iter()
        .map(|o| o.wall_clock_start.to_string())
        .collect::<Vec<_>>()
}

// --- DST ------------------------------------------------------------------

#[test]
fn a_daily_0900_series_stays_at_0900_across_spring_forward() {
    let series = daily(wall(2024, 3, 29, 9, 0));
    let found = expand(
        &series,
        &[],
        window("2024-03-29T00:00:00Z", "2024-04-02T00:00:00Z"),
    )
    .unwrap();

    assert_eq!(
        wall_clocks(&found),
        [
            "2024-03-29T09:00:00",
            "2024-03-30T09:00:00",
            "2024-03-31T09:00:00",
            "2024-04-01T09:00:00",
        ]
    );
    // The clocks go forward in the night of the 31st: the same 09:00 is an hour
    // earlier in UTC from then on.
    assert_eq!(
        instants(&found),
        [
            "2024-03-29T08:00:00+00:00",
            "2024-03-30T08:00:00+00:00",
            "2024-03-31T07:00:00+00:00",
            "2024-04-01T07:00:00+00:00",
        ]
    );
    assert!(found.iter().all(|o| o.resolution == Resolution::Exact));
}

#[test]
fn a_daily_0900_series_stays_at_0900_across_fall_back() {
    let series = daily(wall(2024, 10, 25, 9, 0));
    let found = expand(
        &series,
        &[],
        window("2024-10-25T00:00:00Z", "2024-10-29T00:00:00Z"),
    )
    .unwrap();

    assert!(found
        .iter()
        .all(|o| o.wall_clock_start.naive().time() == NaiveTime::from_hms_opt(9, 0, 0).unwrap()));
    assert_eq!(
        instants(&found),
        [
            "2024-10-25T07:00:00+00:00",
            "2024-10-26T07:00:00+00:00",
            "2024-10-27T08:00:00+00:00",
            "2024-10-28T08:00:00+00:00",
        ]
    );
}

#[test]
fn a_start_inside_the_spring_gap_shifts_forward() {
    let series = daily(wall(2024, 3, 30, 2, 30));
    let found = expand(
        &series,
        &[],
        window("2024-03-30T00:00:00Z", "2024-04-01T12:00:00Z"),
    )
    .unwrap();

    assert_eq!(found.len(), 3);

    // The day before the change: an ordinary 02:30.
    assert_eq!(found[0].resolution, Resolution::Exact);
    assert_eq!(found[0].start.to_rfc3339(), "2024-03-30T01:30:00+00:00");

    // 02:30 does not exist on the 31st, so it moves forward to 03:00 local.
    assert_eq!(found[1].resolution, Resolution::GapShiftedForward);
    assert_eq!(found[1].start.to_rfc3339(), "2024-03-31T01:00:00+00:00");
    // The Occurrence still knows the wall-clock it was asked for, and keeps the
    // identity of the slot the series produced.
    assert_eq!(found[1].wall_clock_start, wall(2024, 3, 31, 2, 30));
    assert_eq!(found[1].id, OccurrenceId::new(wall(2024, 3, 31, 2, 30)));

    // After the change: back to an ordinary 02:30, now at +02:00.
    assert_eq!(found[2].resolution, Resolution::Exact);
    assert_eq!(found[2].start.to_rfc3339(), "2024-04-01T00:30:00+00:00");
}

#[test]
fn a_start_inside_the_autumn_overlap_takes_the_first_instant() {
    let series = daily(wall(2024, 10, 26, 2, 30));
    let found = expand(
        &series,
        &[],
        window("2024-10-26T00:00:00Z", "2024-10-28T12:00:00Z"),
    )
    .unwrap();

    assert_eq!(found.len(), 3);
    assert_eq!(found[0].resolution, Resolution::Exact);

    // 02:30 happens twice on the 27th; the first pass is still +02:00.
    assert_eq!(found[1].resolution, Resolution::OverlapFirst);
    assert_eq!(found[1].start.to_rfc3339(), "2024-10-27T00:30:00+00:00");
    // The second pass would have been 01:30Z — asserted explicitly so the policy
    // cannot be flipped without this failing.
    assert_ne!(found[1].start, utc("2024-10-27T01:30:00Z"));

    assert_eq!(found[2].resolution, Resolution::Exact);
    assert_eq!(found[2].start.to_rfc3339(), "2024-10-28T01:30:00+00:00");
}

#[test]
fn duration_is_measured_in_real_elapsed_time_not_wall_clock() {
    // A 60-minute Event that starts as the clocks go forward still runs 60
    // minutes; only its wall-clock end reads an hour later.
    let series = Series::recurring(
        wall(2024, 3, 31, 1, 30),
        cph(),
        DurationMinutes::new(60).unwrap(),
        RecurrenceRule::parse("FREQ=DAILY;COUNT=1").unwrap(),
    )
    .unwrap();

    let found = expand(
        &series,
        &[],
        window("2024-03-31T00:00:00Z", "2024-04-01T00:00:00Z"),
    )
    .unwrap();

    assert_eq!(found.len(), 1);
    assert_eq!(found[0].end - found[0].start, chrono::Duration::minutes(60));
    assert_eq!(found[0].start.to_rfc3339(), "2024-03-31T00:30:00+00:00");
    assert_eq!(cph().wall_clock_at(found[0].end).naive().hour(), 3);
}

// --- Window boundaries ----------------------------------------------------

#[test]
fn the_window_is_half_open() {
    // 12:00 in Copenhagen in January is 11:00Z.
    let series = daily(wall(2024, 1, 1, 12, 0));
    let found = expand(
        &series,
        &[],
        window("2024-01-02T11:00:00Z", "2024-01-04T11:00:00Z"),
    )
    .unwrap();

    assert_eq!(
        instants(&found),
        ["2024-01-02T11:00:00+00:00", "2024-01-03T11:00:00+00:00"],
        "an Occurrence exactly at `from` is included and one exactly at `to` is not"
    );
}

#[test]
fn adjacent_windows_tile_without_gaps_or_duplicates() {
    let series = daily(wall(2024, 1, 1, 12, 0));
    let first = expand(
        &series,
        &[],
        window("2024-01-01T00:00:00Z", "2024-01-03T11:00:00Z"),
    )
    .unwrap();
    let second = expand(
        &series,
        &[],
        window("2024-01-03T11:00:00Z", "2024-01-06T00:00:00Z"),
    )
    .unwrap();

    let mut all = instants(&first);
    all.extend(instants(&second));
    assert_eq!(
        all,
        [
            "2024-01-01T11:00:00+00:00",
            "2024-01-02T11:00:00+00:00",
            "2024-01-03T11:00:00+00:00",
            "2024-01-04T11:00:00+00:00",
            "2024-01-05T11:00:00+00:00",
        ]
    );
}

#[test]
fn an_empty_window_yields_nothing() {
    let series = daily(wall(2024, 1, 1, 12, 0));
    let found = expand(
        &series,
        &[],
        window("2024-01-02T11:00:00Z", "2024-01-02T11:00:00Z"),
    )
    .unwrap();
    assert!(found.is_empty());
}

#[test]
fn a_window_entirely_before_the_series_yields_nothing() {
    let series = daily(wall(2024, 6, 1, 9, 0));
    let found = expand(
        &series,
        &[],
        window("2024-05-01T00:00:00Z", "2024-05-31T00:00:00Z"),
    )
    .unwrap();
    assert!(found.is_empty());
}

#[test]
fn a_window_entirely_after_a_bounded_series_yields_nothing() {
    let series = series(wall(2024, 6, 1, 9, 0), "FREQ=DAILY;COUNT=3");
    let found = expand(
        &series,
        &[],
        window("2024-07-01T00:00:00Z", "2024-07-31T00:00:00Z"),
    )
    .unwrap();
    assert!(found.is_empty());
}

#[test]
fn an_inverted_window_is_rejected() {
    let err = Window::new(utc("2024-01-02T00:00:00Z"), utc("2024-01-01T00:00:00Z")).unwrap_err();
    assert!(matches!(err, DomainError::InvertedWindow { .. }));
}

// --- Rule shapes ----------------------------------------------------------

#[test]
fn count_bounds_the_series() {
    let series = series(wall(2024, 1, 1, 9, 0), "FREQ=DAILY;COUNT=3");
    let found = expand(
        &series,
        &[],
        window("2024-01-01T00:00:00Z", "2024-02-01T00:00:00Z"),
    )
    .unwrap();

    assert_eq!(
        wall_clocks(&found),
        [
            "2024-01-01T09:00:00",
            "2024-01-02T09:00:00",
            "2024-01-03T09:00:00",
        ]
    );
}

#[test]
fn until_is_read_as_an_rfc_5545_utc_instant() {
    // RFC 5545 §3.3.10: DTSTART is a local time with a tzid, so UNTIL is a UTC
    // instant. 09:00 in Copenhagen in January is 08:00Z, so a boundary of
    // 08:00Z on the 3rd lands exactly on that day's Occurrence.
    let series = series(wall(2024, 1, 1, 9, 0), "FREQ=DAILY;UNTIL=20240103T080000Z");
    let found = expand(
        &series,
        &[],
        window("2024-01-01T00:00:00Z", "2024-02-01T00:00:00Z"),
    )
    .unwrap();

    assert_eq!(
        instants(&found),
        [
            "2024-01-01T08:00:00+00:00",
            "2024-01-02T08:00:00+00:00",
            "2024-01-03T08:00:00+00:00",
        ]
    );
}

#[test]
fn a_summer_until_is_compared_against_the_instant_not_the_wall_clock() {
    // Copenhagen is +02:00 in July, so 09:00 local is 07:00Z. A boundary of
    // 08:00Z sits *after* the 3rd's Occurrence (07:00Z) but *before* its
    // wall-clock reading of 09:00 — so a wall-clock comparison would wrongly
    // drop the 3rd. Two hours of offset, one Occurrence between the two
    // candidate boundaries.
    let series = series(wall(2024, 7, 1, 9, 0), "FREQ=DAILY;UNTIL=20240703T080000Z");
    let found = expand(
        &series,
        &[],
        window("2024-07-01T00:00:00Z", "2024-08-01T00:00:00Z"),
    )
    .unwrap();

    assert_eq!(
        instants(&found),
        [
            "2024-07-01T07:00:00+00:00",
            "2024-07-02T07:00:00+00:00",
            "2024-07-03T07:00:00+00:00",
        ]
    );
    assert_eq!(
        wall_clocks(&found),
        [
            "2024-07-01T09:00:00",
            "2024-07-02T09:00:00",
            "2024-07-03T09:00:00",
        ]
    );
}

#[test]
fn a_winter_until_is_compared_against_the_instant_not_the_wall_clock() {
    // The same shape at +01:00: 09:00 local is 08:00Z, and a boundary of
    // 08:30Z keeps the 3rd even though 08:30 read as a local wall-clock would
    // fall short of 09:00.
    let series = series(wall(2024, 1, 1, 9, 0), "FREQ=DAILY;UNTIL=20240103T083000Z");
    let found = expand(
        &series,
        &[],
        window("2024-01-01T00:00:00Z", "2024-02-01T00:00:00Z"),
    )
    .unwrap();

    assert_eq!(
        instants(&found),
        [
            "2024-01-01T08:00:00+00:00",
            "2024-01-02T08:00:00+00:00",
            "2024-01-03T08:00:00+00:00",
        ]
    );
}

#[test]
fn until_is_inclusive_to_the_second() {
    // RFC 5545: UNTIL is inclusive. 09:00 Copenhagen in July is exactly 07:00Z.
    let on_the_boundary = series(wall(2024, 7, 1, 9, 0), "FREQ=DAILY;UNTIL=20240703T070000Z");
    let found = expand(
        &on_the_boundary,
        &[],
        window("2024-07-01T00:00:00Z", "2024-08-01T00:00:00Z"),
    )
    .unwrap();
    assert_eq!(
        instants(&found),
        [
            "2024-07-01T07:00:00+00:00",
            "2024-07-02T07:00:00+00:00",
            "2024-07-03T07:00:00+00:00",
        ],
        "an Occurrence landing exactly on UNTIL is the last of the series"
    );

    // One second earlier and that same Occurrence is out.
    let just_short = series(wall(2024, 7, 1, 9, 0), "FREQ=DAILY;UNTIL=20240703T065959Z");
    let found = expand(
        &just_short,
        &[],
        window("2024-07-01T00:00:00Z", "2024-08-01T00:00:00Z"),
    )
    .unwrap();
    assert_eq!(
        instants(&found),
        ["2024-07-01T07:00:00+00:00", "2024-07-02T07:00:00+00:00"]
    );
}

#[test]
fn until_is_correct_west_of_utc_too() {
    // New York is -04:00 in July, so 09:00 local is 13:00Z — the offset pushes
    // the boundary the other way. A boundary of 10:00Z on the 3rd is *before*
    // that day's Occurrence, even though a wall-clock comparison of 10:00
    // against 09:00 would wrongly keep it.
    let ny: TimeZoneId = "America/New_York".parse().unwrap();
    let series = series_in(
        ny,
        wall(2024, 7, 1, 9, 0),
        "FREQ=DAILY;UNTIL=20240703T100000Z",
    );
    let found = expand(
        &series,
        &[],
        window("2024-07-01T00:00:00Z", "2024-08-01T00:00:00Z"),
    )
    .unwrap();

    assert_eq!(
        instants(&found),
        ["2024-07-01T13:00:00+00:00", "2024-07-02T13:00:00+00:00"]
    );
}

#[test]
fn an_until_that_is_not_a_utc_instant_is_rejected() {
    // Ambiguity in exactly this field is what the RFC reading exists to remove,
    // so a floating value is refused rather than guessed at.
    assert!(matches!(
        RecurrenceRule::parse("FREQ=DAILY;UNTIL=20240103T090000"),
        Err(DomainError::NonUtcUntil(_))
    ));
}

#[test]
fn until_bounds_the_series_slots_not_the_exceptions() {
    // Moving an Occurrence past the boundary reschedules it; it does not delete
    // it. The slot it came from is still within UNTIL.
    let series = series(wall(2024, 1, 1, 9, 0), "FREQ=DAILY;UNTIL=20240103T080000Z");
    let exceptions = [Exception::move_to(
        OccurrenceId::new(wall(2024, 1, 3, 9, 0)),
        wall(2024, 1, 9, 9, 0),
    )];

    let found = expand(
        &series,
        &exceptions,
        window("2024-01-01T00:00:00Z", "2024-02-01T00:00:00Z"),
    )
    .unwrap();

    assert_eq!(
        wall_clocks(&found),
        [
            "2024-01-01T09:00:00",
            "2024-01-02T09:00:00",
            "2024-01-09T09:00:00",
        ]
    );
}

#[test]
fn a_weekly_byday_rule_picks_the_named_days() {
    // 2024-01-01 is a Monday.
    let series = series(wall(2024, 1, 1, 9, 0), "FREQ=WEEKLY;BYDAY=MO,WE,FR");
    let found = expand(
        &series,
        &[],
        window("2024-01-01T00:00:00Z", "2024-01-11T00:00:00Z"),
    )
    .unwrap();

    assert_eq!(
        wall_clocks(&found),
        [
            "2024-01-01T09:00:00",
            "2024-01-03T09:00:00",
            "2024-01-05T09:00:00",
            "2024-01-08T09:00:00",
            "2024-01-10T09:00:00",
        ]
    );
}

#[test]
fn a_one_off_series_yields_exactly_one_occurrence() {
    let series = Series::once(
        wall(2024, 1, 15, 9, 0),
        cph(),
        DurationMinutes::new(45).unwrap(),
    );

    let inside = expand(
        &series,
        &[],
        window("2024-01-01T00:00:00Z", "2024-02-01T00:00:00Z"),
    )
    .unwrap();
    assert_eq!(instants(&inside), ["2024-01-15T08:00:00+00:00"]);

    let outside = expand(
        &series,
        &[],
        window("2024-02-01T00:00:00Z", "2024-03-01T00:00:00Z"),
    )
    .unwrap();
    assert!(outside.is_empty());
}

// --- Exceptions -----------------------------------------------------------

#[test]
fn a_cancelled_occurrence_disappears() {
    let series = daily(wall(2024, 1, 1, 9, 0));
    let exceptions = [Exception::cancel(OccurrenceId::new(wall(2024, 1, 2, 9, 0)))];

    let found = expand(
        &series,
        &exceptions,
        window("2024-01-01T00:00:00Z", "2024-01-04T00:00:00Z"),
    )
    .unwrap();

    assert_eq!(
        wall_clocks(&found),
        ["2024-01-01T09:00:00", "2024-01-03T09:00:00"]
    );
}

#[test]
fn a_moved_occurrence_appears_at_the_new_time_and_not_the_old() {
    let series = daily(wall(2024, 1, 1, 9, 0));
    let original = OccurrenceId::new(wall(2024, 1, 2, 9, 0));
    let exceptions = [Exception::move_to(original, wall(2024, 1, 2, 15, 30))];

    let found = expand(
        &series,
        &exceptions,
        window("2024-01-01T00:00:00Z", "2024-01-04T00:00:00Z"),
    )
    .unwrap();

    assert_eq!(
        wall_clocks(&found),
        [
            "2024-01-01T09:00:00",
            "2024-01-02T15:30:00",
            "2024-01-03T09:00:00",
        ]
    );
    let moved = &found[1];
    assert!(moved.is_moved());
    assert_eq!(moved.overridden, Override::Moved);
    // Identity is the slot the series produced, not where it ended up.
    assert_eq!(moved.id, original);
}

#[test]
fn an_occurrence_moved_into_the_window_from_outside_it_is_found() {
    let series = daily(wall(2024, 1, 1, 9, 0));
    // Swimming was Tuesday the 2nd; it now happens on Saturday the 6th.
    let exceptions = [Exception::move_to(
        OccurrenceId::new(wall(2024, 1, 2, 9, 0)),
        wall(2024, 1, 6, 14, 0),
    )];

    let found = expand(
        &series,
        &exceptions,
        window("2024-01-06T00:00:00Z", "2024-01-07T00:00:00Z"),
    )
    .unwrap();

    assert_eq!(
        wall_clocks(&found),
        ["2024-01-06T09:00:00", "2024-01-06T14:00:00"]
    );
    assert_eq!(found[1].id, OccurrenceId::new(wall(2024, 1, 2, 9, 0)));
}

#[test]
fn an_occurrence_moved_out_of_the_window_leaves_it() {
    let series = daily(wall(2024, 1, 1, 9, 0));
    let exceptions = [Exception::move_to(
        OccurrenceId::new(wall(2024, 1, 2, 9, 0)),
        wall(2024, 2, 2, 9, 0),
    )];

    let found = expand(
        &series,
        &exceptions,
        window("2024-01-01T00:00:00Z", "2024-01-04T00:00:00Z"),
    )
    .unwrap();

    assert_eq!(
        wall_clocks(&found),
        ["2024-01-01T09:00:00", "2024-01-03T09:00:00"]
    );
}

#[test]
fn a_move_may_change_the_duration() {
    let series = daily(wall(2024, 1, 1, 9, 0));
    let exceptions = [Exception {
        occurrence_id: OccurrenceId::new(wall(2024, 1, 1, 9, 0)),
        kind: ExceptionKind::Moved {
            start: wall(2024, 1, 1, 9, 0),
            duration: Some(DurationMinutes::new(15).unwrap()),
        },
    }];

    let found = expand(
        &series,
        &exceptions,
        window("2024-01-01T00:00:00Z", "2024-01-02T00:00:00Z"),
    )
    .unwrap();

    assert_eq!(found[0].end - found[0].start, chrono::Duration::minutes(15));
}

#[test]
fn a_modified_occurrence_keeps_its_slot_and_its_identity() {
    let series = daily(wall(2024, 1, 1, 9, 0));
    let id = OccurrenceId::new(wall(2024, 1, 2, 9, 0));
    let exceptions = [Exception::modify(id)];

    let found = expand(
        &series,
        &exceptions,
        window("2024-01-01T00:00:00Z", "2024-01-04T00:00:00Z"),
    )
    .unwrap();

    assert_eq!(found.len(), 3);
    assert_eq!(found[1].id, id);
    assert_eq!(found[1].wall_clock_start, wall(2024, 1, 2, 9, 0));
    assert_eq!(found[1].start.to_rfc3339(), "2024-01-02T08:00:00+00:00");
    assert_eq!(found[1].overridden, Override::Modified);
    assert!(!found[1].is_moved());
}

#[test]
fn an_exception_targeting_a_slot_the_series_never_produces_is_inert() {
    let series = daily(wall(2024, 1, 1, 9, 0));
    // 09:05 is not a slot of a 09:00 daily series.
    let exceptions = [Exception::cancel(OccurrenceId::new(wall(2024, 1, 2, 9, 5)))];

    let found = expand(
        &series,
        &exceptions,
        window("2024-01-01T00:00:00Z", "2024-01-04T00:00:00Z"),
    )
    .unwrap();

    assert_eq!(found.len(), 3);
}

#[test]
fn two_exceptions_for_one_occurrence_are_rejected() {
    let series = daily(wall(2024, 1, 1, 9, 0));
    let id = OccurrenceId::new(wall(2024, 1, 2, 9, 0));
    let exceptions = [
        Exception::cancel(id),
        Exception::move_to(id, wall(2024, 1, 2, 10, 0)),
    ];

    let err = expand(
        &series,
        &exceptions,
        window("2024-01-01T00:00:00Z", "2024-01-04T00:00:00Z"),
    )
    .unwrap_err();

    assert!(matches!(err, DomainError::DuplicateException(_)));
}

#[test]
fn a_move_across_the_spring_gap_still_shifts_forward() {
    let series = daily(wall(2024, 3, 30, 9, 0));
    let exceptions = [Exception::move_to(
        OccurrenceId::new(wall(2024, 3, 31, 9, 0)),
        wall(2024, 3, 31, 2, 30),
    )];

    let found = expand(
        &series,
        &exceptions,
        window("2024-03-31T00:00:00Z", "2024-04-01T00:00:00Z"),
    )
    .unwrap();

    assert_eq!(found.len(), 1);
    assert_eq!(found[0].resolution, Resolution::GapShiftedForward);
    assert_eq!(found[0].start.to_rfc3339(), "2024-03-31T01:00:00+00:00");
}

// --- Safety ---------------------------------------------------------------

#[test]
fn an_unreasonably_dense_expansion_errors_rather_than_hangs() {
    let series = series(wall(2024, 1, 1, 0, 0), "FREQ=MINUTELY");
    let err = expand(
        &series,
        &[],
        window("2024-01-01T00:00:00Z", "2024-02-01T00:00:00Z"),
    )
    .unwrap_err();

    assert!(matches!(err, DomainError::ExpansionLimitExceeded { .. }));
}
