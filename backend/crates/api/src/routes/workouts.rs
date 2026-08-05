//! Submitting a logged session (D-07, D-08, D-09).
//!
//! One `POST` at the end of a session, carrying the whole set list — including
//! the sets that were prescribed and *not* done — keyed by an id the client
//! minted before it went offline. This is the endpoint the idempotency decision
//! exists for, and the reason it exists is not tidiness:
//!
//! > Submitting a session runs `advance()` and mutates program state. A retried
//! > POST on a flaky connection would advance twice — a 5/3/1 training max
//! > jumping 5 kg instead of 2.5, silently and permanently.
//!
//! The phone is the logging device, gyms have concrete walls, and a failed POST
//! sits in a local queue and retries on next launch (D-09). So a retry is the
//! normal case rather than the exceptional one, and "the same body twice leaves
//! the same state as once" is a correctness property, not an optimisation.
//!
//! # How the write is made atomic
//!
//! Everything below happens in one transaction, and in this order:
//!
//! 1. `select ... for update` the enrolment, filtered by `athlete_id`. The lock
//!    is what serialises two submits against the same enrolment: the workout
//!    row's primary key already stops the same *id* landing twice, but
//!    `advance()` is a read-modify-write of `enrollments.state`, so two
//!    *different* workouts arriving together would otherwise both read the old
//!    state and one advance would be lost.
//! 2. `insert into workouts ... on conflict (id) do nothing returning id`. The
//!    `returning` is the whole detection mechanism — a row comes back if and
//!    only if this insert is the one that created it. Deliberately not a
//!    `select` first: between the select and the insert is exactly where the
//!    duplicate gets in.
//! 3. Only if a row came back: insert the sets, run `advance()`, write the new
//!    `State`.
//! 4. Commit.
//!
//! A crash anywhere after step 2 rolls the whole thing back, sets included, and
//! the client's retry re-runs it from the top. A duplicate skips steps 3 and 4's
//! state write entirely and answers 200 instead of 201 — success, because from
//! the client's point of view the retry did succeed, and nothing moved.

use std::collections::BTreeSet;

use axum::extract::State;
use axum::extract::{Path, Query};
use axum::http::StatusCode;
use axum::Json;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use athletos_training::{
    exercise, programs, LoggedSession, LoggedSet, ProgramError, Session, State as ProgramState,
};

use crate::auth::AuthenticatedAthlete;
use crate::error::{ApiError, ApiResult};
use crate::report::{self, ReportedSet, SessionReport};
use crate::routes::enrollments::{unknown_program, ProgressView};
use crate::routes::maxes::MAX_WEIGHT_KG;
use crate::state::AppState;
use crate::timing::{self, SessionTiming, TimedSet};

/// The most sets one submitted session may carry.
///
/// Smolov Jr's heaviest day is around forty. This is two orders of magnitude of
/// headroom and exists only so that a malformed or hostile body cannot buy an
/// unbounded insert inside a transaction holding a row lock.
const MAX_SETS: usize = 500;

const MAX_NOTES_LENGTH: usize = 4_000;

/// Long enough for "left shoulder felt off, dropped the last rep", short
/// enough that this does not become a training diary. Enforced here and in the
/// schema — the constraint is what is still true after the next client.
const NOTE_LIMIT: usize = 500;

/// Reps beyond this are not a set, they are a typo.
const MAX_REPS: u32 = 1_000;

/// History rows per page when the caller does not say.
const DEFAULT_HISTORY_LIMIT: u32 = 25;

/// The most history rows one page will return, whatever is asked for.
///
/// Clamped rather than refused, and the effective value is echoed back in the
/// response — a 422 for asking for too much is a worse answer than giving what
/// there is and saying how much that was.
const MAX_HISTORY_LIMIT: u32 = 100;

/// A finished session, as the phone recorded it.
#[derive(Debug, Deserialize, ToSchema)]
pub struct WorkoutSubmission {
    /// **Minted by the client**, before the session started and before it had a
    /// network, and the idempotency key for this whole endpoint (D-09).
    ///
    /// A UUIDv7 by convention, because time-ordered ids cluster in the primary
    /// key's btree. It is not *checked* to be v7: the idempotency comes from the
    /// primary key and works for any uuid, whereas refusing a v4 would strand a
    /// queued offline workout in a retry loop it could never get out of, with no
    /// action the athlete could take to fix it.
    pub id: Uuid,

    /// Must belong to the authenticated athlete. Someone else's is a 404.
    pub enrollment_id: Uuid,

    /// Wall clock from the phone, stamped when the athlete committed to the
    /// session — never when they merely looked at it (D-08).
    pub started_at: DateTime<Utc>,
    pub ended_at: DateTime<Utc>,

    pub outcome: WorkoutOutcome,

    /// Required when `outcome` is `cut_short`, and refused otherwise. The one
    /// question asked when a session ends early; the program advances whatever
    /// the answer is (D-08).
    pub cut_reason: Option<CutReason>,

    pub notes: Option<String>,

    /// Every set of the session, including the ones that were never done.
    ///
    /// `pending` and `skipped` are first-class outcomes rather than absent rows:
    /// what was prescribed and not performed is precisely how "work not done"
    /// becomes the second axis of drift (D-07, D-08).
    pub sets: Vec<SubmittedSet>,
}

/// How the session ended, as the athlete may report it.
///
/// Deliberately missing the schema's third value, `auto_closed`. That one
/// belongs to the sweep that closes a session left open past three hours (D-08),
/// and a client must not be able to claim it.
#[derive(Debug, Clone, Copy, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum WorkoutOutcome {
    Completed,
    CutShort,
}

/// How a session that is already recorded turned out.
///
/// A second enum rather than a `Serialize` on [`WorkoutOutcome`], because the
/// two vocabularies are genuinely different sizes: a client may only ever
/// *claim* `completed` or `cut_short`, but it must be able to *read* the
/// `auto_closed` the stale-session sweep writes (D-08). Collapsing them into one
/// type would mean either letting a client claim `auto_closed` or hiding it from
/// the history, and both are worse than two enums that happen to overlap.
#[derive(Debug, Clone, Copy, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum RecordedOutcome {
    Completed,
    CutShort,
    /// Closed by the server after three hours, rather than by the athlete —
    /// flagged so that a fourteen-hour workout is not silently a real one.
    AutoClosed,
}

/// The four answers to the one question asked when a session ends early (D-08).
#[derive(Debug, Clone, Copy, Deserialize, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum CutReason {
    OutOfTime,
    Pain,
    Equipment,
    Enough,
}

/// Why a set was lifted at something other than the prescribed weight (D-07).
///
/// Optional in every direction. The chips that produce it are unselected by
/// default, no tap is a valid answer, and nothing blocks — a default would
/// answer the question on the athlete's behalf and land a claim nobody made in
/// the one signal this product exists to read.
#[derive(Debug, Clone, Copy, Deserialize, Serialize, ToSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DriftReason {
    /// The prescription was light. The first chip offered, and never the
    /// selected one.
    TooEasy,
    TooHeavy,
    /// The bar already held that weight and stripping it was not worth it —
    /// drift the display caused rather than the athlete (D-04).
    AlreadyLoaded,
    FeltOff,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum SetStatus {
    Done,
    Skipped,
    Pending,
}

/// One set: what was asked for and what happened (D-07).
///
/// Four numbers, not two. Going heavier than prescribed means editing the
/// number, and it is logged as edited — a cap would produce either dishonest
/// logs or an abandoned app, and honesty must never cost more than dishonesty.
#[derive(Debug, Deserialize, ToSchema)]
pub struct SubmittedSet {
    /// From `prescribed_sets[].position` in the session payload. Unique within
    /// the submission.
    pub position: u16,
    pub exercise: String,
    pub prescribed_weight: f64,
    pub prescribed_reps: u32,
    /// Required when `status` is `done`; the schema will not record a set as
    /// done with no numbers, because that is a hole in every drift query that
    /// will ever run over this table.
    pub actual_weight: Option<f64>,
    pub actual_reps: Option<u32>,
    pub status: SetStatus,

    /// When the athlete tapped Log or Skip for this set, from the phone's clock
    /// at that moment (D-10).
    ///
    /// Optional, and additively so (D-12): a client that does not send it still
    /// submits a valid workout, it simply has no timing to show afterwards.
    /// Stamped on the device rather than here because the logger runs offline
    /// and a submission can arrive hours late — a server clock would be
    /// measuring when the queue flushed, not when the work happened.
    ///
    /// Not validated against `started_at` and `ended_at`. A stamp outside them
    /// is a phone whose clock moved, which is a fact about the measurement
    /// rather than a malformed request, and refusing the submission would cost
    /// the athlete a whole session's log over it. `timing` discards the
    /// intervals it cannot believe instead.
    #[serde(default)]
    pub logged_at: Option<DateTime<Utc>>,

    /// What the athlete wrote about this set, if anything (D-07).
    ///
    /// Optional and additively so (D-12). Blank and whitespace-only strings
    /// normalise to `None` rather than being refused — a note that was typed
    /// and then cleared is not an error, and the athlete is holding a phone
    /// with chalk on their hands.
    ///
    /// Over 500 characters is a 422 naming the position. Truncating would
    /// store something other than what was written, which is worse than
    /// refusing it.
    #[serde(default)]
    pub note: Option<String>,

    /// Why this set was lifted at something other than its prescription (D-07).
    ///
    /// Optional and additively so (D-12). **Only a `done` set may carry one**,
    /// and only when its weight actually differs — see `validate`. That is not
    /// tidiness: a reason on a set that was never reached arrives with a null
    /// `actual_weight`, the check constraint refuses it, and the whole
    /// submission goes down over a chip tapped forty minutes earlier.
    #[serde(default)]
    pub drift_reason: Option<DriftReason>,
}

/// What the server recorded, and where the program stands afterwards.
#[derive(Debug, Serialize, ToSchema)]
pub struct WorkoutReceipt {
    pub id: Uuid,
    pub enrollment_id: Uuid,
    /// Where in the program this session sat — decided by the server from the
    /// enrolment's state, not taken from the request (D-11).
    pub week: u32,
    pub day: u32,
    /// True when this submit was a retry of one already accepted, and therefore
    /// changed nothing. The status code says the same thing: 201 the first time,
    /// 200 for every retry.
    pub duplicate: bool,
    /// Progress *after* the submit. A retry reports the same numbers the first
    /// attempt did, which is the whole point.
    pub progress: ProgressView,
    /// What this session cost, and how it compares (D-08, amended).
    ///
    /// Present on a retry too, and computed the same way — see `recorded_report`.
    pub summary: SessionReport,
}

/// One row of the history list.
///
/// Exactly what a history row shows and nothing else: when, which program,
/// where in it, how long it took, and how it ended. `notes` and the set list are
/// on the detail endpoint, because they are what the row expands *into*.
#[derive(Debug, Serialize, ToSchema)]
pub struct WorkoutSummary {
    pub id: Uuid,
    pub enrollment_id: Uuid,
    #[schema(example = "wendler-531-bbb")]
    pub program_key: String,
    #[schema(example = "5/3/1 Boring But Big")]
    pub program_name: String,
    pub week: u32,
    pub day: u32,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    /// Wall clock, in seconds — the only measure of "the hour" there is (D-10).
    ///
    /// Subtracted here rather than left to the client. Two clients doing date
    /// arithmetic on two timestamps is two implementations of one rule, and the
    /// second one is written in a different language (D-11). `null` while a
    /// session is still open, which today means never: `POST /v1/workouts`
    /// requires both ends.
    #[schema(example = 3600)]
    pub duration_seconds: Option<i64>,
    pub outcome: Option<RecordedOutcome>,
    pub cut_reason: Option<CutReason>,
}

/// A page of history, newest first.
#[derive(Debug, Serialize, ToSchema)]
pub struct WorkoutHistory {
    pub workouts: Vec<WorkoutSummary>,
    /// Every workout matching the filter, not just this page — what a "load
    /// more" control needs in order to know when to stop.
    pub total: i64,
    /// The limit actually applied, which is not always the one asked for.
    pub limit: u32,
    pub offset: u32,
}

/// One workout, expanded.
///
/// The summary is nested rather than flattened so that the two responses cannot
/// drift: a field added to the history row is a field this endpoint gains for
/// free, and there is exactly one place that builds it.
#[derive(Debug, Serialize, ToSchema)]
pub struct WorkoutDetail {
    pub workout: WorkoutSummary,
    pub notes: Option<String>,
    /// Every set as it was logged, in position order — including the ones never
    /// done. Both the prescribed and the actual numbers, because drift is the
    /// thing this screen exists to show (D-07, D-13).
    pub sets: Vec<LoggedSetView>,
    /// Where the hour went, when the sets carry stamps to work it out from.
    ///
    /// Absent rather than empty for a session logged before timing existed, so
    /// a client cannot render a breakdown of nothing (D-10).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timing: Option<SessionTiming>,
}

/// One set as it was recorded.
#[derive(Debug, Serialize, ToSchema)]
pub struct LoggedSetView {
    pub position: u16,
    #[schema(example = "squat")]
    pub exercise: String,
    /// Resolved from the compiled registry, for the same reason the session
    /// payload carries it: a browser cannot look a key up in a Rust `static`.
    /// Cues are not repeated here — a history row is read, not performed.
    #[schema(example = "Squat")]
    pub label: String,
    pub prescribed_weight: f64,
    pub prescribed_reps: u32,
    pub actual_weight: Option<f64>,
    pub actual_reps: Option<u32>,
    pub status: SetStatus,
    /// When this set was logged or skipped, as the phone recorded it (D-10).
    /// Null for anything logged before timing existed.
    pub logged_at: Option<DateTime<Utc>>,
    /// What the athlete wrote about this set. Null for every set logged
    /// before notes existed, and for every set they had nothing to say about.
    pub note: Option<String>,
    /// Why this set drifted, if the athlete said. Null for every set logged
    /// before the chips existed, and for every deviation they walked past.
    pub drift_reason: Option<DriftReason>,
}

/// Which slice of the history to return.
#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct HistoryFilter {
    /// Only this enrolment's workouts — "how did that block go".
    ///
    /// Worth having beyond convenience: with it supplied the query is one walk
    /// of `workouts_enrollment_id_idx (enrollment_id, started_at desc)` and
    /// needs no sort at all, which the athlete-wide query cannot manage.
    pub enrollment_id: Option<Uuid>,

    /// Rows per page. Defaults to 25, clamped to 100.
    #[param(example = 25)]
    pub limit: Option<u32>,

    /// Rows to skip. Defaults to 0.
    #[param(example = 0)]
    pub offset: Option<u32>,
}

/// Records a finished session and advances the program exactly once.
#[utoipa::path(
    post,
    path = "/v1/workouts",
    operation_id = "submit_workout",
    tag = "workouts",
    security(("bearer_token" = [])),
    request_body = WorkoutSubmission,
    responses(
        (status = 201, description = "Recorded, and the program advanced", body = WorkoutReceipt),
        (status = 200, description = "A retry of a submit already accepted; nothing moved", body = WorkoutReceipt),
        (status = 401, description = "Missing or invalid access token", body = crate::error::ProblemDetails),
        (status = 404, description = "No such enrolment belongs to this athlete", body = crate::error::ProblemDetails),
        (status = 409, description = "The enrolment has nothing left to log, or the id is already used by another enrolment", body = crate::error::ProblemDetails),
        (status = 413, description = "Too many sets in one submission", body = crate::error::ProblemDetails),
        (status = 422, description = "The submission is inconsistent", body = crate::error::ProblemDetails),
    )
)]
pub async fn submit(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Json(body): Json<WorkoutSubmission>,
) -> ApiResult<(StatusCode, Json<WorkoutReceipt>)> {
    validate(&body)?;

    let mut tx = state.db.begin().await?;

    // Ownership first, and in the `where` clause. A 404 rather than a 403 for
    // another athlete's enrolment, so the API does not confirm that the id names
    // real data belonging to somebody.
    //
    // `for update` is doing real work here — see the module header.
    let row: Option<(String, serde_json::Value, String)> = sqlx::query_as(
        "select program_key, state, status from enrollments
         where id = $1 and athlete_id = $2
         for update",
    )
    .bind(body.enrollment_id)
    .bind(athlete.athlete_id)
    .fetch_optional(&mut *tx)
    .await?;

    let Some((program_key, stored_state, status)) = row else {
        return Err(ApiError::NotFound);
    };

    let program = unknown_program(&program_key)?;
    let program_state = ProgramState::from_json(stored_state);

    // The session the enrolment is currently pointing at, which is the one the
    // athlete was shown by `next-session` and therefore the one they just did.
    // The server decides this, not the request: a client naming its own week and
    // day could log a session the program is not on.
    let current: Option<Session> = if status == "active" {
        match program.session(&program_state) {
            Ok(session) => Some(session),
            // Not an error yet. A block with nothing left still has to be able
            // to acknowledge the retry of the submit that ended it.
            Err(ProgramError::Finished) => None,
            Err(other) => return Err(other.into()),
        }
    } else {
        None
    };

    let Some(session) = current else {
        // Nothing new can be accepted against a closed enrolment, so there is
        // no insert to attempt and therefore no race a lookup could lose.
        let (week, day) = already_recorded(&mut tx, body.id, body.enrollment_id)
            .await?
            .ok_or_else(|| {
                ApiError::Conflict(format!(
                    "this enrolment is {status} and has no session left to log"
                ))
            })?;

        let progress = program.progress(&program_state)?;
        let summary = recorded_report(&mut tx, body.id, body.enrollment_id).await?;
        tx.commit().await?;

        return Ok((
            StatusCode::OK,
            Json(receipt(&body, week, day, true, progress.into(), summary)),
        ));
    };

    let week = smallint(session.week, "week")?;
    let day = smallint(session.day, "day")?;

    // The one statement everything else hangs off. `returning id` yields a row
    // if and only if this call is the one that inserted it — a `select` first
    // would leave a window for the retry to slip through, and rows-affected on a
    // conflict is zero, which is the same signal read a less direct way.
    let inserted: Option<(Uuid,)> = sqlx::query_as(
        "insert into workouts
             (id, enrollment_id, week, day, started_at, ended_at, outcome, cut_reason, notes)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         on conflict (id) do nothing
         returning id",
    )
    .bind(body.id)
    .bind(body.enrollment_id)
    .bind(week)
    .bind(day)
    .bind(body.started_at)
    .bind(body.ended_at)
    .bind(body.outcome.as_str())
    .bind(body.cut_reason.map(CutReason::as_str))
    .bind(body.notes.as_deref())
    .fetch_optional(&mut *tx)
    .await?;

    if inserted.is_none() {
        // The retry. Nothing was written, `advance()` is not run, and the state
        // read above is already the advanced one — so the numbers reported here
        // are the same numbers the first attempt reported.
        let (week, day) = already_recorded(&mut tx, body.id, body.enrollment_id)
            .await?
            .ok_or_else(|| {
                ApiError::Internal(
                    "a workout insert conflicted on a row that then could not be read".to_owned(),
                )
            })?;

        let progress = program.progress(&program_state)?;
        let summary = recorded_report(&mut tx, body.id, body.enrollment_id).await?;
        tx.commit().await?;

        return Ok((
            StatusCode::OK,
            Json(receipt(&body, week, day, true, progress.into(), summary)),
        ));
    }

    insert_sets(&mut tx, body.id, &body.sets).await?;

    // The program advances regardless of how the session went (D-08). Repeating
    // a session because life interrupted it is precisely the guilt loop D-06
    // exists to avoid, and a completeness threshold would force every program
    // author to invent one.
    //
    // By `position`, not by the order the phone happened to serialise `sets`
    // in — the training migration calls wire order "an accident of the wire"
    // for exactly this reason, and `position` is the one the schema treats as
    // canonical. `validate` has already confirmed every position is unique,
    // so this is a total order and the sort is unambiguous. Without it, a
    // program whose fold reads `LoggedSession.sets` order-sensitively — 5/3/1
    // BBB's `made_the_minimum` breaks a weight tie with `max_by`, which
    // returns the *last* maximum — would answer differently depending on
    // request order alone, which is not a fact about the session.
    let mut ordered_sets: Vec<&SubmittedSet> = body.sets.iter().collect();
    ordered_sets.sort_by_key(|set| set.position);

    let logged = LoggedSession {
        week: session.week,
        day: session.day,
        sets: ordered_sets.into_iter().map(LoggedSet::from).collect(),
        cut_reason: body.cut_reason.map(Into::into),
    };

    // Captured before the fold consumes it. Cloning an already-decoded value is
    // cheaper than reading the row again, and reading it again would be reading
    // it at a different moment.
    let state_before = program_state.as_json().clone();

    let advanced = program.advance(program_state, &logged)?;
    let progress = program.progress(&advanced)?;

    // A fixed block that has run out closes here rather than lingering as an
    // `active` enrolment that prescribes nothing. Status and `ended_at` move
    // together because the schema will not have it otherwise: an enrolment is
    // either running or it is over, and "over" has a time.
    let persist = if progress.is_finished() {
        "update enrollments
         set state = $1::jsonb, status = 'finished', ended_at = now()
         where id = $2"
    } else {
        "update enrollments set state = $1::jsonb where id = $2"
    };

    sqlx::query(persist)
        .bind(advanced.as_json().clone())
        .bind(body.enrollment_id)
        .execute(&mut *tx)
        .await?;

    // What the fold did, so a wrong one can be found later (D-19).
    //
    // Inside the transaction that already holds this enrolment's `for update`
    // lock, beside the state write it describes — so the record and the state
    // it records can never disagree. Only this branch advances; the two retry
    // branches have nothing to record.
    sqlx::query(
        "insert into enrollment_advances
             (workout_id, enrollment_id, state_before, state_after, engine_version)
         values ($1, $2, $3::jsonb, $4::jsonb, $5)",
    )
    .bind(body.id)
    .bind(body.enrollment_id)
    .bind(&state_before)
    .bind(advanced.as_json())
    .bind(env!("CARGO_PKG_VERSION"))
    .execute(&mut *tx)
    .await?;

    let summary = recorded_report(&mut tx, body.id, body.enrollment_id).await?;
    tx.commit().await?;

    Ok((
        StatusCode::CREATED,
        Json(receipt(&body, week, day, false, progress.into(), summary)),
    ))
}

/// The athlete's average session length on this enrolment, in seconds.
///
/// Excludes the session being reported, so the comparison is against history
/// rather than diluted by itself, and excludes `auto_closed` sessions — a
/// three-hour workout closed by the stale-session sweep is a measurement of an
/// afternoon, not of a session (D-08).
///
/// `None` below three, which is D-10's rule for pace and is here for the same
/// reason: two would let one long session *be* the average rather than merely
/// be in it.
async fn average_duration(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    enrollment_id: Uuid,
    excluding: Uuid,
) -> ApiResult<Option<i64>> {
    let row: Option<(i64, Option<f64>)> = sqlx::query_as(
        "select count(*), avg(extract(epoch from (ended_at - started_at)))::float8
         from workouts
         where enrollment_id = $1
           and id <> $2
           and ended_at is not null
           and outcome <> 'auto_closed'",
    )
    .bind(enrollment_id)
    .bind(excluding)
    .fetch_optional(&mut **tx)
    .await?;

    Ok(match row {
        Some((count, Some(average))) if count >= 3 => Some(average.round() as i64),
        _ => None,
    })
}

/// One row of `workout_sets`, as `recorded_report` needs it: position, the
/// numbers prescribed and performed, whether the set was done, and its stamp.
///
/// Deliberately not [`StoredSet`] — that row carries `note` and
/// `drift_reason`, which this query has no use for.
type ReportedRow = (
    i16,
    String,
    f64,
    i16,
    Option<f64>,
    Option<i16>,
    String,
    Option<DateTime<Utc>>,
);

/// The ending, built from what is recorded rather than from what was sent.
///
/// Read back inside the same transaction, on every path including both retry
/// branches. One piece of code and one guarantee: the ending describes the
/// workout that is in the database. Building it from `body` would have saved a
/// query and cost that guarantee — a client reusing an id for different content
/// would be shown numbers about something that was never stored.
async fn recorded_report(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    workout_id: Uuid,
    enrollment_id: Uuid,
) -> ApiResult<SessionReport> {
    let (started_at, ended_at): (DateTime<Utc>, Option<DateTime<Utc>>) =
        sqlx::query_as("select started_at, ended_at from workouts where id = $1")
            .bind(workout_id)
            .fetch_one(&mut **tx)
            .await?;

    // `unique (workout_id, "position")` is both the ordering and the index —
    // and the order matters, because the walk that produces intervals is a
    // walk in performed order.
    let rows: Vec<ReportedRow> = sqlx::query_as(
        "select \"position\", exercise, prescribed_weight::float8, prescribed_reps,
                    actual_weight::float8, actual_reps, status, logged_at
             from workout_sets
             where workout_id = $1
             order by \"position\"",
    )
    .bind(workout_id)
    .fetch_all(&mut **tx)
    .await?;

    let reported: Vec<ReportedSet> = rows
        .iter()
        .map(
            |(_, _, prescribed_weight, prescribed_reps, actual_weight, actual_reps, status, _)| {
                ReportedSet {
                    prescribed_weight: *prescribed_weight,
                    prescribed_reps: u32::try_from(*prescribed_reps).unwrap_or_default(),
                    actual_weight: *actual_weight,
                    actual_reps: actual_reps.map(|reps| u32::try_from(reps).unwrap_or_default()),
                    done: status == "done",
                }
            },
        )
        .collect();

    // `label` is the raw key and is never read: `spread` takes the shape of the
    // intervals and does not attribute them to exercises. Resolving labels from
    // the registry here would be work with no consumer.
    let timed: Vec<(u16, TimedSet)> = rows
        .iter()
        .map(|(position, exercise, _, _, _, _, _, logged_at)| {
            (
                u16::try_from(*position).unwrap_or_default(),
                TimedSet {
                    exercise: exercise.clone(),
                    label: exercise.clone(),
                    logged_at: *logged_at,
                },
            )
        })
        .collect();

    let average = average_duration(tx, enrollment_id, workout_id).await?;

    Ok(report::compute(
        ended_at
            .map(|end| (end - started_at).num_seconds())
            .unwrap_or_default(),
        average,
        &reported,
        timing::spread(started_at, &timed),
    ))
}

fn receipt(
    body: &WorkoutSubmission,
    week: i16,
    day: i16,
    duplicate: bool,
    progress: ProgressView,
    summary: SessionReport,
) -> WorkoutReceipt {
    WorkoutReceipt {
        id: body.id,
        enrollment_id: body.enrollment_id,
        week: u32::try_from(week).unwrap_or_default(),
        day: u32::try_from(day).unwrap_or_default(),
        duplicate,
        progress,
        summary,
    }
}

// --- the history (D-13) ---------------------------------------------------

/// A row from the two queries that read a workout back, before the program name
/// and the duration are worked out.
type StoredWorkout = (
    Uuid,
    Uuid,
    String,
    i16,
    i16,
    DateTime<Utc>,
    Option<DateTime<Utc>>,
    Option<String>,
    Option<String>,
);

/// The same row plus `notes`, which only the detail endpoint reads.
type StoredWorkoutDetail = (
    Uuid,
    Uuid,
    String,
    i16,
    i16,
    DateTime<Utc>,
    Option<DateTime<Utc>>,
    Option<String>,
    Option<String>,
    Option<String>,
);

/// One row of `workout_sets`, with the `numeric` columns already cast to
/// `float8` by the query.
type StoredSet = (
    i16,
    String,
    f64,
    i16,
    Option<f64>,
    Option<i16>,
    String,
    Option<DateTime<Utc>>,
    Option<String>,
    Option<String>,
);

/// Everything the athlete has logged, newest first.
///
/// # Pagination, and the index that does not exist
///
/// Offset and limit, not a keyset cursor. Keyset is the stabler construction and
/// it is not the one that fits here: the sort key would have to be
/// `(started_at, id)` to break ties, and the only index over `workouts` is
/// `(enrollment_id, started_at desc)`, which carries neither `athlete_id` nor
/// `id`. So keyset would buy no index advantage and would trade one form of
/// drift for an opaque cursor. The drift offset does have is real and small: a
/// workout submitted while the athlete is paging shifts rows by one, which in a
/// "load more" list read by one person is a repeated or skipped row, not a wrong
/// answer.
///
/// The honest cost of the unfiltered call is that Postgres materialises and
/// sorts one athlete's *entire* workout history per page. `workouts` has no
/// `athlete_id`, so the scope comes through a join and no index over `workouts`
/// can answer the ordering — this is a sort, and it is bounded by how many
/// sessions one person has logged. At the hundreds this is designed for that
/// costs nothing worth measuring. If it ever does, the fix is to denormalise
/// `athlete_id` onto `workouts` with an index on `(athlete_id, started_at
/// desc)`; that is an additive migration, and adding the column now — untested,
/// unmeasured, and duplicating a fact `enrollments` already owns — is exactly
/// the speculative move the schema's own comments argue against.
///
/// Supplying `enrollment_id` sidesteps all of it: that query is one walk of the
/// existing index, in order, and stops at the limit.
#[utoipa::path(
    get,
    path = "/v1/workouts",
    operation_id = "list_workouts",
    tag = "workouts",
    security(("bearer_token" = [])),
    params(HistoryFilter),
    responses(
        (status = 200, description = "A page of history, newest first", body = WorkoutHistory),
        (status = 401, description = "Missing or invalid access token", body = crate::error::ProblemDetails),
    )
)]
pub async fn history(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Query(filter): Query<HistoryFilter>,
) -> ApiResult<Json<WorkoutHistory>> {
    let limit = filter
        .limit
        .unwrap_or(DEFAULT_HISTORY_LIMIT)
        .clamp(1, MAX_HISTORY_LIMIT);
    let offset = filter.offset.unwrap_or_default();

    // Note where the ownership predicate sits: on `enrollments`, in the `where`
    // clause, in both queries. A stranger's `enrollment_id` is not refused, it
    // simply matches nothing — which is the same non-answer a 404 gives and
    // needs no separate branch to get right.
    let total: i64 = sqlx::query_scalar(
        "select count(*)
         from workouts w
         join enrollments e on e.id = w.enrollment_id
         where e.athlete_id = $1 and ($2::uuid is null or w.enrollment_id = $2)",
    )
    .bind(athlete.athlete_id)
    .bind(filter.enrollment_id)
    .fetch_one(&state.db)
    .await?;

    let rows: Vec<StoredWorkout> = sqlx::query_as(
        "select w.id, w.enrollment_id, e.program_key, w.week, w.day,
                w.started_at, w.ended_at, w.outcome, w.cut_reason
         from workouts w
         join enrollments e on e.id = w.enrollment_id
         where e.athlete_id = $1 and ($2::uuid is null or w.enrollment_id = $2)
         order by w.started_at desc, w.id desc
         limit $3 offset $4",
    )
    .bind(athlete.athlete_id)
    .bind(filter.enrollment_id)
    .bind(i64::from(limit))
    .bind(i64::from(offset))
    .fetch_all(&state.db)
    .await?;

    let workouts = rows
        .into_iter()
        .map(summary)
        .collect::<ApiResult<Vec<_>>>()?;

    Ok(Json(WorkoutHistory {
        workouts,
        total,
        limit,
        offset,
    }))
}

/// One workout and every set of it.
///
/// A separate endpoint rather than an `?include=sets` flag on the list, for the
/// interaction it serves: expand-on-tap opens one row at a time, and an include
/// flag would fetch the sets for a whole page whether or not anything was
/// expanded — around a thousand rows to render twenty-five dates, on a phone.
/// A submitted workout is also immutable, so this response can be cached hard by
/// the client where a list response cannot. And the choice is not final in the
/// direction that matters: an `include` flag can be added later if the extra
/// round trip ever hurts, whereas a field cannot be taken back out of the list
/// (D-12).
#[utoipa::path(
    get,
    path = "/v1/workouts/{id}",
    operation_id = "show_workout",
    tag = "workouts",
    security(("bearer_token" = [])),
    params(("id" = Uuid, Path, description = "The workout's id — the one the client minted")),
    responses(
        (status = 200, description = "The workout, with every set as logged", body = WorkoutDetail),
        (status = 401, description = "Missing or invalid access token", body = crate::error::ProblemDetails),
        (status = 404, description = "No such workout belongs to this athlete", body = crate::error::ProblemDetails),
    )
)]
pub async fn show(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<WorkoutDetail>> {
    // 404 for a stranger's workout, not 403 — the id is client-minted, so
    // confirming that one exists confirms that someone else logged a session.
    let row: Option<StoredWorkoutDetail> = sqlx::query_as(
        "select w.id, w.enrollment_id, e.program_key, w.week, w.day,
                w.started_at, w.ended_at, w.outcome, w.cut_reason, w.notes
         from workouts w
         join enrollments e on e.id = w.enrollment_id
         where w.id = $1 and e.athlete_id = $2",
    )
    .bind(id)
    .bind(athlete.athlete_id)
    .fetch_optional(&state.db)
    .await?;

    let Some((
        workout_id,
        enrollment_id,
        program_key,
        week,
        day,
        started_at,
        ended_at,
        outcome,
        cut_reason,
        notes,
    )) = row
    else {
        return Err(ApiError::NotFound);
    };

    // `unique (workout_id, "position")` is both the ordering and the index.
    let sets: Vec<StoredSet> = sqlx::query_as(
        "select \"position\", exercise, prescribed_weight::float8, prescribed_reps,
                actual_weight::float8, actual_reps, status, logged_at, note,
                drift_reason
         from workout_sets
         where workout_id = $1
         order by \"position\"",
    )
    .bind(workout_id)
    .fetch_all(&state.db)
    .await?;

    let sets = sets
        .into_iter()
        .map(logged_set)
        .collect::<ApiResult<Vec<_>>>()?;

    // Computed from the views rather than from the rows, so the labels the
    // breakdown names an exercise by are the same strings the set list beside it
    // shows — resolved once, in `logged_set`, from the compiled registry.
    let timed: Vec<(u16, TimedSet)> = sets
        .iter()
        .map(|set| {
            (
                set.position,
                TimedSet {
                    exercise: set.exercise.clone(),
                    label: set.label.clone(),
                    logged_at: set.logged_at,
                },
            )
        })
        .collect();
    let timing = timing::compute(started_at, ended_at, &timed);

    Ok(Json(WorkoutDetail {
        workout: summary((
            workout_id,
            enrollment_id,
            program_key,
            week,
            day,
            started_at,
            ended_at,
            outcome,
            cut_reason,
        ))?,
        notes,
        sets,
        timing,
    }))
}

/// Turns a stored row into a history row.
///
/// The program name falls back to the key when the registry does not know it,
/// where `routes::enrollments` treats the same situation as an internal error.
/// The difference is what the endpoint needs the program *for*: prescribing a
/// session or counting progress means running it, and there is nothing to return
/// without it — whereas a history row needs only a label, and a program removed
/// from the registry in some future deploy should not make the athlete's past
/// disappear.
fn summary(
    (id, enrollment_id, program_key, week, day, started_at, ended_at, outcome, cut_reason): StoredWorkout,
) -> ApiResult<WorkoutSummary> {
    let program_name = programs::find(&program_key)
        .map(|program| program.meta().name.to_owned())
        .unwrap_or_else(|| program_key.clone());

    Ok(WorkoutSummary {
        id,
        enrollment_id,
        program_key,
        program_name,
        week: u32::try_from(week).unwrap_or_default(),
        day: u32::try_from(day).unwrap_or_default(),
        started_at,
        ended_at,
        duration_seconds: ended_at.map(|end| (end - started_at).num_seconds()),
        outcome: outcome.as_deref().map(RecordedOutcome::parse).transpose()?,
        cut_reason: cut_reason.as_deref().map(CutReason::parse).transpose()?,
    })
}

fn logged_set(
    (
        position,
        exercise,
        prescribed_weight,
        prescribed_reps,
        actual_weight,
        actual_reps,
        status,
        logged_at,
        note,
        drift_reason,
    ): StoredSet,
) -> ApiResult<LoggedSetView> {
    let label = exercise::find(&exercise)
        .map(|found| found.label.to_owned())
        .unwrap_or_else(|| exercise.clone());

    Ok(LoggedSetView {
        position: u16::try_from(position).unwrap_or_default(),
        exercise,
        label,
        prescribed_weight,
        prescribed_reps: u32::try_from(prescribed_reps).unwrap_or_default(),
        actual_weight,
        actual_reps: actual_reps.map(|reps| u32::try_from(reps).unwrap_or_default()),
        status: SetStatus::parse(&status)?,
        logged_at,
        note,
        drift_reason: drift_reason
            .as_deref()
            .map(DriftReason::parse)
            .transpose()?,
    })
}

/// Where a workout id that is already taken actually sits.
///
/// Called only once an insert has conflicted, or once it is known that no insert
/// will be attempted — never speculatively, which is what would make it a race.
///
/// The `Some(_)` arm is the case worth being explicit about: the id exists, but
/// under a different enrolment, possibly another athlete's. Answering 200 there
/// would tell the client its workout landed when it did not, so it is a
/// conflict — and the detail is neutral, since the alternative is confirming
/// nothing while lying about the write.
async fn already_recorded(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    workout_id: Uuid,
    enrollment_id: Uuid,
) -> ApiResult<Option<(i16, i16)>> {
    let row: Option<(Uuid, i16, i16)> =
        sqlx::query_as("select enrollment_id, week, day from workouts where id = $1")
            .bind(workout_id)
            .fetch_optional(&mut **tx)
            .await?;

    match row {
        Some((owner, week, day)) if owner == enrollment_id => Ok(Some((week, day))),
        Some(_) => Err(ApiError::Conflict(
            "that workout id is already in use".to_owned(),
        )),
        None => Ok(None),
    }
}

/// Writes every set of the session in one statement.
///
/// One `insert ... select from unnest(...)` rather than a statement per set,
/// because this runs inside a transaction holding a row lock on the enrolment
/// and forty round trips is forty times as long to hold it.
///
/// The `::numeric` casts are not decoration: `prescribed_weight` and
/// `actual_weight` are `numeric(6,2)` and sqlx sends an `f64` as `float8`, so
/// the conversion is written where it can be seen rather than left to Postgres'
/// assignment-cast rules.
///
/// The unnest column is aliased `slot` rather than `position` for one reason:
/// `position` is a keyword with a `position(sub in str)` production of its own,
/// and while it is legal as a column alias, this is the one statement in the
/// codebase with no test that can prove it before the next session has a
/// database. The target column stays `"position"`, quoted, as the schema has it.
async fn insert_sets(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    workout_id: Uuid,
    sets: &[SubmittedSet],
) -> ApiResult<()> {
    if sets.is_empty() {
        return Ok(());
    }

    let mut exercises: Vec<String> = Vec::with_capacity(sets.len());
    let mut positions: Vec<i16> = Vec::with_capacity(sets.len());
    let mut prescribed_weights: Vec<f64> = Vec::with_capacity(sets.len());
    let mut prescribed_reps: Vec<i16> = Vec::with_capacity(sets.len());
    let mut actual_weights: Vec<Option<f64>> = Vec::with_capacity(sets.len());
    let mut actual_reps: Vec<Option<i16>> = Vec::with_capacity(sets.len());
    let mut statuses: Vec<String> = Vec::with_capacity(sets.len());
    let mut logged_ats: Vec<Option<DateTime<Utc>>> = Vec::with_capacity(sets.len());
    let mut notes: Vec<Option<String>> = Vec::with_capacity(sets.len());
    let mut drift_reasons: Vec<Option<String>> = Vec::with_capacity(sets.len());

    for set in sets {
        exercises.push(set.exercise.trim().to_owned());
        positions.push(i16::try_from(set.position).map_err(|_| {
            ApiError::Validation(format!("position {} is out of range", set.position))
        })?);
        prescribed_weights.push(set.prescribed_weight);
        prescribed_reps.push(smallint(set.prescribed_reps, "prescribed_reps")?);
        actual_weights.push(set.actual_weight);
        actual_reps.push(
            set.actual_reps
                .map(|reps| smallint(reps, "actual_reps"))
                .transpose()?,
        );
        statuses.push(set.status.as_str().to_owned());
        logged_ats.push(set.logged_at);
        // Normalised here rather than refused in `validate`: the check
        // constraint forbids a blank note, and a note the athlete typed and
        // then cleared should cost them nothing.
        notes.push(
            set.note
                .as_deref()
                .map(str::trim)
                .filter(|note| !note.is_empty())
                .map(str::to_owned),
        );
        drift_reasons.push(set.drift_reason.map(DriftReason::as_str).map(str::to_owned));
    }

    sqlx::query(
        "insert into workout_sets
             (workout_id, exercise, \"position\", prescribed_weight, prescribed_reps,
              actual_weight, actual_reps, status, logged_at, note, drift_reason)
         select $1,
                logged.exercise,
                logged.slot,
                logged.prescribed_weight::numeric,
                logged.prescribed_reps,
                logged.actual_weight::numeric,
                logged.actual_reps,
                logged.status,
                logged.logged_at,
                logged.note,
                logged.drift_reason
         from unnest($2::text[], $3::int2[], $4::float8[], $5::int2[],
                     $6::float8[], $7::int2[], $8::text[], $9::timestamptz[],
                     $10::text[], $11::text[])
              as logged(exercise, slot, prescribed_weight, prescribed_reps,
                        actual_weight, actual_reps, status, logged_at, note,
                        drift_reason)",
    )
    .bind(workout_id)
    .bind(&exercises)
    .bind(&positions)
    .bind(&prescribed_weights)
    .bind(&prescribed_reps)
    .bind(&actual_weights)
    .bind(&actual_reps)
    .bind(&statuses)
    .bind(&logged_ats)
    .bind(&notes)
    .bind(&drift_reasons)
    .execute(&mut **tx)
    .await?;

    Ok(())
}

/// Everything about a submission that can be judged without the database.
///
/// Each of these has a matching `check` constraint on the table, and that is the
/// point of doing them here: a constraint violation surfaces as a 500 with
/// "an internal error occurred", which tells a client with a queued offline
/// workout nothing at all about why it will never be accepted.
fn validate(body: &WorkoutSubmission) -> ApiResult<()> {
    if body.ended_at < body.started_at {
        return Err(ApiError::Validation(
            "a session cannot end before it started".to_owned(),
        ));
    }

    match (body.outcome, body.cut_reason) {
        (WorkoutOutcome::CutShort, None) => {
            return Err(ApiError::Validation(
                "a session that was cut short must say why".to_owned(),
            ))
        }
        (WorkoutOutcome::Completed, Some(_)) => {
            return Err(ApiError::Validation(
                "only a session that was cut short carries a reason".to_owned(),
            ))
        }
        _ => {}
    }

    if body.sets.len() > MAX_SETS {
        return Err(ApiError::PayloadTooLarge(format!(
            "a session may carry at most {MAX_SETS} sets"
        )));
    }

    if body
        .notes
        .as_deref()
        .is_some_and(|notes| notes.chars().count() > MAX_NOTES_LENGTH)
    {
        return Err(ApiError::Validation(format!(
            "notes must be at most {MAX_NOTES_LENGTH} characters"
        )));
    }

    let mut positions = BTreeSet::new();

    for set in &body.sets {
        // `workout_sets` is unique on `(workout_id, position)`, because two sets
        // claiming the same slot make the session's order arbitrary — and it is
        // an offline, retrying client that decides these numbers.
        if !positions.insert(set.position) {
            return Err(ApiError::Validation(format!(
                "two sets both claim position {}",
                set.position
            )));
        }

        if i16::try_from(set.position).is_err() {
            return Err(ApiError::Validation(format!(
                "position {} is out of range",
                set.position
            )));
        }

        if set.exercise.trim().is_empty() {
            return Err(ApiError::Validation(
                "every set names the exercise it belongs to".to_owned(),
            ));
        }

        weight(set.prescribed_weight, "prescribed_weight")?;
        if let Some(actual) = set.actual_weight {
            weight(actual, "actual_weight")?;
        }

        if set.prescribed_reps == 0 || set.prescribed_reps > MAX_REPS {
            return Err(ApiError::Validation(format!(
                "prescribed_reps must be between 1 and {MAX_REPS}"
            )));
        }

        if set.actual_reps.is_some_and(|reps| reps > MAX_REPS) {
            return Err(ApiError::Validation(format!(
                "actual_reps must be at most {MAX_REPS}"
            )));
        }

        // The converse is left permissive on purpose, matching the schema: a
        // pending set carrying a half-entered weight is odd but not a lie, and
        // refusing the submit would cost the athlete the whole session's data
        // over one field they touched.
        if matches!(set.status, SetStatus::Done)
            && (set.actual_weight.is_none() || set.actual_reps.is_none())
        {
            return Err(ApiError::Validation(format!(
                "the set at position {} is marked done but records no weight or reps",
                set.position
            )));
        }

        // Normalised before it is measured, so 500 characters of text with a
        // trailing newline is a note and not a rejection.
        if set
            .note
            .as_deref()
            .map(str::trim)
            .is_some_and(|note| note.chars().count() > NOTE_LIMIT)
        {
            return Err(ApiError::Validation(format!(
                "the note on position {} is longer than {NOTE_LIMIT} characters",
                set.position
            )));
        }

        if set.drift_reason.is_some() {
            // Compared at the same two decimal places `numeric(6,2)` stores,
            // not raw `f64` equality: a difference this predicate cannot see
            // is one the column cannot see either, and the two need to agree
            // or the check constraint refuses at insert time — a 500 the
            // client cannot recover from — instead of here at 422.
            let drifted = matches!(set.status, SetStatus::Done)
                && set.actual_weight.is_some_and(|actual| {
                    (actual * 100.0).round() != (set.prescribed_weight * 100.0).round()
                });

            if !drifted {
                return Err(ApiError::Validation(format!(
                    "set {} carries a reason for a weight that did not change",
                    set.position
                )));
            }
        }
    }

    Ok(())
}

fn weight(value: f64, field: &str) -> ApiResult<()> {
    if !value.is_finite() || !(0.0..=MAX_WEIGHT_KG).contains(&value) {
        return Err(ApiError::Validation(format!(
            "{field} must be a weight in kilograms between 0 and {MAX_WEIGHT_KG}"
        )));
    }

    Ok(())
}

/// Narrows to the `smallint` the schema uses, with the caller's field name in
/// the refusal rather than a bare overflow.
fn smallint(value: u32, field: &str) -> ApiResult<i16> {
    i16::try_from(value)
        .map_err(|_| ApiError::Validation(format!("{field} is out of range: {value}")))
}

impl WorkoutOutcome {
    fn as_str(self) -> &'static str {
        match self {
            Self::Completed => "completed",
            Self::CutShort => "cut_short",
        }
    }
}

impl CutReason {
    fn as_str(self) -> &'static str {
        match self {
            Self::OutOfTime => "out_of_time",
            Self::Pain => "pain",
            Self::Equipment => "equipment",
            Self::Enough => "enough",
        }
    }

    fn parse(stored: &str) -> ApiResult<Self> {
        match stored {
            "out_of_time" => Ok(Self::OutOfTime),
            "pain" => Ok(Self::Pain),
            "equipment" => Ok(Self::Equipment),
            "enough" => Ok(Self::Enough),
            other => Err(drifted("cut_reason", other)),
        }
    }
}

impl DriftReason {
    fn as_str(self) -> &'static str {
        match self {
            Self::TooEasy => "too_easy",
            Self::TooHeavy => "too_heavy",
            Self::AlreadyLoaded => "already_loaded",
            Self::FeltOff => "felt_off",
        }
    }

    fn parse(stored: &str) -> ApiResult<Self> {
        match stored {
            "too_easy" => Ok(Self::TooEasy),
            "too_heavy" => Ok(Self::TooHeavy),
            "already_loaded" => Ok(Self::AlreadyLoaded),
            "felt_off" => Ok(Self::FeltOff),
            other => Err(drifted("drift_reason", other)),
        }
    }
}

impl SetStatus {
    fn as_str(self) -> &'static str {
        match self {
            Self::Done => "done",
            Self::Skipped => "skipped",
            Self::Pending => "pending",
        }
    }

    fn parse(stored: &str) -> ApiResult<Self> {
        match stored {
            "done" => Ok(Self::Done),
            "skipped" => Ok(Self::Skipped),
            "pending" => Ok(Self::Pending),
            other => Err(drifted("status", other)),
        }
    }
}

impl RecordedOutcome {
    fn parse(stored: &str) -> ApiResult<Self> {
        match stored {
            "completed" => Ok(Self::Completed),
            "cut_short" => Ok(Self::CutShort),
            "auto_closed" => Ok(Self::AutoClosed),
            other => Err(drifted("outcome", other)),
        }
    }
}

/// The stored vocabulary and the Rust one have come apart.
///
/// Phase 1 chose `text` with a `check` over a Postgres enum, on the grounds that
/// D-12 makes these vocabularies grow and widening a `check` is easier than
/// `alter type`. The price of that choice is exactly this function: a value the
/// constraint admits but Rust does not is a runtime discovery, and it is ours,
/// not the caller's — so it is an internal error and the client is told nothing
/// beyond that.
fn drifted(column: &str, value: &str) -> ApiError {
    ApiError::Internal(format!(
        "a stored {column} reads {value}, which is not a value this build knows"
    ))
}

impl From<CutReason> for athletos_training::CutReason {
    fn from(reason: CutReason) -> Self {
        match reason {
            CutReason::OutOfTime => Self::OutOfTime,
            CutReason::Pain => Self::Pain,
            CutReason::Equipment => Self::Equipment,
            CutReason::Enough => Self::Enough,
        }
    }
}

impl From<SetStatus> for athletos_training::SetStatus {
    fn from(status: SetStatus) -> Self {
        match status {
            SetStatus::Done => Self::Done,
            SetStatus::Skipped => Self::Skipped,
            SetStatus::Pending => Self::Pending,
        }
    }
}

impl From<&SubmittedSet> for LoggedSet {
    fn from(set: &SubmittedSet) -> Self {
        Self {
            exercise: set.exercise.trim().to_owned(),
            position: set.position,
            prescribed_weight: set.prescribed_weight,
            prescribed_reps: set.prescribed_reps,
            actual_weight: set.actual_weight,
            actual_reps: set.actual_reps,
            status: set.status.into(),
        }
    }
}
