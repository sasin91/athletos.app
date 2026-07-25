//! Revocation of access tokens that have not yet expired.
//!
//! ADR-0003 made the refresh token the revocable credential and left the access
//! token valid until its `exp`. That is not good enough for logout: signing out
//! has to end access now, not in up to fifteen minutes. So a revoked token's
//! `jti` is recorded here and every authenticated request checks it.
//!
//! The cost of that check is the entire design constraint. It is *not* a second
//! query — it is a `not exists` folded into the Team membership lookup the
//! extractor already performs (see `auth::extractor::load_athlete`), which
//! keeps an authenticated request at exactly one round-trip, as before.

use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::ApiResult;

/// Revokes a single access token by its `jti`.
///
/// Idempotent: presenting the same token to `/auth/logout` twice is a normal
/// client retry, not an error, so a repeated `jti` is silently ignored rather
/// than raising a unique violation.
pub async fn revoke(
    db: &PgPool,
    jti: Uuid,
    athlete_id: Uuid,
    expires_at: DateTime<Utc>,
    reason: &str,
) -> ApiResult<()> {
    sqlx::query(
        "insert into access_token_denylist (jti, athlete_id, expires_at, reason)
         values ($1, $2, $3, $4)
         on conflict (jti) do nothing",
    )
    .bind(jti)
    .bind(athlete_id)
    .bind(expires_at)
    .bind(reason)
    .execute(db)
    .await?;

    Ok(())
}
