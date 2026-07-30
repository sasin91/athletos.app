//! Enrolling in a program, and looking at what is next (D-06, D-08).
//!
//! `create` and `next_session` are the halves of D-08's central distinction.
//! Enrolling writes; *peeking* does not. `GET /v1/enrollments/{id}/next-session`
//! runs no `insert`, no `update`, and stamps no clock — it is the "what am I
//! doing today" click, and the reference conflates it with starting the session,
//! so that `started_at` there records when the athlete first got curious and the
//! author has learned to back out of the screen to avoid inflating it. That is a
//! bug, and the workaround should not have to exist.
//!
//! Everything these handlers return is computed in Rust (D-11): the weights are
//! already rounded down to something loadable, the plate breakdown is already
//! worked out, and the prescription is already expanded into numbered sets. A
//! client that had to do any of that would be a client the next one has to
//! reimplement in another language.
//!
//! ## An unknown `program_key` is fatal here, and not everywhere
//!
//! Every handler in this module has to *run* the program — to prescribe a
//! session, or to count progress — so a stored key with no compiled program
//! leaves nothing to return, and it is answered as an internal error because it
//! means a program was deleted out from under live enrolments. The history
//! endpoints in `routes::workouts` only need the program's *name*, and there the
//! same situation falls back to the key: a deploy mistake should not make the
//! athlete's past disappear.

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use athletos_training::{
    exercise, plan, programs, Loading, Progress, Readout, Session, State as ProgramState,
    BAR_WEIGHT,
};

use crate::auth::AuthenticatedAthlete;
use crate::error::{ApiError, ApiResult};
use crate::pace::{self, PaceProjection};
use crate::routes::maxes;
use crate::state::AppState;

#[derive(Debug, Deserialize, ToSchema)]
pub struct EnrollmentRequest {
    /// A key from `GET /v1/programs`.
    #[schema(example = "wendler-531-bbb")]
    pub program_key: String,
}

/// One athlete's run of one program.
#[derive(Debug, Serialize, ToSchema)]
pub struct Enrollment {
    pub id: Uuid,
    #[schema(example = "wendler-531-bbb")]
    pub program_key: String,
    #[schema(example = "5/3/1 Boring But Big")]
    pub program_name: String,
    pub status: EnrollmentStatus,
    pub started_at: DateTime<Utc>,
    /// When the block ended, and `null` for exactly as long as `status` is
    /// `active` — the schema will not have it any other way.
    pub ended_at: Option<DateTime<Utc>>,
    pub progress: ProgressView,

    /// The numbers this enrolment is prescribing from, **read-only** (D-04).
    ///
    /// Served here rather than on `next-session` because of who asks. The
    /// question is "what is my program working from", which the maxes screen asks
    /// about *every* active program at once — on `next-session` that would be one
    /// request per enrolment, and each of them would also compute a prescription
    /// and a pace projection that nobody asked for. It would also go missing at
    /// the moment it is most interesting: `next-session` answers 409 once a block
    /// is finished, and where a training max ended up is exactly what an athlete
    /// looks at when a program ends.
    ///
    /// It costs nothing to put here. `progress` already runs the program over the
    /// state this row carries; this runs it once more over the same bytes, with
    /// no extra query.
    pub readout: Vec<ReadoutView>,
}

/// Every enrolment the athlete has ever held.
///
/// An object rather than a bare array, so a cursor or a count can be added
/// without changing the type of the response (D-12).
///
/// Deliberately unpaginated, unlike the workout history. An enrolment is created
/// by a deliberate human act — you press a button to start a program — so the
/// list is bounded by how many programs someone chooses to run, which is a
/// number in the tens over a lifetime. Workouts grow with every session and are
/// paginated for that reason.
#[derive(Debug, Serialize, ToSchema)]
pub struct EnrollmentList {
    pub enrollments: Vec<Enrollment>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum EnrollmentStatus {
    Active,
    Finished,
    Abandoned,
}

impl EnrollmentStatus {
    /// The vocabulary, in one place, so the two parsers below cannot disagree
    /// about it and neither can drift from the `check` constraint.
    const NAMES: [&'static str; 3] = ["active", "finished", "abandoned"];

    fn from_name(name: &str) -> Option<Self> {
        match name {
            "active" => Some(Self::Active),
            "finished" => Some(Self::Finished),
            "abandoned" => Some(Self::Abandoned),
            _ => None,
        }
    }

    /// Reads the vocabulary back out of the `text` column.
    ///
    /// A `check` constraint restricts the column to these three, so an unknown
    /// value means the constraint and this enum have drifted apart — our
    /// problem, and not something to explain to a client.
    fn parse(stored: &str) -> ApiResult<Self> {
        Self::from_name(stored).ok_or_else(|| {
            ApiError::Internal(format!(
                "an enrolment has status {stored}, which is not a status"
            ))
        })
    }

    /// Reads the same vocabulary out of a query string.
    ///
    /// Deliberately *not* [`Self::parse`], though it was at first and the
    /// difference is the whole point. That one answers "the database holds
    /// something impossible", which is a 500. This one answers "you asked for
    /// `?status=activ`", which is the client's typo and a 422 naming the three
    /// legal values. Sharing one function gave `?status=activ` a 500 and an
    /// opaque "an internal error occurred" — a bug that only surfaced once
    /// there was a database to run the test against.
    ///
    /// This is the running cost of `text` + `check` over a Postgres enum
    /// (chosen in the training migration for D-12 reasons): a vocabulary that
    /// is a string on both sides of the process has two parsers, and they fail
    /// differently.
    fn from_query(supplied: &str) -> ApiResult<Self> {
        Self::from_name(supplied).ok_or_else(|| {
            ApiError::Validation(format!(
                "`status` must be one of {}, not `{supplied}`",
                Self::NAMES.join(", ")
            ))
        })
    }
}

/// Which enrolments to return.
#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct EnrollmentFilter {
    /// One of `active`, `finished` or `abandoned`. Omitted returns all of them.
    ///
    /// A `String` parsed by hand rather than the `EnrollmentStatus` enum
    /// deserialized straight from the query string. Two reasons: the refusal can
    /// then name the legal values, where a deserializer rejection is a bare 400
    /// with none of the RFC 9457 shape the rest of this API answers in; and a
    /// query parameter typed as a closed vocabulary is a parameter that cannot
    /// grow, which is the one thing `/v1` may never do (D-12).
    #[param(example = "active")]
    pub status: Option<String>,
}

/// An enrolment as the `enrollments` table holds it, before the program is
/// resolved and its progress counted.
type StoredEnrollment = (
    Uuid,
    String,
    serde_json::Value,
    String,
    DateTime<Utc>,
    Option<DateTime<Utc>>,
);

/// Sessions completed, and the denominator if there is an honest one.
#[derive(Debug, Serialize, ToSchema)]
pub struct ProgressView {
    pub completed: u32,
    /// `null` for an open-ended program. A client showing a percentage needs
    /// this; one that invented a denominator would be lying (D-03).
    pub total: Option<u32>,
}

impl From<Progress> for ProgressView {
    fn from(progress: Progress) -> Self {
        Self {
            completed: progress.completed,
            total: progress.total,
        }
    }
}

/// One number a program is currently working from, and what kind of number it
/// is.
///
/// The mirror of the engine's `Readout`, with the exercise's display name added
/// the way `BlockView` adds it — a browser cannot look a key up in a Rust
/// `static`, and this list is short enough that a second round trip to label it
/// would be absurd.
///
/// There is no PUT for any of this and there must not be. A training max is the
/// governor a program applies to an athlete who over-reaches (D-01), and letting
/// them nudge it after a session that felt easy is letting them undo the
/// restraint (D-04). Visible and read-only is the whole shape of the decision:
/// the athlete may watch the number, and may not touch it.
#[derive(Debug, Serialize, ToSchema)]
pub struct ReadoutView {
    /// The exercise this number applies to, as a registry key.
    #[schema(example = "squat")]
    pub exercise: String,
    /// The exercise's display name, resolved from the compiled registry.
    #[schema(example = "Squat")]
    pub exercise_label: String,
    /// What the number *is*, in the program's own words.
    ///
    /// This is the field that stops the screen lying. "126" next to an entered
    /// max of 140 is inexplicable; "Training max 126" against "Entered 1RM 140"
    /// is the program doing its job. Only the program knows which it is — 5/3/1
    /// took 90% and has been moving it ever since, a fixed block took the number
    /// straight and froze it — so the words come from there and not from here.
    #[schema(example = "Training max")]
    pub label: String,
    /// Kilograms, unrounded. Unlike a prescribed weight this is not something to
    /// load on a bar; it is the number the loadable weights are derived from
    /// (D-04).
    #[schema(example = 126.0)]
    pub weight: f64,
}

impl From<Readout> for ReadoutView {
    fn from(readout: Readout) -> Self {
        Self {
            exercise_label: exercise::find(&readout.exercise)
                .map(|found| found.label.to_owned())
                .unwrap_or_else(|| readout.exercise.clone()),
            exercise: readout.exercise,
            label: readout.label.to_owned(),
            weight: readout.weight,
        }
    }
}

/// The session the enrolment is currently pointing at.
#[derive(Debug, Serialize, ToSchema)]
pub struct NextSession {
    pub enrollment_id: Uuid,
    pub program_key: String,
    pub week: u32,
    pub day: u32,
    /// The exercise key this session is built around, when there is one. A key
    /// rather than a title, so it is data a client can act on.
    pub focus: Option<String>,
    pub progress: ProgressView,
    /// The prescription as the athlete reads it: one entry per exercise.
    pub blocks: Vec<BlockView>,
    /// The same prescription as the athlete *logs* it: every set, expanded and
    /// numbered.
    ///
    /// Committing to a session materialises every prescribed set locally with
    /// `status: pending` (D-08), and this is that list, already built. It is
    /// here rather than left to the client because `position` is a persisted
    /// key — `workout_sets` is unique on `(workout_id, position)` — and a number
    /// that the server enforces should be a number the server issued. It also
    /// keeps the round trip symmetric: what comes back in `POST /v1/workouts` is
    /// this list with the `actual_*` fields and a status filled in.
    pub prescribed_sets: Vec<PrescribedSet>,

    /// When this session will be over, at the athlete's own pace (D-10).
    ///
    /// Added in phase 5, and served here rather than on an endpoint of its own
    /// because this is the only screen that asks the question. The peek page
    /// shows the projection and the logger caches it with the committed session,
    /// so a separate endpoint would be a second request that every caller of the
    /// first one makes — and the header would then be drawable only after both
    /// landed. It also keeps the *offline* story intact: what the phone caches at
    /// commit is one response, and the pace is in it.
    ///
    /// The cost is one more query on a read-only handler, over the same
    /// enrolments the athlete already owns. Peeking still writes nothing (D-08).
    pub pace: PaceProjection,
}

/// One exercise and everything prescribed for it in this session.
#[derive(Debug, Serialize, ToSchema)]
pub struct BlockView {
    #[schema(example = "squat")]
    pub exercise: String,
    #[schema(example = "Squat")]
    pub label: String,
    /// How to do it, from the compiled exercise registry.
    ///
    /// Resolved here rather than stored with the session, so a corrected cue
    /// reaches every session including ones already logged. The engine's `Block`
    /// deliberately carries only the key for exactly that reason; a PWA cannot
    /// call into the registry itself, so the key is resolved at read time on
    /// this side of the wire instead.
    pub cues: Vec<String>,
    /// A competition lift or a close variant, as opposed to accessory work.
    pub is_primary: bool,
    pub lifts: Vec<LiftView>,
}

/// A number of sets at one weight and rep count.
#[derive(Debug, Serialize, ToSchema)]
pub struct LiftView {
    pub sets: u32,
    pub reps: u32,
    /// When true, `reps` is a floor rather than a target — 5/3/1's "5+".
    pub amrap: bool,
    /// Kilograms, already rounded **down** to something that can actually be
    /// loaded (D-04).
    #[schema(example = 97.5)]
    pub weight: f64,
    /// Plates for **one** side of the bar, largest first, empty for anything
    /// that is not a barbell.
    ///
    /// Computed server-side and sent, never derived by the client (D-11). The
    /// athlete is standing at the rack holding a phone, and "112.5 kg" is a
    /// worse answer than "bar + 25, 20, 1.25 per side".
    #[schema(example = json!([25.0, 10.0, 2.5, 1.25]))]
    pub plates_per_side: Vec<f64>,
}

/// What comes off the bar and what goes on, to get to this set's weight
/// (D-04).
///
/// Mirrored from [`athletos_training::PlateChange`] because the training crate
/// depends on `serde`, `serde_json` and `thiserror` and nothing else (D-15),
/// so it cannot carry a `ToSchema` of its own.
#[derive(Debug, Serialize, ToSchema)]
pub struct PlateChangeView {
    /// Per side, outermost first — the order they actually come off.
    #[schema(example = json!([1.25, 2.5]))]
    pub remove: Vec<f64>,
    /// Per side, largest first — the order they go on.
    #[schema(example = json!([15.0]))]
    pub add: Vec<f64>,
    /// What this leaves on the bar, largest first. Sums to
    /// `prescribed_weight`, and is deliberately not always the greedy
    /// breakdown that `plates_per_side` carries.
    #[schema(example = json!([25.0, 15.0]))]
    pub plates_per_side: Vec<f64>,
}

impl From<athletos_training::PlateChange> for PlateChangeView {
    fn from(change: athletos_training::PlateChange) -> Self {
        Self {
            remove: change.remove,
            add: change.add,
            plates_per_side: change.plates_per_side,
        }
    }
}

/// One prescribed set, ready to be logged.
#[derive(Debug, Serialize, ToSchema)]
pub struct PrescribedSet {
    /// Order within the session, from zero. Persisted, and unique per workout.
    pub position: u16,
    pub exercise: String,
    /// The exercise's display name, resolved from the compiled registry.
    #[schema(example = "Squat")]
    pub label: String,
    pub prescribed_weight: f64,
    pub prescribed_reps: u32,
    pub amrap: bool,
    /// The same breakdown [`LiftView::plates_per_side`] carries, repeated here.
    ///
    /// Added in phase 4. The logger walks `prescribed_sets`, not `blocks`, and
    /// the athlete needs the plates on the screen they are actually looking at.
    /// Without this the client has to join the two lists — by position, which
    /// means reimplementing this module's expansion order, or by
    /// `(exercise, weight)`, which is a lookup the server can simply answer. A
    /// few duplicated floats are cheaper than either (D-11).
    #[schema(example = json!([25.0, 10.0, 2.5, 1.25]))]
    pub plates_per_side: Vec<f64>,
    /// The change from the bar as the previous set of this exercise left it
    /// (D-04).
    ///
    /// `None` for anything not loaded with plates. Additive (D-12):
    /// `plates_per_side` above is untouched and stays the canonical greedy
    /// breakdown, so `LiftView` and any client already reading it are
    /// unaffected.
    ///
    /// Chained within an exercise and **reset to an empty bar between them** —
    /// across exercises the previous stack is not on the bar being walked to,
    /// and possibly not even the same bar.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plate_change: Option<PlateChangeView>,
}

/// Starts a program for the authenticated athlete.
///
/// The engine validates: `start()` derives the whole block (or, for an adaptive
/// program, every training max) purely so that a missing max fails here, at
/// enrolment, rather than as a zero-kilo prescription on day one of week one.
/// That refusal reaches the caller as a 422 naming the exercise key — see the
/// `ProgramError` conversion in `crate::error`.
///
/// Nothing stops an athlete holding several enrolments at once, including in the
/// same program. The schema's active-enrolment index is deliberately not unique:
/// running a squat block and a bench block side by side is a product question
/// nobody has answered yet, and a constraint would answer it by accident.
#[utoipa::path(
    post,
    path = "/v1/enrollments",
    operation_id = "create_enrollment",
    tag = "enrollments",
    security(("bearer_token" = [])),
    request_body = EnrollmentRequest,
    responses(
        (status = 201, description = "Enrolled", body = Enrollment),
        (status = 401, description = "Missing or invalid access token", body = crate::error::ProblemDetails),
        (status = 404, description = "No program has that key", body = crate::error::ProblemDetails),
        (status = 422, description = "The athlete has not entered a max this program needs", body = crate::error::ProblemDetails),
    )
)]
pub async fn create(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Json(body): Json<EnrollmentRequest>,
) -> ApiResult<(StatusCode, Json<Enrollment>)> {
    let program = programs::find(&body.program_key).ok_or(ApiError::NotFound)?;

    let maxes = maxes::load(&state, athlete.athlete_id).await?;
    let initial = program.start(&maxes)?;
    let progress = program.progress(&initial)?;
    let readout = program.readout(&initial)?;

    let id = Uuid::now_v7();

    let started_at: DateTime<Utc> = sqlx::query_scalar(
        "insert into enrollments (id, athlete_id, program_key, state, status)
         values ($1, $2, $3, $4::jsonb, 'active')
         returning started_at",
    )
    .bind(id)
    .bind(athlete.athlete_id)
    .bind(program.meta().key)
    .bind(initial.as_json().clone())
    .fetch_one(&state.db)
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(Enrollment {
            id,
            program_key: program.meta().key.to_owned(),
            program_name: program.meta().name.to_owned(),
            status: EnrollmentStatus::Active,
            started_at,
            ended_at: None,
            progress: progress.into(),
            readout: readout.into_iter().map(Into::into).collect(),
        }),
    ))
}

/// Every program this athlete has run, current one first.
///
/// This is how a client that has been reloaded finds its way back: the enrolment
/// id it needs for `next-session` and for `POST /v1/workouts` is not something it
/// can derive, and a BFF cookie holding it would be a second source of truth for
/// a fact the database already knows.
///
/// Both a `status` filter and an active-first ordering, which is not
/// belt-and-braces. The filter is what a client asking "what am I running"
/// should send. The ordering is what keeps the *unfiltered* call — "programs
/// I've run", the D-13 reading — from making the client sort to find the live
/// one. A default order that answers the common question is worth more than one
/// that is merely chronological, and it costs a boolean in the `order by`.
#[utoipa::path(
    get,
    path = "/v1/enrollments",
    operation_id = "list_enrollments",
    tag = "enrollments",
    security(("bearer_token" = [])),
    params(EnrollmentFilter),
    responses(
        (status = 200, description = "The athlete's enrolments, active first", body = EnrollmentList),
        (status = 401, description = "Missing or invalid access token", body = crate::error::ProblemDetails),
        (status = 422, description = "`status` is not one of the three", body = crate::error::ProblemDetails),
    )
)]
pub async fn list(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Query(filter): Query<EnrollmentFilter>,
) -> ApiResult<Json<EnrollmentList>> {
    // Parsed here purely to refuse an unknown value up front. Left unparsed it
    // would simply match nothing, and "no enrolments" is the wrong answer to
    // "?status=activ".
    //
    // `from_query`, not `parse` — the client's typo is a 422, while the same
    // string arriving out of the database would be a 500.
    if let Some(status) = &filter.status {
        EnrollmentStatus::from_query(status)?;
    }

    // `enrollments_athlete_id_idx (athlete_id, started_at desc)` serves the
    // scan; when `status = 'active'` is supplied the partial
    // `enrollments_active_idx` serves it more tightly still. The leading
    // boolean in the `order by` costs a re-sort of a handful of rows, which is
    // the whole reason this list is allowed to be unpaginated.
    let rows: Vec<StoredEnrollment> = sqlx::query_as(
        "select id, program_key, state, status, started_at, ended_at
         from enrollments
         where athlete_id = $1 and ($2::text is null or status = $2)
         order by (status = 'active') desc, started_at desc",
    )
    .bind(athlete.athlete_id)
    .bind(filter.status.as_deref())
    .fetch_all(&state.db)
    .await?;

    let mut enrollments = Vec::with_capacity(rows.len());

    for (id, program_key, stored_state, status, started_at, ended_at) in rows {
        let program = unknown_program(&program_key)?;
        let program_state = ProgramState::from_json(stored_state);
        let progress = program.progress(&program_state)?;
        let readout = program.readout(&program_state)?;

        enrollments.push(Enrollment {
            id,
            program_name: program.meta().name.to_owned(),
            program_key,
            status: EnrollmentStatus::parse(&status)?,
            started_at,
            ended_at,
            progress: progress.into(),
            readout: readout.into_iter().map(Into::into).collect(),
        });
    }

    Ok(Json(EnrollmentList { enrollments }))
}

/// What the athlete is doing next. **Read-only** (D-08).
///
/// No row is written, no timer starts, and no state moves. `started_at` is
/// stamped on commit, which happens on the phone and arrives later as a
/// `POST /v1/workouts` — this endpoint exists precisely so that looking is free.
/// If this handler ever acquires a write, the distinction D-08 is built on has
/// been lost. It acquired a second *read* in phase 5, for the pace projection,
/// and that is the line: reads are what "free" means.
#[utoipa::path(
    get,
    path = "/v1/enrollments/{id}/next-session",
    operation_id = "next_session",
    tag = "enrollments",
    security(("bearer_token" = [])),
    params(("id" = Uuid, Path, description = "The enrolment's id")),
    responses(
        (status = 200, description = "The next session, with plate breakdowns", body = NextSession),
        (status = 401, description = "Missing or invalid access token", body = crate::error::ProblemDetails),
        (status = 404, description = "No such enrolment belongs to this athlete", body = crate::error::ProblemDetails),
        (status = 409, description = "The enrolment is over, or the block has no session left", body = crate::error::ProblemDetails),
    )
)]
pub async fn next_session(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<NextSession>> {
    // Ownership is in the `where` clause rather than in a branch below it, so
    // there is no version of this handler that reads somebody else's enrolment
    // and then decides what to do about it. A missing row and another athlete's
    // row are the same 404 for the same reason the extractor answers 401 rather
    // than 403: a 403 here would confirm that the id names a real enrolment
    // belonging to somebody.
    let row: Option<(String, serde_json::Value, String)> = sqlx::query_as(
        "select program_key, state, status from enrollments
         where id = $1 and athlete_id = $2",
    )
    .bind(id)
    .bind(athlete.athlete_id)
    .fetch_optional(&state.db)
    .await?;

    let Some((program_key, stored_state, status)) = row else {
        return Err(ApiError::NotFound);
    };

    if status != "active" {
        return Err(ApiError::Conflict(format!(
            "this enrolment is {status} and prescribes nothing further"
        )));
    }

    let program = unknown_program(&program_key)?;
    let program_state = ProgramState::from_json(stored_state);

    let session = program.session(&program_state)?;
    let progress = program.progress(&program_state)?;

    let prescribed_sets = prescribed_sets_of(&session);

    // Measured over the athlete's history, not this enrolment's: how fast
    // somebody moves between sets is a fact about them, and restricting it to
    // one program would throw away the sessions that make the sample big enough
    // on the day they start a new block — which is exactly when they most want
    // to know whether it fits in the hour (D-10).
    let pace = pace::measure(&state.db, athlete.athlete_id, prescribed_sets.len()).await?;

    Ok(Json(NextSession {
        enrollment_id: id,
        program_key,
        week: session.week,
        day: session.day,
        focus: session.focus.clone(),
        progress: progress.into(),
        blocks: blocks_of(&session),
        prescribed_sets,
        pace,
    }))
}

/// Resolves a stored `program_key` back to compiled code.
///
/// `pub(crate)` and an internal error rather than a 404: the key was written by
/// this server from the registry, so a key with no program means a program was
/// deleted out from under live enrolments, which is a deploy mistake and not
/// something the caller did.
pub(crate) fn unknown_program(key: &str) -> ApiResult<&'static dyn athletos_training::Program> {
    programs::find(key).ok_or_else(|| {
        ApiError::Internal(format!(
            "enrolment names program {key}, which is not in the registry"
        ))
    })
}

fn blocks_of(session: &Session) -> Vec<BlockView> {
    session
        .blocks
        .iter()
        .map(|block| {
            // An unresolvable key is a bug the engine's own registry test would
            // have caught, so it is not worth failing the athlete's session over:
            // the key is a serviceable label and the cues are the part that goes
            // missing.
            let known = exercise::find(&block.exercise);

            BlockView {
                exercise: block.exercise.clone(),
                label: known
                    .map(|found| found.label.to_owned())
                    .unwrap_or_else(|| block.exercise.clone()),
                cues: known
                    .map(|found| found.cues.iter().map(|cue| (*cue).to_owned()).collect())
                    .unwrap_or_default(),
                is_primary: known.is_some_and(|found| found.is_primary),
                lifts: block
                    .lifts
                    .iter()
                    .map(|lift| LiftView {
                        sets: lift.sets,
                        reps: lift.reps,
                        amrap: lift.amrap,
                        weight: lift.load.weight,
                        plates_per_side: lift.load.plates_per_side.clone(),
                    })
                    .collect(),
            }
        })
        .collect()
}

/// Expands a prescription into the numbered sets the athlete will log.
///
/// Blocks in order, lifts in order, one entry per set, positions from zero. The
/// ordering is the contract: it is what `workout_sets.position` means, and it is
/// the same walk the engine's own test fixtures make.
fn prescribed_sets_of(session: &Session) -> Vec<PrescribedSet> {
    let mut sets = Vec::new();
    let mut position = 0u16;

    // The bar starts empty for every exercise (D-04), but carries across a
    // block boundary that names the same exercise — 5/3/1 BBB prescribes its
    // main lift and its backoff sets as two separate `Block`s sharing one
    // `exercise` key, and the second is still the bar the first one left.
    let mut on_bar: Vec<f64> = Vec::new();
    let mut current_exercise: Option<&str> = None;

    for block in &session.blocks {
        let known = exercise::find(&block.exercise);
        let label = known
            .map(|found| found.label.to_owned())
            .unwrap_or_else(|| block.exercise.clone());
        // An unresolvable key is not a barbell as far as this is concerned:
        // without the registry there is no loading model, and inventing one
        // would put plate instructions on a dumbbell.
        let barbell = matches!(known.map(|found| found.loading), Some(Loading::Barbell));

        if current_exercise != Some(block.exercise.as_str()) {
            on_bar.clear();
            current_exercise = Some(block.exercise.as_str());
        }

        for lift in &block.lifts {
            for _ in 0..lift.sets {
                let plate_change = barbell.then(|| {
                    let target = (lift.load.weight - BAR_WEIGHT) / 2.0;
                    let change = plan(&on_bar, target.max(0.0));
                    on_bar = change.plates_per_side.clone();
                    PlateChangeView::from(change)
                });

                sets.push(PrescribedSet {
                    position,
                    exercise: block.exercise.clone(),
                    label: label.clone(),
                    prescribed_weight: lift.load.weight,
                    prescribed_reps: lift.reps,
                    amrap: lift.amrap,
                    plates_per_side: lift.load.plates_per_side.clone(),
                    plate_change,
                });
                position = position.saturating_add(1);
            }
        }
    }

    sets
}
