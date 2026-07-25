use sqlx::PgPool;
use uuid::Uuid;

use crate::auth::refresh::DeviceContext;

/// The audited actions this module records. Free-form `text` in the schema, but
/// enumerated here so the vocabulary stays stable enough to query.
#[derive(Debug, Clone, Copy)]
pub enum AuthAction {
    LoginSucceeded,
    LoginFailed,
    LoggedOut,
}

impl AuthAction {
    fn as_str(self) -> &'static str {
        match self {
            Self::LoginSucceeded => "auth.login.succeeded",
            Self::LoginFailed => "auth.login.failed",
            Self::LoggedOut => "auth.logout",
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
