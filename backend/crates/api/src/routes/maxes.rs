//! The athlete's entered one-rep maxes (D-04).
//!
//! A map of exercise key to kilograms, and deliberately not a fixed set of three
//! lifts. 5/3/1 BBB needs four — press, deadlift, bench, squat — and Smolov Jr
//! needs three; a `{ squat, bench, deadlift }` struct would have made the fourth
//! program a migration. Which keys a program requires is the program's business
//! and nobody else's, and it says so by refusing to start (see the
//! `ProgramError` conversion in `crate::error`).
//!
//! Maxes are entered, never derived. Each program takes its own view of the
//! number — 5/3/1 works from 90% of it — so the conservatism lives in the
//! program rather than in a settings form the athlete has to be trusted to fill
//! in pessimistically. An adaptive program's *training* max is not here at all:
//! it lives in `enrollments.state` and moves only through `advance()`.
//!
//! ## `numeric` and `f64`
//!
//! `athlete_maxes.weight` is `numeric(6,2)`, which sqlx will not decode into an
//! `f64` — Postgres numerics need `bigdecimal` or `rust_decimal`, a dependency
//! bought for a column that holds two decimal places of kilograms. So the cast
//! is written into the SQL instead, `::float8` on the way out and `::numeric` on
//! the way in, and the same trick appears in `workouts` for the same reason.

use std::collections::BTreeMap;

use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use athletos_training::{exercise, Maxes};

use crate::auth::AuthenticatedAthlete;
use crate::error::{ApiError, ApiResult};
use crate::state::AppState;

/// The heaviest one-rep max this API will record.
///
/// The column would hold 9999.99. This floor-to-ceiling sanity bound exists to
/// catch the two mistakes that actually happen — a stray digit, and pounds typed
/// into a kilogram field — early enough that the athlete is told rather than
/// prescribed a percentage of nonsense.
pub const MAX_WEIGHT_KG: f64 = 1000.0;

/// One athlete's maxes, keyed by exercise.
///
/// The same shape in both directions, so the client's form state and the
/// response are one type. Weights are bare numbers with kilogram semantics: no
/// unit is written into any domain type, which is what makes offering pounds
/// later a UI change and not a migration (D-04).
#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct MaxesDocument {
    #[schema(example = json!({ "squat": 140.0, "bench": 100.0, "deadlift": 180.0, "military-press": 60.0 }))]
    pub maxes: BTreeMap<String, f64>,
}

/// Everything the athlete has entered.
#[utoipa::path(
    get,
    path = "/v1/athlete/maxes",
    operation_id = "show_maxes",
    tag = "athlete",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "The athlete's maxes, possibly none", body = MaxesDocument),
        (status = 401, description = "Missing or invalid access token", body = crate::error::ProblemDetails),
    )
)]
pub async fn show(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
) -> ApiResult<Json<MaxesDocument>> {
    Ok(Json(MaxesDocument {
        maxes: load(&state, athlete.athlete_id)
            .await?
            .iter()
            .map(|(exercise, weight)| (exercise.to_owned(), weight))
            .collect(),
    }))
}

/// Replaces the athlete's maxes with exactly what is sent.
///
/// A `PUT` of the whole document, not a patch: what the client holds is one
/// form, and a partial upsert would leave "clear the max I entered by mistake"
/// with no representation at all. A key absent from the body is therefore a key
/// deleted, and the whole thing is one transaction so a half-applied form is not
/// a state the athlete can end up in.
///
/// Removing a max cannot break a program already running. A prescriptive block
/// snapshots the maxes it was started from (D-03) and an adaptive one keeps its
/// training max in `State`, so neither reads this table again after enrolment —
/// which is also why editing a number here does not retroactively rewrite
/// sessions the athlete has already been shown (D-07).
#[utoipa::path(
    put,
    path = "/v1/athlete/maxes",
    operation_id = "replace_maxes",
    tag = "athlete",
    security(("bearer_token" = [])),
    request_body = MaxesDocument,
    responses(
        (status = 200, description = "The maxes as now stored", body = MaxesDocument),
        (status = 401, description = "Missing or invalid access token", body = crate::error::ProblemDetails),
        (status = 422, description = "An unknown exercise key or an implausible weight", body = crate::error::ProblemDetails),
    )
)]
pub async fn replace(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Json(body): Json<MaxesDocument>,
) -> ApiResult<Json<MaxesDocument>> {
    let mut exercises: Vec<String> = Vec::with_capacity(body.maxes.len());
    let mut weights: Vec<f64> = Vec::with_capacity(body.maxes.len());

    for (key, weight) in &body.maxes {
        // The key has to name something in the compiled registry, or the
        // athlete has stored a number no program will ever ask for and there is
        // nothing to tell them that later.
        if exercise::find(key).is_none() {
            return Err(ApiError::Validation(format!(
                "{key} is not an exercise this API knows"
            )));
        }

        if !weight.is_finite() || *weight <= 0.0 || *weight > MAX_WEIGHT_KG {
            return Err(ApiError::Validation(format!(
                "the max for {key} must be a weight in kilograms between 0 and {MAX_WEIGHT_KG}"
            )));
        }

        exercises.push(key.clone());
        weights.push(*weight);
    }

    let mut tx = state.db.begin().await?;

    // `<> all` rather than `not in`, because `not in` against an empty array is
    // fine but against an array containing a null is not — and this is the one
    // statement that has to be right when the body is `{"maxes": {}}`, which is
    // how an athlete clears everything.
    sqlx::query("delete from athlete_maxes where athlete_id = $1 and exercise <> all($2::text[])")
        .bind(athlete.athlete_id)
        .bind(&exercises)
        .execute(&mut *tx)
        .await?;

    sqlx::query(
        "insert into athlete_maxes (athlete_id, exercise, weight)
         select $1, entry.exercise, entry.weight::numeric
         from unnest($2::text[], $3::float8[]) as entry(exercise, weight)
         on conflict (athlete_id, exercise)
         do update set weight = excluded.weight, updated_at = now()",
    )
    .bind(athlete.athlete_id)
    .bind(&exercises)
    .bind(&weights)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    // Read back rather than echo. `numeric(6,2)` rounds on the way in, so what
    // was sent and what is stored are not always the same number, and the
    // client's form should end up holding the stored one.
    show(State(state), athlete).await
}

/// The athlete's maxes in the shape the engine takes them.
///
/// `pub(crate)` because enrolment needs the same read and must not grow its own
/// copy of the `::float8` cast.
pub(crate) async fn load(state: &AppState, athlete_id: uuid::Uuid) -> ApiResult<Maxes> {
    let rows: Vec<(String, f64)> = sqlx::query_as(
        "select exercise, weight::float8 from athlete_maxes
         where athlete_id = $1 order by exercise",
    )
    .bind(athlete_id)
    .fetch_all(&state.db)
    .await?;

    Ok(rows.into_iter().collect())
}
