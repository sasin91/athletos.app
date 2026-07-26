use std::sync::Arc;

use sqlx::postgres::PgPoolOptions;

use athletos_api::state::AuthContext;
use athletos_api::{app, config::Config, migrate, state::AppState};

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
        "athletos-api listening on http://{} (docs at /swagger-ui)",
        config.bind_addr
    );

    axum::serve(listener, app(AppState::new(db, auth))).await?;

    Ok(())
}
