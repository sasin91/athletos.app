use std::sync::Arc;

use sqlx::postgres::PgPoolOptions;

use pixmyday_api::mail::SmtpMailer;
use pixmyday_api::state::AuthContext;
use pixmyday_api::storage::ObjectStore;
use pixmyday_api::{app, config::Config, migrate, state::AppState};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Absent .env is fine — in production configuration comes from the
    // environment, not a file.
    let _ = dotenvy::dotenv();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=debug".into()),
        )
        .init();

    let config = Config::from_env()?;

    // Resolved before the listener binds: a process that cannot sign tokens is
    // useless, so it should fail at startup rather than at the first login.
    let auth = Arc::new(AuthContext::new(config.auth.clone())?);

    let db = PgPoolOptions::new()
        .max_connections(config.database_max_connections)
        .connect(&config.database_url)
        .await?;

    // Migrating on boot keeps a single-node docker-compose deployment (ADR-0011)
    // to one moving part. This is the thing to revisit first if the API ever
    // scales to multiple replicas.
    migrate(&db).await?;
    tracing::info!("migrations applied");

    let listener = tokio::net::TcpListener::bind(config.bind_addr).await?;
    tracing::info!(
        "pixmyday-api listening on http://{} (docs at /swagger-ui)",
        config.bind_addr
    );

    // Built once: constructing it resolves credentials and TLS state that must
    // not be rebuilt per request (ADR-0010).
    let objects = Arc::new(ObjectStore::new(&config.object_storage));

    // Also built once, and before serving: a deployment that cannot send
    // invitation mail cannot create accounts at all (ADR-0016, ADR-0018), so a
    // bad MAIL_FROM or TLS mode fails here rather than at the first invite.
    let mailer = Arc::new(SmtpMailer::new(&config.mail)?);

    let state = AppState::new(db, auth)
        .with_object_store(objects)
        .with_mailer(mailer);

    axum::serve(listener, app(state)).await?;

    Ok(())
}
