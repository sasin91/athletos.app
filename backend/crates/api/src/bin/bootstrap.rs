//! Creates the first athlete of a deployment, once (ADR-0016).
//!
//! Registration is invitation-only and invitations come from a Team Owner, so
//! there has to be one way in that is not an invitation. This is it, and it is
//! deliberately not an HTTP endpoint — see `bootstrap` in the library for why.
//!
//! ```text
//! PIXMYDAY_ALLOW_BOOTSTRAP=true \
//!   cargo run -p pixmyday-api --bin bootstrap -- alex@example.com "Alex Berg" "The Berg Household"
//! ```
//!
//! The password is read from stdin, never from a command-line argument: `argv`
//! is world-readable in `/proc` on Linux and lands in shell history.
//!
//! It refuses unless `PIXMYDAY_ALLOW_BOOTSTRAP=true` **and** the deployment has
//! no athlete yet. Running it a second time is an error, not a no-op.

use std::io::Read;
use std::sync::Arc;

use sqlx::postgres::PgPoolOptions;

use pixmyday_api::bootstrap::{bootstrap_first_athlete, BootstrapPolicy, BootstrapRequest};
use pixmyday_api::config::AuthConfig;
use pixmyday_api::migrate;
use pixmyday_api::state::AuthContext;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _ = dotenvy::dotenv();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .init();

    let mut args = std::env::args().skip(1);
    let (Some(email), Some(display_name)) = (args.next(), args.next()) else {
        eprintln!("usage: bootstrap <email> <display-name> [team-name]   # password on stdin");
        std::process::exit(2);
    };
    let team_name = args.next();

    let mut password = String::new();
    std::io::stdin().read_to_string(&mut password)?;
    // Only the trailing newline the shell adds — a leading space is part of the
    // secret, and `auth::password` is explicit that it does not trim.
    let password = password.trim_end_matches(['\r', '\n']).to_owned();

    let database_url = std::env::var("DATABASE_URL")?;
    let db = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await?;

    // The same migrations the server applies on boot, so bootstrapping a fresh
    // deployment does not have to be sequenced after a first server start.
    migrate(&db).await?;

    // Built through `AuthContext` rather than by hand so the password policy is
    // exactly the one the API enforces, including a deployment's HIBP opt-in.
    let auth = Arc::new(AuthContext::new(AuthConfig::from_env()?)?);

    let outcome = bootstrap_first_athlete(
        &db,
        &auth.passwords,
        BootstrapPolicy::from_env(),
        BootstrapRequest {
            email,
            display_name,
            password,
            team_name,
        },
    )
    .await;

    match outcome {
        Ok(created) => {
            println!("athlete_id={}", created.athlete_id);
            println!("team_id={}", created.team_id);
            eprintln!(
                "the first athlete exists and owns their Team; \
                 unset {} and invite everybody else",
                pixmyday_api::bootstrap::ALLOW_BOOTSTRAP_ENV
            );
            Ok(())
        }
        Err(error) => {
            eprintln!("bootstrap refused: {error}");
            std::process::exit(1);
        }
    }
}
