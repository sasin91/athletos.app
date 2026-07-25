//! Opaque, DB-backed refresh tokens (ADR-0003).
//!
//! Deliberately not a JWT. A JWT is valid until it expires, which is exactly
//! the property we do not want from the long-lived credential: this one must
//! die the moment a athlete logs out, loses a device, or is removed.
//!
//! The client sees 256 bits of CSPRNG output; the database stores only its
//! SHA-256. Nothing in this module ever logs the secret.

use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::secret::{digest as hash, generate as generate_secret};
use crate::config::AuthConfig;
use crate::error::{ApiError, ApiResult};

/// Where a refresh token was issued from, kept so a future "sign out this
/// device" screen can label sessions.
#[derive(Debug, Clone, Default)]
pub struct DeviceContext {
    pub user_agent: Option<String>,
    pub ip_address: Option<String>,
}

/// A freshly minted token. `secret` is the only copy in existence outside the
/// client — it is returned once and never recoverable from the database.
#[derive(Debug)]
pub struct IssuedRefreshToken {
    pub secret: String,
    pub expires_at: DateTime<Utc>,
}

/// The outcome of a successful rotation.
#[derive(Debug)]
pub struct RotatedRefreshToken {
    pub athlete_id: Uuid,
    pub issued: IssuedRefreshToken,
}

/// Starts a new token family — one per login, and therefore one per device.
pub async fn issue_new_family(
    db: &PgPool,
    config: &AuthConfig,
    athlete_id: Uuid,
    device: &DeviceContext,
) -> ApiResult<IssuedRefreshToken> {
    let mut tx = db.begin().await?;
    let issued = insert(&mut tx, config, athlete_id, Uuid::now_v7(), device).await?;
    tx.commit().await?;
    Ok(issued)
}

/// Exchanges a refresh token for its successor.
///
/// Rotation is what makes theft detectable: each token is single-use, so a
/// second presentation of one that was already spent means two parties hold the
/// same secret. We cannot tell which one is the thief, so the whole family is
/// revoked and both are forced back through a password login.
pub async fn rotate(
    db: &PgPool,
    config: &AuthConfig,
    presented_secret: &str,
    device: &DeviceContext,
) -> ApiResult<RotatedRefreshToken> {
    let mut tx = db.begin().await?;

    // `for update` serialises concurrent presentations of the same token, so a
    // racing pair cannot both be rotated and slip past the reuse check.
    let row = sqlx::query_as::<_, StoredToken>(
        "select id, family_id, athlete_id, expires_at, consumed_at, revoked_at
         from refresh_tokens where token_hash = $1 for update",
    )
    .bind(hash(presented_secret))
    .fetch_optional(&mut *tx)
    .await?;

    let Some(token) = row else {
        return Err(ApiError::Unauthenticated);
    };

    if token.revoked_at.is_some() {
        return Err(ApiError::Unauthenticated);
    }

    if token.consumed_at.is_some() {
        tracing::warn!(
            athlete_id = %token.athlete_id,
            family_id = %token.family_id,
            "refresh token reuse detected; revoking the whole token family"
        );
        revoke_family(&mut tx, token.family_id, "reuse_detected").await?;
        tx.commit().await?;
        return Err(ApiError::Unauthenticated);
    }

    if token.expires_at <= Utc::now() {
        return Err(ApiError::Unauthenticated);
    }

    sqlx::query("update refresh_tokens set consumed_at = now() where id = $1")
        .bind(token.id)
        .execute(&mut *tx)
        .await?;

    let issued = insert(&mut tx, config, token.athlete_id, token.family_id, device).await?;

    tx.commit().await?;

    Ok(RotatedRefreshToken {
        athlete_id: token.athlete_id,
        issued,
    })
}

/// Revokes the family the presented token belongs to — a logout signs out the
/// device it was issued to, not every device the athlete owns.
///
/// Returns the athlete whose session ended, so the caller can audit it. An
/// unknown or already-dead token is not an error: logout is idempotent and must
/// not report whether a token ever existed.
pub async fn revoke_family_of(db: &PgPool, presented_secret: &str) -> ApiResult<Option<Uuid>> {
    let mut tx = db.begin().await?;

    let row = sqlx::query_as::<_, StoredToken>(
        "select id, family_id, athlete_id, expires_at, consumed_at, revoked_at
         from refresh_tokens where token_hash = $1 for update",
    )
    .bind(hash(presented_secret))
    .fetch_optional(&mut *tx)
    .await?;

    let Some(token) = row else {
        tx.commit().await?;
        return Ok(None);
    };

    revoke_family(&mut tx, token.family_id, "logout").await?;
    tx.commit().await?;

    Ok(Some(token.athlete_id))
}

async fn insert(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    config: &AuthConfig,
    athlete_id: Uuid,
    family_id: Uuid,
    device: &DeviceContext,
) -> ApiResult<IssuedRefreshToken> {
    let secret = generate_secret()?;
    let expires_at = Utc::now()
        + chrono::Duration::from_std(config.refresh_token_ttl).map_err(|error| {
            ApiError::Internal(format!("refresh token lifetime is out of range: {error}"))
        })?;

    sqlx::query(
        "insert into refresh_tokens
             (id, family_id, athlete_id, token_hash, expires_at, user_agent, ip_address)
         values ($1, $2, $3, $4, $5, $6, $7::inet)",
    )
    .bind(Uuid::now_v7())
    .bind(family_id)
    .bind(athlete_id)
    .bind(hash(&secret))
    .bind(expires_at)
    .bind(device.user_agent.as_deref())
    .bind(device.ip_address.as_deref())
    .execute(&mut **tx)
    .await?;

    Ok(IssuedRefreshToken { secret, expires_at })
}

async fn revoke_family(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    family_id: Uuid,
    reason: &str,
) -> ApiResult<()> {
    sqlx::query(
        "update refresh_tokens
         set revoked_at = now(), revoked_reason = $2
         where family_id = $1 and revoked_at is null",
    )
    .bind(family_id)
    .bind(reason)
    .execute(&mut **tx)
    .await?;

    Ok(())
}

#[derive(sqlx::FromRow)]
struct StoredToken {
    id: Uuid,
    family_id: Uuid,
    athlete_id: Uuid,
    expires_at: DateTime<Utc>,
    consumed_at: Option<DateTime<Utc>>,
    revoked_at: Option<DateTime<Utc>>,
}
