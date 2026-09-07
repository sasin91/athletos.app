//! Edited sessions keep stable origins and advance only their captured program state.
use athletos_api::{app, state::AppState};
use axum::http::StatusCode;
use axum_test::TestServer;
use serde_json::{json, Value};
use sqlx::PgPool;
use uuid::Uuid;

fn server(pool: PgPool) -> TestServer {
    TestServer::new(app(AppState::with_ephemeral_auth(pool)))
}

async fn register(server: &TestServer, email: &str) -> String {
    let response=server.post("/v1/auth/register").json(&json!({"email":email,"display_name":"Workout athlete","password":"correct horse battery staple"})).await;
    response.assert_status(StatusCode::CREATED);
    response.json::<Value>()["access_token"]
        .as_str()
        .unwrap()
        .to_owned()
}

async fn enroll(server: &TestServer, token: &str) -> Uuid {
    server
        .put("/v1/athlete/maxes")
        .authorization_bearer(token)
        .json(&json!({"maxes":{"squat":140,"bench":100,"deadlift":180,"military-press":60}}))
        .await
        .assert_status_ok();
    let response = server
        .post("/v1/enrollments")
        .authorization_bearer(token)
        .json(&json!({"program_key":"wendler-531-bbb"}))
        .await;
    response.assert_status(StatusCode::CREATED);
    response.json::<Value>()["id"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap()
}

async fn prepare(server: &TestServer, token: &str, enrollment: Uuid, id: Uuid) -> Value {
    let response = server
        .post("/v2/session-drafts")
        .authorization_bearer(token)
        .json(&json!({"id":id,"enrollment_id":enrollment}))
        .await;
    response.assert_status_ok();
    response.json()
}

fn submission(session: &Value, id: Uuid) -> Value {
    let sets:Vec<_>=session["sets"].as_array().unwrap().iter().enumerate().map(|(position,set)|json!({
        "id":set["id"],"block_id":set["block_id"],"origin_id":set["id"],"position":position,
        "exercise":set["exercise"],"prescribed_weight":set["prescribed_weight"],"prescribed_reps":set["prescribed_reps"],
        "committed_weight":set["prescribed_weight"],"committed_reps":set["prescribed_reps"],"amrap":set["amrap"],
        "removed":false,"actual_weight":set["prescribed_weight"],"actual_reps":set["prescribed_reps"],
        "status":"done","logged_at":null,"note":null,"drift_reason":null
    })).collect();
    json!({"id":id,"title":session["title"],"source":session["source"],"definition_id":session["definition_id"],"revision":session["revision"],"draft_id":session["draft_id"],
        "started_at":"2026-09-07T09:00:00Z","ended_at":"2026-09-07T10:00:00Z","outcome":"completed","cut_reason":null,"notes":null,"sets":sets})
}

fn added_set(position: usize) -> Value {
    json!({"id":Uuid::now_v7(),"block_id":Uuid::now_v7(),"origin_id":null,"position":position,"exercise":"squat",
        "prescribed_weight":100.0,"prescribed_reps":5,"committed_weight":100.0,"committed_reps":5,"amrap":false,
        "removed":false,"actual_weight":100.0,"actual_reps":5,"status":"done","logged_at":null,"note":"Added accessory","drift_reason":null})
}

fn ad_hoc(id: Uuid) -> Value {
    json!({"id":id,"title":"Quick workout","source":"ad_hoc","definition_id":null,"revision":null,"draft_id":null,
        "started_at":"2026-09-07T09:00:00Z","ended_at":"2026-09-07T10:00:00Z","outcome":"completed","cut_reason":null,"notes":null,"sets":[added_set(0)]})
}

#[sqlx::test(migrations = "./migrations")]
async fn saved_revision_identity_survives_edit_archive_and_offline_submission(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, "owner@example.com").await;
    let enrollment = enroll(&server, &token).await;
    let before: (Value, i64) = sqlx::query_as("select state,revision from enrollments where id=$1")
        .bind(enrollment)
        .fetch_one(&pool)
        .await
        .unwrap();
    let content = json!({"title":"Pull day","description":null,"blocks":[{"exercise":"squat","lifts":[{"sets":2,"reps":5,"weight":81.0,"amrap":false}]}]});
    let definition = server
        .post("/v1/workout-definitions")
        .authorization_bearer(&token)
        .json(&content)
        .await
        .json::<Value>();
    let id = definition["id"].as_str().unwrap();
    let definition_path = format!("/v1/workout-definitions/{id}");
    let session_path = format!("{definition_path}/revisions/1/session");
    let response = server.get(&session_path).authorization_bearer(&token).await;
    response.assert_status_ok();
    let session = response.json::<Value>();
    let again = server
        .get(&session_path)
        .authorization_bearer(&token)
        .await
        .json::<Value>();
    assert_eq!(session["sets"], again["sets"]);
    assert_eq!(session["sets"][0]["prescribed_weight"], 80.0);
    assert_ne!(session["sets"][0]["id"], session["sets"][1]["id"]);
    let mut edit = content.clone();
    edit["expected_revision"] = json!(1);
    edit["title"] = json!("Changed elsewhere");
    server
        .patch(&definition_path)
        .authorization_bearer(&token)
        .json(&edit)
        .await
        .assert_status_ok();
    server
        .delete(&definition_path)
        .authorization_bearer(&token)
        .await
        .assert_status(StatusCode::NO_CONTENT);
    let workout_id = Uuid::now_v7();
    let mut body = submission(&session, workout_id);
    let rows = body["sets"].as_array_mut().unwrap();
    rows[1]["removed"] = json!(true);
    rows[1]["status"] = json!("skipped");
    rows[1]["actual_weight"] = Value::Null;
    rows[1]["actual_reps"] = Value::Null;
    rows.push(added_set(2));
    let response = server
        .post("/v2/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    response.assert_status(StatusCode::CREATED);
    let receipt = response.json::<Value>();
    assert_eq!(receipt["progression"], "none");
    assert!(receipt["progress"].is_null());
    assert_eq!(receipt["title"], "Pull day");
    let duplicate = server
        .post("/v2/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    duplicate.assert_status_ok();
    assert_eq!(duplicate.json::<Value>()["duplicate"], true);
    let after: (Value, i64) = sqlx::query_as("select state,revision from enrollments where id=$1")
        .bind(enrollment)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(before, after);
    let persisted: (Option<Uuid>, String, Value) =
        sqlx::query_as("select enrollment_id,title,baseline from workouts where id=$1")
            .bind(workout_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert!(persisted.0.is_none());
    assert_eq!(persisted.1, "Pull day");
    assert_eq!(persisted.2["sets"], session["sets"]);
    let sets:Vec<(Uuid,Option<Uuid>,bool)>=sqlx::query_as("select stable_id,origin_id,removed from workout_sets where workout_id=$1 order by position").bind(workout_id).fetch_all(&pool).await.unwrap();
    assert_eq!(sets.len(), 3);
    assert_eq!(sets[0].0, sets[0].1.unwrap());
    assert!(sets[1].2);
    assert!(sets[2].1.is_none());
    server
        .get(&format!("/v1/workouts/{workout_id}"))
        .authorization_bearer(&token)
        .await
        .assert_status(StatusCode::NOT_FOUND);
    server
        .get(&format!("/v2/workouts/{workout_id}"))
        .authorization_bearer(&token)
        .await
        .assert_status_ok();
}

#[sqlx::test(migrations = "./migrations")]
async fn heavier_same_exercise_addition_cannot_replace_removed_program_top_set(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, "owner@example.com").await;
    let enrollment = enroll(&server, &token).await;
    let draft = Uuid::now_v7();
    let session = prepare(&server, &token, enrollment, draft).await;
    assert_eq!(session, prepare(&server, &token, enrollment, draft).await);
    let before: Value = sqlx::query_scalar("select state from enrollments where id=$1")
        .bind(enrollment)
        .fetch_one(&pool)
        .await
        .unwrap();
    let mut body = submission(&session, Uuid::now_v7());
    let rows = body["sets"].as_array_mut().unwrap();
    let top = rows
        .iter()
        .enumerate()
        .filter(|(_, s)| s["amrap"] == true)
        .max_by(|(_, a), (_, b)| {
            a["prescribed_weight"]
                .as_f64()
                .unwrap()
                .total_cmp(&b["prescribed_weight"].as_f64().unwrap())
        })
        .map(|(i, _)| i)
        .expect("531 has an AMRAP main lift");
    let original = rows[top].clone();
    rows[top]["removed"] = json!(true);
    rows[top]["status"] = json!("skipped");
    rows[top]["actual_weight"] = Value::Null;
    rows[top]["actual_reps"] = Value::Null;
    let mut accessory = added_set(rows.len());
    accessory["exercise"] = original["exercise"].clone();
    accessory["prescribed_weight"] = json!(original["prescribed_weight"].as_f64().unwrap() + 50.0);
    accessory["committed_weight"] = accessory["prescribed_weight"].clone();
    accessory["actual_weight"] = accessory["prescribed_weight"].clone();
    accessory["actual_reps"] = json!(20);
    rows.push(accessory);
    let response = server
        .post("/v2/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    response.assert_status(StatusCode::CREATED);
    assert_eq!(response.json::<Value>()["progression"], "applied");
    let projected = athletos_api::routes::editable_workouts::project(
        &serde_json::from_value(session.clone()).unwrap(),
        &serde_json::from_value(body.clone()).unwrap(),
    );
    assert_eq!(
        projected.sets.len(),
        session["sets"].as_array().unwrap().len()
    );
    assert_eq!(
        projected.sets[top].status,
        athletos_training::SetStatus::Skipped
    );
    assert_eq!(
        projected.sets[top].prescribed_weight,
        original["prescribed_weight"].as_f64().unwrap()
    );
    let program = athletos_training::programs::find("wendler-531-bbb").unwrap();
    let expected = program
        .advance(athletos_training::State::from_json(before), &projected)
        .unwrap();
    let (after, revision): (Value, i64) =
        sqlx::query_as("select state,revision from enrollments where id=$1")
            .bind(enrollment)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(&after, expected.as_json());
    assert_eq!(revision, 1);
    let advances = athletos_api::advances::load_advances(&pool, enrollment, program)
        .await
        .unwrap();
    assert_eq!(advances.len(), 1);
    assert_eq!(advances[0].recomputed.as_ref(), Some(&after));
    let count: i64 = sqlx::query_scalar(
        "select count(*) from enrollment_advances where enrollment_id=$1 and projection_version=2",
    )
    .bind(enrollment)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(count, 1);
}

#[sqlx::test(migrations = "./migrations")]
async fn stale_prepared_session_records_once_without_advancing_current_state(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, "owner@example.com").await;
    let enrollment = enroll(&server, &token).await;
    let first = prepare(&server, &token, enrollment, Uuid::now_v7()).await;
    let second = prepare(&server, &token, enrollment, Uuid::now_v7()).await;
    let first_body = submission(&first, Uuid::now_v7());
    let second_body = submission(&second, Uuid::now_v7());
    server
        .post("/v2/workouts")
        .authorization_bearer(&token)
        .json(&first_body)
        .await
        .assert_status(StatusCode::CREATED);
    let before: (Value, i64) = sqlx::query_as("select state,revision from enrollments where id=$1")
        .bind(enrollment)
        .fetch_one(&pool)
        .await
        .unwrap();
    let stale = server
        .post("/v2/workouts")
        .authorization_bearer(&token)
        .json(&second_body)
        .await;
    stale.assert_status(StatusCode::CREATED);
    assert_eq!(stale.json::<Value>()["progression"], "not_applied_stale");
    let retry = server
        .post("/v2/workouts")
        .authorization_bearer(&token)
        .json(&second_body)
        .await;
    retry.assert_status_ok();
    assert_eq!(retry.json::<Value>()["duplicate"], true);
    assert_eq!(retry.json::<Value>()["progression"], "not_applied_stale");
    let after: (Value, i64) = sqlx::query_as("select state,revision from enrollments where id=$1")
        .bind(enrollment)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(before, after);
    let count: i64 =
        sqlx::query_scalar("select count(*) from enrollment_advances where enrollment_id=$1")
            .bind(enrollment)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(count, 1);
    let mut reused = second_body.clone();
    reused["id"] = json!(Uuid::now_v7());
    server
        .post("/v2/workouts")
        .authorization_bearer(&token)
        .json(&reused)
        .await
        .assert_status(StatusCode::CONFLICT);
    assert!(
        athletos_api::advances::missing_advances(&pool, enrollment)
            .await
            .unwrap()
            .is_empty(),
        "the intentionally stale workout must not be reported as a missing advance"
    );
    sqlx::query("delete from enrollment_advances where enrollment_id=$1")
        .bind(enrollment)
        .execute(&pool)
        .await
        .unwrap();
    let missing = athletos_api::advances::missing_advances(&pool, enrollment)
        .await
        .unwrap();
    assert_eq!(
        missing,
        vec![first_body["id"].as_str().unwrap().parse::<Uuid>().unwrap()]
    );
}

#[sqlx::test(migrations = "./migrations")]
async fn duplicate_receipt_precedes_validation_and_ids_do_not_cross_owners_or_api_versions(
    pool: PgPool,
) {
    let server = server(pool.clone());
    let owner = register(&server, "owner@example.com").await;
    let other = register(&server, "other@example.com").await;
    let id = Uuid::now_v7();
    let body = ad_hoc(id);
    server
        .post("/v2/workouts")
        .authorization_bearer(&owner)
        .json(&body)
        .await
        .assert_status(StatusCode::CREATED);
    let mut invalid = body.clone();
    invalid["title"] = json!("");
    invalid["sets"] = json!([]);
    let retry = server
        .post("/v2/workouts")
        .authorization_bearer(&owner)
        .json(&invalid)
        .await;
    retry.assert_status_ok();
    assert_eq!(retry.json::<Value>()["duplicate"], true);
    server
        .post("/v2/workouts")
        .authorization_bearer(&other)
        .json(&body)
        .await
        .assert_status(StatusCode::CONFLICT);
    server
        .get(&format!("/v2/workouts/{id}"))
        .authorization_bearer(&other)
        .await
        .assert_status(StatusCode::NOT_FOUND);
    let enrollment = enroll(&server, &owner).await;
    let next = server
        .get(&format!("/v1/enrollments/{enrollment}/next-session"))
        .authorization_bearer(&owner)
        .await
        .json::<Value>();
    let legacy_sets:Vec<_>=next["prescribed_sets"].as_array().unwrap().iter().map(|s|json!({"position":s["position"],"exercise":s["exercise"],"prescribed_weight":s["prescribed_weight"],"prescribed_reps":s["prescribed_reps"],"actual_weight":s["prescribed_weight"],"actual_reps":s["prescribed_reps"],"status":"done"})).collect();
    let mut legacy = json!({"id":id,"enrollment_id":enrollment,"started_at":"2026-09-07T09:00:00Z","ended_at":"2026-09-07T10:00:00Z","outcome":"completed","sets":legacy_sets});
    server
        .post("/v1/workouts")
        .authorization_bearer(&owner)
        .json(&legacy)
        .await
        .assert_status(StatusCode::CONFLICT);
    let legacy_id = Uuid::now_v7();
    legacy["id"] = json!(legacy_id);
    server
        .post("/v1/workouts")
        .authorization_bearer(&owner)
        .json(&legacy)
        .await
        .assert_status(StatusCode::CREATED);
    server
        .post("/v2/workouts")
        .authorization_bearer(&owner)
        .json(&ad_hoc(legacy_id))
        .await
        .assert_status(StatusCode::CONFLICT);
    let draft = prepare(&server, &owner, enrollment, Uuid::now_v7()).await;
    server
        .post("/v2/workouts")
        .authorization_bearer(&other)
        .json(&submission(&draft, Uuid::now_v7()))
        .await
        .assert_status(StatusCode::NOT_FOUND);
    server
        .post("/v2/session-drafts")
        .authorization_bearer(&other)
        .json(&json!({"id":Uuid::now_v7(),"enrollment_id":enrollment}))
        .await
        .assert_status(StatusCode::NOT_FOUND);
}

#[sqlx::test(migrations = "./migrations")]
async fn invalid_origins_and_removing_logged_work_roll_back_without_consuming_draft(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, "owner@example.com").await;
    let enrollment = enroll(&server, &token).await;
    let session = prepare(&server, &token, enrollment, Uuid::now_v7()).await;
    let body = submission(&session, Uuid::now_v7());
    let mut variants = Vec::new();
    let mut invalid = body.clone();
    invalid["sets"][0]["logged_order"] = json!(0);
    invalid["sets"][1]["logged_order"] = json!(0);
    variants.push(invalid);
    let mut invalid = body.clone();
    invalid["sets"][0]["logged_order"] = json!(u32::MAX);
    variants.push(invalid);
    let mut invalid = body.clone();
    let rows = invalid["sets"].as_array_mut().unwrap();
    let mut unknown = added_set(rows.len());
    unknown["exercise"] = json!("unknown-exercise");
    rows.push(unknown);
    variants.push(invalid);
    let mut invalid = body.clone();
    invalid["sets"][0]["origin_id"] = json!(Uuid::now_v7());
    variants.push(invalid);
    let mut invalid = body.clone();
    invalid["sets"][0]["removed"] = json!(true);
    variants.push(invalid);
    let mut invalid = body.clone();
    invalid["sets"].as_array_mut().unwrap().remove(0);
    variants.push(invalid);
    let mut invalid = body.clone();
    invalid["sets"][1]["id"] = invalid["sets"][0]["id"].clone();
    variants.push(invalid);
    for invalid in variants {
        server
            .post("/v2/workouts")
            .authorization_bearer(&token)
            .json(&invalid)
            .await
            .assert_status(StatusCode::UNPROCESSABLE_ENTITY);
    }
    let count: i64 = sqlx::query_scalar("select count(*) from workouts where enrollment_id=$1")
        .bind(enrollment)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 0);
    server
        .post("/v2/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::CREATED);
}

#[sqlx::test(migrations = "./migrations")]
async fn simultaneous_submissions_serialize_program_state_and_standalone_retries(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, "owner@example.com").await;
    let standalone = ad_hoc(Uuid::now_v7());
    let (left, right) = tokio::join!(
        async {
            server
                .post("/v2/workouts")
                .authorization_bearer(&token)
                .json(&standalone)
                .await
        },
        async {
            server
                .post("/v2/workouts")
                .authorization_bearer(&token)
                .json(&standalone)
                .await
        }
    );
    let mut statuses = vec![left.status_code(), right.status_code()];
    statuses.sort();
    assert_eq!(statuses, vec![StatusCode::OK, StatusCode::CREATED]);
    assert_ne!(
        left.json::<Value>()["duplicate"],
        right.json::<Value>()["duplicate"]
    );
    let enrollment = enroll(&server, &token).await;
    let first = submission(
        &prepare(&server, &token, enrollment, Uuid::now_v7()).await,
        Uuid::now_v7(),
    );
    let second = submission(
        &prepare(&server, &token, enrollment, Uuid::now_v7()).await,
        Uuid::now_v7(),
    );
    let (left, right) = tokio::join!(
        async {
            server
                .post("/v2/workouts")
                .authorization_bearer(&token)
                .json(&first)
                .await
        },
        async {
            server
                .post("/v2/workouts")
                .authorization_bearer(&token)
                .json(&second)
                .await
        }
    );
    left.assert_status(StatusCode::CREATED);
    right.assert_status(StatusCode::CREATED);
    let mut dispositions = vec![
        left.json::<Value>()["progression"]
            .as_str()
            .unwrap()
            .to_owned(),
        right.json::<Value>()["progression"]
            .as_str()
            .unwrap()
            .to_owned(),
    ];
    dispositions.sort();
    assert_eq!(dispositions, vec!["applied", "not_applied_stale"]);
    let (revision, advances): (i64, i64) = sqlx::query_as("select revision,(select count(*) from enrollment_advances where enrollment_id=$1) from enrollments where id=$1")
        .bind(enrollment).fetch_one(&pool).await.unwrap();
    assert_eq!((revision, advances), (1, 1));
}

#[sqlx::test(migrations = "./migrations")]
async fn replay_refuses_missing_or_malformed_baselines_and_missing_origin_rows(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, "owner@example.com").await;
    let enrollment = enroll(&server, &token).await;
    let session = prepare(&server, &token, enrollment, Uuid::now_v7()).await;
    let id = Uuid::now_v7();
    let body = submission(&session, id);
    server
        .post("/v2/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::CREATED);
    let program = athletos_training::programs::find("wendler-531-bbb").unwrap();
    let healthy = athletos_api::advances::load_advances(&pool, enrollment, program)
        .await
        .unwrap();
    assert!(healthy[0].recomputed.is_some());
    let mut duplicate_origin = session.clone();
    let duplicate = duplicate_origin["sets"][0].clone();
    duplicate_origin["sets"]
        .as_array_mut()
        .unwrap()
        .push(duplicate);
    let mut missing_program_context = session.clone();
    missing_program_context["week"] = Value::Null;
    for malformed in [
        Some(json!({})),
        None,
        Some(duplicate_origin),
        Some(missing_program_context),
    ] {
        sqlx::query("update workouts set baseline=$2 where id=$1")
            .bind(id)
            .bind(malformed)
            .execute(&pool)
            .await
            .unwrap();
        let advances = athletos_api::advances::load_advances(&pool, enrollment, program)
            .await
            .expect("an unreadable workout must not abort the enrollment audit");
        assert!(
            advances[0].recomputed.is_none(),
            "missing source facts must be reported as a fold that could not run"
        );
    }
    sqlx::query("update workouts set baseline=$2 where id=$1")
        .bind(id)
        .bind(&session)
        .execute(&pool)
        .await
        .unwrap();
    // Deleting accessory work can leave program state unchanged. It must still
    // be an incomplete reconstruction, never a falsely clean verification.
    sqlx::query("delete from workout_sets where workout_id=$1 and position=(select max(position) from workout_sets where workout_id=$1)")
        .bind(id).execute(&pool).await.unwrap();
    let advances = athletos_api::advances::load_advances(&pool, enrollment, program)
        .await
        .unwrap();
    assert!(
        advances[0].recomputed.is_none(),
        "an absent baseline row is not an explicitly removed row"
    );
}

#[sqlx::test(migrations = "./migrations")]
async fn prepared_adjustments_and_committed_targets_remain_distinct_in_history(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, "owner@example.com").await;
    let enrollment = enroll(&server, &token).await;
    let unadjusted = prepare(&server, &token, enrollment, Uuid::now_v7()).await;
    let exercise = unadjusted["sets"][0]["exercise"].as_str().unwrap();
    let adjustment_path = format!("/v1/enrollments/{enrollment}/exercise-adjustments");
    server
        .put(&adjustment_path)
        .authorization_bearer(&token)
        .json(&json!({"adjustments":{exercise:-10}}))
        .await
        .assert_status_ok();
    let draft_id = Uuid::now_v7();
    let session = prepare(&server, &token, enrollment, draft_id).await;
    assert!(
        session["sets"][0]["prescribed_weight"].as_f64().unwrap()
            < unadjusted["sets"][0]["prescribed_weight"].as_f64().unwrap()
    );
    server
        .put(&adjustment_path)
        .authorization_bearer(&token)
        .json(&json!({"adjustments":{exercise:10}}))
        .await
        .assert_status_ok();
    assert_eq!(
        session,
        prepare(&server, &token, enrollment, draft_id).await
    );
    let id = Uuid::now_v7();
    let mut body = submission(&session, id);
    let source_weight = body["sets"][0]["prescribed_weight"].as_f64().unwrap();
    body["sets"][0]["committed_weight"] = json!(source_weight + 2.5);
    body["sets"][0]["prescribed_weight"] = json!(source_weight + 5.0);
    body["sets"][0]["actual_weight"] = json!(source_weight + 7.5);
    let response = server
        .post("/v2/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    response.assert_status(StatusCode::CREATED);
    assert_eq!(response.json::<Value>()["progression"], "applied");
    let detail = server
        .get(&format!("/v2/workouts/{id}"))
        .authorization_bearer(&token)
        .await
        .json::<Value>();
    assert_eq!(detail["sets"][0]["baseline_weight"], source_weight);
    assert_eq!(detail["sets"][0]["committed_weight"], source_weight + 2.5);
    assert_eq!(detail["sets"][0]["prescribed_weight"], source_weight + 5.0);
    assert_eq!(detail["sets"][0]["actual_weight"], source_weight + 7.5);
    assert_eq!(detail["changes"]["changed_sets"], 1);
    assert_eq!(detail["changes"]["source_changed_sets"], 1);
    assert_eq!(detail["changes"]["committed_changed_sets"], 1);
    let committed_load: f64 = body["sets"]
        .as_array()
        .unwrap()
        .iter()
        .map(|set| {
            set["committed_weight"].as_f64().unwrap() * set["committed_reps"].as_f64().unwrap()
        })
        .sum();
    let final_load: f64 = body["sets"]
        .as_array()
        .unwrap()
        .iter()
        .map(|set| {
            set["prescribed_weight"].as_f64().unwrap() * set["prescribed_reps"].as_f64().unwrap()
        })
        .sum();
    assert_eq!(detail["changes"]["committed_load_kg"], committed_load);
    assert_eq!(detail["changes"]["planned_load_kg"], final_load);
    assert_eq!(detail["changes"]["comparison_scope"], "enrollment");
    let baseline: Value = sqlx::query_scalar("select baseline from workouts where id=$1")
        .bind(id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(baseline["sets"], session["sets"]);
    let program = athletos_training::programs::find("wendler-531-bbb").unwrap();
    let advances = athletos_api::advances::load_advances(&pool, enrollment, program)
        .await
        .unwrap();
    assert_eq!(
        advances[0].recomputed.as_ref(),
        Some(&advances[0].state_after)
    );
}

#[sqlx::test(migrations = "./migrations")]
async fn adding_to_existing_block_preserves_origins_and_rejects_identity_theft(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, "owner@example.com").await;
    let enrollment = enroll(&server, &token).await;
    let session = prepare(&server, &token, enrollment, Uuid::now_v7()).await;
    let mut body = submission(&session, Uuid::now_v7());
    let mut extra = added_set(body["sets"].as_array().unwrap().len());
    extra["exercise"] = body["sets"][0]["exercise"].clone();
    extra["block_id"] = body["sets"][0]["block_id"].clone();
    let mut invalid = body.clone();
    let mut stolen = extra.clone();
    stolen["id"] = body["sets"][0]["id"].clone();
    invalid["sets"].as_array_mut().unwrap().push(stolen);
    server
        .post("/v2/workouts")
        .authorization_bearer(&token)
        .json(&invalid)
        .await
        .assert_status(StatusCode::UNPROCESSABLE_ENTITY);
    let mut invalid = body.clone();
    let mut mixed = extra.clone();
    mixed["exercise"] = if extra["exercise"] == "squat" {
        json!("bench")
    } else {
        json!("squat")
    };
    invalid["sets"].as_array_mut().unwrap().push(mixed);
    server
        .post("/v2/workouts")
        .authorization_bearer(&token)
        .json(&invalid)
        .await
        .assert_status(StatusCode::UNPROCESSABLE_ENTITY);
    body["sets"].as_array_mut().unwrap().push(extra);
    server
        .post("/v2/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::CREATED);
}

#[sqlx::test(migrations = "./migrations")]
async fn ad_hoc_timing_uses_answer_order_and_keeps_backwards_clock_intervals_invalid(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, "owner@example.com").await;
    let other = register(&server, "other@example.com").await;
    server
        .get("/v2/blank-session")
        .await
        .assert_status(StatusCode::UNAUTHORIZED);
    let blank_response = server
        .get("/v2/blank-session")
        .authorization_bearer(&token)
        .await;
    blank_response.assert_status_ok();
    let blank = blank_response.json::<Value>();
    assert_eq!(blank["source"], "ad_hoc");
    assert_eq!(blank["schema_version"], 2);
    assert_eq!(blank["sets"], json!([]));
    assert!(blank["enrollment_id"].is_null());
    assert!(!blank["exercises"].as_array().unwrap().is_empty());
    let id = Uuid::now_v7();
    let mut body = ad_hoc(id);
    body["ended_at"] = json!("2026-09-07T09:04:00Z");
    let rows = body["sets"].as_array_mut().unwrap();
    rows[0]["logged_at"] = json!("2026-09-07T09:03:00Z");
    rows[0]["logged_order"] = json!(1);
    let mut second = added_set(1);
    second["exercise"] = json!("bench");
    second["logged_at"] = json!("2026-09-07T09:01:00Z");
    second["logged_order"] = json!(0);
    rows.push(second);
    let mut third = added_set(2);
    third["exercise"] = json!("deadlift");
    third["logged_at"] = json!("2026-09-07T09:02:00Z");
    third["logged_order"] = json!(2);
    rows.push(third);
    let mut removed = added_set(3);
    removed["removed"] = json!(true);
    removed["status"] = json!("skipped");
    removed["actual_weight"] = Value::Null;
    removed["actual_reps"] = Value::Null;
    rows.push(removed);
    let response = server
        .post("/v2/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    response.assert_status(StatusCode::CREATED);
    let receipt = response.json::<Value>();
    assert_eq!(receipt["summary"]["load_moved_kg"], 1500.0);
    assert_eq!(receipt["changes"]["added_load_moved_kg"], 1500.0);
    assert!(receipt["changes"]["comparison_scope"].is_null());
    let detail = server
        .get(&format!("/v2/workouts/{id}"))
        .authorization_bearer(&token)
        .await
        .json::<Value>();
    assert_eq!(detail["timing"]["discarded_intervals"], 1);
    assert_eq!(detail["timing"]["lead_in_seconds"], 60);
    assert_eq!(detail["timing"]["tail_seconds"], 120);
    assert_eq!(detail["timing"]["longest_interval"]["position"], 0);
    assert_eq!(detail["timing"]["unstamped_sets"], 0);
    let progress = server
        .get("/v2/progress")
        .authorization_bearer(&token)
        .await
        .json::<Value>();
    assert_eq!(progress["sessions"], 1);
    assert_eq!(progress["done_sets"], 3);
    assert_eq!(progress["load_moved_kg"], 1500.0);
    assert_eq!(progress["duration_seconds"], 240);
    assert_eq!(progress["estimates"].as_array().unwrap().len(), 3);
    let history = server
        .get("/v2/workouts")
        .authorization_bearer(&token)
        .await
        .json::<Value>();
    assert_eq!(history["total"], 1);
    assert_eq!(history["workouts"][0]["source"], "ad_hoc");
    assert!(history["workouts"][0]["week"].is_null());
    let other_progress = server
        .get("/v2/progress")
        .authorization_bearer(&other)
        .await
        .json::<Value>();
    assert_eq!(other_progress["sessions"], 0);
    assert_eq!(other_progress["done_sets"], 0);
}

#[sqlx::test(migrations = "./migrations")]
async fn preparing_and_recording_saved_workouts_need_only_one_database_connection(pool: PgPool) {
    let limited = sqlx::postgres::PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(std::time::Duration::from_secs(2))
        .connect_with((*pool.connect_options()).clone())
        .await
        .unwrap();
    let server = server(limited);
    let token = register(&server, "owner@example.com").await;
    let enrollment = enroll(&server, &token).await;
    prepare(&server, &token, enrollment, Uuid::now_v7()).await;
    let content = json!({"title":"One connection","description":null,"blocks":[{"exercise":"squat","lifts":[{"sets":1,"reps":5,"weight":80.0,"amrap":false}]}]});
    let created = server
        .post("/v1/workout-definitions")
        .authorization_bearer(&token)
        .json(&content)
        .await;
    created.assert_status(StatusCode::CREATED);
    let id = created.json::<Value>()["id"].as_str().unwrap().to_owned();
    let session = server
        .get(&format!("/v1/workout-definitions/{id}/revisions/1/session"))
        .authorization_bearer(&token)
        .await;
    session.assert_status_ok();
    server
        .post("/v2/workouts")
        .authorization_bearer(&token)
        .json(&submission(&session.json::<Value>(), Uuid::now_v7()))
        .await
        .assert_status(StatusCode::CREATED);
}

#[sqlx::test(migrations = "./migrations")]
async fn history_reads_canonical_order_and_normalized_set_notes(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, "owner@example.com").await;
    let id = Uuid::now_v7();
    let mut body = ad_hoc(id);
    let rows = body["sets"].as_array_mut().unwrap();
    rows[0]["note"] = json!(" \n Keep the bar close \n ");
    let first_id = rows[0]["id"].clone();
    let mut second = added_set(1);
    second["note"] = json!(" \n \t ");
    let second_id = second["id"].clone();
    rows.push(second);
    rows.reverse();
    server
        .post("/v2/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::CREATED);
    let response = server
        .get(&format!("/v2/workouts/{id}"))
        .authorization_bearer(&token)
        .await;
    response.assert_status_ok();
    let detail = response.json::<Value>();
    assert_eq!(detail["sets"].as_array().unwrap().len(), 2);
    assert_eq!(detail["sets"][0]["position"], 0);
    assert_eq!(detail["sets"][0]["id"], first_id);
    assert_eq!(detail["sets"][0]["note"], "Keep the bar close");
    assert_eq!(detail["sets"][1]["position"], 1);
    assert_eq!(detail["sets"][1]["id"], second_id);
    assert!(detail["sets"][1]["note"].is_null());
}
