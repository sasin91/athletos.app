//! The axum extractor that turns a bearer token into an authenticated athlete.
//!
//! Putting this in an extractor means a handler cannot forget to authenticate:
//! either it asks for `AuthenticatedAthlete` and gets a verified one, or it
//! never runs.
//!
//! Everything here produces 401 and nothing produces 403. A missing, malformed,
//! expired or forged token means "we do not know who you are"; 403 means "we
//! know exactly who you are and you may not do this", which only a handler
//! applying an ownership rule can decide.

use axum::extract::FromRequestParts;
use axum::http::header::AUTHORIZATION;
use axum::http::request::Parts;
use axum::http::HeaderMap;
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::auth::token::verify_access_token;
use crate::error::ApiError;
use crate::state::AppState;

/// A verified athlete.
///
/// Deliberately just the id: v1 has one athlete per account and no teams
/// (D-14), so there is nothing else an authorization decision needs. Coaching
/// arrives in v2 as a coach↔athlete relation, which is a different shape from
/// the generic team roles this replaced — so there is nothing here to keep
/// warm for it either.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct AuthenticatedAthlete {
    pub athlete_id: Uuid,
}

impl FromRequestParts<AppState> for AuthenticatedAthlete {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let token = bearer_token(&parts.headers).ok_or(ApiError::Unauthenticated)?;

        let claims = verify_access_token(&state.auth.keys, &state.auth.config, token)
            .map_err(|_| ApiError::Unauthenticated)?;

        load_athlete(state, claims.sub, claims.jti).await
    }
}

/// Loads the athlete named by a verified token, in a single round-trip.
///
/// Two checks share that one query, and deliberately so — this runs on every
/// authenticated request:
///
/// 1. the athlete exists and is not soft-deleted. Their access token may
///    still be inside its lifetime; this is what stops it working.
/// 2. the token has not been revoked (`auth::denylist`). Folded in as a
///    `not exists` rather than a second query, so revocation is free on the
///    happy path.
///
/// Because the `not exists` sits in the `where` clause, a revoked token yields
/// no row — indistinguishable here from an unknown athlete, and answered the
/// same way: 401, never 403. A denylisted token means "we no longer accept this
/// credential", not "you may not do this".
async fn load_athlete(
    state: &AppState,
    athlete_id: Uuid,
    jti: Uuid,
) -> Result<AuthenticatedAthlete, ApiError> {
    let found: Option<(Uuid,)> = sqlx::query_as(
        "select c.id
         from athletes c
         where c.id = $1
           and c.deleted_at is null
           and not exists (
               select 1 from access_token_denylist d where d.jti = $2
           )",
    )
    .bind(athlete_id)
    .bind(jti)
    .fetch_optional(&state.db)
    .await?;

    if found.is_none() {
        return Err(ApiError::Unauthenticated);
    }

    Ok(AuthenticatedAthlete { athlete_id })
}

/// Extracts the credential from `Authorization: Bearer <token>`.
pub(crate) fn bearer_token(headers: &HeaderMap) -> Option<&str> {
    let value = headers.get(AUTHORIZATION)?.to_str().ok()?;
    let (scheme, token) = value.split_once(' ')?;

    // The scheme is case-insensitive per RFC 7235; the token is not.
    scheme
        .eq_ignore_ascii_case("Bearer")
        .then(|| token.trim())
        .filter(|token| !token.is_empty())
}
