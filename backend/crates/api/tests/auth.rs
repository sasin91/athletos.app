//! Feature tests for authentication (ADR-0003): real Postgres, real router,
//! real signatures.
//!
//! `#[sqlx::test]` creates a private database per test with all migrations
//! applied and drops it afterwards. It connects using `DATABASE_URL`; start the
//! server first with `./scripts/dev-services.ps1 up`.

use std::sync::Arc;

use axum_test::TestServer;
use chrono::Utc;
use jsonwebtoken::{Algorithm, Header};
use pixmyday_api::app;
use pixmyday_api::auth::keys::KeyRing;
use pixmyday_api::auth::password::hash_password;
use pixmyday_api::auth::token::AccessClaims;
use pixmyday_api::config::AuthConfig;
use pixmyday_api::state::{AppState, AuthContext};
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

const PASSWORD: &str = "correct horse battery staple";
const EMAIL: &str = "athlete@example.com";

fn auth_context() -> Arc<AuthContext> {
    Arc::new(
        AuthContext::new(AuthConfig::ephemeral_for_development())
            .expect("an ephemeral key ring is always constructible"),
    )
}

fn server_with(pool: PgPool, auth: Arc<AuthContext>) -> TestServer {
    TestServer::new(app(AppState::new(pool, auth)))
}

/// Inserts a athlete who owns one Team, and returns their id and the Team's.
async fn seed_athlete(pool: &PgPool) -> (Uuid, Uuid) {
    let athlete_id = Uuid::now_v7();
    let team_id = Uuid::now_v7();

    let password_hash = hash_password(PASSWORD.to_owned())
        .await
        .expect("failed to hash the seed password");

    sqlx::query(
        "insert into athletes (id, email, display_name, password_hash)
         values ($1, $2, 'Seed athlete', $3)",
    )
    .bind(athlete_id)
    .bind(EMAIL)
    .bind(&password_hash)
    .execute(pool)
    .await
    .expect("failed to insert the seed athlete");

    sqlx::query("insert into teams (id, name) values ($1, 'Seed Household')")
        .bind(team_id)
        .execute(pool)
        .await
        .expect("failed to insert the seed team");

    sqlx::query(
        "insert into team_memberships (team_id, athlete_id, role) values ($1, $2, 'owner')",
    )
    .bind(team_id)
    .bind(athlete_id)
    .execute(pool)
    .await
    .expect("failed to insert the seed membership");

    (athlete_id, team_id)
}

async fn log_in(server: &TestServer) -> serde_json::Value {
    let response = server
        .post("/auth/login")
        .json(&json!({ "email": EMAIL, "password": PASSWORD }))
        .await;

    response.assert_status_ok();
    response.json()
}

// --- access token revocation on logout ------------------------------------

/// The core of the denylist: the same access token, accepted and then refused.
#[sqlx::test]
async fn logout_rejects_the_access_token_it_was_presented_with(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool.clone(), auth_context());

    let tokens = log_in(&server).await;
    let access_token = tokens["access_token"].as_str().unwrap();

    server
        .get("/auth/me")
        .authorization_bearer(access_token)
        .await
        .assert_status_ok();

    server
        .post("/auth/logout")
        .authorization_bearer(access_token)
        .json(&json!({ "refresh_token": tokens["refresh_token"] }))
        .await
        .assert_status(axum::http::StatusCode::NO_CONTENT);

    // Still perfectly well-signed and inside its `exp` — and refused anyway.
    // 401, because we no longer accept the credential; not 403, which would
    // mean we accepted it and denied the action.
    server
        .get("/auth/me")
        .authorization_bearer(access_token)
        .await
        .assert_status_unauthorized();

    let denylisted: i64 = sqlx::query_scalar(
        "select count(*) from access_token_denylist where reason = 'logout' and expires_at > now()",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(denylisted, 1, "the sweep column must be populated");
}

/// Revocation is per token, not per athlete: signing out of the school tablet
/// must not sign you out of your phone.
#[sqlx::test]
async fn denylisting_one_token_leaves_another_token_for_the_same_athlete_alive(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool, auth_context());

    let phone = log_in(&server).await;
    let tablet = log_in(&server).await;

    let phone_access = phone["access_token"].as_str().unwrap();
    let tablet_access = tablet["access_token"].as_str().unwrap();
    assert_ne!(phone_access, tablet_access);

    server
        .post("/auth/logout")
        .authorization_bearer(tablet_access)
        .json(&json!({ "refresh_token": tablet["refresh_token"] }))
        .await
        .assert_status(axum::http::StatusCode::NO_CONTENT);

    server
        .get("/auth/me")
        .authorization_bearer(tablet_access)
        .await
        .assert_status_unauthorized();

    server
        .get("/auth/me")
        .authorization_bearer(phone_access)
        .await
        .assert_status_ok();
}

/// The denylist check rides along in the memberships query, so the memberships
/// it returns are the thing most at risk of quietly breaking.
#[sqlx::test]
async fn the_extractor_still_reports_every_membership_with_the_denylist_join(pool: PgPool) {
    let (athlete_id, owned_team) = seed_athlete(&pool).await;

    let joined_team = Uuid::now_v7();
    let deleted_team = Uuid::now_v7();

    sqlx::query("insert into teams (id, name) values ($1, 'School Class')")
        .bind(joined_team)
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("insert into teams (id, name, deleted_at) values ($1, 'Old Unit', now())")
        .bind(deleted_team)
        .execute(&pool)
        .await
        .unwrap();

    for (team_id, role) in [(joined_team, "member"), (deleted_team, "owner")] {
        sqlx::query("insert into team_memberships (team_id, athlete_id, role) values ($1, $2, $3::team_role)")
            .bind(team_id)
            .bind(athlete_id)
            .bind(role)
            .execute(&pool)
            .await
            .unwrap();
    }

    let server = server_with(pool, auth_context());
    let tokens = log_in(&server).await;

    let response = server
        .get("/auth/me")
        .authorization_bearer(tokens["access_token"].as_str().unwrap())
        .await;
    response.assert_status_ok();
    let body: serde_json::Value = response.json();

    let mut expected = vec![
        json!({ "team_id": owned_team, "role": "owner" }),
        json!({ "team_id": joined_team, "role": "member" }),
    ];
    expected.sort_by_key(|m| m["team_id"].as_str().unwrap().to_owned());

    assert_eq!(
        body["memberships"].as_array().unwrap(),
        &expected,
        "the soft-deleted Team must be excluded and the rest kept"
    );
}

/// A athlete between Teams is authenticated, just unable to reach anything —
/// the outer join must not turn that into a 401.
#[sqlx::test]
async fn a_athlete_with_no_teams_is_still_authenticated(pool: PgPool) {
    let (athlete_id, _) = seed_athlete(&pool).await;
    sqlx::query("delete from team_memberships where athlete_id = $1")
        .bind(athlete_id)
        .execute(&pool)
        .await
        .unwrap();

    let server = server_with(pool, auth_context());
    let tokens = log_in(&server).await;

    let response = server
        .get("/auth/me")
        .authorization_bearer(tokens["access_token"].as_str().unwrap())
        .await;

    response.assert_status_ok();
    response.assert_json(&json!({ "athlete_id": athlete_id, "memberships": [] }));
}

/// Logout without a bearer token still ends the session. The access token
/// cannot be revoked because nothing links it to the refresh family — the
/// documented residual exposure, asserted so it stays deliberate.
#[sqlx::test]
async fn logout_with_only_a_refresh_token_ends_the_session(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool.clone(), auth_context());

    let tokens = log_in(&server).await;

    server
        .post("/auth/logout")
        .json(&json!({ "refresh_token": tokens["refresh_token"] }))
        .await
        .assert_status(axum::http::StatusCode::NO_CONTENT);

    server
        .post("/auth/refresh")
        .json(&json!({ "refresh_token": tokens["refresh_token"] }))
        .await
        .assert_status_unauthorized();

    let denylisted: i64 = sqlx::query_scalar("select count(*) from access_token_denylist")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(denylisted, 0);
}

/// A client that holds only an access token can still revoke it.
#[sqlx::test]
async fn logout_with_only_an_access_token_revokes_it(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool, auth_context());

    let tokens = log_in(&server).await;
    let access_token = tokens["access_token"].as_str().unwrap();

    server
        .post("/auth/logout")
        .authorization_bearer(access_token)
        .json(&json!({}))
        .await
        .assert_status(axum::http::StatusCode::NO_CONTENT);

    server
        .get("/auth/me")
        .authorization_bearer(access_token)
        .await
        .assert_status_unauthorized();
}

#[sqlx::test]
async fn logout_with_neither_credential_is_refused(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool, auth_context());

    server
        .post("/auth/logout")
        .json(&json!({}))
        .await
        .assert_status(axum::http::StatusCode::UNPROCESSABLE_ENTITY);
}

/// Denylisting is keyed on a `jti` we minted. An unverifiable token names an
/// id we have no reason to trust, so it must not be written to the table.
#[sqlx::test]
async fn logout_ignores_an_unverifiable_access_token(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool.clone(), auth_context());

    let tokens = log_in(&server).await;

    server
        .post("/auth/logout")
        .authorization_bearer("not-a-token")
        .json(&json!({ "refresh_token": tokens["refresh_token"] }))
        .await
        .assert_status(axum::http::StatusCode::NO_CONTENT);

    let denylisted: i64 = sqlx::query_scalar("select count(*) from access_token_denylist")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(denylisted, 0);
}

// --- login ---------------------------------------------------------------

#[sqlx::test]
async fn login_with_correct_credentials_issues_a_token_pair(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool, auth_context());

    let body = log_in(&server).await;

    assert_eq!(body["token_type"], "Bearer");
    assert!(body["expires_in"].as_i64().unwrap() > 0);
    assert!(!body["access_token"].as_str().unwrap().is_empty());
    // The refresh token is opaque, not a JWT — that is the whole point of it.
    assert!(!body["refresh_token"].as_str().unwrap().contains('.'));
    assert!(body["refresh_token_expires_at"].is_string());
}

#[sqlx::test]
async fn login_with_the_wrong_password_is_unauthorized(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool.clone(), auth_context());

    let response = server
        .post("/auth/login")
        .json(&json!({ "email": EMAIL, "password": "not the password" }))
        .await;

    response.assert_status_unauthorized();

    let issued: i64 = sqlx::query_scalar("select count(*) from refresh_tokens")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(issued, 0, "a failed login must not mint a refresh token");
}

#[sqlx::test]
async fn login_with_an_unknown_address_is_unauthorized(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool, auth_context());

    server
        .post("/auth/login")
        .json(&json!({ "email": "nobody@example.com", "password": PASSWORD }))
        .await
        .assert_status_unauthorized();
}

/// ADR-0011 requires an access-audit log from v1.
#[sqlx::test]
async fn login_and_logout_are_written_to_the_access_audit_log(pool: PgPool) {
    let (athlete_id, _) = seed_athlete(&pool).await;
    let server = server_with(pool.clone(), auth_context());

    server
        .post("/auth/login")
        .json(&json!({ "email": EMAIL, "password": "wrong" }))
        .await
        .assert_status_unauthorized();

    let tokens = log_in(&server).await;

    server
        .post("/auth/logout")
        .json(&json!({ "refresh_token": tokens["refresh_token"] }))
        .await
        .assert_status(axum::http::StatusCode::NO_CONTENT);

    let actions: Vec<String> = sqlx::query_scalar(
        "select action from access_audit_log where athlete_id = $1 order by id",
    )
    .bind(athlete_id)
    .fetch_all(&pool)
    .await
    .unwrap();

    assert_eq!(
        actions,
        vec!["auth.login.failed", "auth.login.succeeded", "auth.logout"]
    );
}

/// A database dump must not yield usable credentials.
#[sqlx::test]
async fn the_refresh_token_is_stored_only_as_a_hash(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool.clone(), auth_context());

    let tokens = log_in(&server).await;
    let secret = tokens["refresh_token"].as_str().unwrap();

    let matches: i64 = sqlx::query_scalar(
        "select count(*) from refresh_tokens where encode(token_hash, 'escape') = $1",
    )
    .bind(secret)
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(matches, 0);

    let hash_len: i32 = sqlx::query_scalar("select length(token_hash) from refresh_tokens")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(hash_len, 32, "expected a SHA-256 digest");
}

// --- access tokens and the extractor ------------------------------------

#[sqlx::test]
async fn a_valid_access_token_identifies_the_athlete_and_their_teams(pool: PgPool) {
    let (athlete_id, team_id) = seed_athlete(&pool).await;
    let server = server_with(pool, auth_context());

    let tokens = log_in(&server).await;

    let response = server
        .get("/auth/me")
        .authorization_bearer(tokens["access_token"].as_str().unwrap())
        .await;

    response.assert_status_ok();
    response.assert_json(&json!({
        "athlete_id": athlete_id,
        "memberships": [{ "team_id": team_id, "role": "owner" }],
    }));
}

#[sqlx::test]
async fn a_protected_route_without_a_token_is_unauthorized(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool, auth_context());

    server.get("/auth/me").await.assert_status_unauthorized();

    // A present-but-nonsense header is the same answer: 401, never 403.
    server
        .get("/auth/me")
        .authorization_bearer("not-a-token")
        .await
        .assert_status_unauthorized();
}

#[sqlx::test]
async fn an_expired_access_token_is_rejected(pool: PgPool) {
    seed_athlete(&pool).await;
    let auth = auth_context();
    let expired = sign_claims(
        &auth,
        auth.keys.signing_kid(),
        &auth.keys,
        Utc::now().timestamp() - 3600,
    );
    let server = server_with(pool, auth);

    server
        .get("/auth/me")
        .authorization_bearer(&expired)
        .await
        .assert_status_unauthorized();
}

#[sqlx::test]
async fn a_tampered_access_token_is_rejected(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool, auth_context());

    let tokens = log_in(&server).await;
    let token = tokens["access_token"].as_str().unwrap();

    // Flip the last character of the signature, leaving the header and payload
    // — and therefore the `kid` — intact.
    let mut tampered: Vec<char> = token.chars().collect();
    let last = tampered.len() - 1;
    tampered[last] = if tampered[last] == 'A' { 'B' } else { 'A' };
    let tampered: String = tampered.into_iter().collect();

    server
        .get("/auth/me")
        .authorization_bearer(&tampered)
        .await
        .assert_status_unauthorized();
}

/// The dangerous case: a well-formed token claiming a `kid` this process knows,
/// but signed by a key it does not hold.
#[sqlx::test]
async fn an_access_token_signed_with_another_key_is_rejected(pool: PgPool) {
    seed_athlete(&pool).await;
    let auth = auth_context();
    let impostor = auth_context();

    let forged = sign_claims(
        &auth,
        auth.keys.signing_kid(),
        &impostor.keys,
        Utc::now().timestamp() + 3600,
    );
    let server = server_with(pool, auth);

    server
        .get("/auth/me")
        .authorization_bearer(&forged)
        .await
        .assert_status_unauthorized();
}

// --- refresh rotation and reuse detection -------------------------------

#[sqlx::test]
async fn refresh_rotates_the_token_and_retires_the_old_one(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool, auth_context());

    let first = log_in(&server).await;

    let response = server
        .post("/auth/refresh")
        .json(&json!({ "refresh_token": first["refresh_token"] }))
        .await;
    response.assert_status_ok();
    let second: serde_json::Value = response.json();

    assert_ne!(first["refresh_token"], second["refresh_token"]);

    // The successor works...
    server
        .get("/auth/me")
        .authorization_bearer(second["access_token"].as_str().unwrap())
        .await
        .assert_status_ok();

    // ...and the token it replaced does not.
    server
        .post("/auth/refresh")
        .json(&json!({ "refresh_token": first["refresh_token"] }))
        .await
        .assert_status_unauthorized();
}

/// Two parties holding the same refresh token means one of them stole it, and
/// we cannot tell which — so both lose the session.
#[sqlx::test]
async fn reusing_a_consumed_refresh_token_revokes_the_whole_family(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool.clone(), auth_context());

    let first = log_in(&server).await;

    let second: serde_json::Value = server
        .post("/auth/refresh")
        .json(&json!({ "refresh_token": first["refresh_token"] }))
        .await
        .json();

    // The thief replays the spent token.
    server
        .post("/auth/refresh")
        .json(&json!({ "refresh_token": first["refresh_token"] }))
        .await
        .assert_status_unauthorized();

    // The legitimate holder's live token is collateral damage, by design.
    server
        .post("/auth/refresh")
        .json(&json!({ "refresh_token": second["refresh_token"] }))
        .await
        .assert_status_unauthorized();

    let live: i64 =
        sqlx::query_scalar("select count(*) from refresh_tokens where revoked_at is null")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(live, 0);

    let reason: String = sqlx::query_scalar("select distinct revoked_reason from refresh_tokens")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(reason, "reuse_detected");
}

#[sqlx::test]
async fn logout_revokes_the_refresh_token(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool, auth_context());

    let tokens = log_in(&server).await;

    server
        .post("/auth/logout")
        .json(&json!({ "refresh_token": tokens["refresh_token"] }))
        .await
        .assert_status(axum::http::StatusCode::NO_CONTENT);

    server
        .post("/auth/refresh")
        .json(&json!({ "refresh_token": tokens["refresh_token"] }))
        .await
        .assert_status_unauthorized();

    // Idempotent, and it reveals nothing about whether the token was real.
    server
        .post("/auth/logout")
        .json(&json!({ "refresh_token": tokens["refresh_token"] }))
        .await
        .assert_status(axum::http::StatusCode::NO_CONTENT);
}

// --- JWKS ----------------------------------------------------------------

#[sqlx::test]
async fn jwks_publishes_the_key_that_signed_the_access_token(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool, auth_context());

    let tokens = log_in(&server).await;
    let header = jsonwebtoken::decode_header(tokens["access_token"].as_str().unwrap())
        .expect("the access token has a readable header");

    assert_eq!(header.alg, Algorithm::EdDSA);
    let kid = header.kid.expect("the access token names its key");

    let response = server.get("/.well-known/jwks.json").await;
    response.assert_status_ok();
    let jwks: serde_json::Value = response.json();

    let key = jwks["keys"]
        .as_array()
        .expect("the JWKS has a keys array")
        .iter()
        .find(|key| key["kid"] == kid.as_str())
        .expect("the JWKS publishes the key the token was signed with");

    assert_eq!(key["kty"], "OKP");
    assert_eq!(key["crv"], "Ed25519");
    assert_eq!(key["alg"], "EdDSA");
    assert_eq!(key["use"], "sig");
    assert!(!key["x"].as_str().unwrap().is_empty());
}

/// A retired key stays in the JWKS so tokens minted before a rotation still
/// verify — this is what makes rotation possible without a flag day.
#[sqlx::test]
async fn jwks_publishes_retired_verification_keys_alongside_the_signer(pool: PgPool) {
    let retired_kid = "retired-2026-01";
    let mut config = AuthConfig::ephemeral_for_development();
    config.additional_verification_keys = vec![(
        retired_kid.to_owned(),
        // 32 zero bytes, base64url — the shape is what matters here.
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA".to_owned(),
    )];

    let auth = Arc::new(AuthContext::new(config).expect("the key ring should build"));
    let signing_kid = auth.keys.signing_kid().to_owned();
    let server = server_with(pool, auth);

    let jwks: serde_json::Value = server.get("/.well-known/jwks.json").await.json();
    let kids: Vec<&str> = jwks["keys"]
        .as_array()
        .unwrap()
        .iter()
        .map(|key| key["kid"].as_str().unwrap())
        .collect();

    assert!(kids.contains(&retired_kid));
    assert!(kids.contains(&signing_kid.as_str()));
}

// --- helpers -------------------------------------------------------------

/// Signs a claim set with an arbitrary key under an arbitrary `kid`, so tests
/// can produce tokens the API would never issue itself.
fn sign_claims(auth: &AuthContext, kid: &str, signer: &KeyRing, exp: i64) -> String {
    let claims = AccessClaims {
        sub: Uuid::now_v7(),
        iss: auth.config.issuer.clone(),
        aud: auth.config.audience.clone(),
        exp,
        iat: exp - 900,
        jti: Uuid::now_v7(),
    };

    let mut header = Header::new(Algorithm::EdDSA);
    header.kid = Some(kid.to_owned());

    jsonwebtoken::encode(&header, &claims, signer.encoding_key()).expect("failed to sign")
}

// --- the per-account throttle (ADR-0017) ----------------------------------

/// The verifier-side SHALL of SP 800-63B-4 s3.2.2, live: after five
/// consecutive failures the address waits, and the refusal names the wait.
#[sqlx::test]
async fn five_failures_throttle_the_address_even_with_the_right_password(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool, auth_context());

    for _ in 0..5 {
        server
            .post("/auth/login")
            .json(&json!({ "email": EMAIL, "password": "wrong password entirely" }))
            .await
            .assert_status_unauthorized();
    }

    // The sixth attempt is refused before it is evaluated - even the RIGHT
    // password waits, which is what makes the guess budget real.
    let throttled = server
        .post("/auth/login")
        .json(&json!({ "email": EMAIL, "password": PASSWORD }))
        .await;
    throttled.assert_status(axum::http::StatusCode::TOO_MANY_REQUESTS);

    // Retry-After (RFC 9110) carries the machine-readable wait, and the body
    // says nothing that distinguishes a real address from an unknown one.
    let retry_after: u64 = throttled
        .headers()
        .get("retry-after")
        .expect("a 429 must carry Retry-After")
        .to_str()
        .unwrap()
        .parse()
        .expect("Retry-After must be integer seconds");
    assert!((1..=30).contains(&retry_after), "got {retry_after}");

    let problem: serde_json::Value = throttled.json();
    assert_eq!(problem["status"], 429);
    let detail = problem["detail"].as_str().unwrap().to_lowercase();
    assert!(
        !detail.contains("account"),
        "must not confirm an account exists: {detail}"
    );
    assert!(
        !detail.contains("unknown"),
        "must not deny one either: {detail}"
    );
}

/// The throttle is keyed on the submitted address, so an address with no
/// account throttles identically - anything else would be an oracle.
#[sqlx::test]
async fn an_unknown_address_throttles_identically(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool, auth_context());

    let known = throttle_response(&server, EMAIL).await;
    let unknown = throttle_response(&server, "nobody@example.com").await;

    assert_eq!(known.0, unknown.0, "status must match");
    assert_eq!(known.1, unknown.1, "body must match");
}

/// Drives an address to its first throttled response and returns it.
async fn throttle_response(
    server: &TestServer,
    email: &str,
) -> (axum::http::StatusCode, serde_json::Value) {
    for _ in 0..5 {
        server
            .post("/auth/login")
            .json(&json!({ "email": email, "password": "wrong password entirely" }))
            .await
            .assert_status_unauthorized();
    }
    let response = server
        .post("/auth/login")
        .json(&json!({ "email": email, "password": "wrong password entirely" }))
        .await;
    (response.status_code(), response.json())
}

/// A success ends the run: four failures are free, and after signing in the
/// counter starts over rather than accumulating toward the fifth.
#[sqlx::test]
async fn a_successful_login_resets_the_run_of_failures(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool.clone(), auth_context());

    for round in 0..2 {
        for _ in 0..4 {
            server
                .post("/auth/login")
                .json(&json!({ "email": EMAIL, "password": "wrong password entirely" }))
                .await
                .assert_status_unauthorized();
        }
        server
            .post("/auth/login")
            .json(&json!({ "email": EMAIL, "password": PASSWORD }))
            .await
            .assert_status_ok();

        // The row is deleted on success, not zeroed - state exists only for
        // addresses currently failing (round {round}).
        let rows: i64 = sqlx::query_scalar("select count(*) from login_throttle")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(rows, 0, "round {round}");
    }
}

/// Case and whitespace variants of an address share one run of failures -
/// the throttle folds exactly what login's lower(email) comparison folds.
#[sqlx::test]
async fn address_case_variants_share_one_throttle(pool: PgPool) {
    seed_athlete(&pool).await;
    let server = server_with(pool, auth_context());

    for email in [EMAIL, "athlete@example.com", " athlete@EXAMPLE.com "] {
        server
            .post("/auth/login")
            .json(&json!({ "email": email, "password": "wrong password entirely" }))
            .await
            .assert_status_unauthorized();
    }
    for _ in 0..2 {
        server
            .post("/auth/login")
            .json(&json!({ "email": EMAIL, "password": "wrong password entirely" }))
            .await
            .assert_status_unauthorized();
    }

    server
        .post("/auth/login")
        .json(&json!({ "email": "athlete@Example.Com", "password": PASSWORD }))
        .await
        .assert_status(axum::http::StatusCode::TOO_MANY_REQUESTS);
}
