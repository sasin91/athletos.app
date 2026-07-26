//! AthletOS API — the source of truth for all business logic and authorization
//! (ADR-0002, D-11).
//!
//! Exposed as a library so tests can drive the real router in-process with
//! `axum-test` rather than over a socket (ADR-0015).

pub mod auth;
pub mod config;
pub mod error;
pub mod openapi;
pub mod pace;
pub mod routes;
pub mod state;

use axum::routing::{get, post};
use axum::Router;
use sqlx::PgPool;
use tower_http::trace::TraceLayer;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::openapi::ApiDoc;
use crate::state::AppState;

/// Applies all pending migrations. Called at startup and by each test database.
pub async fn migrate(db: &PgPool) -> Result<(), sqlx::migrate::MigrateError> {
    sqlx::migrate!("./migrations").run(db).await
}

/// Builds the router. Takes state rather than a pool so tests can substitute
/// their own dependencies as the state grows.
pub fn app(state: AppState) -> Router {
    Router::new()
        // Probes stay unversioned: they are read by orchestrators, not clients,
        // and an orchestrator must not have to follow an API version bump.
        .route("/health", get(routes::health::health))
        .route("/health/ready", get(routes::health::ready))
        // Everything a client calls lives under `/v1` from the first commit
        // (D-12) — retrofitting the prefix later means touching every client.
        .route("/v1/auth/register", post(routes::auth::register))
        .route("/v1/auth/login", post(routes::auth::login))
        .route("/v1/auth/refresh", post(routes::auth::refresh))
        .route("/v1/auth/logout", post(routes::auth::logout))
        .route("/v1/auth/me", get(routes::auth::me))
        // The catalogue is a `static`, not a table (D-03).
        .route("/v1/programs", get(routes::programs::list))
        .route("/v1/programs/{key}", get(routes::programs::detail))
        // The same `static`, and the reason the maxes form can offer a lift no
        // compiled program asks for (D-04).
        .route("/v1/exercises", get(routes::exercises::list))
        .route(
            "/v1/athlete/maxes",
            get(routes::maxes::show).put(routes::maxes::replace),
        )
        .route(
            "/v1/enrollments",
            post(routes::enrollments::create).get(routes::enrollments::list),
        )
        // Read-only, and it must stay that way: peeking at the session is not
        // committing to it, and only committing starts the clock (D-08).
        .route(
            "/v1/enrollments/{id}/next-session",
            get(routes::enrollments::next_session),
        )
        // Idempotent on a client-minted id (D-09); the history the same rows
        // read back (D-13).
        .route(
            "/v1/workouts",
            post(routes::workouts::submit).get(routes::workouts::history),
        )
        .route("/v1/workouts/{id}", get(routes::workouts::show))
        // Served at the RFC 8615 well-known location so any future verifier can
        // discover it without configuration. Deliberately *not* under `/v1`:
        // the path is fixed by the RFC, not by us.
        .route("/.well-known/jwks.json", get(routes::auth::jwks))
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
