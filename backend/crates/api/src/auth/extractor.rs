//! The axum extractor that turns a bearer token into an authenticated athlete.
//!
//! Putting this in an extractor means a handler cannot forget to authenticate:
//! either it asks for `Authenticatedathlete` and gets a verified one, or it
//! never runs.
//!
//! Everything here produces 401 and nothing produces 403. A missing, malformed,
//! expired or forged token means "we do not know who you are"; 403 means "we
//! know exactly who you are and you may not do this", which only a handler
//! applying Team rules (ADR-0004) can decide.

use axum::extract::FromRequestParts;
use axum::http::header::AUTHORIZATION;
use axum::http::request::Parts;
use axum::http::HeaderMap;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::auth::token::verify_access_token;
use crate::error::ApiError;
use crate::state::AppState;

/// The two coarse Team roles (CONTEXT.md).
///
/// `Deserialize` as well as `Serialize` because an invitation says which role
/// the invitee will hold (ADR-0016), so the role arrives in a request body.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize, sqlx::Type, ToSchema)]
#[sqlx(type_name = "team_role", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum TeamRole {
    Owner,
    Member,
}

/// One Team the athlete belongs to, and the role they hold there.
#[derive(Debug, Clone, Serialize, sqlx::FromRow, ToSchema)]
pub struct TeamMembership {
    pub team_id: Uuid,
    pub role: TeamRole,
}

/// A verified athlete plus the Team memberships that bound what they can
/// reach. Loaded per request rather than carried in the token, so revoking a
/// membership takes effect immediately instead of at the next token refresh.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct Authenticatedathlete {
    pub athlete_id: Uuid,
    pub memberships: Vec<TeamMembership>,
}

impl Authenticatedathlete {
    /// The role this athlete holds in `team_id`, if they are a member at all.
    pub fn role_in(&self, team_id: Uuid) -> Option<TeamRole> {
        self.memberships
            .iter()
            .find(|membership| membership.team_id == team_id)
            .map(|membership| membership.role)
    }

    pub fn is_member_of(&self, team_id: Uuid) -> bool {
        self.role_in(team_id).is_some()
    }
}

impl FromRequestParts<AppState> for Authenticatedathlete {
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

/// One row of the account-and-memberships lookup. `team_id` and `role` are
/// optional because the outer join produces a single all-null row for a
/// athlete who belongs to no Team — an account that exists but can reach
/// nothing, which is a different answer from "not authenticated".
#[derive(sqlx::FromRow)]
struct AuthRow {
    team_id: Option<Uuid>,
    role: Option<TeamRole>,
}

/// Loads the athlete named by a verified token, in a single round-trip.
///
/// Three checks share that one query, and deliberately so — this runs on every
/// authenticated request:
///
/// 1. the athlete exists and is not soft-deleted. Their access token may
///    still be inside its lifetime; this is what stops it working.
/// 2. the token has not been revoked (`auth::denylist`). Folded in as a
///    `not exists` rather than a second query, so revocation is free on the
///    happy path.
/// 3. their Team memberships, loaded per request rather than carried in the
///    token so a removed membership takes effect immediately.
///
/// Because the `not exists` sits in the `where` clause of the driving table,
/// a revoked token yields zero rows — indistinguishable here from an unknown
/// athlete, and answered the same way: 401, never 403. A denylisted token
/// means "we no longer accept this credential", not "you may not do this".
async fn load_athlete(
    state: &AppState,
    athlete_id: Uuid,
    jti: Uuid,
) -> Result<Authenticatedathlete, ApiError> {
    let rows = sqlx::query_as::<_, AuthRow>(
        "select m.team_id, m.role
         from athletes c
         left join (
             select tm.athlete_id, tm.team_id, tm.role
             from team_memberships tm
             join teams t on t.id = tm.team_id and t.deleted_at is null
         ) m on m.athlete_id = c.id
         where c.id = $1
           and c.deleted_at is null
           and not exists (
               select 1 from access_token_denylist d where d.jti = $2
           )
         order by m.team_id",
    )
    .bind(athlete_id)
    .bind(jti)
    .fetch_all(&state.db)
    .await?;

    if rows.is_empty() {
        return Err(ApiError::Unauthenticated);
    }

    let memberships = rows
        .into_iter()
        .filter_map(|row| {
            Some(TeamMembership {
                team_id: row.team_id?,
                role: row.role?,
            })
        })
        .collect();

    Ok(Authenticatedathlete {
        athlete_id,
        memberships,
    })
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
