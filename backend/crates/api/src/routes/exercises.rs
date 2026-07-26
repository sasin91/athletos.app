//! The exercise catalogue, so a client can offer a lift the athlete has not
//! entered yet (D-03, D-04).
//!
//! Like `routes::programs`, this reads a compiled-in `static` and touches no
//! table, and mirrors the engine's type into a hand-written DTO for the same two
//! reasons: the training crate must not grow a `utoipa` dependency (D-15), and
//! `/v1` may never change a field's type while the engine is under no such
//! obligation (D-12).
//!
//! ## Why this had to exist
//!
//! Until now the maxes form was built from the union of every program's
//! `required_maxes`, which meant the athlete could hold a max only for a lift
//! that some compiled program happened to ask for. That is a program-shaped
//! answer to an athlete-shaped question — the set of lifts somebody tracks is
//! theirs, and a program deciding it is the same category of mistake as a
//! `{ squat, bench, deadlift }` struct would have been.
//!
//! Making maxes a genuine set therefore needs a list of what may go *in* it, and
//! there was nowhere to get one: `GET /v1/athlete/maxes` returns what the athlete
//! already has, and `GET /v1/programs` returns what programs want. Neither can
//! answer "which lifts could I add".
//!
//! ## What is deliberately not here
//!
//! Cues. They belong to a session — `BlockView` resolves them at the moment the
//! athlete is standing in front of the rack — and a picker does not cue anything.
//! Loading models are absent for the same reason: the client never rounds a
//! weight (D-04, D-11), so telling it the barbell resolution would only invite it
//! to. Both are additive if a screen ever genuinely needs them.

use axum::Json;
use serde::Serialize;
use utoipa::ToSchema;

use athletos_training::{exercise, Exercise};

use crate::auth::AuthenticatedAthlete;

/// One exercise, as a client renders it in a list.
#[derive(Debug, Serialize, ToSchema)]
pub struct ExerciseSummary {
    /// Stable key. This is what the maxes document is keyed by.
    #[schema(example = "squat")]
    pub key: String,
    #[schema(example = "Squat")]
    pub label: String,
    /// A competition lift or a close variant, as opposed to accessory work.
    ///
    /// Carried so a picker can put the lifts an athlete is likely to track a max
    /// for at the top, without a client holding its own opinion about which
    /// those are.
    pub is_primary: bool,
}

/// Every exercise the compiled-in programs know about.
///
/// An object rather than a bare array, so this can grow a cursor or a filter
/// without changing the type of the response (D-12).
#[derive(Debug, Serialize, ToSchema)]
pub struct ExerciseCatalogue {
    pub exercises: Vec<ExerciseSummary>,
}

impl From<&Exercise> for ExerciseSummary {
    fn from(exercise: &Exercise) -> Self {
        Self {
            key: exercise.key.to_owned(),
            label: exercise.label.to_owned(),
            is_primary: exercise.is_primary,
        }
    }
}

/// Every exercise a max may be entered for.
///
/// Authenticated for the same reason the program catalogue is: nothing here is
/// anybody's data, but opening an endpoint later is additive and closing one is
/// not (D-12).
#[utoipa::path(
    get,
    path = "/v1/exercises",
    operation_id = "list_exercises",
    tag = "exercises",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "The exercise registry, in registry order", body = ExerciseCatalogue),
        (status = 401, description = "Missing or invalid access token", body = crate::error::ProblemDetails),
    )
)]
pub async fn list(_athlete: AuthenticatedAthlete) -> Json<ExerciseCatalogue> {
    Json(ExerciseCatalogue {
        exercises: exercise::REGISTRY.iter().map(Into::into).collect(),
    })
}
