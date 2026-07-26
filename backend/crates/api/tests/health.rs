//! Feature tests: real Postgres, real router, real HTTP semantics (ADR-0015).
//!
//! `#[sqlx::test]` creates a private database per test with all migrations
//! applied and drops it afterwards, so these run in parallel without
//! interfering. It connects using `DATABASE_URL`; start the server first with
//! `./scripts/dev-services.ps1 up`.

use athletos_api::{app, state::AppState};
use axum_test::TestServer;
use sqlx::PgPool;

fn server(pool: PgPool) -> TestServer {
    TestServer::new(app(AppState::with_ephemeral_auth(pool)))
}

#[sqlx::test]
async fn health_reports_ok(pool: PgPool) {
    let response = server(pool).get("/health").await;

    response.assert_status_ok();
    response.assert_json(&serde_json::json!({
        "status": "ok",
        "service": "athletos-api",
    }));
}

#[sqlx::test]
async fn readiness_reports_ready_when_the_database_is_reachable(pool: PgPool) {
    let response = server(pool).get("/health/ready").await;

    response.assert_status_ok();
    response.assert_json(&serde_json::json!({
        "status": "ready",
        "service": "athletos-api",
    }));
}

/// The generated document is the contract the SvelteKit BFF's client is built
/// from (ADR-0014, D-11), so a handler silently missing from it is a real
/// defect.
#[sqlx::test]
async fn openapi_document_describes_every_route(pool: PgPool) {
    let response = server(pool).get("/api-docs/openapi.json").await;

    response.assert_status_ok();
    let doc: serde_json::Value = response.json();

    assert_eq!(doc["openapi"], "3.1.0");
    assert_eq!(doc["info"]["title"], "AthletOS API");
    assert!(doc["paths"]["/health"]["get"].is_object());
    assert!(doc["paths"]["/health/ready"]["get"].is_object());
    assert!(doc["paths"]["/v1/auth/login"]["post"].is_object());
    assert!(doc["paths"]["/v1/auth/refresh"]["post"].is_object());
    assert!(doc["paths"]["/v1/auth/logout"]["post"].is_object());
    assert!(doc["paths"]["/v1/auth/me"]["get"].is_object());
    // Not under `/v1`: RFC 8615 fixes this path (D-12).
    assert!(doc["paths"]["/.well-known/jwks.json"]["get"].is_object());

    // The BFF's generated client needs the bearer scheme to attach tokens.
    assert_eq!(
        doc["components"]["securitySchemes"]["bearer_token"]["scheme"],
        "bearer"
    );
    assert_eq!(
        doc["paths"]["/v1/auth/me"]["get"]["security"][0]["bearer_token"],
        serde_json::json!([])
    );
}

/// Migrations must leave the identity and access schema in place — this is the
/// cheapest guard against a migration that applies but creates the wrong thing.
///
/// Asserted as a subset rather than the whole table list: later migrations add
/// their own tables (and assert their own shape), and a test that has to be
/// edited every time one lands stops being a guard and starts being a chore.
#[sqlx::test]
async fn migrations_create_the_identity_schema(pool: PgPool) {
    // `table_name::text` for the same reason the training-schema test does it:
    // `information_schema.table_name` is a domain over `name`, and this query
    // has never once run against a non-empty result — there were no tables to
    // find until the migrations landed. An uncast domain that sqlx declines to
    // decode would fail here as a decode error rather than a missing table,
    // which is a confusing way to learn your migrations are fine.
    let tables: Vec<String> = sqlx::query_scalar(
        "select table_name::text from information_schema.tables
         where table_schema = 'public' and table_name <> '_sqlx_migrations'
         order by table_name",
    )
    .fetch_all(&pool)
    .await
    .expect("failed to read the schema");

    for expected in [
        "access_audit_log",
        "access_token_denylist",
        "athletes",
        "login_throttle",
        "refresh_tokens",
    ] {
        assert!(
            tables.iter().any(|table| table == expected),
            "migrations must create `{expected}`, found {tables:?}"
        );
    }
}

/// The training schema, asserted separately rather than by extending the list
/// above — that test says in as many words that each migration should assert
/// its own tables, and it is right.
#[sqlx::test]
async fn migrations_create_the_training_schema(pool: PgPool) {
    // Cast out of `information_schema.sql_identifier`, which is a domain: what
    // the wire reports for it is the domain's own oid, and a driver that has
    // not resolved it has nothing to decode a `String` from.
    let tables: Vec<String> = sqlx::query_scalar(
        "select table_name::text from information_schema.tables
         where table_schema = 'public'
         order by table_name",
    )
    .fetch_all(&pool)
    .await
    .expect("failed to read the schema");

    for expected in ["athlete_maxes", "enrollments", "workout_sets", "workouts"] {
        assert!(
            tables.iter().any(|table| table == expected),
            "migrations must create `{expected}`, found {tables:?}"
        );
    }
}

/// `workouts.id` is generated by the client and is the idempotency key that
/// stops a retried offline submit from advancing the program twice (D-09).
///
/// A `default gen_random_uuid()` would break that silently: every retry would
/// insert a fresh row, `on conflict (id) do nothing` would never conflict, and
/// nothing would fail except a training max that quietly climbs at double rate.
/// No test that submits a workout only once can catch it, so the guard is put
/// on the column definition itself.
#[sqlx::test]
async fn the_client_generated_workout_id_has_no_server_side_default(pool: PgPool) {
    let default: Option<String> = sqlx::query_scalar(
        "select column_default::text from information_schema.columns
         where table_schema = 'public'
           and table_name = 'workouts'
           and column_name = 'id'",
    )
    .fetch_one(&pool)
    .await
    .expect("`workouts.id` must exist");

    assert_eq!(
        default, None,
        "workouts.id must be supplied by the client, never defaulted (D-09)"
    );
}
