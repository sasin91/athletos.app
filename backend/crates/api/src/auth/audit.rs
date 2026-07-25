use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::refresh::DeviceContext;

/// The audited actions this module records. Free-form `text` in the schema, but
/// enumerated here so the vocabulary stays stable enough to query.
#[derive(Debug, Clone, Copy)]
pub enum AuthAction {
    /// The one-shot creation of the very first athlete (`bootstrap`). Audited
    /// like everything else precisely *because* it bypasses the invitation rule
    /// — if it ever runs twice, the log is where that shows up.
    Bootstrapped,
    LoginSucceeded,
    LoginFailed,
    LoggedOut,
    InvitationCreated,
    InvitationAccepted,
    InvitationRevoked,
}

impl AuthAction {
    fn as_str(self) -> &'static str {
        match self {
            Self::Bootstrapped => "auth.bootstrap",
            Self::LoginSucceeded => "auth.login.succeeded",
            Self::LoginFailed => "auth.login.failed",
            Self::LoggedOut => "auth.logout",
            Self::InvitationCreated => "auth.invitation.created",
            Self::InvitationAccepted => "auth.invitation.accepted",
            Self::InvitationRevoked => "auth.invitation.revoked",
        }
    }
}

/// Records an authentication event.
///
/// `athlete_id` is `None` for a failed login against an unknown address —
/// note that the attempted address is deliberately *not* stored, since it is
/// unauthenticated input and often a real person's email.
pub async fn record(
    db: &PgPool,
    action: AuthAction,
    athlete_id: Option<Uuid>,
    device: &DeviceContext,
) {
    let result = sqlx::query(
        "insert into access_audit_log
             (athlete_id, action, resource, resource_id, ip_address, user_agent)
         values ($1, $2, 'athlete', $1, $3::inet, $4)",
    )
    .bind(athlete_id)
    .bind(action.as_str())
    .bind(device.ip_address.as_deref())
    .bind(device.user_agent.as_deref())
    .execute(db)
    .await;

    if let Err(error) = result {
        tracing::error!(
            ?error,
            action = action.as_str(),
            "failed to write an audit record"
        );
    }
}

/// Records an invitation event (ADR-0016).
///
/// Separate from [`record`] because the interesting resource is the invitation,
/// not the athlete, and because the Team is what an auditor asks about first:
/// "who was invited into this care unit, by whom, and was it withdrawn".
///
/// `athlete_id` is the Owner who issued or revoked it, and the *new* athlete
/// on acceptance — in every case the account that acted. The invited address is
/// deliberately not copied here: it is already on the invitation row that
/// `resource_id` names, and duplicating personal data into a table with no
/// foreign keys would put it outside the erasure cascade (ADR-0011).
pub async fn record_invitation(
    db: &PgPool,
    action: AuthAction,
    athlete_id: Option<Uuid>,
    team_id: Uuid,
    invitation_id: Uuid,
    device: &DeviceContext,
) {
    let result = sqlx::query(
        "insert into access_audit_log
             (athlete_id, team_id, action, resource, resource_id, ip_address, user_agent)
         values ($1, $2, $3, 'athlete_invitation', $4, $5::inet, $6)",
    )
    .bind(athlete_id)
    .bind(team_id)
    .bind(action.as_str())
    .bind(invitation_id)
    .bind(device.ip_address.as_deref())
    .bind(device.user_agent.as_deref())
    .execute(db)
    .await;

    if let Err(error) = result {
        tracing::error!(
            ?error,
            action = action.as_str(),
            "failed to write an audit record"
        );
    }
}
