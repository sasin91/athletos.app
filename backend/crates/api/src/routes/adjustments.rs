//! Per-enrolment changes to generated exercise loads.
//!
//! The rows here alter previews, not program state. A client commits to the
//! concrete prescription returned by `next-session`, and workout submission
//! persists that body unchanged even if this document changes while the client
//! is offline.

use std::collections::BTreeMap;

use athletos_training::{exercise, AdjustmentPercent, Loading};
use axum::extract::{Path, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::auth::AuthenticatedAthlete;
use crate::error::{ApiError, ApiResult};
use crate::routes::programs::resolve_stored_program;
use crate::state::AppState;

type EngineAdjustments = BTreeMap<String, AdjustmentPercent>;

/// The complete adjustment document supplied by a client.
#[derive(Debug, Deserialize, ToSchema)]
pub struct ReplaceExerciseAdjustments {
    /// Integer percentages keyed by exercise. Zero removes an adjustment.
    #[schema(example = json!({ "squat": -5, "bench": 10 }))]
    pub adjustments: BTreeMap<String, i16>,
}

/// The canonical non-zero adjustments stored for one enrolment.
#[derive(Debug, Serialize, ToSchema)]
pub struct ExerciseAdjustments {
    pub enrollment_id: Uuid,
    #[schema(example = json!({ "squat": -5, "bench": 10 }))]
    pub adjustments: BTreeMap<String, i16>,
}

/// Reads adjustments for an enrolment owned by the authenticated athlete.
/// Closed enrolments remain readable so their settings do not disappear from
/// history and settings screens merely because the block ended.
#[utoipa::path(
    get,
    path = "/v1/enrollments/{id}/exercise-adjustments",
    operation_id = "show_exercise_adjustments",
    tag = "enrollments",
    security(("bearer_token" = [])),
    params(("id" = Uuid, Path, description = "The enrolment's id")),
    responses(
        (status = 200, description = "The enrolment's exercise adjustments", body = ExerciseAdjustments),
        (status = 401, description = "Missing or invalid access token", body = crate::error::ProblemDetails),
        (status = 404, description = "No such enrolment belongs to this athlete", body = crate::error::ProblemDetails),
    )
)]
pub async fn show(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<ExerciseAdjustments>> {
    let owned: bool = sqlx::query_scalar(
        "select exists(
             select 1 from enrollments where id = $1 and athlete_id = $2
         )",
    )
    .bind(id)
    .bind(athlete.athlete_id)
    .fetch_one(&state.db)
    .await?;

    if !owned {
        return Err(ApiError::NotFound);
    }

    let adjustments = load(&state.db, id).await?;
    Ok(Json(ExerciseAdjustments {
        enrollment_id: id,
        adjustments: wire_adjustments(&adjustments),
    }))
}

/// Replaces every adjustment for one active enrolment.
///
/// The request first lands as generic JSON so a fractional number can be
/// translated into this API's RFC 9457 422 response. Extracting the DTO
/// directly would let Axum own that rejection instead of `ApiError`.
#[utoipa::path(
    put,
    path = "/v1/enrollments/{id}/exercise-adjustments",
    operation_id = "replace_exercise_adjustments",
    tag = "enrollments",
    security(("bearer_token" = [])),
    params(("id" = Uuid, Path, description = "The enrolment's id")),
    request_body = ReplaceExerciseAdjustments,
    responses(
        (status = 200, description = "The adjustments as now stored", body = ExerciseAdjustments),
        (status = 401, description = "Missing or invalid access token", body = crate::error::ProblemDetails),
        (status = 404, description = "No such enrolment belongs to this athlete", body = crate::error::ProblemDetails),
        (status = 409, description = "The enrolment is closed", body = crate::error::ProblemDetails),
        (status = 422, description = "An exercise or percentage is not adjustable", body = crate::error::ProblemDetails),
    )
)]
pub async fn replace(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Path(id): Path<Uuid>,
    Json(raw): Json<serde_json::Value>,
) -> ApiResult<Json<ExerciseAdjustments>> {
    let body: ReplaceExerciseAdjustments = serde_json::from_value(raw).map_err(|error| {
        ApiError::Validation(format!(
            "exercise adjustments must be integer percentages: {error}"
        ))
    })?;

    let mut tx = state.db.begin().await?;

    // This is the same first lock as workout submission: the enrolment row,
    // filtered by both its id and owner. Two writes against one enrolment can
    // therefore never acquire shared resources in opposite orders.
    let row: Option<(String, String)> = sqlx::query_as(
        "select program_key, status from enrollments
         where id = $1 and athlete_id = $2
         for update",
    )
    .bind(id)
    .bind(athlete.athlete_id)
    .fetch_optional(&mut *tx)
    .await?;

    let Some((program_key, status)) = row else {
        return Err(ApiError::NotFound);
    };

    if status != "active" {
        return Err(ApiError::Conflict(format!(
            "this enrolment is {status} and its adjustments cannot be changed"
        )));
    }

    let program = resolve_stored_program(&program_key)?;
    let allowed = program.meta().weighted_exercises;
    let normalized = validate_and_normalize(&body.adjustments, allowed)?;
    let exercises: Vec<String> = normalized.keys().cloned().collect();
    let percentages: Vec<i16> = normalized.values().map(|percent| percent.get()).collect();

    // All parsing and domain validation is complete before either write. A
    // mixed body therefore cannot clear valid old rows and fail halfway through.
    sqlx::query(
        "delete from enrollment_exercise_adjustments
         where enrollment_id = $1 and exercise <> all($2::text[])",
    )
    .bind(id)
    .bind(&exercises)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        "insert into enrollment_exercise_adjustments
             (enrollment_id, exercise, adjustment_percent)
         select $1, entry.exercise, entry.adjustment_percent
         from unnest($2::text[], $3::int2[])
              as entry(exercise, adjustment_percent)
         on conflict (enrollment_id, exercise)
         do update set adjustment_percent = excluded.adjustment_percent",
    )
    .bind(id)
    .bind(&exercises)
    .bind(&percentages)
    .execute(&mut *tx)
    .await?;

    let rows: Vec<(String, i16)> = sqlx::query_as(
        "select exercise, adjustment_percent
         from enrollment_exercise_adjustments
         where enrollment_id = $1
         order by exercise",
    )
    .bind(id)
    .fetch_all(&mut *tx)
    .await?;
    let adjustments = decode_rows(rows)?;

    tx.commit().await?;

    Ok(Json(ExerciseAdjustments {
        enrollment_id: id,
        adjustments: wire_adjustments(&adjustments),
    }))
}

fn validate_and_normalize(
    adjustments: &BTreeMap<String, i16>,
    allowed: &[&str],
) -> ApiResult<EngineAdjustments> {
    let mut normalized = BTreeMap::new();

    for (key, percent) in adjustments {
        let known = exercise::find(key).ok_or_else(|| {
            ApiError::Validation(format!("{key} is not an exercise this API knows"))
        })?;

        if matches!(known.loading, Loading::Bodyweight) {
            return Err(ApiError::Validation(format!(
                "{key} is bodyweight-only and has no load to adjust"
            )));
        }

        if !allowed.contains(&key.as_str()) {
            return Err(ApiError::Validation(format!(
                "{key} is not a weighted exercise in this program"
            )));
        }

        if *percent == 0 {
            continue;
        }

        let percent = AdjustmentPercent::try_from(*percent).map_err(|_| {
            ApiError::Validation(format!(
                "the adjustment for {key} must be between -50 and 50 percent"
            ))
        })?;
        normalized.insert(key.clone(), percent);
    }

    Ok(normalized)
}

pub(crate) async fn load(pool: &PgPool, enrollment_id: Uuid) -> ApiResult<EngineAdjustments> {
    let rows: Vec<(String, i16)> = sqlx::query_as(
        "select exercise, adjustment_percent
         from enrollment_exercise_adjustments
         where enrollment_id = $1
         order by exercise",
    )
    .bind(enrollment_id)
    .fetch_all(pool)
    .await?;

    decode_rows(rows)
}

fn decode_rows(rows: Vec<(String, i16)>) -> ApiResult<EngineAdjustments> {
    rows.into_iter()
        .map(
            |(exercise, value)| match AdjustmentPercent::try_from(value) {
                Ok(percent) => Ok((exercise, percent)),
                Err(_) => Err(ApiError::Internal(format!(
                    "stored adjustment {value} for {exercise} is outside the engine domain"
                ))),
            },
        )
        .collect()
}

fn wire_adjustments(adjustments: &EngineAdjustments) -> BTreeMap<String, i16> {
    adjustments
        .iter()
        .map(|(exercise, percent)| (exercise.clone(), percent.get()))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_values_cross_into_the_bounded_engine_domain() {
        let allowed = ["squat"];

        for value in [-51, 51] {
            let request = BTreeMap::from([("squat".to_owned(), value)]);
            assert!(matches!(
                validate_and_normalize(&request, &allowed),
                Err(ApiError::Validation(_))
            ));
        }

        let absent = validate_and_normalize(&BTreeMap::from([("squat".to_owned(), 0)]), &allowed)
            .expect("zero means no adjustment");
        assert!(absent.is_empty());

        for value in [-50, 50] {
            let normalized =
                validate_and_normalize(&BTreeMap::from([("squat".to_owned(), value)]), &allowed)
                    .expect("hard endpoint is valid");
            assert_eq!(normalized["squat"].get(), value);
        }
    }

    #[test]
    fn an_invalid_stored_percentage_is_an_internal_error() {
        assert!(matches!(
            decode_rows(vec![("squat".to_owned(), 0)]),
            Err(ApiError::Internal(_))
        ));
    }
}
