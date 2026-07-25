//! The first athlete (ADR-0016).
//!
//! Invitation-only registration has a chicken-and-egg problem: an account
//! requires an invitation, an invitation requires a Team Owner, and a Team Owner
//! is an account. Something has to create the first one.
//!
//! **Why this is a separate binary and not an endpoint.** Every HTTP-shaped
//! answer — an env-gated `POST /auth/bootstrap`, a first-run mode, a
//! self-disabling route — leaves an unauthenticated account-creating endpoint
//! in the router of a production deployment, one misread environment variable
//! away from being live, and reachable by anyone who can reach the service. A
//! binary is reachable only by someone who can already execute processes next
//! to the database, which is a position from which they could insert the row by
//! hand anyway; it adds no attack surface that was not already conceded. It
//! also means the production router simply has no bootstrap path in it, which
//! is a property that can be read off `lib.rs` rather than argued about.
//!
//! **Two independent guards**, mirroring how `AuthConfig` treats an ephemeral
//! signing key — one mistake must not be enough:
//!
//! 1. `PIXMYDAY_ALLOW_BOOTSTRAP=true`, compared against the literal `true` so a
//!    typo leaves it off.
//! 2. the `athletes` table is empty. This one is not configurable and cannot
//!    be argued with: bootstrap creates *the first* athlete or nothing. A
//!    deployment in service is therefore not reachable by this code path even
//!    with the flag left on by accident, which is the failure mode that
//!    actually happens.
//!
//! The password policy and the audit log apply exactly as they do to an
//! invitation, because the first account is the one with the most authority.

use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::audit::{self, AuthAction};
use crate::auth::password::{hash_password, PasswordContext, PasswordPolicy};
use crate::auth::refresh::DeviceContext;
use crate::error::ApiError;
use crate::routes::auth::{validate_display_name, validate_email};

/// The environment variable that must say `true`.
pub const ALLOW_BOOTSTRAP_ENV: &str = "PIXMYDAY_ALLOW_BOOTSTRAP";

/// Whether bootstrapping is permitted at all.
///
/// A value rather than a bare `bool` read inside the function, so a test can
/// exercise both answers without mutating process-global environment state —
/// and so the one place that reads the environment is [`Self::from_env`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BootstrapPolicy {
    enabled: bool,
}

impl BootstrapPolicy {
    /// Reads the opt-in. Anything other than exactly `true` — unset, empty,
    /// `TRUE`, `1`, `yes` — leaves it disabled.
    pub fn from_env() -> Self {
        Self {
            enabled: std::env::var(ALLOW_BOOTSTRAP_ENV).is_ok_and(|value| value.trim() == "true"),
        }
    }

    pub fn enabled() -> Self {
        Self { enabled: true }
    }

    pub fn disabled() -> Self {
        Self { enabled: false }
    }

    pub fn is_enabled(self) -> bool {
        self.enabled
    }
}

/// Who the first athlete is and what their Team is called.
#[derive(Debug, Clone)]
pub struct BootstrapRequest {
    pub email: String,
    pub display_name: String,
    pub password: String,
    /// Defaults to a household named after them, as the old registration
    /// endpoint did — renameable later.
    pub team_name: Option<String>,
}

#[derive(Debug, Clone, Copy)]
pub struct BootstrapOutcome {
    pub athlete_id: Uuid,
    pub team_id: Uuid,
}

#[derive(Debug, thiserror::Error)]
pub enum BootstrapError {
    #[error(
        "bootstrapping is not enabled; set {ALLOW_BOOTSTRAP_ENV}=true only for the \
         one-off creation of the first athlete"
    )]
    NotEnabled,

    #[error(
        "this deployment already has a athlete; every further account is created \
         by invitation (ADR-0016)"
    )]
    AlreadyBootstrapped,

    /// A validation or database failure. Reuses the API's error type so the
    /// password policy is literally the same code path as an invitation accept,
    /// rather than a second, drifting copy of the rules.
    #[error(transparent)]
    Api(#[from] ApiError),
}

/// Creates the first athlete and the Team they own, or refuses.
///
/// The athlete comes out as `owner` for the same reason registration used to
/// make them one: a athlete with no Team can reach nothing (ADR-0004,
/// ADR-0005), and this one additionally has to be able to invite everybody else.
pub async fn bootstrap_first_athlete(
    db: &PgPool,
    passwords: &PasswordPolicy,
    policy: BootstrapPolicy,
    request: BootstrapRequest,
) -> Result<BootstrapOutcome, BootstrapError> {
    if !policy.is_enabled() {
        return Err(BootstrapError::NotEnabled);
    }

    let email = validate_email(&request.email)?;
    let display_name = validate_display_name(&request.display_name)?;

    passwords
        .check(
            &request.password,
            PasswordContext {
                email: &email,
                display_name: &display_name,
            },
        )
        .await?;

    let team_name = match request.team_name.as_deref().map(str::trim) {
        Some(name) if !name.is_empty() => validate_display_name(name)?,
        _ => format!("{display_name}'s Household"),
    };

    let password_hash = hash_password(request.password).await?;

    let athlete_id = Uuid::now_v7();
    let team_id = Uuid::now_v7();

    let mut tx = db.begin().await.map_err(ApiError::Database)?;

    // Inside the transaction and taking a write lock, so two operators racing
    // cannot both conclude the table was empty. Soft-deleted athletes count:
    // a deployment that once had an account has been in service, and a second
    // "first" account is not what bootstrap is for.
    let existing: i64 = sqlx::query_scalar("select count(*) from athletes")
        .fetch_one(&mut *tx)
        .await
        .map_err(ApiError::Database)?;

    if existing > 0 {
        return Err(BootstrapError::AlreadyBootstrapped);
    }

    sqlx::query(
        "insert into athletes (id, email, display_name, password_hash)
         values ($1, $2, $3, $4)",
    )
    .bind(athlete_id)
    .bind(&email)
    .bind(&display_name)
    .bind(&password_hash)
    .execute(&mut *tx)
    .await
    .map_err(ApiError::Database)?;

    sqlx::query("insert into teams (id, name) values ($1, $2)")
        .bind(team_id)
        .bind(&team_name)
        .execute(&mut *tx)
        .await
        .map_err(ApiError::Database)?;

    sqlx::query(
        "insert into team_memberships (team_id, athlete_id, role) values ($1, $2, 'owner')",
    )
    .bind(team_id)
    .bind(athlete_id)
    .execute(&mut *tx)
    .await
    .map_err(ApiError::Database)?;

    tx.commit().await.map_err(ApiError::Database)?;

    // Audited like every other account-creating event (ADR-0011). There is no
    // request, so there is no device context to record.
    audit::record(
        db,
        AuthAction::Bootstrapped,
        Some(athlete_id),
        &DeviceContext::default(),
    )
    .await;

    Ok(BootstrapOutcome {
        athlete_id,
        team_id,
    })
}
