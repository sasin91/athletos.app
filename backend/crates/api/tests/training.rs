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
use chrono::{DateTime, Utc};
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

/// Logs the enrolment's current session exactly as prescribed, returning the
/// workout's client-minted id.
async fn log_a_session(server: &TestServer, token: &str, enrollment: Uuid) -> Uuid {
    let session = next_session(server, token, enrollment).await;
    let id = Uuid::now_v7();

    server
        .post("/v1/workouts")
        .authorization_bearer(token)
        .json(&logged_as_prescribed(id, enrollment, &session))
        .await
        .assert_status(StatusCode::CREATED);

    id
}

/// Logs the enrolment's current session exactly as prescribed, at `now()`
/// rather than the fixture's fixed day.
///
/// `/v1/progress` windows to the last twelve months, measured from `now()`
/// (`progress::WINDOW_MONTHS`). `logged_as_prescribed`'s hard-coded
/// `started_at` cannot be moved — `a_submission_that_contradicts_itself_is_refused`
/// depends on it staying fixed to build an "ends before it starts" case — so
/// any test that reads `/v1/progress` needs its own session pinned to `now()`
/// instead, the same rule `log_a_heavy_session_at` already follows by taking
/// `at` as a parameter rather than reusing the fixture's date.
async fn log_a_recent_session(server: &TestServer, token: &str, enrollment: Uuid) -> Uuid {
    let session = next_session(server, token, enrollment).await;
    let id = Uuid::now_v7();
    let now = chrono::Utc::now();

    let mut body = logged_as_prescribed(id, enrollment, &session);
    body["started_at"] = json!(now.to_rfc3339());
    body["ended_at"] = json!((now + chrono::Duration::hours(1)).to_rfc3339());

    server
        .post("/v1/workouts")
        .authorization_bearer(token)
        .json(&body)
        .await
        .assert_status(StatusCode::CREATED);

    id
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

// --- the recorded advance refolds clean (D-19) ------------------------------

/// Loads one enrolment's recorded advances exactly as `verify-advances` would
/// and checks them with `audit` — the round trip the whole D-19 branch exists
/// for.
async fn refolded(pool: &PgPool, enrollment: Uuid) -> athletos_api::audit::Audit {
    let program = athletos_training::programs::find("wendler-531-bbb")
        .expect("wendler-531-bbb is in the registry");

    let advances = athletos_api::advances::load_advances(pool, enrollment, program)
        .await
        .expect("advances load against a database that just wrote them");

    let current_state: serde_json::Value =
        sqlx::query_scalar("select state from enrollments where id = $1")
            .bind(enrollment)
            .fetch_one(pool)
            .await
            .unwrap();

    athletos_api::audit::audit(enrollment, &current_state, &advances)
}

/// `audit` itself is well covered by unit tests in `audit.rs`. What was
/// missing is the reconstruction it is checked against — `load_advances` and
/// `logged_session`, which used to live inside the `verify-advances` binary,
/// where no test could reach them. This is the round trip: submit a real
/// session, load the row `submit` wrote back through the same code path the
/// binary runs, refold it, and confirm `audit` finds nothing wrong with data
/// that is completely healthy.
#[sqlx::test]
async fn a_recorded_advance_refolds_to_what_it_recorded(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    log_a_session(&server, &token, enrollment).await;

    let result = refolded(&pool, enrollment).await;

    assert_eq!(result.advances, 1);
    assert!(result.findings.is_empty(), "{:?}", result.findings);
}

/// `position` is the canonical order — the training migration calls wire
/// order "an accident of the wire" for exactly this reason — but nothing
/// enforced it in `submit` until this branch: the fold ran over `body.sets`
/// in request order. Submitting the sets in the opposite of position order
/// and still getting a clean audit is what pins that fix to a test rather
/// than leaving it as an argument in a comment.
#[sqlx::test]
async fn a_session_logged_out_of_position_order_still_refolds_clean(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    let session = next_session(&server, &token, enrollment).await;
    let mut body = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);
    body["sets"]
        .as_array_mut()
        .expect("a submission carries its sets")
        .reverse();

    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::CREATED);

    let result = refolded(&pool, enrollment).await;

    assert_eq!(result.advances, 1);
    assert!(result.findings.is_empty(), "{:?}", result.findings);
}

/// The one place `submit`'s bug (Finding 1: folding `body.sets` in request
/// order rather than by `position`) can actually change what a fold computes:
/// `made_the_minimum`'s tie-break, which is `max_by` and therefore returns
/// the *last* maximum it sees. The test above cannot exercise that —
/// `logged_as_prescribed` always logs a set as matching its own prescription,
/// so whichever tied set the fold happens to land on trivially "made the
/// minimum" regardless of order, tie or no tie. This one builds a genuine
/// tie by hand: the week-3 AMRAP set and the last Boring But Big set of the
/// same lift, pinned to the same weight, and only one of them made. Submitted
/// in the opposite of position order, this diverges without the position
/// sort in `submit` and refolds clean with it — the fix pinned by a test
/// rather than left as the argument in that function's comment.
#[sqlx::test]
async fn a_tied_amrap_reversed_in_the_wire_still_refolds_by_position(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    // Two full weeks, so the ninth session lands on week 3 — the only week
    // `advance()` reads `logged` at all.
    for _ in 0..8 {
        log_a_session(&server, &token, enrollment).await;
    }

    let session = next_session(&server, &token, enrollment).await;
    assert_eq!(session["week"], 3);
    assert_eq!(session["day"], 1);

    let prescribed = session["prescribed_sets"].as_array().unwrap();
    assert_eq!(prescribed.len(), 8, "3 main sets and 5 Boring But Big sets");

    // Position 2 is the week-3 AMRAP set; position 7 is the last Boring But
    // Big set of the same lift. Pinning them to the same weight is what
    // creates the tie `made_the_minimum`'s `max_by` has to break.
    let tied_weight = prescribed[2]["prescribed_weight"].clone();

    let mut sets: Vec<serde_json::Value> = prescribed
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

    // Position 2: the AMRAP set, missed outright.
    sets[2]["actual_reps"] = json!(0);

    // Position 7: the last Boring But Big set, pinned to the AMRAP's weight
    // and made in full.
    sets[7]["prescribed_weight"] = tied_weight.clone();
    sets[7]["actual_weight"] = tied_weight;

    // The opposite of position order — what `submit` used to fold verbatim.
    sets.reverse();

    let body = json!({
        "id": Uuid::now_v7(),
        "enrollment_id": enrollment,
        "started_at": "2026-07-26T09:00:00Z",
        "ended_at": "2026-07-26T10:00:00Z",
        "outcome": "completed",
        "sets": sets,
    });

    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::CREATED);

    let result = refolded(&pool, enrollment).await;

    assert_eq!(result.advances, 9);
    assert!(result.findings.is_empty(), "{:?}", result.findings);
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

/// The maxes are a set the athlete owns: a lift goes in, a lift comes out, and
/// no program has a vote (D-04).
///
/// The lift added here is `barbell-row`, which is in the exercise registry and
/// which **no** compiled program declares in `required_maxes`. That is the whole
/// point — before this, the client's form was the union of the programs' needs,
/// so a number like this had nowhere to live. Removing `bench` in the same pass
/// checks the other direction against a lift that a program very much does want:
/// a program can refuse to *start* without a max, but it cannot stop the athlete
/// deleting one.
#[sqlx::test]
async fn the_maxes_are_a_set_that_gains_and_loses_lifts(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, EMAIL).await;

    set_maxes(&server, &token, full_maxes()).await;

    // Gaining a lift no program asks for.
    let mut wanted = full_maxes();
    wanted["barbell-row"] = json!(85.0);
    set_maxes(&server, &token, wanted).await;

    let held: serde_json::Value = server
        .get("/v1/athlete/maxes")
        .authorization_bearer(&token)
        .await
        .json();
    assert_eq!(held["maxes"]["barbell-row"], 85.0);
    assert_eq!(held["maxes"].as_object().unwrap().len(), 5);

    // No program declares it, which is what makes it an athlete's number rather
    // than a program's.
    let catalogue: serde_json::Value = server
        .get("/v1/programs")
        .authorization_bearer(&token)
        .await
        .json();
    for program in catalogue["programs"].as_array().unwrap() {
        for required in program["required_maxes"].as_array().unwrap() {
            assert_ne!(
                required["exercise"], "barbell-row",
                "this test needs a lift no program requires"
            );
        }
    }

    // Losing one, by sending a document without it.
    set_maxes(
        &server,
        &token,
        json!({
            "squat": 140.0,
            "deadlift": 180.0,
            "military-press": 60.0,
            "barbell-row": 85.0,
        }),
    )
    .await;

    let after: serde_json::Value = server
        .get("/v1/athlete/maxes")
        .authorization_bearer(&token)
        .await
        .json();
    assert!(
        after["maxes"].get("bench").is_none(),
        "a key absent from the body is a key deleted"
    );
    assert_eq!(after["maxes"]["barbell-row"], 85.0, "and the rest survived");

    // The row is gone rather than zeroed, so nothing downstream can read a max
    // the athlete deleted.
    let rows: i64 = sqlx::query_scalar(
        "select count(*) from athlete_maxes where athlete_id = (select id from athletes)",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(rows, 4);

    // Deleting a lift a program needs is allowed, and is felt at enrolment
    // rather than silently.
    let refused = server
        .post("/v1/enrollments")
        .authorization_bearer(&token)
        .json(&json!({ "program_key": "wendler-531-bbb" }))
        .await;
    refused.assert_status(StatusCode::UNPROCESSABLE_ENTITY);
    assert!(refused.json::<serde_json::Value>()["detail"]
        .as_str()
        .unwrap()
        .contains("bench"));

    // And clearing the set entirely is a representable state, not an error.
    set_maxes(&server, &token, json!({})).await;

    let empty: serde_json::Value = server
        .get("/v1/athlete/maxes")
        .authorization_bearer(&token)
        .await
        .json();
    assert_eq!(empty["maxes"], json!({}));
}

// --- the exercise registry -------------------------------------------------

/// The list the "add a lift" picker is built from. Without it the client can
/// only offer lifts that some compiled program happens to require, which is the
/// limitation that made maxes a form instead of a set.
#[sqlx::test]
async fn the_exercise_registry_offers_every_lift_a_max_can_be_entered_for(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;

    let response = server
        .get("/v1/exercises")
        .authorization_bearer(&token)
        .await;
    response.assert_status_ok();

    let body: serde_json::Value = response.json();
    let exercises = body["exercises"].as_array().unwrap();
    assert!(exercises.len() >= 12, "the whole registry, not a subset");

    let squat = exercises
        .iter()
        .find(|exercise| exercise["key"] == "squat")
        .expect("the squat is in the registry");
    assert_eq!(squat["label"], "Squat");
    assert_eq!(squat["is_primary"], true);

    // The lifts no program declares are here too, which is the entire reason
    // this endpoint is not just a restatement of `required_maxes`.
    assert!(
        exercises
            .iter()
            .any(|exercise| exercise["key"] == "barbell-row"),
        "a lift no program requires must still be offerable"
    );

    // Every key a program requires can be labelled from this one list, so a
    // client holding it never has to fall back to showing a raw key.
    let keys: Vec<&str> = exercises
        .iter()
        .map(|exercise| exercise["key"].as_str().unwrap())
        .collect();

    let catalogue: serde_json::Value = server
        .get("/v1/programs")
        .authorization_bearer(&token)
        .await
        .json();
    for program in catalogue["programs"].as_array().unwrap() {
        for required in program["required_maxes"].as_array().unwrap() {
            assert!(keys.contains(&required["exercise"].as_str().unwrap()));
        }
    }

    // Nothing here is anybody's data, and it is still behind a token: opening an
    // endpoint later is additive, closing one is not (D-12).
    server
        .get("/v1/exercises")
        .await
        .assert_status_unauthorized();
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

/// Plates as loading instructions: chained within an exercise, reset between
/// them (D-04).
///
/// Asserted on the chaining rather than on which plates come out. The
/// arrangement is the training crate's business and is swept exhaustively
/// there; what this endpoint owns is *which bar* each set is planned against,
/// and that is the thing a handler gets wrong.
#[sqlx::test]
async fn the_plate_change_chains_within_an_exercise_and_resets_between_them(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    let plates = |value: &serde_json::Value| -> Vec<f64> {
        value
            .as_array()
            .expect("a plate list")
            .iter()
            .map(|plate| plate.as_f64().expect("a plate is a number"))
            .collect()
    };

    let mut previous_exercise = String::new();
    let mut on_bar: Vec<f64> = Vec::new();

    for set in session["prescribed_sets"]
        .as_array()
        .expect("the session carries its prescribed sets")
    {
        let change = &set["plate_change"];
        assert!(
            !change.is_null(),
            "set {} is a barbell set and should carry a plan",
            set["position"]
        );

        let remove = plates(&change["remove"]);
        let add = plates(&change["add"]);
        let resulting = plates(&change["plates_per_side"]);

        let exercise = set["exercise"].as_str().expect("a set names its exercise");

        // The bar starts empty for each exercise, so the first set of one has
        // nothing to take off.
        if exercise != previous_exercise {
            assert!(
                remove.is_empty(),
                "set {} opens {exercise} and should plan from an empty bar",
                set["position"]
            );
            on_bar.clear();
        }

        // The instructions apply to the bar as the previous set left it.
        let kept = on_bar.len() - remove.len();
        let mut applied = on_bar[..kept].to_vec();
        applied.extend(add.iter().copied());
        assert_eq!(applied, resulting, "set {}", set["position"]);

        // And they build the weight that was prescribed.
        let prescribed = set["prescribed_weight"].as_f64().expect("a weight");
        let from_plates = resulting.iter().sum::<f64>() * 2.0 + 20.0;
        assert!(
            (from_plates - prescribed).abs() < 1e-9,
            "set {} builds {from_plates} kg, not {prescribed}",
            set["position"]
        );

        previous_exercise = exercise.to_owned();
        on_bar = resulting;
    }
}

/// A dumbbell set and a bodyweight set carry no plate change, while the
/// barbell sets around them do (D-04).
///
/// The chaining test above only ever exercises `wendler-531-bbb`, which is
/// four barbell lifts, so `!change.is_null()` there passes for every set
/// without ever proving the `None` branch exists. That let a real bug ship:
/// `plateChangeFor` on the client returns `null` for a `None` plate change,
/// and the current-set card's fallback drew an empty plate diagram under it —
/// "empty bar · 20 kg, for the prescribed 12 kg" on a Smolov Jr dumbbell set.
/// `smolov-jr` day 1 carries both: `lateral-raise` is a dumbbell exercise and
/// `hanging-leg-raise` is bodyweight, alongside barbell squat and deadlift
/// work, so one session proves both halves at once.
#[sqlx::test]
async fn non_barbell_sets_carry_no_plate_change_while_barbell_sets_do(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "smolov-jr").await;
    let session = next_session(&server, &token, enrollment).await;

    let mut saw_dumbbell = false;
    let mut saw_bodyweight = false;
    let mut saw_barbell = false;

    for set in session["prescribed_sets"]
        .as_array()
        .expect("the session carries its prescribed sets")
    {
        let exercise = set["exercise"].as_str().expect("a set names its exercise");
        let has_plate_change = !set["plate_change"].is_null();

        match exercise {
            "lateral-raise" => {
                assert!(
                    !has_plate_change,
                    "set {} is a dumbbell set and should carry no plate change",
                    set["position"]
                );
                saw_dumbbell = true;
            }
            "hanging-leg-raise" => {
                assert!(
                    !has_plate_change,
                    "set {} is a bodyweight set and should carry no plate change",
                    set["position"]
                );
                saw_bodyweight = true;
            }
            "squat" | "deadlift" => {
                assert!(
                    has_plate_change,
                    "set {} is a barbell set and should carry a plan",
                    set["position"]
                );
                saw_barbell = true;
            }
            _ => {}
        }
    }

    assert!(saw_dumbbell, "day 1 should prescribe the lateral raise");
    assert!(
        saw_bodyweight,
        "day 1 should prescribe the hanging leg raise"
    );
    assert!(saw_barbell, "day 1 should prescribe barbell work");
}

// --- the pace projection (D-10) -------------------------------------------

/// Logs the enrolment's current session with a chosen wall clock and a chosen
/// number of sets actually performed, leaving the rest `pending`.
///
/// The date is a day index rather than a fixed instant, because the pace window
/// is ordered by `started_at` and two sessions sharing one would leave the
/// window's contents up to the tiebreak.
async fn log_a_session_lasting(
    server: &TestServer,
    token: &str,
    enrollment: Uuid,
    session: &serde_json::Value,
    day: u32,
    seconds: i64,
    done: usize,
) {
    let started: chrono::DateTime<chrono::Utc> = format!("2026-08-{day:02}T09:00:00Z")
        .parse()
        .expect("the day index makes a real date");
    let ended = started + chrono::Duration::seconds(seconds);

    let prescribed = session["prescribed_sets"].as_array().unwrap();

    let sets: Vec<serde_json::Value> = prescribed
        .iter()
        .enumerate()
        .map(|(index, set)| {
            if index < done {
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
                    "status": "pending",
                })
            }
        })
        .collect();

    // Anything short of every set has to answer D-08's one question, and the
    // schema enforces the pairing either way.
    let cut = done < prescribed.len();

    server
        .post("/v1/workouts")
        .authorization_bearer(token)
        .json(&json!({
            "id": Uuid::now_v7(),
            "enrollment_id": enrollment,
            "started_at": started.to_rfc3339(),
            "ended_at": ended.to_rfc3339(),
            "outcome": if cut { "cut_short" } else { "completed" },
            "cut_reason": if cut { Some("out_of_time") } else { None },
            "sets": sets,
        }))
        .await
        .assert_status(StatusCode::CREATED);
}

/// Logs the current session at an exact seconds-per-set.
///
/// The wall clock is derived from the session's own size rather than fixed, so
/// the rate the pace query recovers is exactly `seconds_per_set` however many
/// sets that day happens to prescribe — 5/3/1's four weeks are not the same
/// length as each other, and a fixed hour would make every assertion depend on
/// the program's set count.
async fn log_a_session_at(
    server: &TestServer,
    token: &str,
    enrollment: Uuid,
    day: u32,
    seconds_per_set: i64,
) {
    let session = next_session(server, token, enrollment).await;
    let sets = session["prescribed_sets"].as_array().unwrap().len();

    log_a_session_lasting(
        server,
        token,
        enrollment,
        &session,
        day,
        seconds_per_set * sets as i64,
        sets,
    )
    .await;
}

/// The pace as the peek response carries it.
async fn pace(server: &TestServer, token: &str, enrollment: Uuid) -> serde_json::Value {
    next_session(server, token, enrollment).await["pace"].clone()
}

/// D-10 shows a finish time only once there is data to compute one from, and
/// "roughly three sessions" is where that line is drawn.
#[sqlx::test]
async fn the_pace_says_nothing_until_three_sessions_have_been_logged(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    let fresh = pace(&server, &token, enrollment).await;
    assert_eq!(fresh["can_project"], false);
    assert!(fresh["median_seconds_per_set"].is_null());
    assert!(fresh["projected_seconds"].is_null());
    assert_eq!(fresh["sample_size"], 0);

    for day in 1..=2 {
        log_a_session_at(&server, &token, enrollment, day, 90).await;

        let so_far = pace(&server, &token, enrollment).await;
        assert_eq!(so_far["sample_size"], day);
        assert_eq!(
            so_far["can_project"], false,
            "two sessions is not three, and one outlier would be the whole median"
        );
        assert!(so_far["projected_seconds"].is_null());
    }

    log_a_session_at(&server, &token, enrollment, 3, 90).await;

    let session = next_session(&server, &token, enrollment).await;
    let projection = &session["pace"];

    assert_eq!(projection["can_project"], true);
    assert_eq!(projection["sample_size"], 3);
    assert_eq!(projection["median_seconds_per_set"], 90.0);

    // The whole session, already multiplied out. The client formats this; it
    // does not work it out (D-11).
    let sets = session["prescribed_sets"].as_array().unwrap().len() as i64;
    assert_eq!(projection["projected_seconds"], 90 * sets);
}

/// The median is the median. A mean would be pulled by the long session, which
/// is the entire reason D-10 names this statistic and not that one.
#[sqlx::test]
async fn the_pace_is_the_median_and_not_the_mean(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    // 60, 300 and 90 seconds a set. The median is 90; the mean is 150, which
    // would promise a session two thirds longer than the one about to happen.
    for (day, seconds_per_set) in [(1, 60), (2, 300), (3, 90)] {
        log_a_session_at(&server, &token, enrollment, day, seconds_per_set).await;
    }

    let projection = pace(&server, &token, enrollment).await;
    assert_eq!(projection["sample_size"], 3);
    assert_eq!(projection["median_seconds_per_set"], 90.0);
}

/// One session that ran long is a phone call, not a change of pace.
#[sqlx::test]
async fn a_session_that_ran_long_does_not_dominate_the_projection(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    for day in 1..=3 {
        log_a_session_at(&server, &token, enrollment, day, 90).await;
    }
    assert_eq!(
        pace(&server, &token, enrollment).await["median_seconds_per_set"],
        90.0
    );

    // Fifty minutes a set: the gym was full, or the phone rang, or the session
    // was left open and swept. The mean of the four is now 817 s/set.
    log_a_session_at(&server, &token, enrollment, 4, 3_000).await;

    let projection = pace(&server, &token, enrollment).await;
    assert_eq!(projection["sample_size"], 4);
    assert_eq!(
        projection["median_seconds_per_set"], 90.0,
        "the outlier is in the sample and is not the answer"
    );
}

/// A session with nothing logged in it took no time per set, because there were
/// no sets. Counting it as zero would drag the median toward a pace nobody ever
/// lifted at — and unlike a long session, which the median survives by design, a
/// zero is not a slow session at all.
#[sqlx::test]
async fn a_session_with_no_sets_logged_is_dropped_rather_than_counted(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    for day in 1..=2 {
        log_a_session_at(&server, &token, enrollment, day, 90).await;
    }

    // Committed, on the clock for an hour, and not one set performed.
    let abandoned = next_session(&server, &token, enrollment).await;
    log_a_session_lasting(&server, &token, enrollment, &abandoned, 3, 3_600, 0).await;

    let after = pace(&server, &token, enrollment).await;
    assert_eq!(
        after["sample_size"], 2,
        "an hour over no sets is not a rate, and does not count toward the floor"
    );
    assert_eq!(after["can_project"], false);

    log_a_session_at(&server, &token, enrollment, 4, 90).await;

    let now = pace(&server, &token, enrollment).await;
    assert_eq!(now["sample_size"], 3);
    assert_eq!(now["can_project"], true);
    assert_eq!(
        now["median_seconds_per_set"], 90.0,
        "the empty session is dropped, not counted as zero seconds a set"
    );
}

/// The pace is the athlete's, not the enrolment's — see the comment at the call
/// site in `routes::enrollments`. A new block is exactly when the question "does
/// this fit in the hour" is being asked, and it is also exactly when a
/// per-enrolment sample would be empty.
#[sqlx::test]
async fn the_pace_follows_the_athlete_into_a_new_program(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let first = enrol(&server, &token, "wendler-531-bbb").await;
    for day in 1..=3 {
        log_a_session_at(&server, &token, first, day, 90).await;
    }

    let second = enrol(&server, &token, "smolov-jr").await;
    let projection = pace(&server, &token, second).await;

    assert_eq!(projection["can_project"], true);
    assert_eq!(projection["median_seconds_per_set"], 90.0);
}

/// One athlete's pace is not another's, and the scope is a join rather than a
/// column on `workouts` — so this is the assertion that the join is right.
#[sqlx::test]
async fn the_pace_is_measured_over_the_athletes_own_sessions(pool: PgPool) {
    let server = server(pool);

    let stranger = register(&server, "stranger@example.com").await;
    set_maxes(&server, &stranger, full_maxes()).await;
    let theirs = enrol(&server, &stranger, "wendler-531-bbb").await;
    for day in 1..=3 {
        log_a_session_at(&server, &stranger, theirs, day, 90).await;
    }

    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let mine = enrol(&server, &token, "wendler-531-bbb").await;

    let projection = pace(&server, &token, mine).await;
    assert_eq!(projection["sample_size"], 0);
    assert_eq!(projection["can_project"], false);
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
    // Derived or not, it is somebody's training data and is scoped like
    // everything else — the athlete comes from the token and from nowhere else.
    server
        .get("/v1/progress")
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

// --- listing enrolments ---------------------------------------------------

/// The reason this endpoint exists: a client that has been reloaded has no way
/// to derive the enrolment id it needs for everything else.
#[sqlx::test]
async fn listing_enrollments_puts_the_live_one_first_and_filters_by_status(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let finished = enrol(&server, &token, "smolov-jr").await;
    let live = enrol(&server, &token, "wendler-531-bbb").await;

    // Closed directly rather than by driving twelve sessions — this test is
    // about the listing, and the closing path has its own test.
    sqlx::query("update enrollments set status = 'finished', ended_at = now() where id = $1")
        .bind(finished)
        .execute(&pool)
        .await
        .unwrap();

    let response = server
        .get("/v1/enrollments")
        .authorization_bearer(&token)
        .await;
    response.assert_status_ok();

    let body: serde_json::Value = response.json();
    let all = body["enrollments"].as_array().unwrap();
    assert_eq!(all.len(), 2);

    // Active first, so the unfiltered call still answers "what am I running"
    // without the client sorting.
    assert_eq!(all[0]["id"].as_str().unwrap(), live.to_string());
    assert_eq!(all[0]["status"], "active");
    assert_eq!(all[0]["program_name"], "5/3/1 Boring But Big");
    assert!(all[0]["ended_at"].is_null());
    assert!(all[0]["progress"]["total"].is_null(), "open-ended");

    assert_eq!(all[1]["status"], "finished");
    assert!(!all[1]["ended_at"].is_null());
    assert_eq!(all[1]["progress"]["total"], 12);

    let active: serde_json::Value = server
        .get("/v1/enrollments?status=active")
        .authorization_bearer(&token)
        .await
        .json();
    assert_eq!(active["enrollments"].as_array().unwrap().len(), 1);
    assert_eq!(
        active["enrollments"][0]["id"].as_str().unwrap(),
        live.to_string()
    );

    let abandoned: serde_json::Value = server
        .get("/v1/enrollments?status=abandoned")
        .authorization_bearer(&token)
        .await
        .json();
    assert!(abandoned["enrollments"].as_array().unwrap().is_empty());

    // A typo must not read as "none of them".
    server
        .get("/v1/enrollments?status=activ")
        .authorization_bearer(&token)
        .await
        .assert_status(StatusCode::UNPROCESSABLE_ENTITY);
}

#[sqlx::test]
async fn another_athletes_enrollments_are_not_listed(pool: PgPool) {
    let server = server(pool);

    let mine = register(&server, EMAIL).await;
    set_maxes(&server, &mine, full_maxes()).await;
    enrol(&server, &mine, "wendler-531-bbb").await;

    let theirs = register(&server, "rival@example.com").await;

    let body: serde_json::Value = server
        .get("/v1/enrollments")
        .authorization_bearer(&theirs)
        .await
        .json();
    assert!(body["enrollments"].as_array().unwrap().is_empty());
}

// --- the readout: what the program is actually working from (D-03, D-04) ---

/// One enrolment's `readout`, as the enrolment list carries it.
async fn readout(server: &TestServer, token: &str, enrollment: Uuid) -> serde_json::Value {
    let body: serde_json::Value = server
        .get("/v1/enrollments")
        .authorization_bearer(token)
        .await
        .json();

    body["enrollments"]
        .as_array()
        .expect("the list is a list")
        .iter()
        .find(|row| row["id"].as_str() == Some(&enrollment.to_string()))
        .unwrap_or_else(|| panic!("{enrollment} is in the athlete's enrolments"))["readout"]
        .clone()
}

/// The two kinds of program answer the same question with different numbers, and
/// each says which kind of number it is.
///
/// This is the gap D-03 left open. A 140 kg entered squat is a 126 kg training
/// max on day one of 5/3/1 and neither number was reachable from outside the
/// program; Smolov Jr takes the same 140 straight. A screen showing one of them
/// with no label cannot explain the other.
#[sqlx::test]
async fn an_enrollment_reports_the_numbers_its_program_prescribes_from(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    // Adaptive: 90% of what was entered, owned by the program from here on.
    let wendler = enrol(&server, &token, "wendler-531-bbb").await;
    let training = readout(&server, &token, wendler).await;
    let training = training.as_array().unwrap();

    assert_eq!(training.len(), 4, "5/3/1's four main lifts");
    assert_eq!(training[0]["exercise"], "military-press");
    assert_eq!(training[0]["exercise_label"], "Military Press");
    assert_eq!(training[0]["label"], "Training max");
    assert_eq!(training[0]["weight"], 54.0, "90% of a 60 kg press");

    let squat = training
        .iter()
        .find(|entry| entry["exercise"] == "squat")
        .expect("the squat is one of the four");
    assert_eq!(squat["weight"], 126.0, "90% of a 140 kg squat");
    assert_eq!(squat["exercise_label"], "Squat");

    // Prescriptive: the entered numbers, snapshotted, and labelled as such —
    // Smolov Jr has no training max and one must not be invented for it.
    let smolov = enrol(&server, &token, "smolov-jr").await;
    let entered = readout(&server, &token, smolov).await;
    let entered = entered.as_array().unwrap();

    let squat = entered
        .iter()
        .find(|entry| entry["exercise"] == "squat")
        .expect("the squat is in the snapshot");
    assert_eq!(squat["label"], "Entered 1RM");
    assert_eq!(squat["weight"], 140.0, "taken straight, not discounted");

    for entry in entered {
        assert_eq!(entry["label"], "Entered 1RM");
    }

    // Enrolling answers with the same field, so a client that has just pressed
    // the button does not have to re-list to see the numbers.
    let created: serde_json::Value = server
        .post("/v1/enrollments")
        .authorization_bearer(&token)
        .json(&json!({ "program_key": "wendler-531-bbb" }))
        .await
        .json();
    assert_eq!(created["readout"][0]["label"], "Training max");
    assert_eq!(created["readout"][0]["weight"], 54.0);
}

/// The drift the feature exists to explain, observed end to end.
///
/// A cycle of 5/3/1 moves the press training max from 54 to 56.5 while
/// `GET /v1/athlete/maxes` still says 60 — which is correct, and which is
/// exactly what looks like a bug to an athlete who can only see one of the two
/// numbers.
#[sqlx::test]
async fn the_training_max_readout_climbs_while_the_entered_max_stands_still(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let opening = readout(&server, &token, enrollment).await;

    // Fifteen sessions is a cycle less one, and the number has not moved.
    for _ in 0..15 {
        log_a_session(&server, &token, enrollment).await;
    }
    assert_eq!(
        readout(&server, &token, enrollment).await,
        opening,
        "the training max moves at the cycle boundary and nowhere else"
    );

    log_a_session(&server, &token, enrollment).await;
    let crossed = readout(&server, &token, enrollment).await;
    assert_ne!(crossed, opening, "a completed cycle moves it");

    let press = |readout: &serde_json::Value| {
        readout
            .as_array()
            .unwrap()
            .iter()
            .find(|entry| entry["exercise"] == "military-press")
            .expect("the press is one of the four")["weight"]
            .as_f64()
            .unwrap()
    };
    assert_eq!(press(&opening), 54.0);
    assert_eq!(press(&crossed), 56.5, "+2.5 kg, upper body");

    // And the athlete's own number is untouched. This is the whole point: the
    // two are allowed to disagree, and now they can both be shown.
    let maxes: serde_json::Value = server
        .get("/v1/athlete/maxes")
        .authorization_bearer(&token)
        .await
        .json();
    assert_eq!(maxes["maxes"]["military-press"], 60.0);
}

/// A readout is somebody's training data and is scoped like everything else.
///
/// It rides on the enrolment list, whose `where` clause is the ownership check,
/// so this asserts the property rather than a second mechanism — and it asserts
/// it against the numbers themselves, because "the list was empty" and "the list
/// held a stranger's training max" are the same length of array to a weaker test.
#[sqlx::test]
async fn another_athletes_readout_is_not_reachable(pool: PgPool) {
    let server = server(pool);

    let mine = register(&server, EMAIL).await;
    // A max nobody else in this test has, so the number itself is the evidence.
    set_maxes(
        &server,
        &mine,
        json!({ "squat": 200.0, "bench": 100.0, "deadlift": 180.0, "military-press": 60.0 }),
    )
    .await;
    let enrollment = enrol(&server, &mine, "wendler-531-bbb").await;

    let ours = readout(&server, &mine, enrollment).await;
    assert!(
        ours.to_string().contains("180.0"),
        "the owner sees 90% of a 200 kg squat: {ours}"
    );

    let theirs = register(&server, "rival@example.com").await;

    let listed: serde_json::Value = server
        .get("/v1/enrollments")
        .authorization_bearer(&theirs)
        .await
        .json();
    assert!(listed["enrollments"].as_array().unwrap().is_empty());
    assert!(
        !listed.to_string().contains("180"),
        "a stranger's list must not carry the number: {listed}"
    );

    // Filtering does not widen the scope either, and neither does the only other
    // endpoint that runs somebody's program.
    let filtered: serde_json::Value = server
        .get("/v1/enrollments?status=active")
        .authorization_bearer(&theirs)
        .await
        .json();
    assert!(filtered["enrollments"].as_array().unwrap().is_empty());

    server
        .get(&format!("/v1/enrollments/{enrollment}/next-session"))
        .authorization_bearer(&theirs)
        .await
        .assert_status_not_found();

    // And with no token at all there is nothing to read.
    server
        .get("/v1/enrollments")
        .await
        .assert_status_unauthorized();
}

// --- the history list (D-13) ----------------------------------------------

/// The history row carries what the history row shows, and the duration is
/// subtracted here rather than by two clients in two languages (D-11).
#[sqlx::test]
async fn the_history_row_carries_the_duration_and_the_outcome(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let workout = log_a_session(&server, &token, enrollment).await;

    let response = server
        .get("/v1/workouts")
        .authorization_bearer(&token)
        .await;
    response.assert_status_ok();

    let body: serde_json::Value = response.json();
    assert_eq!(body["total"], 1);
    assert_eq!(body["limit"], 25, "the default page size");
    assert_eq!(body["offset"], 0);

    let row = &body["workouts"][0];
    assert_eq!(row["id"].as_str().unwrap(), workout.to_string());
    assert_eq!(
        row["enrollment_id"].as_str().unwrap(),
        enrollment.to_string()
    );
    assert_eq!(row["program_key"], "wendler-531-bbb");
    assert_eq!(row["program_name"], "5/3/1 Boring But Big");
    assert_eq!(row["week"], 1);
    assert_eq!(row["day"], 1);
    assert_eq!(row["outcome"], "completed");
    assert!(row["cut_reason"].is_null());
    // 09:00 to 10:00, and the client is not asked to work that out.
    assert_eq!(row["duration_seconds"], 3600);

    // A history row is a row, not the session: notes and sets live on the
    // detail endpoint that the row expands into.
    assert!(row.get("sets").is_none());
}

#[sqlx::test]
async fn the_history_list_paginates_and_reports_the_total(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    for _ in 0..3 {
        log_a_session(&server, &token, enrollment).await;
    }

    let first: serde_json::Value = server
        .get("/v1/workouts?limit=2")
        .authorization_bearer(&token)
        .await
        .json();
    assert_eq!(first["total"], 3);
    assert_eq!(first["limit"], 2);
    assert_eq!(first["workouts"].as_array().unwrap().len(), 2);

    let second: serde_json::Value = server
        .get("/v1/workouts?limit=2&offset=2")
        .authorization_bearer(&token)
        .await
        .json();
    assert_eq!(second["total"], 3);
    assert_eq!(second["offset"], 2);
    assert_eq!(second["workouts"].as_array().unwrap().len(), 1);

    // The pages do not overlap.
    let page_one: Vec<&str> = first["workouts"]
        .as_array()
        .unwrap()
        .iter()
        .map(|row| row["id"].as_str().unwrap())
        .collect();
    let leftover = second["workouts"][0]["id"].as_str().unwrap();
    assert!(!page_one.contains(&leftover));

    // All three sessions were submitted with the same `started_at`, so the id
    // tiebreak is what makes the order total — and all three are present
    // exactly once across the two pages.
    let mut days: Vec<i64> = first["workouts"]
        .as_array()
        .unwrap()
        .iter()
        .chain(second["workouts"].as_array().unwrap())
        .map(|row| row["day"].as_i64().unwrap())
        .collect();
    days.sort_unstable();
    assert_eq!(days, vec![1, 2, 3]);

    // Asking for more than the ceiling gets the ceiling, and is told so.
    let clamped: serde_json::Value = server
        .get("/v1/workouts?limit=5000")
        .authorization_bearer(&token)
        .await
        .json();
    assert_eq!(clamped["limit"], 100);

    // Scoped to one enrolment, which is the query the existing index serves
    // without a sort.
    let scoped: serde_json::Value = server
        .get(&format!("/v1/workouts?enrollment_id={enrollment}"))
        .authorization_bearer(&token)
        .await
        .json();
    assert_eq!(scoped["total"], 3);
}

/// An athlete's history is theirs alone.
#[sqlx::test]
async fn the_history_shows_only_the_athletes_own_workouts(pool: PgPool) {
    let server = server(pool.clone());

    let mine = register(&server, EMAIL).await;
    set_maxes(&server, &mine, full_maxes()).await;
    let my_enrollment = enrol(&server, &mine, "wendler-531-bbb").await;
    let my_workout = log_a_session(&server, &mine, my_enrollment).await;

    let theirs = register(&server, "rival@example.com").await;
    set_maxes(&server, &theirs, full_maxes()).await;
    let their_enrollment = enrol(&server, &theirs, "smolov-jr").await;
    let their_workout = log_a_session(&server, &theirs, their_enrollment).await;

    assert_eq!(workout_count(&pool).await, 2, "both were recorded");

    let mine_listed: serde_json::Value = server
        .get("/v1/workouts")
        .authorization_bearer(&mine)
        .await
        .json();
    assert_eq!(mine_listed["total"], 1);
    assert_eq!(
        mine_listed["workouts"][0]["id"].as_str().unwrap(),
        my_workout.to_string()
    );

    let theirs_listed: serde_json::Value = server
        .get("/v1/workouts")
        .authorization_bearer(&theirs)
        .await
        .json();
    assert_eq!(theirs_listed["total"], 1);
    assert_eq!(
        theirs_listed["workouts"][0]["id"].as_str().unwrap(),
        their_workout.to_string()
    );

    // Naming somebody else's enrolment does not widen the scope — it narrows to
    // nothing, because the ownership predicate is on `enrollments`.
    let borrowed: serde_json::Value = server
        .get(&format!("/v1/workouts?enrollment_id={their_enrollment}"))
        .authorization_bearer(&mine)
        .await
        .json();
    assert_eq!(borrowed["total"], 0);
    assert!(borrowed["workouts"].as_array().unwrap().is_empty());
}

// --- one workout, expanded -------------------------------------------------

#[sqlx::test]
async fn the_workout_detail_carries_every_set_as_logged(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;
    let prescribed = session["prescribed_sets"].as_array().unwrap().len();

    let workout = Uuid::now_v7();
    let mut body = logged_as_prescribed(workout, enrollment, &session);
    body["notes"] = json!("felt heavy");
    // One set edited upward: drift is the thing this screen exists to show.
    body["sets"][0]["actual_weight"] = json!(200.0);

    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::CREATED);

    let response = server
        .get(&format!("/v1/workouts/{workout}"))
        .authorization_bearer(&token)
        .await;
    response.assert_status_ok();

    let detail: serde_json::Value = response.json();
    assert_eq!(
        detail["workout"]["id"].as_str().unwrap(),
        workout.to_string()
    );
    assert_eq!(detail["workout"]["duration_seconds"], 3600);
    assert_eq!(detail["notes"], "felt heavy");

    let sets = detail["sets"].as_array().unwrap();
    assert_eq!(sets.len(), prescribed);

    // In position order, and the key is resolved to something readable.
    let positions: Vec<i64> = sets
        .iter()
        .map(|set| set["position"].as_i64().unwrap())
        .collect();
    let mut sorted = positions.clone();
    sorted.sort_unstable();
    assert_eq!(positions, sorted);

    assert_eq!(sets[0]["exercise"], "military-press");
    assert_eq!(sets[0]["label"], "Military Press");
    assert_eq!(sets[0]["status"], "done");

    // Both numbers, which is what makes drift first-class data (D-07).
    assert_eq!(sets[0]["actual_weight"], 200.0);
    assert_ne!(sets[0]["prescribed_weight"], sets[0]["actual_weight"]);
}

/// `pending` and `skipped` are stored and read back, not silently dropped —
/// "work not done" is the second axis of drift (D-08).
#[sqlx::test]
async fn the_detail_shows_the_sets_that_were_never_done(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    let workout = Uuid::now_v7();
    let sets: Vec<serde_json::Value> = session["prescribed_sets"]
        .as_array()
        .unwrap()
        .iter()
        .enumerate()
        .map(|(index, set)| {
            let status = match index {
                0 => "done",
                1 => "skipped",
                _ => "pending",
            };

            let mut logged = json!({
                "position": set["position"],
                "exercise": set["exercise"],
                "prescribed_weight": set["prescribed_weight"],
                "prescribed_reps": set["prescribed_reps"],
                "status": status,
            });

            if index == 0 {
                logged["actual_weight"] = set["prescribed_weight"].clone();
                logged["actual_reps"] = set["prescribed_reps"].clone();
            }

            logged
        })
        .collect();

    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&json!({
            "id": workout,
            "enrollment_id": enrollment,
            "started_at": "2026-07-26T09:00:00Z",
            "ended_at": "2026-07-26T09:12:00Z",
            "outcome": "cut_short",
            "cut_reason": "pain",
            "sets": sets,
        }))
        .await
        .assert_status(StatusCode::CREATED);

    let detail: serde_json::Value = server
        .get(&format!("/v1/workouts/{workout}"))
        .authorization_bearer(&token)
        .await
        .json();

    assert_eq!(detail["workout"]["outcome"], "cut_short");
    assert_eq!(detail["workout"]["cut_reason"], "pain");
    assert_eq!(detail["workout"]["duration_seconds"], 720);

    let statuses: Vec<&str> = detail["sets"]
        .as_array()
        .unwrap()
        .iter()
        .map(|set| set["status"].as_str().unwrap())
        .collect();
    assert_eq!(statuses[0], "done");
    assert_eq!(statuses[1], "skipped");
    assert!(statuses[2..].iter().all(|status| *status == "pending"));

    // A set never performed carries no actual numbers, and that is the record.
    assert!(detail["sets"][2]["actual_weight"].is_null());
    assert!(detail["sets"][2]["actual_reps"].is_null());
}

#[sqlx::test]
async fn another_athletes_workout_detail_is_not_found(pool: PgPool) {
    let server = server(pool);

    let mine = register(&server, EMAIL).await;
    set_maxes(&server, &mine, full_maxes()).await;
    let enrollment = enrol(&server, &mine, "wendler-531-bbb").await;
    let workout = log_a_session(&server, &mine, enrollment).await;

    let theirs = register(&server, "rival@example.com").await;

    // 404, not 403 — the id is client-minted, so confirming one exists confirms
    // that somebody logged a session.
    server
        .get(&format!("/v1/workouts/{workout}"))
        .authorization_bearer(&theirs)
        .await
        .assert_status_not_found();

    // An id that never existed answers identically.
    server
        .get(&format!("/v1/workouts/{}", Uuid::now_v7()))
        .authorization_bearer(&theirs)
        .await
        .assert_status_not_found();

    // And the owner can still read it.
    server
        .get(&format!("/v1/workouts/{workout}"))
        .authorization_bearer(&mine)
        .await
        .assert_status_ok();
}

#[sqlx::test]
async fn the_history_endpoints_require_a_token(pool: PgPool) {
    let server = server(pool);

    server
        .get("/v1/enrollments")
        .await
        .assert_status_unauthorized();
    server
        .get("/v1/workouts")
        .await
        .assert_status_unauthorized();
    server
        .get(&format!("/v1/workouts/{}", Uuid::now_v7()))
        .await
        .assert_status_unauthorized();
}

/// D-10: where the hour went, computed from the per-set stamps the phone sends.
///
/// The interesting part of this test is not that the arithmetic works — that is
/// covered by the unit tests in `timing`, which need no database. It is that the
/// stamps survive the round trip: they are sent by a client, written by an
/// `unnest` insert that has no test of its own, read back by the detail query,
/// and aggregated. Every one of those is a place a column can be silently
/// dropped.
#[sqlx::test]
async fn a_logged_session_reports_where_its_time_went(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, "timing@example.com").await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    let session = next_session(&server, &token, enrollment).await;
    let prescribed = session["prescribed_sets"].as_array().unwrap().clone();
    assert!(
        prescribed.len() >= 3,
        "the assertions below need at least three sets to have two intervals"
    );

    let started: chrono::DateTime<chrono::Utc> = "2026-08-01T09:00:00Z".parse().unwrap();

    // Lead-in of five minutes, then three minutes between every set.
    let stamp_of = |index: usize| started + chrono::Duration::seconds(300 + 180 * index as i64);

    let sets: Vec<serde_json::Value> = prescribed
        .iter()
        .enumerate()
        .map(|(index, set)| {
            json!({
                "position": set["position"],
                "exercise": set["exercise"],
                "prescribed_weight": set["prescribed_weight"],
                "prescribed_reps": set["prescribed_reps"],
                "actual_weight": set["prescribed_weight"],
                "actual_reps": set["prescribed_reps"],
                "status": "done",
                "logged_at": stamp_of(index).to_rfc3339(),
            })
        })
        .collect();

    let workout_id = Uuid::now_v7();
    let ended = stamp_of(prescribed.len() - 1) + chrono::Duration::seconds(90);

    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&json!({
            "id": workout_id,
            "enrollment_id": enrollment,
            "started_at": started.to_rfc3339(),
            "ended_at": ended.to_rfc3339(),
            "outcome": "completed",
            "sets": sets,
        }))
        .await
        .assert_status(StatusCode::CREATED);

    let detail = server
        .get(&format!("/v1/workouts/{workout_id}"))
        .authorization_bearer(&token)
        .await
        .json::<serde_json::Value>();

    let timing = &detail["timing"];
    assert!(!timing.is_null(), "every set carried a stamp");

    // The lead-in is the session's, not the first exercise's.
    assert_eq!(timing["lead_in_seconds"], 300);
    assert_eq!(timing["tail_seconds"], 90);
    assert_eq!(timing["discarded_intervals"], 0);
    assert_eq!(timing["unstamped_sets"], 0);

    // Every interval is a flat three minutes, so the totals must add up to
    // three minutes per set *after the first* — the first closed the lead-in.
    let counted: i64 = timing["exercises"]
        .as_array()
        .unwrap()
        .iter()
        .map(|spend| spend["seconds"].as_i64().unwrap())
        .sum();
    assert_eq!(counted, 180 * (prescribed.len() as i64 - 1));

    assert_eq!(timing["longest_interval"]["seconds"], 180);

    // And the stamps come back on the sets themselves, not only in aggregate.
    assert_eq!(
        detail["sets"][0]["logged_at"]
            .as_str()
            .map(|s| s.parse::<chrono::DateTime<chrono::Utc>>().unwrap()),
        Some(stamp_of(0))
    );
}

/// A client that does not send stamps still submits a valid workout (D-12).
///
/// This is the compatibility guarantee the column was made nullable for: the
/// field is additive, so the previous version of the app — and every workout
/// already in the database — keeps working and simply has no breakdown.
#[sqlx::test]
async fn a_session_submitted_without_stamps_has_no_timing_rather_than_an_empty_one(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, "untimed@example.com").await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    let workout_id = log_a_session(&server, &token, enrollment).await;

    let detail = server
        .get(&format!("/v1/workouts/{workout_id}"))
        .authorization_bearer(&token)
        .await
        .json::<serde_json::Value>();

    // Absent, not present-and-zeroed. A breakdown of nothing is not renderable
    // and the client must be able to tell the difference.
    assert!(
        detail.get("timing").is_none() || detail["timing"].is_null(),
        "expected no timing, got {}",
        detail["timing"]
    );
    assert!(detail["sets"][0]["logged_at"].is_null());
}

// --- a note on a set --------------------------------------------------------

/// A note rides along with its set and comes back on the history detail.
#[sqlx::test]
async fn a_set_carries_an_optional_note(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    let id = Uuid::now_v7();
    let mut body = logged_as_prescribed(id, enrollment, &session);
    body["sets"][0]["note"] = json!("left shoulder felt off");
    // Blank is not a note. It normalises to null rather than being refused —
    // a note typed and then cleared is not an error.
    body["sets"][1]["note"] = json!("   ");

    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::CREATED);

    let detail = server
        .get(&format!("/v1/workouts/{id}"))
        .authorization_bearer(&token)
        .await
        .json::<serde_json::Value>();

    assert_eq!(detail["sets"][0]["note"], json!("left shoulder felt off"));
    assert_eq!(detail["sets"][1]["note"], json!(null));
    assert_eq!(detail["sets"][2]["note"], json!(null));
}

/// Over the cap is a 422 naming the position, like every other set-level
/// complaint on this endpoint. Not a truncation: silently storing something
/// other than what was written is worse than refusing it.
#[sqlx::test]
async fn a_note_over_the_cap_is_refused(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;

    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    let mut body = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);
    body["sets"][0]["note"] = json!("x".repeat(501));

    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::UNPROCESSABLE_ENTITY);
}

/// The current session logged as prescribed, except that set 0 was lifted
/// `over` kilograms heavier than asked and says why.
fn logged_with_drift(
    id: Uuid,
    enrollment: Uuid,
    session: &serde_json::Value,
    over: f64,
    reason: &str,
) -> serde_json::Value {
    let mut body = logged_as_prescribed(id, enrollment, session);
    let prescribed = body["sets"][0]["prescribed_weight"]
        .as_f64()
        .expect("a prescribed set carries a weight");

    body["sets"][0]["actual_weight"] = json!(prescribed + over);
    body["sets"][0]["drift_reason"] = json!(reason);
    body
}

#[sqlx::test]
async fn a_drift_reason_round_trips_to_the_history(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    let id = Uuid::now_v7();
    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&logged_with_drift(
            id, enrollment, &session, 5.0, "too_easy",
        ))
        .await
        .assert_status(StatusCode::CREATED);

    let detail: serde_json::Value = server
        .get(&format!("/v1/workouts/{id}"))
        .authorization_bearer(&token)
        .await
        .json();

    assert_eq!(detail["sets"][0]["drift_reason"], json!("too_easy"));
    assert_eq!(detail["sets"][1]["drift_reason"], json!(null));
}

#[sqlx::test]
async fn a_reason_on_a_set_that_was_not_done_is_refused(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    let mut body = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);
    body["outcome"] = json!("cut_short");
    body["cut_reason"] = json!("out_of_time");
    body["sets"][0]["status"] = json!("pending");
    body["sets"][0]["actual_weight"] = json!(null);
    body["sets"][0]["actual_reps"] = json!(null);
    body["sets"][0]["drift_reason"] = json!("too_easy");

    // 422, not the 500 a raw constraint violation would produce. A client
    // holding a queued offline workout has to be able to learn why it will
    // never be accepted.
    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::UNPROCESSABLE_ENTITY);
}

#[sqlx::test]
async fn a_reason_on_a_set_that_did_not_drift_is_refused(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    // Logged exactly as prescribed, so there is no deviation for a reason to
    // be about.
    let mut body = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);
    body["sets"][0]["drift_reason"] = json!("too_easy");

    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::UNPROCESSABLE_ENTITY);
}

/// The athlete's typed weight differs from the prescription only below the
/// two decimal places the column actually stores. `validate` compares in
/// `f64`, so it sees a difference and lets the drift reason through; the
/// insert rounds both sides to `numeric(6,2)`, the constraint sees no drift,
/// and without this fix Postgres — not the 422 path — is what refuses it.
#[sqlx::test]
async fn a_reason_on_a_drift_too_small_to_store_is_refused_as_422_not_500(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    let body = logged_with_drift(Uuid::now_v7(), enrollment, &session, 0.001, "too_easy");

    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::UNPROCESSABLE_ENTITY);
}

#[sqlx::test]
async fn a_retry_reports_the_same_ending_as_the_first_submit(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    let body = logged_with_drift(Uuid::now_v7(), enrollment, &session, 5.0, "too_easy");

    let first: serde_json::Value = server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .json();

    let response = server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await;
    response.assert_status(StatusCode::OK);
    let retry: serde_json::Value = response.json();

    assert_eq!(first["duplicate"], json!(false));
    assert_eq!(retry["duplicate"], json!(true));

    // A session that finally lands three days later is exactly the one whose
    // numbers the athlete has not seen. A blank ending on the retry would be
    // the worst possible time to have one.
    assert_eq!(first["summary"], retry["summary"]);
    assert_eq!(first["summary"]["sets_over"], json!(1));
    assert_eq!(first["summary"]["sets_under"], json!(0));
}

#[sqlx::test]
async fn the_ending_has_no_average_before_three_sessions(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    for day in 1..=2 {
        let session = next_session(&server, &token, enrollment).await;
        let sets = session["prescribed_sets"].as_array().unwrap().len();
        log_a_session_lasting(&server, &token, enrollment, &session, day, 3_600, sets).await;
    }

    let session = next_session(&server, &token, enrollment).await;
    let receipt: serde_json::Value = server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&logged_as_prescribed(Uuid::now_v7(), enrollment, &session))
        .await
        .json();

    // Two prior sessions would let one long day *be* the average rather than
    // merely be in it — D-10's rule for pace, here for the same reason.
    assert_eq!(receipt["summary"]["average_duration_seconds"], json!(null));
}

#[sqlx::test]
async fn the_ending_compares_against_the_sessions_before_it(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    for day in 1..=3 {
        let session = next_session(&server, &token, enrollment).await;
        let sets = session["prescribed_sets"].as_array().unwrap().len();
        log_a_session_lasting(&server, &token, enrollment, &session, day, 3_600, sets).await;
    }

    // The fourth runs ninety minutes. `logged_as_prescribed` hard-codes an
    // hour, so both stamps are replaced.
    let session = next_session(&server, &token, enrollment).await;
    let mut body = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);
    body["started_at"] = json!("2026-08-04T09:00:00Z");
    body["ended_at"] = json!("2026-08-04T10:30:00Z");

    let receipt: serde_json::Value = server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .json();

    assert_eq!(receipt["summary"]["duration_seconds"], json!(5_400));
    // The average of the three before it, and not diluted by its own ninety
    // minutes — the comparison is against history.
    assert_eq!(receipt["summary"]["average_duration_seconds"], json!(3_600));
}

/// The enrolment's state as Postgres holds it, for tests that need to see the
/// fold from outside the engine.
async fn stored_state(pool: &PgPool, enrollment: Uuid) -> serde_json::Value {
    sqlx::query_scalar("select state from enrollments where id = $1")
        .bind(enrollment)
        .fetch_one(pool)
        .await
        .expect("the enrolment exists")
}

#[sqlx::test]
async fn advancing_records_what_the_fold_did(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    let before = stored_state(&pool, enrollment).await;
    let workout = log_a_session(&server, &token, enrollment).await;
    let after = stored_state(&pool, enrollment).await;

    let (recorded_workout, recorded_enrollment, state_before, state_after, engine_version): (
        Uuid,
        Uuid,
        serde_json::Value,
        serde_json::Value,
        String,
    ) = sqlx::query_as(
        "select workout_id, enrollment_id, state_before, state_after, engine_version
         from enrollment_advances",
    )
    .fetch_one(&pool)
    .await
    .expect("exactly one advance was recorded");

    assert_eq!(recorded_workout, workout);
    assert_eq!(recorded_enrollment, enrollment);
    // The fold's input is the state as it stood *before* the submit, and its
    // output is what the submit persisted. Both compared structurally.
    assert_eq!(state_before, before);
    assert_eq!(state_after, after);
    assert!(!engine_version.is_empty());
}

#[sqlx::test]
async fn a_retried_submit_records_no_second_advance(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    let body = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);

    for _ in 0..2 {
        server
            .post("/v1/workouts")
            .authorization_bearer(&token)
            .json(&body)
            .await;
    }

    // A retry does not advance, so it has nothing to record. The primary key
    // would refuse a second row anyway, which is the belt to this braces.
    let advances: i64 = sqlx::query_scalar("select count(*) from enrollment_advances")
        .fetch_one(&pool)
        .await
        .unwrap();

    assert_eq!(advances, 1);
}

// --- the progress screen: a year of training, derived (D-13) ---------------

/// The whole screen in one round trip.
async fn progress(server: &TestServer, token: &str) -> serde_json::Value {
    server
        .get("/v1/progress")
        .authorization_bearer(token)
        .await
        .json()
}

#[sqlx::test]
async fn progress_is_empty_for_an_athlete_who_has_logged_nothing(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;

    let view = progress(&server, &token).await;

    assert_eq!(view["lifts"].as_array().unwrap().len(), 0);
    assert_eq!(view["sessions"].as_array().unwrap().len(), 0);
    assert_eq!(view["programs"].as_array().unwrap().len(), 0);
    // No sessions means no median to report — the card is absent, not zero.
    let overall: Vec<String> = view["overall"]
        .as_array()
        .unwrap()
        .iter()
        .map(|indicator| indicator["key"].as_str().unwrap().to_owned())
        .collect();
    assert!(!overall.contains(&"median_duration".to_owned()));
}

#[sqlx::test]
async fn a_logged_session_produces_a_trend_point_with_a_training_max(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    log_a_recent_session(&server, &token, enrollment).await;

    let view = progress(&server, &token).await;

    let lifts = view["lifts"].as_array().unwrap();
    assert!(!lifts.is_empty(), "one session should produce one lift");

    let point = &lifts[0]["points"][0];
    // Logged exactly as prescribed, so the estimate exists and drift is zero.
    assert!(point["estimate"].as_f64().is_some());
    assert_eq!(point["drift_kg"].as_f64(), Some(0.0));
    assert_eq!(point["sets_over"].as_u64(), Some(0));
    // The training max comes from readout(state_before), which this session
    // recorded — so it is present rather than a gap.
    assert!(point["training_max"].as_f64().is_some());
}

#[sqlx::test]
async fn a_best_is_the_heaviest_weight_for_at_least_that_many_reps(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    // One set taken well past its prescription, so there is an unambiguous
    // best: heavier than anything else that day, at five reps.
    let mut body = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);
    body["sets"][0]["actual_weight"] = json!(200.0);
    body["sets"][0]["actual_reps"] = json!(5);

    // `/v1/progress` windows to the last twelve months measured from `now()`;
    // the fixture's fixed date cannot move (see `log_a_recent_session`), so this
    // overrides it the same way that helper does.
    let now = chrono::Utc::now();
    body["started_at"] = json!(now.to_rfc3339());
    body["ended_at"] = json!((now + chrono::Duration::hours(1)).to_rfc3339());

    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::CREATED);

    let view = progress(&server, &token).await;
    let bests = view["lifts"][0]["bests"].as_array().unwrap();

    let at_three = bests
        .iter()
        .find(|best| best["reps"].as_u64() == Some(3))
        .expect("a 3-rep bucket");
    let at_five = bests
        .iter()
        .find(|best| best["reps"].as_u64() == Some(5))
        .expect("a 5-rep bucket");

    // Five reps at 200 proves three reps at 200: "at least", not "exactly".
    assert_eq!(at_three["weight"].as_f64(), Some(200.0));
    assert_eq!(at_five["weight"].as_f64(), Some(200.0));
    assert_eq!(at_five["actual_reps"].as_u64(), Some(5));
}

#[sqlx::test]
async fn drift_is_signed_and_counted_per_direction(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    // Both directions on the same lift in the same session, which is the only
    // arrangement that can tell a signed sum from an absolute one: these two
    // sum to +2.5 signed and to 7.5 unsigned, so a drift that forgot its sign
    // would fail here rather than merely look larger.
    let mut body = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);
    let first = body["sets"][0]["prescribed_weight"].as_f64().unwrap();
    let second = body["sets"][1]["prescribed_weight"].as_f64().unwrap();
    body["sets"][0]["actual_weight"] = json!(first + 5.0);
    body["sets"][1]["actual_weight"] = json!(second - 2.5);

    // The two sets have to belong to the same lift for the point to hold both,
    // and 5/3/1 opens with three sets of the main lift.
    assert_eq!(body["sets"][0]["exercise"], body["sets"][1]["exercise"]);

    // `/v1/progress` windows to the last twelve months measured from `now()`;
    // the fixture's fixed date cannot move (see `log_a_recent_session`), so this
    // overrides it the same way that helper does.
    let now = chrono::Utc::now();
    body["started_at"] = json!(now.to_rfc3339());
    body["ended_at"] = json!((now + chrono::Duration::hours(1)).to_rfc3339());

    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::CREATED);

    let view = progress(&server, &token).await;
    let point = &view["lifts"][0]["points"][0];

    assert_eq!(point["drift_kg"].as_f64(), Some(2.5));
    assert_eq!(point["sets_over"].as_u64(), Some(1));
    assert_eq!(point["sets_under"].as_u64(), Some(1));
}

/// The units are the contract, and nothing else asserted which one is which.
///
/// `progress.rs`'s own test only checks that every indicator has *a* unit,
/// which can fail only if a fourth variant appears. This pins the two that a
/// client formats differently: kilograms are weight and get D-04's treatment,
/// a session count is a bare integer. Swapping them would render "12 kg
/// sessions" and no existing test would notice.
#[sqlx::test]
async fn an_indicator_names_the_unit_the_client_must_format_it_in(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    log_a_recent_session(&server, &token, enrollment).await;

    let view = progress(&server, &token).await;
    let unit = |key: &str| {
        view["overall"]
            .as_array()
            .expect("overall is a list")
            .iter()
            .find(|indicator| indicator["key"] == key)
            .unwrap_or_else(|| panic!("{key} is an indicator"))["unit"]
            .as_str()
            .expect("a unit is a string")
            .to_owned()
    };

    assert_eq!(unit("load_moved"), "kg");
    assert_eq!(unit("sessions"), "count");
}

/// A rival sees an empty screen, and the owner still sees a full one.
///
/// The convention every other read endpoint here follows
/// (`another_athletes_workout_detail_is_not_found` and its siblings), and the
/// one `/v1/progress` was missing. The 401 test proves an *unauthenticated*
/// request is refused; it says nothing about an authenticated stranger, which
/// is the failure that would actually leak training data.
///
/// One test covers all four queries: they scope through the same join on
/// `enrollments`, so a widened predicate in any of them shows up as something
/// non-empty here. And the assertions are on the *figures* as well as the array
/// lengths — "the list was empty" and "the list held a stranger's load total"
/// are the same length to a weaker test.
#[sqlx::test]
async fn another_athletes_progress_is_not_in_mine(pool: PgPool) {
    let server = server(pool);

    let mine = register(&server, EMAIL).await;
    set_maxes(&server, &mine, full_maxes()).await;
    let enrollment = enrol(&server, &mine, "wendler-531-bbb").await;
    log_a_recent_session(&server, &mine, enrollment).await;

    let theirs = register(&server, "rival@example.com").await;

    let load_moved = |view: &serde_json::Value| {
        view["overall"]
            .as_array()
            .expect("overall is a list")
            .iter()
            .find(|indicator| indicator["key"] == "load_moved")
            .expect("load moved is always offered")["value"]
            .as_f64()
            .expect("a load is a number")
    };

    let rival = progress(&server, &theirs).await;
    assert!(rival["lifts"].as_array().unwrap().is_empty());
    assert!(rival["sessions"].as_array().unwrap().is_empty());
    assert!(rival["programs"].as_array().unwrap().is_empty());
    assert_eq!(load_moved(&rival), 0.0);

    // And the owner still sees it, so "empty" above is a scoping result rather
    // than an endpoint that answers nothing to anybody.
    let owner = progress(&server, &mine).await;
    assert!(!owner["lifts"].as_array().unwrap().is_empty());
    assert_eq!(owner["sessions"].as_array().unwrap().len(), 1);
    assert_eq!(owner["programs"].as_array().unwrap().len(), 1);
    assert!(load_moved(&owner) > 0.0);
}

/// The asymmetry D-13's second question is asked in: what the program wanted,
/// against what was actually moved.
///
/// `load_planned_kg` counts every set the session prescribed, including one
/// the athlete skipped; `load_moved_kg` counts only what was performed. Making
/// both sides count the same sets would mean skipping work and still reading as
/// perfect compliance, which is the one thing this pair exists to catch.
///
/// The expected figures are computed from the session's own prescription rather
/// than written down, so this pins the rule and not 5/3/1's week-one numbers.
#[sqlx::test]
async fn the_prescribed_load_counts_a_skipped_set_and_the_moved_load_does_not(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    let prescribed = session["prescribed_sets"].as_array().unwrap();
    let volume = |set: &serde_json::Value| {
        set["prescribed_weight"].as_f64().unwrap() * set["prescribed_reps"].as_f64().unwrap()
    };

    // The whole session as prescribed, except one set in the middle of it that
    // the athlete did not do. `completed` rather than `cut_short`: they
    // finished the session, they just left a set out — which is freelancing
    // rather than running out of time, and is exactly the case in question.
    const SKIPPED: usize = 1;
    let sets: Vec<serde_json::Value> = prescribed
        .iter()
        .enumerate()
        .map(|(index, set)| {
            let mut logged = json!({
                "position": set["position"],
                "exercise": set["exercise"],
                "prescribed_weight": set["prescribed_weight"],
                "prescribed_reps": set["prescribed_reps"],
                "status": if index == SKIPPED { "skipped" } else { "done" },
            });

            if index != SKIPPED {
                logged["actual_weight"] = set["prescribed_weight"].clone();
                logged["actual_reps"] = set["prescribed_reps"].clone();
            }

            logged
        })
        .collect();

    // `/v1/progress` windows to the last twelve months measured from `now()`;
    // this test's own literal date cannot be the fixture's fixed day (see
    // `log_a_recent_session`), so it is computed here instead.
    let now = chrono::Utc::now();

    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&json!({
            "id": Uuid::now_v7(),
            "enrollment_id": enrollment,
            "started_at": now.to_rfc3339(),
            "ended_at": (now + chrono::Duration::hours(1)).to_rfc3339(),
            "outcome": "completed",
            "sets": sets,
        }))
        .await
        .assert_status(StatusCode::CREATED);

    let view = progress(&server, &token).await;
    let figures = &view["sessions"][0];

    let asked_for: f64 = prescribed.iter().map(volume).sum();
    let left_out = volume(&prescribed[SKIPPED]);

    assert!(left_out > 0.0, "the skipped set has to be worth something");
    assert_eq!(figures["load_planned_kg"].as_f64(), Some(asked_for));
    assert_eq!(
        figures["load_moved_kg"].as_f64(),
        Some(asked_for - left_out)
    );
    assert!(
        figures["load_moved_kg"].as_f64() < figures["load_planned_kg"].as_f64(),
        "a skipped set has to show as a shortfall, or the figures say nothing"
    );
}

/// A bodyweight lift's record is reps, not kilograms — so it gets no cells.
///
/// Six cells all reading `0.0` would be worse than no grid: it looks like six
/// achievements rather than an absence, and it would sit beside a real squat
/// record as though it meant the same kind of thing. The lift itself is still
/// present in the trend, which is what makes this an exclusion from the grid
/// rather than the exercise being dropped.
#[sqlx::test]
async fn a_set_lifted_at_no_weight_earns_no_record(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;
    let session = next_session(&server, &token, enrollment).await;

    let mut body = logged_as_prescribed(Uuid::now_v7(), enrollment, &session);
    let after_the_last = body["sets"]
        .as_array()
        .unwrap()
        .iter()
        .filter_map(|set| set["position"].as_u64())
        .max()
        .expect("the session prescribes sets")
        + 1;

    // Fifteen reps at nothing: above every bucket in the grid, so an
    // implementation that failed to exclude it would fill all six with zeroes.
    body["sets"].as_array_mut().unwrap().push(json!({
        "position": after_the_last,
        "exercise": "hanging-leg-raise",
        "prescribed_weight": 0.0,
        "prescribed_reps": 15,
        "actual_weight": 0.0,
        "actual_reps": 15,
        "status": "done",
    }));

    // `/v1/progress` windows to the last twelve months measured from `now()`;
    // the fixture's fixed date cannot move (see `log_a_recent_session`), so this
    // overrides it the same way that helper does.
    let now = chrono::Utc::now();
    body["started_at"] = json!(now.to_rfc3339());
    body["ended_at"] = json!((now + chrono::Duration::hours(1)).to_rfc3339());

    server
        .post("/v1/workouts")
        .authorization_bearer(&token)
        .json(&body)
        .await
        .assert_status(StatusCode::CREATED);

    let view = progress(&server, &token).await;
    let bodyweight = view["lifts"]
        .as_array()
        .unwrap()
        .iter()
        .find(|lift| lift["exercise"] == "hanging-leg-raise")
        .expect("the lift was performed and belongs in the trend");

    assert!(
        bodyweight["bests"].as_array().unwrap().is_empty(),
        "a zero-kilogram set is not a record: {}",
        bodyweight["bests"]
    );
    // Present in the trend, and honest about the estimate: Brzycki over no
    // weight is not a one-rep max of zero, it is no answer at all.
    assert_eq!(bodyweight["points"].as_array().unwrap().len(), 1);
    assert!(bodyweight["points"][0]["estimate"].is_null());

    // The barbell lift beside it still has its grid, so this excluded a set
    // rather than the query finding nothing. Whichever lift the program opened
    // the day with, by position — the assertion is that a loaded set earns
    // cells, not that 5/3/1 starts on any particular one.
    let loaded = &view["lifts"][0];
    assert_ne!(loaded["exercise"], "hanging-leg-raise");
    assert!(!loaded["bests"].as_array().unwrap().is_empty());
}

/// Submits one session at a chosen instant, with the first set taken heavy.
///
/// The date is a parameter rather than the fixture's fixed day because these
/// two tests are *about* the window, and a hard-coded 2026 date would test the
/// window's edge only until the calendar moved past it.
async fn log_a_heavy_session_at(
    server: &TestServer,
    token: &str,
    enrollment: Uuid,
    at: chrono::DateTime<chrono::Utc>,
    weight: f64,
    reps: u64,
) -> (Uuid, String) {
    let session = next_session(server, token, enrollment).await;
    let workout = Uuid::now_v7();

    let mut body = logged_as_prescribed(workout, enrollment, &session);
    body["started_at"] = json!(at.to_rfc3339());
    body["ended_at"] = json!((at + chrono::Duration::hours(1)).to_rfc3339());
    body["sets"][0]["actual_weight"] = json!(weight);
    body["sets"][0]["actual_reps"] = json!(reps);

    let exercise = body["sets"][0]["exercise"]
        .as_str()
        .expect("a set names its lift")
        .to_owned();

    server
        .post("/v1/workouts")
        .authorization_bearer(token)
        .json(&body)
        .await
        .assert_status(StatusCode::CREATED);

    (workout, exercise)
}

/// A record does not expire, and the trend around it still does.
///
/// Spec section 6 puts bests "over all history and all programs", against the
/// twelve-month window the other three queries carry. An athlete who pulled
/// their best five fourteen months ago and has been running a hypertrophy block
/// since must not open the grid and be shown a *lower* number labelled as their
/// best — every cell is meant to be backed by a set that actually happened, so
/// a windowed grid would state something false rather than merely be incomplete.
///
/// The test pins the **asymmetry**, not only the fix: the same out-of-window
/// session that supplies the record is asserted absent from `sessions` and from
/// the lift's `points`. Anybody later tidying the queries into consistency by
/// re-applying the window to all four fails here, and anybody dropping it from
/// all four fails here too.
#[sqlx::test]
async fn a_record_outlives_the_window_that_bounds_the_trend(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    // Fifteen months ago: outside the window by three months, measured from
    // now rather than from a date written into the test.
    let long_ago = chrono::Utc::now() - chrono::Duration::days(455);
    let (old_workout, lift) =
        log_a_heavy_session_at(&server, &token, enrollment, long_ago, 200.0, 5).await;

    // 5/3/1 BBB runs four days to the week, so four more sessions bring the
    // same lift around again — inside the window, and much lighter.
    for day in 1..=4 {
        let recent = chrono::Utc::now() - chrono::Duration::days(20 - day);
        log_a_heavy_session_at(&server, &token, enrollment, recent, 60.0, 5).await;
    }

    let view = progress(&server, &token).await;

    // The sessions series is windowed: four recent, and not the old one.
    let sessions = view["sessions"].as_array().unwrap();
    assert_eq!(
        sessions.len(),
        4,
        "the fifteen-month-old session is outside"
    );
    assert!(
        !sessions
            .iter()
            .any(|session| session["workout_id"] == old_workout.to_string()),
        "a windowed series must not carry the old session"
    );

    let trend = view["lifts"]
        .as_array()
        .unwrap()
        .iter()
        .find(|entry| entry["exercise"] == lift.as_str())
        .unwrap_or_else(|| panic!("{lift} was trained inside the window"));

    // The trend is windowed too, so nothing plots at fifteen months.
    assert!(
        !trend["points"]
            .as_array()
            .unwrap()
            .iter()
            .any(|point| point["workout_id"] == old_workout.to_string()),
        "the trend is a series and is bounded"
    );

    // And the record is not. 200 kg for five, from the session the trend has
    // correctly forgotten.
    let at_five = trend["bests"]
        .as_array()
        .unwrap()
        .iter()
        .find(|best| best["reps"].as_u64() == Some(5))
        .expect("a 5-rep bucket");

    assert_eq!(at_five["weight"].as_f64(), Some(200.0));
    assert_eq!(
        at_five["workout_id"],
        old_workout.to_string(),
        "the record must still name the out-of-window set that set it"
    );
}

/// A lift untouched for over a year still shows its record.
///
/// The companion hole to the query fix, and the reason dropping the window from
/// the SQL is not on its own enough: `lifts` is assembled from the trend points,
/// so a lift with a record and no recent session would have had its record
/// fetched and then dropped on the way out. The athlete would see nothing —
/// which is the same wrong answer the window gave, arriving by a different
/// route.
#[sqlx::test]
async fn a_lift_not_trained_in_a_year_still_carries_its_record(pool: PgPool) {
    let server = server(pool);
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    let long_ago = chrono::Utc::now() - chrono::Duration::days(455);
    let (_, lift) = log_a_heavy_session_at(&server, &token, enrollment, long_ago, 200.0, 5).await;

    let view = progress(&server, &token).await;

    // Nothing inside the window at all: no sessions, and no program totals.
    assert!(view["sessions"].as_array().unwrap().is_empty());
    assert!(view["programs"].as_array().unwrap().is_empty());

    let trend = view["lifts"]
        .as_array()
        .unwrap()
        .iter()
        .find(|entry| entry["exercise"] == lift.as_str())
        .unwrap_or_else(|| panic!("{lift} holds a record and must still be listed"));

    // No trend to draw — the series is empty and honest about it — but the
    // record survives, which is the whole distinction.
    assert!(trend["points"].as_array().unwrap().is_empty());
    assert_eq!(
        trend["bests"]
            .as_array()
            .unwrap()
            .iter()
            .find(|best| best["reps"].as_u64() == Some(5))
            .expect("a 5-rep bucket")["weight"]
            .as_f64(),
        Some(200.0)
    );
}

// --- `advanced_at` is statement time, not transaction time -----------------
//
// Postgres's `now()` is fixed for the lifetime of a transaction; the whole
// reason `advanced_at` defaults to `clock_timestamp()` instead is that two
// submits can overlap under the enrolment's `for update` lock, and the row
// written by the transaction that acquires the lock *second* must not be
// stamped earlier than the row written first. That specific interleaving —
// two genuinely concurrent transactions racing on one lock — is not
// something this crate's `#[sqlx::test]` harness (one pool, no manual
// connection interleaving) can drive honestly. Both tests below stop short
// of that: they prove the mechanism the fix relies on, not the race itself.

/// The regression this guards against is literal: someone reverts the
/// default to `now()` "for tidiness", every existing test still passes
/// (nothing here submits two overlapping requests), and the false
/// `ChainBroken` this migration exists to prevent comes back silently. This
/// reads the column's actual default straight from the catalog so that
/// revert fails immediately and loudly, without needing a race to trigger it.
#[sqlx::test]
async fn advanced_at_still_defaults_to_clock_timestamp(pool: PgPool) {
    let default_expr: String = sqlx::query_scalar(
        "select pg_get_expr(d.adbin, d.adrelid)
         from pg_attrdef d
         join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
         where d.adrelid = 'enrollment_advances'::regclass
           and a.attname = 'advanced_at'",
    )
    .fetch_one(&pool)
    .await
    .expect("advanced_at has a default");

    assert_eq!(default_expr, "clock_timestamp()");
}

/// `now()` is frozen at transaction start, so two statements in the same
/// transaction always see the same value; `clock_timestamp()` is evaluated
/// per statement. This is what makes lock-acquisition order and insert order
/// coincide for `advanced_at` — the property `load_advances`'s ordering
/// comment in `advances.rs` depends on.
///
/// This test is honest about what it does and does not show: it inserts two
/// rows for one enrolment *sequentially within a single transaction*
/// (`workouts` rows created directly by SQL, since the API only ever writes
/// one `enrollment_advances` row per transaction) with `pg_sleep` between
/// them, and asserts the second row's `advanced_at` is strictly later than
/// the first's. That demonstrates the statement-time behaviour the fix
/// depends on. It does not exercise two concurrent transactions or the
/// `for update` lock, and it proves nothing about lock-acquisition order —
/// only a real race, which this harness cannot drive, would do that.
#[sqlx::test]
async fn advanced_at_moves_between_statements_in_one_transaction(pool: PgPool) {
    let server = server(pool.clone());
    let token = register(&server, EMAIL).await;
    set_maxes(&server, &token, full_maxes()).await;
    let enrollment = enrol(&server, &token, "wendler-531-bbb").await;

    let workout_a = Uuid::now_v7();
    let workout_b = Uuid::now_v7();

    let mut tx = pool.begin().await.unwrap();

    for workout in [workout_a, workout_b] {
        sqlx::query(
            "insert into workouts (id, enrollment_id, week, day, started_at)
             values ($1, $2, 1, 1, now())",
        )
        .bind(workout)
        .bind(enrollment)
        .execute(&mut *tx)
        .await
        .unwrap();
    }

    sqlx::query(
        "insert into enrollment_advances
             (workout_id, enrollment_id, state_before, state_after, engine_version)
         values ($1, $2, '{}'::jsonb, '{}'::jsonb, 'test')",
    )
    .bind(workout_a)
    .bind(enrollment)
    .execute(&mut *tx)
    .await
    .unwrap();

    // Long enough to exceed clock resolution comfortably; short enough not to
    // make the suite noticeably slower.
    sqlx::query("select pg_sleep(0.05)")
        .execute(&mut *tx)
        .await
        .unwrap();

    sqlx::query(
        "insert into enrollment_advances
             (workout_id, enrollment_id, state_before, state_after, engine_version)
         values ($1, $2, '{}'::jsonb, '{}'::jsonb, 'test')",
    )
    .bind(workout_b)
    .bind(enrollment)
    .execute(&mut *tx)
    .await
    .unwrap();

    tx.commit().await.unwrap();

    let stamps: Vec<(Uuid, DateTime<Utc>)> = sqlx::query_as(
        "select workout_id, advanced_at from enrollment_advances
         where workout_id = any($1)
         order by advanced_at",
    )
    .bind(vec![workout_a, workout_b])
    .fetch_all(&pool)
    .await
    .unwrap();

    assert_eq!(stamps[0].0, workout_a, "inserted first, so sorts first");
    assert_eq!(stamps[1].0, workout_b, "inserted second, so sorts second");
    assert!(
        stamps[1].1 > stamps[0].1,
        "clock_timestamp() must advance between two statements in one \
         transaction — if this ties, the default reverted to now()"
    );
}
