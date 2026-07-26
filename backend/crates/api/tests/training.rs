//! Feature tests for the training API: registration, maxes, the catalogue,
//! enrolling, peeking, and the idempotent submit (D-04, D-08, D-09).
//!
//! `#[sqlx::test]` creates a private database per test with all migrations
//! applied and drops it afterwards. It connects using `DATABASE_URL`.
//!
//! The one that the whole phase exists for is
//! [`posting_the_same_workout_twice_advances_the_program_exactly_once`], and its
//! longer sibling
//! [`the_training_max_moves_once_per_cycle_even_when_every_submit_is_retried`],
//! which drives a full 5/3/1 cycle sending every submit twice and asserts the
//! training max moved by exactly one increment. A retry that advanced twice
//! would show up there as a 5 kg jump — silent, permanent, and the reason the
//! idempotency key is in the schema from the first migration.

use athletos_api::app;
use athletos_api::state::AppState;
use axum_test::TestServer;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use axum::http::StatusCode;

/// In the bundled corpus' terms: long, unrelated words, and not built out of
/// the address or display name below.
const PASSWORD: &str = "correct horse battery staple";
const EMAIL: &str = "athlete@example.com";

/// Every lift either compiled-in program asks about. 5/3/1 BBB needs four
/// including the press; Smolov Jr needs three. That asymmetry is why maxes are a
/// map rather than a struct of three named lifts.
fn full_maxes() -> serde_json::Value {
    json!({
        "squat": 140.0,
        "bench": 100.0,
        "deadlift": 180.0,
        "military-press": 60.0,
    })
}

fn server(pool: PgPool) -> TestServer {
    TestServer::new(app(AppState::with_ephemeral_auth(pool)))
}

/// Registers an athlete and returns their access token.
async fn register(server: &TestServer, email: &str) -> String {
    let response = server
        .post("/v1/auth/register")
        .json(&json!({
            "email": email,
            "display_name": "Seed athlete",
            "password": PASSWORD,
        }))
        .await;

    response.assert_status(StatusCode::CREATED);

    response.json::<serde_json::Value>()["access_token"]
        .as_str()
        .expect("register returns an access token")
        .to_owned()
}

async fn set_maxes(server: &TestServer, token: &str, maxes: serde_json::Value) {
    server
        .put("/v1/athlete/maxes")
        .authorization_bearer(token)
        .json(&json!({ "maxes": maxes }))
        .await
        .assert_status_ok();
}

async fn enrol(server: &TestServer, token: &str, program_key: &str) -> Uuid {
    let response = server
        .post("/v1/enrollments")
        .authorization_bearer(token)
        .json(&json!({ "program_key": program_key }))
        .await;

    response.assert_status(StatusCode::CREATED);

    let body: serde_json::Value = response.json();
    body["id"]
        .as_str()
        .and_then(|id| id.parse().ok())
        .expect("an enrolment has an id")
}

async fn next_session(server: &TestServer, token: &str, enrollment: Uuid) -> serde_json::Value {
    let response = server
        .get(&format!("/v1/enrollments/{enrollment}/next-session"))
        .authorization_bearer(token)
        .await;

    response.assert_status_ok();
    response.json()
}

/// A submission logging the session exactly as prescribed: every set done,
/// every rep made.
///
/// Built from `prescribed_sets`, which is the point of the server sending that
/// list — the client fills in `actual_*` and a status and sends it straight back.
fn logged_as_prescribed(
    id: Uuid,
    enrollment: Uuid,
    session: &serde_json::Value,
) -> serde_json::Value {
    let sets: Vec<serde_json::Value> = session["prescribed_sets"]
        .as_array()
        .expect("the session carries its prescribed sets")
        .iter()
        .map(|set| {
            json!({
                "position": set["position"],
                "exercise": set["exercise"],
                "prescribed_weight": set["prescribed_weight"],
                "prescribed_reps": set["prescribed_reps"],
                "actual_weight": set["prescribed_weight"],
                "actual_reps": set["prescribed_reps"],
                "status": "done",
            })
        })
        .collect();

    json!({
        "id": id,
        "enrollment_id": enrollment,
        "started_at": "2026-07-26T09:00:00Z",
        "ended_at": "2026-07-26T10:00:00Z",
        "outcome": "completed",
        "sets": sets,
    })
}

/// The heaviest weight prescribed for the session's main lift.
///
/// For 5/3/1 that is the AMRAP set of week 1–3, which is exactly the number that
/// moves when the training max moves.
fn heaviest_main_lift(session: &serde_json::Value) -> f64 {
    session["blocks"][0]["lifts"]
        .as_array()
        .expect("the main block has lifts")
        .iter()
        .map(|lift| lift["weight"].as_f64().expect("a lift has a weight"))
        .fold(f64::MIN, f64::max)
}

async fn workout_count(pool: &PgPool) -> i64 {
    sqlx::query_scalar("select count(*) from workouts")
        .fetch_one(pool)
        .await
        .unwrap()
}

// --- the acceptance test this whole phase exists for -----------------------

/// The same body twice leaves the same state as once.
///
/// A retried POST on a flaky connection is the *normal* case for an offline
/// logger (D-09), not the exceptional one, so this is a correctness property
/// rather than a nicety. The second call succeeds — from the client's point of
/// view the retry did work — and moves nothing.
#[sqlx::test]
async fn posting_the_same_workout_twice_advances_the_program_exactly_once(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;
    assert_eq!(session["progress"]["completed"], 0);

    let prescribed = session["prescribed_sets"].as_array().unwrap().len();
    let body = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);

    let first = server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    first.assert_status(StatusCode::CREATED);
    let first: serde_json::Value = first.json();
    assert_eq!(first["duplicate"], false);
    assert_eq!(first["week"], 1);
    assert_eq!(first["day"], 1);
    assert_eq!(first["progress"]["completed"], 1);

    let state_after_first: serde_json::Value =
        sqlx::query_scalar("select state from enrollments where id = $1")
            .bind(enrollment)
            .fetch_one(&pool)
            .await
            .unwrap();

    // The retry. Byte-identical body, same client-minted id.
    let second = server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    second.assert_status_ok();
    let second: serde_json::Value = second.json();
    assert_eq!(second["duplicate"], true);
    assert_eq!(
        second["progress"], first["progress"],
        "a retry must report the same place in the program"
    );

    assert_eq!(workout_count(&pool).await, 1, "one workout, not two");

    let set_rows: i64 = sqlx::query_scalar("select count(*) from workout_sets")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(set_rows, prescribed as i64, "the sets were written once");

    let state_after_second: serde_json::Value =
        sqlx::query_scalar("select state from enrollments where id = $1")
            .bind(enrollment)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        state_after_first, state_after_second,
        "advance() must not have run a second time"
    );
}

/// The failure the idempotency key exists to prevent, observed at the only place
/// it is visible: the training max.
///
/// 5/3/1's number moves once per cycle, not once per session, so a double
/// advance does not show up until sixteen sessions have gone by. Every one of
/// them is submitted twice here. A 60 kg press is a 54 kg training max: 85% of
/// that rounds down to 45 kg, and after one cycle's +2.5 kg it rounds down to
/// 47.5. Anything else — 50, or a week the program should not be on — means a
/// retry advanced something.
#[sqlx::test]
async fn the_training_max_moves_once_per_cycle_even_when_every_submit_is_retried(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    let opening = next_session(&server, &token, enrollment).await;
    assert_eq!(opening["week"], 1);
    assert_eq!(opening["day"], 1);
    assert_eq!(heaviest_main_lift(&opening), 45.0, "85% of a 54 kg TM");

    // Four weeks of four days, every one of them submitted twice.
    for session_number in 0..16 {
        let session = next_session(&server, &token, enrollment).await;
        let body = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);

        server
            .post("/v1/workouts")
            .authorization_bearer(&token)
            .json(&body)
            .await
            .assert_status(StatusCode::CREATED);

        server
            .post("/v1/workouts")
            .authorization_bearer(&token)
            .json(&body)
            .await
            .assert_status_ok();

        let progress: serde_json::Value = server
            .get(&format!("/v1/enrollments/{enrollment}/next-session"))
            .authorization_bearer(&token)
            .await
            .json();
        assert_eq!(
            progress["progress"]["completed"],
            session_number + 1,
            "after {} submits the program should have advanced {} times",
            session_number + 1,
            session_number + 1
        );
    }

    assert_eq!(workout_count(&pool).await, 16);

    let second_cycle = next_session(&server, &token, enrollment).await;
    assert_eq!(second_cycle["week"], 1, "back to the top of the cycle");
    assert_eq!(second_cycle["day"], 1);
    assert_eq!(
        heaviest_main_lift(&second_cycle),
        47.5,
        "the press training max gained 2.5 kg exactly once"
    );

    // Open-ended, so there is no denominator to invent (D-03).
    assert_eq!(second_cycle["progress"]["completed"], 16);
    assert!(second_cycle["progress"]["total"].is_null());
}

// --- registration ---------------------------------------------------------

#[sqlx::test]
async fn register_refuses_an_address_that_is_not_one(pool: PgPool) {
    let server = server(pool);

    for bad in ["not-an-address", "@example.com", "someone@localhost", ""] {
        server
            .post("/v1/auth/register")
            .json(&json!({
                "email": bad,
                "display_name": "Seed athlete",
                "password": PASSWORD,
            }))
            .await
            .assert_status(StatusCode::UNPROCESSABLE_ENTITY);
    }
}

/// Registration is the first place a password is chosen, so it is the first
/// place the guessability policy of SP 800-63B-4 §3.1.1.2 has to run.
#[sqlx::test]
async fn register_refuses_a_breached_or_guessable_password(pool: PgPool) {
    let server = server(pool.clone());

    for weak in [
        // In the bundled corpus and long enough to reach it.
        "1qaz2wsx3edc4rfv",
        // A corpus entry repeated until it clears the length floor.
        "hunter2hunter2hunter2",
        // Sequential.
        "1234567890123456",
        // Too short.
        "short",
    ] {
        server
            .post("/v1/auth/register")
            .json(&json!({
                "email": EMAIL,
                "display_name": "Seed athlete",
                "password": weak,
            }))
            .await
            .assert_status(StatusCode::UNPROCESSABLE_ENTITY);
    }

    let athletes: i64 = sqlx::query_scalar("select count(*) from athletes")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(athletes, 0, "a refused password must not create an account");
}

/// Open registration cannot avoid this oracle — the alternative needs mail, and
/// v1 has none by decision. Asserted so the trade-off stays deliberate.
#[sqlx::test]
async fn register_refuses_an_address_that_is_already_taken(pool: PgPool) {
    let server = server(pool);

    register(&server, EMAIL).await;

    server
        .post("/v1/auth/register")
        .json(&json!({
            "email": EMAIL,
            "display_name": "Someone Else",
            "password": PASSWORD,
        }))
        .await
        .assert_status(StatusCode::CONFLICT);
}

// --- maxes ----------------------------------------------------------------

/// `PUT` means the whole document. A key absent from the body is a key deleted —
/// which is the only way an athlete can undo a max entered by mistake.
#[sqlx::test]
async fn putting_maxes_replaces_the_whole_document(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;

    set_maxes(&server, &token, full_maxes()).await;
    set_maxes(&server, &token, json!({ "squat": 145.0 })).await;

    let response = server
        .get("/v1/athlete/maxes")
        .authorization_bearer(&token)
        .await;
    response.assert_status_ok();
    response.assert_json(&json!({ "maxes": { "squat": 145.0 } }));
}

#[sqlx::test]
async fn putting_a_max_for_an_unknown_exercise_is_refused(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;

    server
        .put("/v1/athlete/maxes")
        .authorization_bearer(&token)
        .json(&json!({ "maxes": { "jetpack-press": 90.0 } }))
        .await
        .assert_status(StatusCode::UNPROCESSABLE_ENTITY);
}

// --- enrolling ------------------------------------------------------------

/// The engine refuses to start a program the athlete has no number for, and the
/// refusal has to reach the athlete as something they can act on — not as a 500,
/// and not as "an error occurred".
#[sqlx::test]
async fn enrolling_without_the_required_maxes_names_the_missing_lift(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, EMAIL).await;

    // Enough for Smolov Jr's three lifts, one short of 5/3/1's four.
    set_maxes(
        &server,
        &token,
        json!({ "squat": 140.0, "bench": 100.0, "deadlift": 180.0 }),
    )
    .await;

    let refused = server
        .post("/v1/enrollments")
        .authorization_bearer(&token)
        .json(&json!({ "program_key": "wendler-531-bbb" }))
        .await;

    refused.assert_status(StatusCode::UNPROCESSABLE_ENTITY);

    let problem: serde_json::Value = refused.json();
    let detail = problem["detail"].as_str().unwrap();
    assert!(
        detail.contains("military-press"),
        "the refusal must name the lift: {detail}"
    );
    assert!(
        detail.contains("/v1/athlete/maxes"),
        "and where to fix it: {detail}"
    );

    // The same three maxes are enough for the other program, which is the whole
    // reason maxes are a map.
    server
        .post("/v1/enrollments")
        .authorization_bearer(&token)
        .json(&json!({ "program_key": "smolov-jr" }))
        .await
        .assert_status(StatusCode::CREATED);

    let enrollments: i64 = sqlx::query_scalar("select count(*) from enrollments")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(enrollments, 1, "the refused enrolment wrote nothing");
}

#[sqlx::test]
async fn enrolling_in_a_program_that_does_not_exist_is_not_found(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    server
        .post("/v1/enrollments")
        .authorization_bearer(&token)
        .json(&json!({ "program_key": "no-such-program" }))
        .await
        .assert_status_not_found();
}

// --- peeking is free ------------------------------------------------------

/// D-08's central distinction, asserted rather than trusted: looking at the
/// session writes nothing at all. No workout row, no timer, no state moved.
#[sqlx::test]
async fn peeking_at_the_next_session_writes_nothing(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    let before: (serde_json::Value, chrono::DateTime<chrono::Utc>, String) =
        sqlx::query_as("select state, started_at, status from enrollments where id = $1")
            .bind(enrollment)
            .fetch_one(&pool)
            .await
            .unwrap();

    for _ in 0..3 {
        let session = next_session(&server, &token, enrollment).await;
        assert_eq!(session["progress"]["completed"], 0);
    }

    assert_eq!(workout_count(&pool).await, 0, "peeking wrote a workout");

    let sets: i64 = sqlx::query_scalar("select count(*) from workout_sets")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(sets, 0);

    let after: (serde_json::Value, chrono::DateTime<chrono::Utc>, String) =
        sqlx::query_as("select state, started_at, status from enrollments where id = $1")
            .bind(enrollment)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(before, after, "peeking moved the enrolment");
}

/// The plate breakdown is computed server-side and sent, because the athlete is
/// standing at the rack and the client must not be reimplementing D-04.
#[sqlx::test]
async fn the_session_carries_loadable_weights_and_their_plates(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "smolov-jr").await;
    let session = next_session(&server, &token, enrollment).await;

    // Week 1 day 1 opens with 6×6 at 70% of a 140 kg squat — 98 kg, which is not
    // loadable, so the athlete is prescribed 97.5 (D-04).
    let squat = &session["blocks"][0];
    assert_eq!(squat["exercise"], "squat");
    assert_eq!(squat["label"], "Squat");
    assert!(!squat["cues"].as_array().unwrap().is_empty());

    let top = &squat["lifts"][2];
    assert_eq!(top["sets"], 6);
    assert_eq!(top["reps"], 6);
    assert_eq!(top["weight"], 97.5);
    assert_eq!(top["plates_per_side"], json!([25.0, 10.0, 2.5, 1.25]));

    // Every barbell weight in the session is 20 + 2.5n, and every plate list
    // adds back up to it.
    for block in session["blocks"].as_array().unwrap() {
        for lift in block["lifts"].as_array().unwrap() {
            let weight = lift["weight"].as_f64().unwrap();
            let plates: f64 = lift["plates_per_side"]
                .as_array()
                .unwrap()
                .iter()
                .map(|plate| plate.as_f64().unwrap())
                .sum();

            if plates > 0.0 {
                assert_eq!(20.0 + plates * 2.0, weight, "{lift}");
            }
        }
    }

    // A fixed block has an honest denominator; the progress bar is not invented.
    assert_eq!(session["progress"]["total"], 12);
}

// --- authorization --------------------------------------------------------

/// Another athlete's enrolment is a 404, not a 403. A 403 would confirm that the
/// id names real data belonging to somebody.
#[sqlx::test]
async fn another_athletes_enrollment_is_not_found(pool: PgPool) {
    let server = server(pool);

    let mine = register(&server, EMAIL).await;
    set_maxes(&server, &mine, full_maxes()).await;
    let enrollment = enrol(&server, &mine, "wendler-531-bbb").await;

    let theirs = register(&server, "rival@example.com").await;

    server
        .get(&format!("/v1/enrollments/{enrollment}/next-session"))
        .authorization_bearer(&theirs)
        .await
        .assert_status_not_found();

    // A wholly invented id answers identically, which is what makes the first
    // answer say nothing.
    server
        .get(&format!("/v1/enrollments/{}/next-session", Uuid::now_v7()))
        .authorization_bearer(&theirs)
        .await
        .assert_status_not_found();
}

#[sqlx::test]
async fn submitting_a_workout_for_another_athletes_enrollment_is_not_found(pool: PgPool) {
    let server = server(pool.clone());

    let mine = register(&server, EMAIL).await;
    set_maxes(&server, &mine, full_maxes()).await;
    let enrollment = enrol(&server, &mine, "wendler-531-bbb").await;
    let session = next_session(&server, &mine, enrollment).await;

    let theirs = register(&server, "rival@example.com").await;

    server
        .post("/v1/workouts")
        .authorization_bearer(&theirs)
        .json(&logged_as_prescribed(Uuid::now_v7(), enrollment, &session))
        .await
        .assert_status_not_found();

    assert_eq!(workout_count(&pool).await, 0);

    // And the owner's program did not move on the strength of a stranger's POST.
    let mine_now = next_session(&server, &mine, enrollment).await;
    assert_eq!(mine_now["progress"]["completed"], 0);
}

#[sqlx::test]
async fn the_training_endpoints_all_require_a_token(pool: PgPool) {
    let server = server(pool);

    server
        .get("/v1/programs")
        .await
        .assert_status_unauthorized();
    server
        .get("/v1/programs/smolov-jr")
        .await
        .assert_status_unauthorized();
    server
        .get("/v1/athlete/maxes")
        .await
        .assert_status_unauthorized();
    server
        .put("/v1/athlete/maxes")
        .json(&json!({ "maxes": {} }))
        .await
        .assert_status_unauthorized();
    server
        .post("/v1/enrollments")
        .json(&json!({ "program_key": "smolov-jr" }))
        .await
        .assert_status_unauthorized();
    server
        .get(&format!("/v1/enrollments/{}/next-session", Uuid::now_v7()))
        .await
        .assert_status_unauthorized();
}

// --- the catalogue --------------------------------------------------------

#[sqlx::test]
async fn the_catalogue_lists_both_programs_with_the_axes_that_matter(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;

    let response = server
        .get("/v1/programs")
        .authorization_bearer(&token)
        .await;
    response.assert_status_ok();

    let body: serde_json::Value = response.json();
    let programs = body["programs"].as_array().unwrap();
    assert_eq!(programs.len(), 2);

    let smolov = programs
        .iter()
        .find(|program| program["key"] == "smolov-jr")
        .expect("smolov-jr is in the catalogue");

    // D-05's two honest axes, both present before enrolment.
    assert_eq!(smolov["recovery_demand"], "brutal");
    assert_eq!(smolov["estimated_session_minutes"], 75);
    assert_eq!(
        smolov["length"],
        json!({ "kind": "fixed", "weeks": 3, "sessions": 12 })
    );

    let wendler = programs
        .iter()
        .find(|program| program["key"] == "wendler-531-bbb")
        .expect("wendler-531-bbb is in the catalogue");
    assert_eq!(wendler["length"], json!({ "kind": "open_ended" }));

    server
        .get("/v1/programs/no-such-program")
        .authorization_bearer(&token)
        .await
        .assert_status_not_found();
}

// --- cutting a session short ----------------------------------------------

/// Ending early advances the program anyway (D-08). Repeating a session because
/// life interrupted it is precisely the guilt loop D-06 exists to avoid, and a
/// completeness threshold would force every program author to invent one.
#[sqlx::test]
async fn a_session_cut_short_still_advances(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    // The first three sets done, everything after them left as it was found —
    // `pending` and `skipped` are outcomes the client sends, not absent rows.
    let sets: Vec<serde_json::Value> = session["prescribed_sets"]
        .as_array()
        .unwrap()
        .iter()
        .enumerate()
        .map(|(index, set)| {
            if index < 3 {
                json!({
                    "position": set["position"],
                    "exercise": set["exercise"],
                    "prescribed_weight": set["prescribed_weight"],
                    "prescribed_reps": set["prescribed_reps"],
                    "actual_weight": set["prescribed_weight"],
                    "actual_reps": set["prescribed_reps"],
                    "status": "done",
                })
            } else {
                json!({
                    "position": set["position"],
                    "exercise": set["exercise"],
                    "prescribed_weight": set["prescribed_weight"],
                    "prescribed_reps": set["prescribed_reps"],
                    "status": if index == 3 { "skipped" } else { "pending" },
                })
            }
        })
        .collect();

    let body = json!({
        "id": Uuid::now_v7(),
        "enrollment_id": enrollment,
        "started_at": "2026-07-26T09:00:00Z",
        "ended_at": "2026-07-26T09:20:00Z",
        "outcome": "cut_short",
        "cut_reason": "out_of_time",
        "sets": sets,
    });

    let accepted = server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    accepted.assert_status(StatusCode::CREATED);
    assert_eq!(
        accepted.json::<serde_json::Value>()["progress"]["completed"],
        1
    );

    // Day 2, not day 1 again.
    let after = next_session(&server, &token, enrollment).await;
    assert_eq!(after["week"], 1);
    assert_eq!(after["day"], 2);

    let reason: Option<String> = sqlx::query_scalar("select cut_reason from workouts")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(reason.as_deref(), Some("out_of_time"));

    // The work not done is recorded, which is what makes it a second axis of
    // drift rather than something inferred later (D-07, D-08).
    let not_done: i64 =
        sqlx::query_scalar("select count(*) from workout_sets where status <> 'done'")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert!(not_done > 0, "pending and skipped sets must be stored");

    // And it is idempotent like any other submit.
    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status_ok();
    assert_eq!(workout_count(&pool).await, 1);
}

#[sqlx::test]
async fn a_submission_that_contradicts_itself_is_refused(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;
    let good = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);

    let cases = [
        // Cut short with no reason, and a reason with no cut.
        json!({ "outcome": "cut_short" }),
        json!({ "cut_reason": "pain" }),
        // Ends before it starts.
        json!({ "ended_at": "2026-07-26T08:00:00Z" }),
        // A set marked done with no numbers is a hole in every drift query.
        json!({ "sets": [{
            "position": 0, "exercise": "military-press",
            "prescribed_weight": 35.0, "prescribed_reps": 5,
            "status": "done"
        }] }),
        // Two sets claiming one slot.
        json!({ "sets": [
            { "position": 0, "exercise": "military-press", "prescribed_weight": 35.0,
              "prescribed_reps": 5, "status": "pending" },
            { "position": 0, "exercise": "military-press", "prescribed_weight": 40.0,
              "prescribed_reps": 5, "status": "pending" }
        ] }),
        // `auto_closed` belongs to the stale-session sweep, not to a client.
        json!({ "outcome": "auto_closed" }),
    ];

    for overrides in cases {
        let mut body = good.clone();
        for (key, value) in overrides.as_object().unwrap() {
            body[key] = value.clone();
        }
        body["id"] = json!(Uuid::now_v7());

        let response = server
            .post("/v1/workouts")
            .authorization_bearer(&token)
            .json(&body)
            .await;

        assert!(
            response.status_code().is_client_error(),
            "expected a refusal for {overrides}, got {}",
            response.status_code()
        );
    }

    assert_eq!(workout_count(&pool).await, 0);
}

// --- the end of a fixed block ---------------------------------------------

/// A prescriptive block ends, and the enrolment ends with it — including, and
/// this is the awkward part, the retry of the very submit that finished it.
#[sqlx::test]
async fn finishing_a_fixed_block_closes_the_enrolment_and_still_accepts_the_retry(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "smolov-jr").await;

    let mut last = json!(null);

    for session_number in 0..12 {
        let session = next_session(&server, &token, enrollment).await;
        assert_eq!(session["progress"]["completed"], session_number);

        last = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);

        server
            .post("/v1/workouts")
            .authorization_bearer(&token)
            .json(&last)
            .await
            .assert_status(StatusCode::CREATED);
    }

    let status: String = sqlx::query_scalar("select status from enrollments where id = $1")
        .bind(enrollment)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(status, "finished");

    // Nothing left to prescribe.
    server
        .get(&format!("/v1/enrollments/{enrollment}/next-session"))
        .authorization_bearer(&token)
        .await
        .assert_status(StatusCode::CONFLICT);

    // The queued retry of the twelfth submit lands after the block has closed,
    // and must still be acknowledged — the client cannot know the difference and
    // would otherwise retry forever.
    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&last)
        .await
        .assert_status_ok();

    assert_eq!(workout_count(&pool).await, 12);

    // A genuinely new workout against a closed enrolment is refused, though.
    let mut fresh = last.clone();
    fresh["id"] = json!(Uuid::now_v7());
    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&fresh)
        .await
        .assert_status(StatusCode::CONFLICT);

    assert_eq!(workout_count(&pool).await, 12);
}
