//! Authentication endpoints (ADR-0003).
//!
//! The Nuxt BFF keeps the refresh token in an httpOnly cookie and attaches the
//! access token when it calls this API (ADR-0002); a mobile app does the same
//! directly. Neither cookie handling nor CSRF lives here — this API speaks
//! bearer tokens only, which is what keeps the two clients symmetric.

use axum::extract::State;
use axum::http::header::USER_AGENT;
use axum::http::{HeaderMap, StatusCode};
use axum::Json;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::auth::audit::{self, AuthAction};
use crate::auth::extractor::bearer_token;
use crate::auth::keys::Jwks;
use crate::auth::password::{hash_password, verify_password};
use crate::auth::refresh::{self, DeviceContext};
use crate::auth::token::{issue_access_token, verify_access_token};
use crate::auth::{denylist, throttle, Authenticatedathlete};
use crate::error::{ApiError, ApiResult};
use crate::state::AppState;

/// The longest address this API accepts anywhere, from the RFC 5321 §4.5.3.1.3
/// forward-path limit of 256 octets minus the enclosing angle brackets.
pub(crate) const MAX_EMAIL_LENGTH: usize = 254;

pub(crate) const MAX_DISPLAY_NAME_LENGTH: usize = 128;

#[derive(Debug, Deserialize, ToSchema)]
pub struct LoginRequest {
    #[schema(example = "athlete@example.com")]
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct RefreshRequest {
    /// The opaque refresh token most recently issued to this client.
    pub refresh_token: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct LogoutRequest {
    /// The refresh token to kill, ending the session on this device. Optional
    /// so a client that only holds an access token can still revoke it.
    pub refresh_token: Option<String>,
}

/// A new pair of credentials. The refresh token is single-use: the next call to
/// `/auth/refresh` invalidates it and returns its successor.
#[derive(Debug, Serialize, ToSchema)]
pub struct TokenPair {
    /// Ed25519-signed JWT. Verifiable against `/.well-known/jwks.json`.
    pub access_token: String,
    #[schema(example = "Bearer")]
    pub token_type: &'static str,
    /// Access token lifetime in seconds.
    #[schema(example = 900)]
    pub expires_in: i64,
    /// Opaque refresh token — not a JWT, and revocable.
    pub refresh_token: String,
    /// When the refresh token stops working, RFC 3339.
    pub refresh_token_expires_at: chrono::DateTime<chrono::Utc>,
}

// There is deliberately no `POST /auth/register` (ADR-0016). Registration is
// invitation-only: an account comes from `POST /auth/invitations/accept`
// (`routes::invitations`) or from the one-shot `bootstrap` binary, and nothing
// else. The endpoint that used to live here answered 409 for an address that
// already had an account, which made it a free account-enumeration oracle over
// a population defined by supporting an autistic person — see
// `docs/dpia-inputs.md`. The accept endpoint that replaced it takes no email
// address at all: the address comes from the invitation row, so there is
// nothing for a caller to probe with.

/// Exchanges a athlete's email and password for a token pair.
#[utoipa::path(
    post,
    path = "/auth/login",
    tag = "auth",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Credentials accepted", body = TokenPair),
        (status = 401, description = "Unknown address or wrong password", body = crate::error::ProblemDetails),
        (status = 429, description = "Too many consecutive failures for this address; `Retry-After` says how long to wait (ADR-0017)", body = crate::error::ProblemDetails),
    )
)]
pub async fn login(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<LoginRequest>,
) -> ApiResult<Json<TokenPair>> {
    let device = device_context(&headers);

    // Before anything else — before the row lookup, and long before an Argon2
    // is spent. Keyed on the submitted address whether or not it has an
    // account, so the refusal reveals nothing (`auth::throttle`, ADR-0017).
    throttle::check(&state.db, &body.email).await?;

    let athlete: Option<(Uuid, String)> = sqlx::query_as(
        "select id, password_hash from athletes
         where lower(email) = lower($1) and deleted_at is null",
    )
    .bind(body.email.trim())
    .fetch_optional(&state.db)
    .await?;

    let Some((athlete_id, password_hash)) = athlete else {
        // Hash anyway. Returning early would make an unknown address measurably
        // faster to reject than a wrong password, which is a free account
        // enumeration oracle.
        let _ = hash_password(body.password).await;
        throttle::record_failure(&state.db, &body.email).await?;
        audit::record(&state.db, AuthAction::LoginFailed, None, &device).await;
        return Err(ApiError::Unauthenticated);
    };

    if !verify_password(body.password, password_hash).await? {
        throttle::record_failure(&state.db, &body.email).await?;
        audit::record(
            &state.db,
            AuthAction::LoginFailed,
            Some(athlete_id),
            &device,
        )
        .await;
        return Err(ApiError::Unauthenticated);
    }

    // The run of failures ends the moment the verifier says yes.
    throttle::record_success(&state.db, &body.email).await?;

    let issued =
        refresh::issue_new_family(&state.db, &state.auth.config, athlete_id, &device).await?;

    sqlx::query("update athletes set last_active_at = now() where id = $1")
        .bind(athlete_id)
        .execute(&state.db)
        .await?;

    audit::record(
        &state.db,
        AuthAction::LoginSucceeded,
        Some(athlete_id),
        &device,
    )
    .await;

    Ok(Json(token_pair(&state, athlete_id, issued)?))
}

/// Exchanges a refresh token for a new pair, invalidating the one presented.
///
/// Presenting a token that was already exchanged revokes every token in its
/// family — see `auth::refresh` for why.
#[utoipa::path(
    post,
    path = "/auth/refresh",
    tag = "auth",
    request_body = RefreshRequest,
    responses(
        (status = 200, description = "A new token pair", body = TokenPair),
        (status = 401, description = "The refresh token is unknown, spent, expired or revoked", body = crate::error::ProblemDetails),
    )
)]
pub async fn refresh(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<RefreshRequest>,
) -> ApiResult<Json<TokenPair>> {
    let device = device_context(&headers);

    let rotated =
        refresh::rotate(&state.db, &state.auth.config, &body.refresh_token, &device).await?;

    Ok(Json(token_pair(
        &state,
        rotated.athlete_id,
        rotated.issued,
    )?))
}

/// Ends the session the refresh token belongs to, and revokes the access token
/// presented alongside it.
///
/// Both credentials are revoked because revoking only the refresh token leaves
/// the caller holding a bearer token that keeps working for up to its full
/// lifetime after they pressed "sign out". The access token's `jti` goes on the
/// denylist (`auth::denylist`), which the authenticated extractor already
/// consults as part of the query it was making anyway.
///
/// Both are optional, and the sensible behaviours differ:
///
/// * refresh token only — the ordinary BFF logout. The session dies; any access
///   token already handed out lives until its `exp`, because nothing links an
///   access token to a refresh family and inventing that link would mean
///   storing every access token, which is precisely what ADR-0003 avoids. The
///   15-minute ceiling is the residual exposure, and it is why the access token
///   should be sent too.
/// * access token only — a client that never held a refresh token, or lost it.
///   The token presented is revoked immediately.
///
/// Idempotent, and it still never reveals whether either credential existed: an
/// attacker holding a stolen token must not learn anything by logging it out.
/// A request carrying neither credential is a malformed request, not a silent
/// success, and is the one case that is refused.
#[utoipa::path(
    post,
    path = "/auth/logout",
    tag = "auth",
    security(("bearer_token" = [])),
    request_body = LogoutRequest,
    responses(
        (status = 204, description = "The session is ended"),
        (status = 422, description = "Neither a refresh token nor an access token was presented", body = crate::error::ProblemDetails),
    )
)]
pub async fn logout(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<LogoutRequest>,
) -> ApiResult<StatusCode> {
    let device = device_context(&headers);

    // Verified, not merely decoded: an unsigned or expired token names a `jti`
    // we have no reason to trust, and denylisting attacker-chosen ids would let
    // anyone fill the table for free.
    let access_claims = bearer_token(&headers)
        .and_then(|token| verify_access_token(&state.auth.keys, &state.auth.config, token).ok());

    if access_claims.is_none() && body.refresh_token.is_none() {
        return Err(ApiError::Validation(
            "logout requires a refresh token, an access token, or both".to_owned(),
        ));
    }

    let revoked_family_for = match body.refresh_token.as_deref() {
        Some(secret) => refresh::revoke_family_of(&state.db, secret).await?,
        None => None,
    };

    if let Some(claims) = &access_claims {
        // The caller demonstrably holds this token, so they are entitled to
        // revoke it — no check against the refresh token's owner is needed, and
        // requiring the two to agree would only break the access-token-only
        // case above.
        denylist::revoke(
            &state.db,
            claims.jti,
            claims.sub,
            DateTime::from_timestamp(claims.exp, 0).unwrap_or_else(Utc::now),
            "logout",
        )
        .await?;
    }

    if let Some(athlete_id) = revoked_family_for.or(access_claims.map(|claims| claims.sub)) {
        audit::record(
            &state.db,
            AuthAction::LoggedOut,
            Some(athlete_id),
            &device,
        )
        .await;
    }

    Ok(StatusCode::NO_CONTENT)
}

/// The athlete the presented access token identifies, with their Team
/// memberships. Also the smallest possible proof that the extractor works.
#[utoipa::path(
    get,
    path = "/auth/me",
    tag = "auth",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "The authenticated athlete", body = Authenticatedathlete),
        (status = 401, description = "Missing or invalid access token", body = crate::error::ProblemDetails),
    )
)]
pub async fn me(athlete: Authenticatedathlete) -> Json<Authenticatedathlete> {
    Json(athlete)
}

/// The public keys access tokens are signed with.
///
/// Public and unauthenticated by definition: it carries only public keys, and a
/// verifier needs it before it holds any credential to authenticate with.
#[utoipa::path(
    get,
    path = "/.well-known/jwks.json",
    tag = "auth",
    responses((status = 200, description = "The active JSON Web Key Set", body = Jwks))
)]
pub async fn jwks(State(state): State<AppState>) -> Json<Jwks> {
    Json(state.auth.keys.jwks())
}

/// Checks an address is plausible and returns it trimmed.
///
/// Deliberately shallow. RFC 5322 addresses admit comments, quoted local parts
/// and folding whitespace, and a validator that tries to honour all of it
/// rejects real addresses far more often than it catches typos. The only test
/// that establishes an address is real is delivering mail to it, so this checks
/// the shape the rest of the system relies on — a non-empty local part, a
/// dotted domain, no whitespace, within the RFC 5321 length limit — and leaves
/// the rest to the (not yet built) verification mail.
pub(crate) fn validate_email(raw: &str) -> ApiResult<String> {
    let email = raw.trim();

    let invalid = || ApiError::Validation("email is not a valid address".to_owned());

    if email.chars().count() > MAX_EMAIL_LENGTH {
        return Err(ApiError::Validation(format!(
            "email must be at most {MAX_EMAIL_LENGTH} characters"
        )));
    }

    if email.chars().any(|c| c.is_whitespace() || c.is_control()) {
        return Err(invalid());
    }

    // Split at the *last* `@`, which is the domain separator even when the
    // local part is a quoted string containing one.
    let (local, domain) = email.rsplit_once('@').ok_or_else(invalid)?;

    if local.is_empty() || domain.len() < 3 {
        return Err(invalid());
    }

    let dotted = domain.contains('.')
        && !domain.starts_with(['.', '-'])
        && !domain.ends_with(['.', '-'])
        && !domain.contains("..");

    if !dotted {
        return Err(invalid());
    }

    Ok(email.to_owned())
}

/// Shared by the athlete's own name and their Team's, because both land in
/// `text not null check (length(trim(...)) > 0)` columns and both are rendered
/// to other people.
pub(crate) fn validate_display_name(raw: &str) -> ApiResult<String> {
    let name = raw.trim();

    if name.is_empty() {
        return Err(ApiError::Validation("name must not be empty".to_owned()));
    }

    if name.chars().count() > MAX_DISPLAY_NAME_LENGTH {
        return Err(ApiError::Validation(format!(
            "name must be at most {MAX_DISPLAY_NAME_LENGTH} characters"
        )));
    }

    Ok(name.to_owned())
}

pub(crate) fn token_pair(
    state: &AppState,
    athlete_id: Uuid,
    issued: refresh::IssuedRefreshToken,
) -> ApiResult<TokenPair> {
    let (access_token, expires_in) =
        issue_access_token(&state.auth.keys, &state.auth.config, athlete_id).map_err(
            |error| ApiError::Internal(format!("could not issue an access token: {error}")),
        )?;

    Ok(TokenPair {
        access_token,
        token_type: "Bearer",
        expires_in,
        refresh_token: issued.secret,
        refresh_token_expires_at: issued.expires_at,
    })
}

/// Best-effort device fingerprint for the audit log and the future "sign out
/// this device" screen. `X-Forwarded-For` is trusted only because the BFF and
/// the reverse proxy in front of it are ours (ADR-0002); it is attacker-
/// controlled otherwise and is therefore never used for an access decision.
pub(crate) fn device_context(headers: &HeaderMap) -> DeviceContext {
    let user_agent = headers
        .get(USER_AGENT)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.chars().take(512).collect::<String>());

    let ip_address = headers
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(',').next())
        .map(str::trim)
        .filter(|value| value.parse::<std::net::IpAddr>().is_ok())
        .map(str::to_owned);

    DeviceContext {
        user_agent,
        ip_address,
    }
}
