//! Feature tests: real Postgres, real router, real HTTP semantics (ADR-0015).
//!
//! `#[sqlx::test]` creates a private database per test with all migrations
//! applied and drops it afterwards, so these run in parallel without
//! interfering. It connects using `DATABASE_URL`; start the server first with
//! `./scripts/dev-services.ps1 up`.

use axum_test::TestServer;
use pixmyday_api::{app, state::AppState};
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
        "service": "pixmyday-api",
    }));
}

#[sqlx::test]
async fn readiness_reports_ready_when_the_database_is_reachable(pool: PgPool) {
    let response = server(pool).get("/health/ready").await;

    response.assert_status_ok();
    response.assert_json(&serde_json::json!({
        "status": "ready",
        "service": "pixmyday-api",
    }));
}

/// The generated document is the contract the Nuxt BFF's client is built from
/// (ADR-0014), so a handler silently missing from it is a real defect.
#[sqlx::test]
async fn openapi_document_describes_every_route(pool: PgPool) {
    let response = server(pool).get("/api-docs/openapi.json").await;

    response.assert_status_ok();
    let doc: serde_json::Value = response.json();

    assert_eq!(doc["openapi"], "3.1.0");
    assert_eq!(doc["info"]["title"], "PixMyDay API");
    assert!(doc["paths"]["/health"]["get"].is_object());
    assert!(doc["paths"]["/health/ready"]["get"].is_object());
    assert!(doc["paths"]["/auth/invitations/accept"]["post"].is_object());
    assert!(doc["paths"]["/teams/{team_id}/invitations"]["post"].is_object());
    assert!(doc["paths"]["/auth/login"]["post"].is_object());
    assert!(doc["paths"]["/auth/refresh"]["post"].is_object());
    assert!(doc["paths"]["/auth/logout"]["post"].is_object());
    assert!(doc["paths"]["/auth/me"]["get"].is_object());
    assert!(doc["paths"]["/.well-known/jwks.json"]["get"].is_object());
    assert!(doc["paths"]["/teams/{team_id}/pictograms"]["post"].is_object());
    assert!(doc["paths"]["/persons/{person_id}/appearance"]["get"].is_object());

    // The BFF's generated client needs the bearer scheme to attach tokens.
    assert_eq!(
        doc["components"]["securitySchemes"]["bearer_token"]["scheme"],
        "bearer"
    );
    assert_eq!(
        doc["paths"]["/auth/me"]["get"]["security"][0]["bearer_token"],
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
    let tables: Vec<String> = sqlx::query_scalar(
        "select table_name from information_schema.tables
         where table_schema = 'public' and table_name <> '_sqlx_migrations'
         order by table_name",
    )
    .fetch_all(&pool)
    .await
    .expect("failed to read the schema");

    for expected in [
        "access_audit_log",
        "access_token_denylist",
        "athlete_invitations",
        "athletes",
        "organizations",
        "person_team_links",
        "persons",
        "refresh_tokens",
        "team_memberships",
        "teams",
    ] {
        assert!(
            tables.iter().any(|table| table == expected),
            "migrations must create `{expected}`, found {tables:?}"
        );
    }
}
