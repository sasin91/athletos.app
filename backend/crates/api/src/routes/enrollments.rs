//! Enrolling in a program, and looking at what is next (D-06, D-08).
//!
//! The two handlers here are the halves of D-08's central distinction. Enrolling
//! writes; *peeking* does not. `GET /v1/enrollments/{id}/next-session` runs no
//! `insert`, no `update`, and stamps no clock — it is the "what am I doing
//! today" click, and the reference conflates it with starting the session, so
//! that `started_at` there records when the athlete first got curious and the
//! author has learned to back out of the screen to avoid inflating it. That is a
//! bug, and the workaround should not have to exist.
//!
//! Everything either handler returns is computed in Rust (D-11): the weights are
//! already rounded down to something loadable, the plate breakdown is already
//! worked out, and the prescription is already expanded into numbered sets. A
//! client that had to do any of that would be a client the next one has to
//! reimplement in another language.

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use athletos_training::{exercise, programs, Progress, Session, State as ProgramState};

use crate::auth::AuthenticatedAthlete;
use crate::error::{ApiError, ApiResult};
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
    pub progress: ProgressView,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum EnrollmentStatus {
    Active,
    Finished,
    Abandoned,
}

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

/// One prescribed set, ready to be logged.
#[derive(Debug, Serialize, ToSchema)]
pub struct PrescribedSet {
    /// Order within the session, from zero. Persisted, and unique per workout.
    pub position: u16,
    pub exercise: String,
    pub prescribed_weight: f64,
    pub prescribed_reps: u32,
    pub amrap: bool,
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
            progress: progress.into(),
        }),
    ))
}

/// What the athlete is doing next. **Read-only** (D-08).
///
/// No row is written, no timer starts, and no state moves. `started_at` is
/// stamped on commit, which happens on the phone and arrives later as a
/// `POST /v1/workouts` — this endpoint exists precisely so that looking is free.
/// If this handler ever acquires a write, the distinction D-08 is built on has
/// been lost.
#[utoipa::path(
    get,
    path = "/v1/enrollments/{id}/next-session",
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

    Ok(Json(NextSession {
        enrollment_id: id,
        program_key,
        week: session.week,
        day: session.day,
        focus: session.focus.clone(),
        progress: progress.into(),
        blocks: blocks_of(&session),
        prescribed_sets: prescribed_sets_of(&session),
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

    for block in &session.blocks {
        for lift in &block.lifts {
            for _ in 0..lift.sets {
                sets.push(PrescribedSet {
                    position,
                    exercise: block.exercise.clone(),
                    prescribed_weight: lift.load.weight,
                    prescribed_reps: lift.reps,
                    amrap: lift.amrap,
                });
                position = position.saturating_add(1);
            }
        }
    }

    sets
}
