//! The OpenAPI document, derived from the handlers and DTOs themselves.
//!
//! Code-first per ADR-0014: these annotations are the spec, and the Nuxt BFF's
//! TypeScript client is generated from the JSON this produces. Adding a handler
//! without registering it here means it is absent from the generated client.

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
                            "Ed25519 (EdDSA) access token from /auth/login, verifiable \
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
        title = "PixMyDay API",
        description = "Visual scheduling and gamification for autistic users and their athletes.",
        version = env!("CARGO_PKG_VERSION"),
    ),
    paths(
        crate::routes::health::health,
        crate::routes::health::ready,
        crate::routes::invitations::accept_invitation,
        crate::routes::invitations::create_invitation,
        crate::routes::invitations::list_invitations,
        crate::routes::invitations::revoke_invitation,
        crate::routes::auth::login,
        crate::routes::auth::refresh,
        crate::routes::auth::logout,
        crate::routes::auth::me,
        crate::routes::auth::jwks,
    ),
    components(schemas(
        crate::routes::health::Health,
        crate::routes::invitations::CreateInvitationRequest,
        crate::routes::invitations::CreatedInvitation,
        crate::routes::invitations::PendingInvitation,
        crate::routes::invitations::PendingInvitationList,
        crate::routes::invitations::AcceptInvitationRequest,
        crate::routes::invitations::AcceptedInvitation,
        crate::routes::auth::LoginRequest,
        crate::routes::auth::RefreshRequest,
        crate::routes::auth::LogoutRequest,
        crate::routes::auth::TokenPair,
        crate::auth::keys::Jwks,
        crate::auth::keys::Jwk,
        crate::auth::extractor::Authenticatedathlete,
        crate::auth::extractor::TeamMembership,
        crate::auth::extractor::TeamRole,
        crate::error::ProblemDetails,
    )),
    tags(
        (name = "health", description = "Liveness and readiness probes"),
        (name = "auth", description = "athlete authentication: tokens and keys (ADR-0003)"),
        (name = "invitations", description = "Invitation-only athlete registration and Team membership (ADR-0016)")
    )
)]
pub struct ApiDoc;
