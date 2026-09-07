//! Ownership, immutable revisions and the lifecycle of unlisted workout links.
use athletos_api::{app, state::AppState};
use axum::http::StatusCode;
use axum_test::TestServer;
use serde_json::{json, Value};
use sqlx::PgPool;

fn server(pool: PgPool) -> TestServer {
    TestServer::new(app(AppState::with_ephemeral_auth(pool)))
}

async fn register(server: &TestServer, email: &str) -> String {
    let response = server.post("/v1/auth/register").json(&json!({
        "email":email,"display_name":"Workout athlete", "password":"correct horse battery staple"
    })).await;
    response.assert_status(StatusCode::CREATED);
    response.json::<Value>()["access_token"]
        .as_str()
        .unwrap()
        .to_owned()
}

fn content(title: &str) -> Value {
    json!({"title":title,"description":"A repeatable session","blocks":[
        {"exercise":"squat","lifts":[{"sets":3,"reps":5,"weight":81.0,"amrap":false}]},
        {"exercise":"squat","lifts":[{"sets":1,"reps":8,"weight":60.0,"amrap":true}]}
    ]})
}

async fn create(server: &TestServer, token: &str, title: &str) -> Value {
    let response = server
        .post("/v1/workout-definitions")
        .authorization_bearer(token)
        .json(&content(title))
        .await;
    response.assert_status(StatusCode::CREATED);
    response.json()
}

#[sqlx::test(migrations = "./migrations")]
async fn definitions_are_private_and_every_mutation_checks_ownership(pool: PgPool) {
    let server = server(pool);
    let owner = register(&server, "owner@example.com").await;
    let other = register(&server, "other@example.com").await;
    let definition = create(&server, &owner, "Pull day").await;
    let id = definition["id"].as_str().unwrap();
    let path = format!("/v1/workout-definitions/{id}");
    assert_eq!(definition["revision"], 1);
    server
        .get(&path)
        .await
        .assert_status(StatusCode::UNAUTHORIZED);
    server
        .get(&path)
        .authorization_bearer(&other)
        .await
        .assert_status(StatusCode::NOT_FOUND);
    let mut edit = content("Stolen workout");
    edit["expected_revision"] = json!(1);
    server
        .patch(&path)
        .authorization_bearer(&other)
        .json(&edit)
        .await
        .assert_status(StatusCode::NOT_FOUND);
    server
        .delete(&path)
        .authorization_bearer(&other)
        .await
        .assert_status(StatusCode::NOT_FOUND);
    for suffix in ["copies", "shares"] {
        server
            .post(&format!("{path}/{suffix}"))
            .authorization_bearer(&other)
            .json(&json!({"revision":1}))
            .await
            .assert_status(StatusCode::NOT_FOUND);
    }
    server
        .get(&format!("{path}/shares"))
        .authorization_bearer(&other)
        .await
        .assert_status(StatusCode::NOT_FOUND);
    let list = server
        .get("/v1/workout-definitions")
        .authorization_bearer(&other)
        .await
        .json::<Value>();
    assert_eq!(list["workouts"], json!([]));
    assert_eq!(
        server
            .get(&path)
            .authorization_bearer(&owner)
            .await
            .json::<Value>()["title"],
        "Pull day"
    );
}

#[sqlx::test(migrations = "./migrations")]
async fn edits_append_revisions_and_stale_writes_do_not_overwrite(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, "owner@example.com").await;
    let definition = create(&server, &token, "Original").await;
    let id = definition["id"].as_str().unwrap();
    let path = format!("/v1/workout-definitions/{id}");
    let mut edit = content("Revised");
    edit["expected_revision"] = json!(1);
    let updated = server
        .patch(&path)
        .authorization_bearer(&token)
        .json(&edit)
        .await;
    updated.assert_status_ok();
    assert_eq!(updated.json::<Value>()["revision"], 2);
    edit["title"] = json!("Stale draft");
    server
        .patch(&path)
        .authorization_bearer(&token)
        .json(&edit)
        .await
        .assert_status(StatusCode::CONFLICT);
    let rows: Vec<(i32, Value)> = sqlx::query_as(
        "select revision,document from workout_revisions where definition_id=$1 order by revision",
    )
    .bind(id.parse::<uuid::Uuid>().unwrap())
    .fetch_all(&pool)
    .await
    .unwrap();
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0].1["title"], "Original");
    assert_eq!(rows[1].1["title"], "Revised");
    assert_eq!(rows[0].1["blocks"][0]["lifts"][0]["weight"], 81.0);
    let copy = server
        .post(&format!("{path}/copies"))
        .authorization_bearer(&token)
        .json(&json!({"revision":1}))
        .await;
    copy.assert_status(StatusCode::CREATED);
    let copied = copy.json::<Value>();
    assert_ne!(copied["id"], definition["id"]);
    assert_eq!(copied["title"], "Original");
    server
        .delete(&path)
        .authorization_bearer(&token)
        .await
        .assert_status(StatusCode::NO_CONTENT);
    let list = server
        .get("/v1/workout-definitions")
        .authorization_bearer(&token)
        .await
        .json::<Value>();
    assert_eq!(list["workouts"].as_array().unwrap().len(), 1);
    assert_eq!(list["workouts"][0]["id"], copied["id"]);
    let archived = server
        .get(&path)
        .authorization_bearer(&token)
        .await
        .json::<Value>();
    assert_eq!(archived["archived"], true);
    let count: i64 =
        sqlx::query_scalar("select count(*) from workout_revisions where definition_id=$1")
            .bind(id.parse::<uuid::Uuid>().unwrap())
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(count, 2);
}

#[sqlx::test(migrations = "./migrations")]
async fn shared_links_pin_revisions_and_revocation_preserves_independent_copies(pool: PgPool) {
    let server = server(pool.clone());
    let owner = register(&server, "owner@example.com").await;
    let recipient = register(&server, "recipient@example.com").await;
    let definition = create(&server, &owner, "Shared original").await;
    let id = definition["id"].as_str().unwrap();
    let path = format!("/v1/workout-definitions/{id}");
    let share_response = server
        .post(&format!("{path}/shares"))
        .authorization_bearer(&owner)
        .json(&json!({"revision":1}))
        .await;
    share_response.assert_status(StatusCode::CREATED);
    share_response.assert_header("cache-control", "private, no-store");
    let share = share_response.json::<Value>();
    let token = share["token"].as_str().unwrap();
    let share_id = share["id"].as_str().unwrap();
    let preview_path = format!("/v1/shared-workouts/{token}");
    let digest: Vec<u8> = sqlx::query_scalar("select token_hash from workout_shares where id=$1")
        .bind(share_id.parse::<uuid::Uuid>().unwrap())
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(digest.len(), 32);
    assert_ne!(digest, token.as_bytes());
    let mut edit = content("New revision");
    edit["expected_revision"] = json!(1);
    server
        .patch(&path)
        .authorization_bearer(&owner)
        .json(&edit)
        .await
        .assert_status_ok();
    let preview = server.get(&preview_path).await;
    preview.assert_status_ok();
    preview.assert_header("cache-control", "private, no-store");
    preview.assert_header("referrer-policy", "no-referrer");
    let body = preview.json::<Value>();
    assert_eq!(body["title"], "Shared original");
    assert_eq!(body["revision"], 1);
    for private in ["athlete_id", "email", "id", "history", "maxes"] {
        assert!(body.get(private).is_none());
    }
    server
        .post(&format!("{preview_path}/copies"))
        .await
        .assert_status(StatusCode::UNAUTHORIZED);
    let copy = server
        .post(&format!("{preview_path}/copies"))
        .authorization_bearer(&recipient)
        .await;
    copy.assert_status(StatusCode::CREATED);
    let copied = copy.json::<Value>();
    let copy_path = format!("/v1/workout-definitions/{}", copied["id"].as_str().unwrap());
    let revoke_path = format!("{path}/shares/{share_id}");
    server
        .delete(&revoke_path)
        .authorization_bearer(&recipient)
        .await
        .assert_status(StatusCode::NOT_FOUND);
    server
        .delete(&revoke_path)
        .authorization_bearer(&owner)
        .await
        .assert_status(StatusCode::NO_CONTENT);
    server
        .get(&preview_path)
        .await
        .assert_status(StatusCode::NOT_FOUND);
    server
        .post(&format!("{preview_path}/copies"))
        .authorization_bearer(&recipient)
        .await
        .assert_status(StatusCode::NOT_FOUND);
    server
        .get(&copy_path)
        .authorization_bearer(&owner)
        .await
        .assert_status(StatusCode::NOT_FOUND);
    edit["title"] = json!("Recipient edit");
    server
        .patch(&copy_path)
        .authorization_bearer(&recipient)
        .json(&edit)
        .await
        .assert_status_ok();
    assert_eq!(
        server
            .get(&path)
            .authorization_bearer(&owner)
            .await
            .json::<Value>()["title"],
        "New revision"
    );
}

#[sqlx::test(migrations = "./migrations")]
async fn archive_revokes_links_and_cannot_be_shared_again(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, "owner@example.com").await;
    let definition = create(&server, &token, "Archive me").await;
    let path = format!(
        "/v1/workout-definitions/{}",
        definition["id"].as_str().unwrap()
    );
    let shares_path = format!("{path}/shares");
    let share = server
        .post(&shares_path)
        .authorization_bearer(&token)
        .json(&json!({"revision":1}))
        .await
        .json::<Value>();
    let preview = format!("/v1/shared-workouts/{}", share["token"].as_str().unwrap());
    server
        .delete(&path)
        .authorization_bearer(&token)
        .await
        .assert_status(StatusCode::NO_CONTENT);
    server
        .delete(&path)
        .authorization_bearer(&token)
        .await
        .assert_status(StatusCode::NO_CONTENT);
    server
        .get(&preview)
        .await
        .assert_status(StatusCode::NOT_FOUND);
    server
        .post(&shares_path)
        .authorization_bearer(&token)
        .json(&json!({"revision":1}))
        .await
        .assert_status(StatusCode::NOT_FOUND);
    let shares = server
        .get(&shares_path)
        .authorization_bearer(&token)
        .await
        .json::<Value>();
    assert!(shares["shares"][0]["revoked_at"].is_string());
}

#[sqlx::test(migrations = "./migrations")]
async fn validation_bounds_expansion_and_accepts_repeated_exercises(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, "owner@example.com").await;
    create(&server, &token, "Repeated exercises").await;
    let mut cases = Vec::new();
    let mut invalid = content("   ");
    cases.push(invalid.clone());
    invalid = content("Unknown");
    invalid["blocks"][0]["exercise"] = json!("made-up");
    cases.push(invalid.clone());
    invalid = content("Too many");
    invalid["blocks"][0]["lifts"][0]["sets"] = json!(500);
    cases.push(invalid.clone());
    invalid = content("Zero sets");
    invalid["blocks"][0]["lifts"][0]["sets"] = json!(0);
    cases.push(invalid.clone());
    invalid = content("Too many reps");
    invalid["blocks"][0]["lifts"][0]["reps"] = json!(1001);
    cases.push(invalid.clone());
    invalid = content("Heavy");
    invalid["blocks"][0]["lifts"][0]["weight"] = json!(1000.1);
    cases.push(invalid.clone());
    invalid = content("Empty");
    invalid["blocks"] = json!([]);
    cases.push(invalid);
    for body in cases {
        server
            .post("/v1/workout-definitions")
            .authorization_bearer(&token)
            .json(&body)
            .await
            .assert_status(StatusCode::UNPROCESSABLE_ENTITY);
    }
}

#[sqlx::test(migrations = "./migrations")]
async fn concurrent_editors_create_only_one_new_revision(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, "owner@example.com").await;
    let definition = create(&server, &token, "Original").await;
    let path = format!(
        "/v1/workout-definitions/{}",
        definition["id"].as_str().unwrap()
    );
    let mut first = content("Editor one");
    first["expected_revision"] = json!(1);
    let mut second = content("Editor two");
    second["expected_revision"] = json!(1);
    let (left, right) = tokio::join!(
        async {
            server
                .patch(&path)
                .authorization_bearer(&token)
                .json(&first)
                .await
        },
        async {
            server
                .patch(&path)
                .authorization_bearer(&token)
                .json(&second)
                .await
        }
    );
    let mut statuses = vec![left.status_code(), right.status_code()];
    statuses.sort();
    assert_eq!(statuses, vec![StatusCode::OK, StatusCode::CONFLICT]);
    let count: i64 = sqlx::query_scalar("select count(*) from workout_revisions")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 2);
}
