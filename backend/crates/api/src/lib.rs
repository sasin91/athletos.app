//! PixMyDay API — the source of truth for all business logic and authorization
//! (ADR-0002).
//!
//! Exposed as a library so tests can drive the real router in-process with
//! `axum-test` rather than over a socket (ADR-0015).

pub mod auth;
pub mod bootstrap;
pub mod config;
pub mod error;
pub mod images;
pub mod mail;
pub mod openapi;
pub mod points;
pub mod routes;
pub mod schedule;
pub mod state;
pub mod storage;

use axum::extract::DefaultBodyLimit;
use axum::routing::{get, post, put};
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
        .route("/health", get(routes::health::health))
        .route("/health/ready", get(routes::health::ready))
        // No `/auth/register`: registration is invitation-only (ADR-0016). An
        // account is created by accepting an invitation, or — once, for the
        // first athlete — by the `bootstrap` binary, which deliberately has
        // no route here at all.
        .route(
            "/auth/invitations/accept",
            post(routes::invitations::accept_invitation),
        )
        .route("/auth/login", post(routes::auth::login))
        .route("/auth/refresh", post(routes::auth::refresh))
        .route("/auth/logout", post(routes::auth::logout))
        .route("/auth/me", get(routes::auth::me))
        // Served at the RFC 8615 well-known location so any future verifier can
        // discover it without configuration.
        .route("/.well-known/jwks.json", get(routes::auth::jwks))
        // Team membership by invitation (ADR-0016). Owner-only, and hanging off
        // the Team because that is the thing an invitation grants access to.
        .route(
            "/teams/{team_id}/invitations",
            post(routes::invitations::create_invitation).get(routes::invitations::list_invitations),
        )
        .route(
            "/teams/{team_id}/invitations/{invitation_id}",
            axum::routing::delete(routes::invitations::revoke_invitation),
        )
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
