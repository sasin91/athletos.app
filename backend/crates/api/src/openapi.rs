//! The OpenAPI document, derived from the handlers and DTOs themselves.
//!
//! Code-first per ADR-0014: these annotations are the spec, and the SvelteKit
//! BFF's TypeScript client is generated from the JSON this produces (D-11).
//! Adding a handler without registering it here means it is absent from the
//! generated client.

use utoipa::openapi::security::{Http, HttpAuthScheme, SecurityScheme};
use utoipa::{Modify, OpenApi};

/// Declares the bearer scheme once, so handlers only have to name it.
struct BearerToken;

impl Modify for BearerToken {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "bearer_token",
                SecurityScheme::Http(
                    Http::builder()
                        .scheme(HttpAuthScheme::Bearer)
                        .bearer_format("JWT")
                        .description(Some(
                            "Ed25519 (EdDSA) access token from /v1/auth/login, verifiable \
                             against /.well-known/jwks.json",
                        ))
                        .build(),
                ),
            );
        }
    }
}

#[derive(OpenApi)]
#[openapi(
    modifiers(&BearerToken),
    info(
        title = "AthletOS API",
        description = "A governor for athletes who already train.",
        version = env!("CARGO_PKG_VERSION"),
    ),
    paths(
        crate::routes::health::health,
        crate::routes::health::ready,
        crate::routes::auth::register,
        crate::routes::auth::login,
        crate::routes::auth::refresh,
        crate::routes::auth::logout,
        crate::routes::auth::me,
        crate::routes::auth::jwks,
        crate::routes::programs::list,
        crate::routes::programs::detail,
        crate::routes::maxes::show,
        crate::routes::maxes::replace,
        crate::routes::enrollments::create,
        crate::routes::enrollments::list,
        crate::routes::enrollments::next_session,
        crate::routes::workouts::submit,
        crate::routes::workouts::history,
        crate::routes::workouts::show,
    ),
    components(schemas(
        crate::routes::health::Health,
        crate::routes::auth::RegisterRequest,
        crate::routes::auth::LoginRequest,
        crate::routes::auth::RefreshRequest,
        crate::routes::auth::LogoutRequest,
        crate::routes::auth::TokenPair,
        crate::auth::keys::Jwks,
        crate::auth::keys::Jwk,
        crate::auth::extractor::AuthenticatedAthlete,
        crate::error::ProblemDetails,
        crate::routes::programs::ProgramCatalogue,
        crate::routes::programs::ProgramSummary,
        crate::routes::programs::ProgramEquipment,
        crate::routes::programs::ProgramExperience,
        crate::routes::programs::ProgramLength,
        crate::routes::programs::ProgramRecoveryDemand,
        crate::routes::maxes::MaxesDocument,
        crate::routes::enrollments::EnrollmentRequest,
        crate::routes::enrollments::Enrollment,
        crate::routes::enrollments::EnrollmentList,
        crate::routes::enrollments::EnrollmentStatus,
        crate::routes::enrollments::ProgressView,
        crate::routes::enrollments::NextSession,
        crate::routes::enrollments::BlockView,
        crate::routes::enrollments::LiftView,
        crate::routes::enrollments::PrescribedSet,
        crate::routes::workouts::WorkoutSubmission,
        crate::routes::workouts::WorkoutOutcome,
        crate::routes::workouts::CutReason,
        crate::routes::workouts::SetStatus,
        crate::routes::workouts::SubmittedSet,
        crate::routes::workouts::WorkoutReceipt,
        crate::routes::workouts::RecordedOutcome,
        crate::routes::workouts::WorkoutSummary,
        crate::routes::workouts::WorkoutHistory,
        crate::routes::workouts::WorkoutDetail,
        crate::routes::workouts::LoggedSetView,
    )),
    tags(
        (name = "health", description = "Liveness and readiness probes"),
        (name = "auth", description = "Athlete authentication: tokens and keys (ADR-0003)"),
        (name = "programs", description = "The compiled-in program catalogue (D-03, D-05)"),
        (name = "athlete", description = "The athlete's own numbers (D-04)"),
        (name = "enrollments", description = "Running a program, and peeking at what is next (D-08)"),
        (name = "workouts", description = "Submitting a logged session, idempotently (D-09)"),
    )
)]
pub struct ApiDoc;
