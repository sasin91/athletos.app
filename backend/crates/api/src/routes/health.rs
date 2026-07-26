//! Liveness and readiness probes.

use axum::extract::State;
use axum::Json;
use serde::Serialize;
use utoipa::ToSchema;

use crate::error::ApiResult;
use crate::state::AppState;

#[derive(Debug, Serialize, ToSchema)]
pub struct Health {
    #[schema(example = "ok")]
    pub status: &'static str,
    #[schema(example = "athletos-api")]
    pub service: &'static str,
}

/// Liveness probe — answers as long as the process is serving requests.
#[utoipa::path(
    get,
    path = "/health",
    tag = "health",
    responses((status = 200, description = "The process is alive", body = Health))
)]
pub async fn health() -> Json<Health> {
    Json(Health {
        status: "ok",
        service: "athletos-api",
    })
}

/// Readiness probe — additionally verifies the database is reachable, so an
/// orchestrator does not route traffic to an instance that cannot serve it.
#[utoipa::path(
    get,
    path = "/health/ready",
    tag = "health",
    responses(
        (status = 200, description = "Dependencies are reachable", body = Health),
        (status = 500, description = "A dependency is unreachable", body = crate::error::ProblemDetails),
    )
)]
pub async fn ready(State(state): State<AppState>) -> ApiResult<Json<Health>> {
    sqlx::query("select 1").execute(&state.db).await?;

    Ok(Json(Health {
        status: "ready",
        service: "athletos-api",
    }))
}
