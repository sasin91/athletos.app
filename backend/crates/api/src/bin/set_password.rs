//! Sets an existing athlete's password, offline.
//!
//! There is no password-reset endpoint (`PasswordPolicy::check` documents that
//! a future one must go through it), so this is the only recovery path there
//! is (D-02) — without it a forgotten password would mean editing
//! `password_hash` by hand. This tool is that edit done properly: the same
//! policy check and Argon2id parameters the API applies when a password is
//! chosen, and every refresh token for the account revoked in the same
//! transaction. Access tokens are left to expire on their own short TTL.
//!
//! ```text
//! cargo run -p athletos-api --bin set-password -- alex@example.com
//! ```
//!
//! The password is read from stdin, never from a command-line argument: `argv`
//! is world-readable in `/proc` on Linux and lands in shell history.
//!
//! Deliberately not gated behind a flag: whoever can run this already holds
//! `DATABASE_URL`, and with that they can write `password_hash` with `psql`
//! directly. A gate here would add a step, not a barrier.

use std::io::Read;
use std::sync::Arc;

use sqlx::postgres::PgPoolOptions;
use uuid::Uuid;

use athletos_api::auth::password::{hash_password, PasswordContext};
use athletos_api::config::AuthConfig;
use athletos_api::migrate;
use athletos_api::state::AuthContext;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _ = dotenvy::dotenv();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .init();

    let mut args = std::env::args().skip(1);
    let Some(email) = args.next() else {
        eprintln!("usage: set-password <email>   # new password on stdin");
        std::process::exit(2);
    };

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

    // The same migrations the server applies on boot, so this tool never has to
    // be sequenced after a first server start.
    migrate(&db).await?;

    let Some((athlete_id, stored_email, display_name)) =
        sqlx::query_as::<_, (Uuid, String, String)>(
            "select id, email, display_name from athletes
             where lower(email) = lower($1) and deleted_at is null",
        )
        .bind(&email)
        .fetch_optional(&db)
        .await?
    else {
        eprintln!("no active athlete with email {email}");
        std::process::exit(1);
    };

    // Built through `AuthContext` rather than by hand so the password policy is
    // exactly the one the API enforces, including a deployment's HIBP opt-in.
    let auth = Arc::new(AuthContext::new(AuthConfig::from_env()?)?);
    auth.passwords
        .check(
            &password,
            PasswordContext {
                email: &stored_email,
                display_name: &display_name,
            },
        )
        .await?;

    let password_hash = hash_password(password).await?;

    let mut tx = db.begin().await?;
    sqlx::query("update athletes set password_hash = $2 where id = $1")
        .bind(athlete_id)
        .bind(&password_hash)
        .execute(&mut *tx)
        .await?;
    let revoked = sqlx::query("delete from refresh_tokens where athlete_id = $1")
        .bind(athlete_id)
        .execute(&mut *tx)
        .await?
        .rows_affected();
    tx.commit().await?;

    println!("athlete_id={athlete_id}");
    println!("refresh_tokens_revoked={revoked}");
    Ok(())
}
