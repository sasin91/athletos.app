//! Private reusable workouts, immutable revisions, and revocable pinned links.
use athletos_training::{exercise, Block, Lift, Loading};
use axum::{
    extract::{Path, State},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::{DateTime, Utc};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::{Executor, PgConnection, Postgres};
use utoipa::ToSchema;
use uuid::Uuid;

use super::maxes::MAX_WEIGHT_KG;
use crate::{
    auth::AuthenticatedAthlete,
    error::{ApiError, ApiResult},
    state::AppState,
};

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct WorkoutLift {
    pub sets: u32,
    pub reps: u32,
    pub weight: f64,
    #[serde(default)]
    pub amrap: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct WorkoutBlock {
    pub exercise: String,
    pub lifts: Vec<WorkoutLift>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct WorkoutContent {
    pub title: String,
    pub description: Option<String>,
    pub blocks: Vec<WorkoutBlock>,
}

impl WorkoutContent {
    pub fn validate(&self) -> ApiResult<()> {
        if self.title.trim().is_empty() || self.title.chars().count() > 200 {
            return Err(ApiError::Validation(
                "title must contain between 1 and 200 characters".into(),
            ));
        }
        if self
            .description
            .as_ref()
            .is_some_and(|v| v.chars().count() > 4000)
        {
            return Err(ApiError::Validation(
                "description must be at most 4000 characters".into(),
            ));
        }
        if self.blocks.is_empty() || self.blocks.len() > 500 {
            return Err(ApiError::Validation(
                "a workout must contain between 1 and 500 exercise blocks".into(),
            ));
        }
        let mut total = 0_u64;
        for block in &self.blocks {
            let exercise = exercise::find(&block.exercise)
                .ok_or_else(|| ApiError::Validation("unknown exercise key".into()))?;
            if block.lifts.is_empty() || block.lifts.len() > 500 {
                return Err(ApiError::Validation(
                    "an exercise must contain between 1 and 500 set groups".into(),
                ));
            }
            for lift in &block.lifts {
                if lift.sets == 0 || lift.reps == 0 || lift.reps > 1000 {
                    return Err(ApiError::Validation(
                        "sets must be positive and reps must be between 1 and 1000".into(),
                    ));
                }
                total += u64::from(lift.sets);
                if total > 500 {
                    return Err(ApiError::Validation(
                        "a workout may contain at most 500 expanded sets".into(),
                    ));
                }
                if !lift.weight.is_finite() || !(0.0..=MAX_WEIGHT_KG).contains(&lift.weight) {
                    return Err(ApiError::Validation(format!(
                        "weight must be between 0 and {MAX_WEIGHT_KG} kilograms"
                    )));
                }
                if matches!(exercise.loading, Loading::Bodyweight) && lift.weight != 0.0 {
                    return Err(ApiError::Validation(
                        "bodyweight exercises must have zero external weight".into(),
                    ));
                }
            }
        }
        Ok(())
    }

    /// The same loading rules used by compiled programs, retaining input values
    /// in the revision while materializing rounded, loadable prescriptions.
    pub fn materialize_blocks(&self) -> ApiResult<Vec<Block>> {
        self.validate()?;
        self.blocks
            .iter()
            .map(|block| {
                let exercise = exercise::find(&block.exercise).ok_or(ApiError::NotFound)?;
                Ok(Block {
                    exercise: block.exercise.clone(),
                    lifts: block
                        .lifts
                        .iter()
                        .map(|lift| Lift {
                            sets: lift.sets,
                            reps: lift.reps,
                            amrap: lift.amrap,
                            load: exercise.loading.round_down(lift.weight),
                        })
                        .collect(),
                })
            })
            .collect()
    }
}

#[derive(Debug, Serialize, ToSchema)]
pub struct WorkoutDefinition {
    pub id: Uuid,
    pub revision: i32,
    #[serde(flatten)]
    pub content: WorkoutContent,
    pub archived: bool,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct DefinitionList {
    pub workouts: Vec<WorkoutDefinition>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateDefinition {
    pub expected_revision: i32,
    #[serde(flatten)]
    pub content: WorkoutContent,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct RevisionRequest {
    pub revision: i32,
}

#[derive(Debug, Serialize, ToSchema, sqlx::FromRow)]
pub struct WorkoutShare {
    pub id: Uuid,
    pub revision: i32,
    pub created_at: DateTime<Utc>,
    pub revoked_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ShareList {
    pub shares: Vec<WorkoutShare>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CreatedShare {
    pub id: Uuid,
    pub revision: i32,
    /// Returned once; only its SHA-256 digest is stored.
    pub token: String,
    pub path: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SharedWorkout {
    pub revision: i32,
    #[serde(flatten)]
    pub content: WorkoutContent,
    /// Display metadata for this revision, also available before sign-in.
    pub exercises: Vec<super::exercises::ExerciseSummary>,
}

fn decode(document: serde_json::Value) -> ApiResult<WorkoutContent> {
    serde_json::from_value(document)
        .map_err(|e| ApiError::Internal(format!("invalid workout revision: {e}")))
}

pub async fn load_revision<'e, E>(
    executor: E,
    athlete_id: Uuid,
    definition_id: Uuid,
    revision: i32,
) -> ApiResult<WorkoutContent>
where
    E: Executor<'e, Database = Postgres>,
{
    let document: serde_json::Value = sqlx::query_scalar(
        "select r.document from workout_revisions r join workout_definitions d on d.id = r.definition_id where d.id = $1 and d.athlete_id = $2 and r.revision = $3"
    ).bind(definition_id).bind(athlete_id).bind(revision).fetch_optional(executor).await?.ok_or(ApiError::NotFound)?;
    decode(document)
}

async fn insert_definition(
    conn: &mut PgConnection,
    athlete_id: Uuid,
    content: WorkoutContent,
) -> ApiResult<WorkoutDefinition> {
    content.validate()?;
    let id = Uuid::now_v7();
    sqlx::query(
        "insert into workout_definitions (id, athlete_id, current_revision) values ($1,$2,1)",
    )
    .bind(id)
    .bind(athlete_id)
    .execute(&mut *conn)
    .await?;
    sqlx::query(
        "insert into workout_revisions (definition_id, revision, document) values ($1,1,$2)",
    )
    .bind(id)
    .bind(serde_json::to_value(&content).map_err(|e| ApiError::Internal(e.to_string()))?)
    .execute(conn)
    .await?;
    Ok(WorkoutDefinition {
        id,
        revision: 1,
        content,
        archived: false,
    })
}

// Locking the owner row serializes revisions, archive, and share creation.
async fn lock_active(conn: &mut PgConnection, id: Uuid, athlete_id: Uuid) -> ApiResult<i32> {
    sqlx::query_scalar("select current_revision from workout_definitions where id=$1 and athlete_id=$2 and archived_at is null for update")
        .bind(id).bind(athlete_id).fetch_optional(conn).await?.ok_or(ApiError::NotFound)
}

#[utoipa::path(get, path="/v1/workout-definitions", operation_id="list_workout_definitions", tag="workout-definitions", security(("bearer_token"=[])), responses((status=200, body=DefinitionList)))]
pub async fn list(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
) -> ApiResult<Json<DefinitionList>> {
    let rows: Vec<(Uuid,i32,serde_json::Value)> = sqlx::query_as("select d.id,d.current_revision,r.document from workout_definitions d join workout_revisions r on r.definition_id=d.id and r.revision=d.current_revision where d.athlete_id=$1 and d.archived_at is null order by d.updated_at desc,d.id")
        .bind(athlete.athlete_id).fetch_all(&state.db).await?;
    let workouts = rows
        .into_iter()
        .map(|(id, revision, doc)| {
            Ok(WorkoutDefinition {
                id,
                revision,
                content: decode(doc)?,
                archived: false,
            })
        })
        .collect::<ApiResult<_>>()?;
    Ok(Json(DefinitionList { workouts }))
}

#[utoipa::path(post, path="/v1/workout-definitions", operation_id="create_workout_definition", tag="workout-definitions", security(("bearer_token"=[])), request_body=WorkoutContent, responses((status=201, body=WorkoutDefinition)))]
pub async fn create(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Json(content): Json<WorkoutContent>,
) -> ApiResult<(StatusCode, Json<WorkoutDefinition>)> {
    content.validate()?;
    let mut tx = state.db.begin().await?;
    let result = insert_definition(&mut tx, athlete.athlete_id, content).await?;
    tx.commit().await?;
    Ok((StatusCode::CREATED, Json(result)))
}

#[utoipa::path(get, path="/v1/workout-definitions/{id}", operation_id="get_workout_definition", tag="workout-definitions", security(("bearer_token"=[])), params(("id"=Uuid,Path)), responses((status=200, body=WorkoutDefinition)))]
pub async fn get(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<WorkoutDefinition>> {
    let (revision,doc,archived): (i32,serde_json::Value,bool) = sqlx::query_as("select d.current_revision,r.document,d.archived_at is not null from workout_definitions d join workout_revisions r on r.definition_id=d.id and r.revision=d.current_revision where d.id=$1 and d.athlete_id=$2")
        .bind(id).bind(athlete.athlete_id).fetch_optional(&state.db).await?.ok_or(ApiError::NotFound)?;
    Ok(Json(WorkoutDefinition {
        id,
        revision,
        content: decode(doc)?,
        archived,
    }))
}

#[utoipa::path(patch, path="/v1/workout-definitions/{id}", operation_id="update_workout_definition", tag="workout-definitions", security(("bearer_token"=[])), params(("id"=Uuid,Path)), request_body=UpdateDefinition, responses((status=200, body=WorkoutDefinition),(status=409,body=crate::error::ProblemDetails)))]
pub async fn update(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateDefinition>,
) -> ApiResult<Json<WorkoutDefinition>> {
    body.content.validate()?;
    let mut tx = state.db.begin().await?;
    let current = lock_active(&mut tx, id, athlete.athlete_id).await?;
    if current != body.expected_revision {
        return Err(ApiError::Conflict(
            "this workout has changed; reload it before saving your draft".into(),
        ));
    }
    let revision = current
        .checked_add(1)
        .ok_or_else(|| ApiError::Conflict("revision limit reached".into()))?;
    sqlx::query(
        "insert into workout_revisions (definition_id,revision,document) values ($1,$2,$3)",
    )
    .bind(id)
    .bind(revision)
    .bind(serde_json::to_value(&body.content).map_err(|e| ApiError::Internal(e.to_string()))?)
    .execute(&mut *tx)
    .await?;
    sqlx::query("update workout_definitions set current_revision=$2,updated_at=now() where id=$1")
        .bind(id)
        .bind(revision)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(Json(WorkoutDefinition {
        id,
        revision,
        content: body.content,
        archived: false,
    }))
}

#[utoipa::path(delete, path="/v1/workout-definitions/{id}", operation_id="archive_workout_definition", tag="workout-definitions", security(("bearer_token"=[])), params(("id"=Uuid,Path)), responses((status=204)))]
pub async fn archive(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Path(id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    let mut tx = state.db.begin().await?;
    let exists: Option<Uuid> = sqlx::query_scalar(
        "select id from workout_definitions where id=$1 and athlete_id=$2 for update",
    )
    .bind(id)
    .bind(athlete.athlete_id)
    .fetch_optional(&mut *tx)
    .await?;
    exists.ok_or(ApiError::NotFound)?;
    sqlx::query("update workout_definitions set archived_at=coalesce(archived_at,now()),updated_at=now() where id=$1").bind(id).execute(&mut *tx).await?;
    sqlx::query(
        "update workout_shares set revoked_at=coalesce(revoked_at,now()) where definition_id=$1",
    )
    .bind(id)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(post, path="/v1/workout-definitions/{id}/copies", operation_id="copy_workout_definition", tag="workout-definitions", security(("bearer_token"=[])), params(("id"=Uuid,Path)), request_body=RevisionRequest, responses((status=201,body=WorkoutDefinition)))]
pub async fn copy(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Path(id): Path<Uuid>,
    Json(body): Json<RevisionRequest>,
) -> ApiResult<(StatusCode, Json<WorkoutDefinition>)> {
    let content = load_revision(&state.db, athlete.athlete_id, id, body.revision).await?;
    let mut tx = state.db.begin().await?;
    let result = insert_definition(&mut tx, athlete.athlete_id, content).await?;
    tx.commit().await?;
    Ok((StatusCode::CREATED, Json(result)))
}

fn private_response(value: impl IntoResponse) -> Response {
    let mut response = value.into_response();
    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, "private, no-store".parse().unwrap());
    response
        .headers_mut()
        .insert("referrer-policy", "no-referrer".parse().unwrap());
    response
}

#[utoipa::path(post, path="/v1/workout-definitions/{id}/shares", operation_id="create_workout_share", tag="workout-definitions", security(("bearer_token"=[])), params(("id"=Uuid,Path)), request_body=RevisionRequest, responses((status=201,body=CreatedShare)))]
pub async fn create_share(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Path(id): Path<Uuid>,
    Json(body): Json<RevisionRequest>,
) -> ApiResult<Response> {
    let mut tx = state.db.begin().await?;
    lock_active(&mut tx, id, athlete.athlete_id).await?;
    let exists: bool = sqlx::query_scalar(
        "select exists(select 1 from workout_revisions where definition_id=$1 and revision=$2)",
    )
    .bind(id)
    .bind(body.revision)
    .fetch_one(&mut *tx)
    .await?;
    if !exists {
        return Err(ApiError::NotFound);
    }
    let mut bytes = [0_u8; 32];
    rand::rng().fill_bytes(&mut bytes);
    let token = URL_SAFE_NO_PAD.encode(bytes);
    let share_id = Uuid::now_v7();
    sqlx::query("insert into workout_shares(id,definition_id,revision,athlete_id,token_hash) values($1,$2,$3,$4,$5)")
        .bind(share_id).bind(id).bind(body.revision).bind(athlete.athlete_id).bind(Sha256::digest(token.as_bytes()).to_vec()).execute(&mut *tx).await?;
    tx.commit().await?;
    let path = format!("/shared/workouts/{token}");
    Ok(private_response((
        StatusCode::CREATED,
        Json(CreatedShare {
            id: share_id,
            revision: body.revision,
            token,
            path,
        }),
    )))
}

#[utoipa::path(get, path="/v1/workout-definitions/{id}/shares", operation_id="list_workout_shares", tag="workout-definitions", security(("bearer_token"=[])), params(("id"=Uuid,Path)), responses((status=200,body=ShareList)))]
pub async fn list_shares(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Path(id): Path<Uuid>,
) -> ApiResult<Response> {
    let exists: bool = sqlx::query_scalar(
        "select exists(select 1 from workout_definitions where id=$1 and athlete_id=$2)",
    )
    .bind(id)
    .bind(athlete.athlete_id)
    .fetch_one(&state.db)
    .await?;
    if !exists {
        return Err(ApiError::NotFound);
    }
    let shares: Vec<WorkoutShare> = sqlx::query_as("select id,revision,created_at,revoked_at from workout_shares where definition_id=$1 and athlete_id=$2 order by created_at desc,id")
        .bind(id).bind(athlete.athlete_id).fetch_all(&state.db).await?;
    Ok(private_response(Json(ShareList { shares })))
}

#[utoipa::path(delete, path="/v1/workout-definitions/{id}/shares/{share_id}", operation_id="revoke_workout_share", tag="workout-definitions", security(("bearer_token"=[])), params(("id"=Uuid,Path),("share_id"=Uuid,Path)), responses((status=204)))]
pub async fn revoke_share(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Path((id, share_id)): Path<(Uuid, Uuid)>,
) -> ApiResult<StatusCode> {
    let affected=sqlx::query("update workout_shares set revoked_at=coalesce(revoked_at,now()) where id=$1 and definition_id=$2 and athlete_id=$3")
        .bind(share_id).bind(id).bind(athlete.athlete_id).execute(&state.db).await?.rows_affected();
    if affected == 0 {
        return Err(ApiError::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}

async fn shared_content(conn: &mut PgConnection, token: &str) -> ApiResult<(i32, WorkoutContent)> {
    if token.len() != 43 || URL_SAFE_NO_PAD.decode(token).is_err() {
        return Err(ApiError::NotFound);
    }
    let hash = Sha256::digest(token.as_bytes()).to_vec();
    // Match archive's lock order (definition, then share), preventing a copy
    // racing archive from deadlocking while preserving revocation semantics.
    let definition: Option<Uuid> = sqlx::query_scalar("select d.id from workout_definitions d join workout_shares s on s.definition_id=d.id where s.token_hash=$1 and s.revoked_at is null and d.archived_at is null for share of d")
        .bind(&hash).fetch_optional(&mut *conn).await?;
    definition.ok_or(ApiError::NotFound)?;
    // Holding a share lock through copy makes revocation linearizable: when
    // revoke returns, no later copy may still read the old grant.
    let (revision,document):(i32,serde_json::Value)=sqlx::query_as("select s.revision,r.document from workout_shares s join workout_revisions r on r.definition_id=s.definition_id and r.revision=s.revision where s.token_hash=$1 and s.revoked_at is null for share of s")
        .bind(hash).fetch_optional(conn).await?.ok_or(ApiError::NotFound)?;
    Ok((revision, decode(document)?))
}

#[utoipa::path(get, path="/v1/shared-workouts/{token}", operation_id="preview_shared_workout", tag="workout-definitions", params(("token"=String,Path)), responses((status=200,body=SharedWorkout)))]
pub async fn preview_share(State(state): State<AppState>, Path(token): Path<String>) -> Response {
    let result: ApiResult<Json<SharedWorkout>> = async {
        let mut conn = state.db.acquire().await?;
        let (revision, content) = shared_content(&mut conn, &token).await?;
        let mut seen = std::collections::HashSet::new();
        let exercises = content
            .blocks
            .iter()
            .filter(|block| seen.insert(block.exercise.as_str()))
            .filter_map(|block| exercise::find(&block.exercise))
            .map(Into::into)
            .collect();
        Ok(Json(SharedWorkout {
            revision,
            content,
            exercises,
        }))
    }
    .await;
    private_response(result)
}

#[utoipa::path(post, path="/v1/shared-workouts/{token}/copies", operation_id="copy_shared_workout", tag="workout-definitions", security(("bearer_token"=[])), params(("token"=String,Path)), responses((status=201,body=WorkoutDefinition)))]
pub async fn copy_share(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Path(token): Path<String>,
) -> Response {
    let result: ApiResult<(StatusCode, Json<WorkoutDefinition>)> = async {
        let mut tx = state.db.begin().await?;
        let (_, content) = shared_content(&mut tx, &token).await?;
        let result = insert_definition(&mut tx, athlete.athlete_id, content).await?;
        tx.commit().await?;
        Ok((StatusCode::CREATED, Json(result)))
    }
    .await;
    private_response(result)
}
