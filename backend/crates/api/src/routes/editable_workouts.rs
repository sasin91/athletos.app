//! Source-aware sessions. Baseline identity, athlete edits, and actual results
//! are distinct facts; only the original program rows can drive progression.
use std::collections::{BTreeMap, BTreeSet};

use athletos_training::{
    apply_exercise_adjustments, exercise, Loading, LoggedSession, LoggedSet, Session,
    State as ProgramState,
};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{PgConnection, Postgres, Transaction};
use utoipa::ToSchema;
use uuid::Uuid;

use super::{adjustments, enrollments, programs::resolve_stored_program, workouts};
use crate::{
    auth::AuthenticatedAthlete,
    error::{ApiError, ApiResult},
    pace, report,
    state::AppState,
    timing,
};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, ToSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum WorkoutSource {
    Program,
    SavedWorkout,
    AdHoc,
}

impl WorkoutSource {
    fn name(self) -> &'static str {
        match self {
            Self::Program => "program",
            Self::SavedWorkout => "saved_workout",
            Self::AdHoc => "ad_hoc",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EditableExercise {
    pub key: String,
    pub label: String,
    pub cues: Vec<String>,
    pub loading: String,
    pub is_primary: bool,
}

pub fn exercise_catalogue() -> Vec<EditableExercise> {
    exercise::REGISTRY
        .iter()
        .map(|e| EditableExercise {
            key: e.key.into(),
            label: e.label.into(),
            cues: e.cues.iter().map(|s| (*s).into()).collect(),
            loading: match e.loading {
                Loading::Barbell => "barbell",
                Loading::Bodyweight => "bodyweight",
                Loading::Dumbbell { .. } => "dumbbell",
                Loading::Machine { .. } => "machine",
            }
            .into(),
            is_primary: e.is_primary,
        })
        .collect()
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EditablePrescribedSet {
    pub id: Uuid,
    pub block_id: Uuid,
    pub exercise: String,
    pub label: String,
    pub prescribed_weight: f64,
    pub prescribed_reps: u32,
    pub amrap: bool,
    pub plates_per_side: Vec<f64>,
    pub plate_change: Option<enrollments::PlateChangeView>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EditableSession {
    pub schema_version: u16,
    pub athlete_id: Uuid,
    pub title: String,
    pub source: WorkoutSource,
    pub definition_id: Option<Uuid>,
    pub revision: Option<i32>,
    pub draft_id: Option<Uuid>,
    pub enrollment_id: Option<Uuid>,
    pub program_key: Option<String>,
    pub week: Option<u32>,
    pub day: Option<u32>,
    pub sets: Vec<EditablePrescribedSet>,
    pub exercises: Vec<EditableExercise>,
    pub seconds_per_set: Option<f64>,
}

pub fn materialize(session: &Session) -> Vec<EditablePrescribedSet> {
    let mut expanded = enrollments::prescribed_sets_of(session).into_iter();
    let mut sets = Vec::new();
    for block in &session.blocks {
        let block_id = Uuid::now_v7();
        for _ in 0..block.lifts.iter().map(|l| l.sets).sum::<u32>() {
            if let Some(s) = expanded.next() {
                sets.push(EditablePrescribedSet {
                    id: Uuid::now_v7(),
                    block_id,
                    exercise: s.exercise,
                    label: s.label,
                    prescribed_weight: s.prescribed_weight,
                    prescribed_reps: s.prescribed_reps,
                    amrap: s.amrap,
                    plates_per_side: s.plates_per_side,
                    plate_change: s.plate_change,
                });
            }
        }
    }
    sets
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct PrepareSession {
    pub id: Uuid,
    pub enrollment_id: Uuid,
}

#[utoipa::path(post, path = "/v2/session-drafts", operation_id = "prepare_editable_session", tag = "workouts", security(("bearer_token" = [])), request_body = PrepareSession,
    responses((status = 200, description = "Prepared session; clock has not started", body = EditableSession)))]
pub async fn prepare(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Json(body): Json<PrepareSession>,
) -> ApiResult<Json<EditableSession>> {
    let mut tx = state.db.begin().await?;
    let row: Option<(String, Value, String, i64)> = sqlx::query_as(
        "select program_key,state,status,revision from enrollments where id=$1 and athlete_id=$2 for update")
        .bind(body.enrollment_id).bind(athlete.athlete_id).fetch_optional(&mut *tx).await?;
    let (key, stored, status, revision) = row.ok_or(ApiError::NotFound)?;
    if let Some((owner, enrollment, document)) = sqlx::query_as::<_, (Uuid, Uuid, Value)>(
        "select athlete_id,enrollment_id,document from session_drafts where id=$1",
    )
    .bind(body.id)
    .fetch_optional(&mut *tx)
    .await?
    {
        if owner != athlete.athlete_id || enrollment != body.enrollment_id {
            return Err(ApiError::Conflict("draft id already used".into()));
        }
        return Ok(Json(decode(document)?));
    }
    if status != "active" {
        return Err(ApiError::Conflict(
            "this program has no session left".into(),
        ));
    }
    let program = resolve_stored_program(&key)?;
    let mut session = program.session(&ProgramState::from_json(stored))?;
    let adjustment = adjustments::load(&mut *tx, body.enrollment_id).await?;
    apply_exercise_adjustments(&mut session, &adjustment);
    let sets = materialize(&session);
    let seconds = pace::measure(&mut *tx, athlete.athlete_id, sets.len())
        .await?
        .median_seconds_per_set;
    let doc = EditableSession {
        schema_version: 2,
        athlete_id: athlete.athlete_id,
        title: program.meta().name.into(),
        source: WorkoutSource::Program,
        definition_id: None,
        revision: None,
        draft_id: Some(body.id),
        enrollment_id: Some(body.enrollment_id),
        program_key: Some(key),
        week: Some(session.week),
        day: Some(session.day),
        sets,
        exercises: exercise_catalogue(),
        seconds_per_set: seconds,
    };
    let inserted = sqlx::query("insert into session_drafts(id,athlete_id,enrollment_id,enrollment_revision,document) values($1,$2,$3,$4,$5) on conflict(id) do nothing")
        .bind(body.id).bind(athlete.athlete_id).bind(body.enrollment_id).bind(revision).bind(json!(&doc)).execute(&mut *tx).await?;
    if inserted.rows_affected() == 0 {
        return Err(ApiError::Conflict("draft id already used".into()));
    }
    tx.commit().await?;
    Ok(Json(doc))
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EditableSubmittedSet {
    pub id: Uuid,
    pub block_id: Uuid,
    pub origin_id: Option<Uuid>,
    pub position: u16,
    pub exercise: String,
    pub prescribed_weight: f64,
    pub prescribed_reps: u32,
    pub committed_weight: f64,
    pub committed_reps: u32,
    pub amrap: bool,
    pub removed: bool,
    pub actual_weight: Option<f64>,
    pub actual_reps: Option<u32>,
    pub status: workouts::SetStatus,
    pub logged_at: Option<DateTime<Utc>>,
    pub logged_order: Option<u32>,
    pub note: Option<String>,
    pub drift_reason: Option<workouts::DriftReason>,
}

impl EditableSubmittedSet {
    fn legacy(&self) -> workouts::SubmittedSet {
        workouts::SubmittedSet {
            position: self.position,
            exercise: self.exercise.clone(),
            prescribed_weight: self.prescribed_weight,
            prescribed_reps: self.prescribed_reps,
            actual_weight: self.actual_weight,
            actual_reps: self.actual_reps,
            status: self.status,
            logged_at: self.logged_at,
            note: self.note.clone(),
            drift_reason: self.drift_reason,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct V2WorkoutSubmission {
    pub id: Uuid,
    pub source: WorkoutSource,
    pub title: String,
    pub definition_id: Option<Uuid>,
    pub revision: Option<i32>,
    pub draft_id: Option<Uuid>,
    pub started_at: DateTime<Utc>,
    pub ended_at: DateTime<Utc>,
    pub outcome: workouts::WorkoutOutcome,
    pub cut_reason: Option<workouts::CutReason>,
    pub notes: Option<String>,
    pub sets: Vec<EditableSubmittedSet>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct V2WorkoutReceipt {
    pub id: Uuid,
    pub duplicate: bool,
    pub title: String,
    pub source: WorkoutSource,
    /// applied, not_applied_stale, or none.
    pub progression: String,
    #[schema(value_type = Option<enrollments::ProgressView>)]
    pub progress: Option<Value>,
    #[schema(value_type = crate::report::SessionReport)]
    pub summary: Value,
    pub changes: WorkoutChanges,
}

fn decode<T: serde::de::DeserializeOwned>(value: Value) -> ApiResult<T> {
    serde_json::from_value(value)
        .map_err(|e| ApiError::Internal(format!("invalid stored workout document: {e}")))
}

pub(crate) fn validate(
    body: &V2WorkoutSubmission,
    baseline: &[EditablePrescribedSet],
) -> ApiResult<()> {
    let invalid = |s: &str| ApiError::Validation(s.into());
    if body.title.trim().is_empty() || body.title.chars().count() > 200 {
        return Err(invalid("title must contain 1–200 characters"));
    }
    let legacy = workouts::WorkoutSubmission {
        id: body.id,
        enrollment_id: Uuid::nil(),
        started_at: body.started_at,
        ended_at: body.ended_at,
        outcome: body.outcome,
        cut_reason: body.cut_reason,
        notes: body.notes.clone(),
        sets: body.sets.iter().map(EditableSubmittedSet::legacy).collect(),
    };
    workouts::validate_syntax(&legacy)?;
    let origins: BTreeMap<_, _> = baseline.iter().map(|s| (s.id, s)).collect();
    if origins.len() != baseline.len() || baseline.len() > 500 {
        return Err(invalid("invalid baseline set identities"));
    }
    for original in baseline {
        if exercise::find(&original.exercise).is_none()
            || !original.prescribed_weight.is_finite()
            || !(0.0..=super::maxes::MAX_WEIGHT_KG).contains(&original.prescribed_weight)
            || original.prescribed_reps == 0
            || original.prescribed_reps > 1000
        {
            return Err(invalid("invalid baseline prescription"));
        }
    }
    let mut ids = BTreeSet::new();
    let mut used = BTreeSet::new();
    let mut blocks = BTreeMap::new();
    let mut answer_orders = BTreeSet::new();
    for set in &body.sets {
        if exercise::find(&set.exercise).is_none() {
            return Err(invalid("unknown exercise key"));
        }
        if let Some(order) = set.logged_order {
            if order > i32::MAX as u32
                || !answer_orders.insert(order)
                || set.removed
                || matches!(set.status, workouts::SetStatus::Pending)
            {
                return Err(invalid("answer order must be unique and belong to performed or explicitly skipped sets"));
            }
        }
        if !ids.insert(set.id) {
            return Err(invalid("set IDs must be unique"));
        }
        if let Some(previous) = blocks.insert(set.block_id, &set.exercise) {
            if previous != &set.exercise {
                return Err(invalid("a block must contain one exercise"));
            }
        }
        if set.position as usize >= body.sets.len() {
            return Err(invalid("set positions must be contiguous"));
        }
        if !set.committed_weight.is_finite()
            || !(0.0..=super::maxes::MAX_WEIGHT_KG).contains(&set.committed_weight)
            || set.committed_reps == 0
            || set.committed_reps > 1000
        {
            return Err(invalid("invalid committed target"));
        }
        for weight in [
            Some(set.prescribed_weight),
            Some(set.committed_weight),
            set.actual_weight,
        ]
        .into_iter()
        .flatten()
        {
            if (weight * 100.0 - (weight * 100.0).round()).abs() > 0.000001 {
                return Err(invalid("weights may have at most two decimal places"));
            }
        }
        if let Some(origin) = set.origin_id {
            let Some(original) = origins.get(&origin) else {
                return Err(invalid("unknown baseline set"));
            };
            if !used.insert(origin)
                || original.exercise != set.exercise
                || original.id != set.id
                || original.block_id != set.block_id
            {
                return Err(invalid("baseline identity and exercise must be preserved"));
            }
        } else if origins.contains_key(&set.id) {
            return Err(invalid("baseline set must retain its origin"));
        }
        if set.removed
            && (!matches!(set.status, workouts::SetStatus::Skipped)
                || set.actual_weight.is_some()
                || set.actual_reps.is_some()
                || set.logged_at.is_some()
                || set.drift_reason.is_some())
        {
            return Err(invalid(
                "removed sets must be unperformed with no timestamp",
            ));
        }
        if matches!(
            exercise::find(&set.exercise).map(|e| e.loading),
            Some(Loading::Bodyweight)
        ) && (set.prescribed_weight != 0.0
            || set.committed_weight != 0.0
            || set.actual_weight.is_some_and(|w| w != 0.0))
        {
            return Err(invalid("bodyweight exercises use zero external load"));
        }
    }
    if used.len() != origins.len() {
        return Err(invalid(
            "every baseline set must be retained, including removed work",
        ));
    }
    let pending = body
        .sets
        .iter()
        .any(|s| !s.removed && matches!(s.status, workouts::SetStatus::Pending));
    if matches!(body.outcome, workouts::WorkoutOutcome::Completed) == pending {
        return Err(invalid("outcome must match the remaining pending work"));
    }
    Ok(())
}

/// Projection version 2: baseline order/targets, actual results by origin only.
pub(crate) fn valid_program_baseline(baseline: &EditableSession) -> bool {
    baseline.schema_version == 2
        && baseline.source == WorkoutSource::Program
        && baseline
            .week
            .is_some_and(|w| (1..=i16::MAX as u32).contains(&w))
        && baseline
            .day
            .is_some_and(|d| (1..=i16::MAX as u32).contains(&d))
        && baseline.enrollment_id.is_some()
        && baseline.draft_id.is_some()
        && baseline.program_key.is_some()
        && baseline.definition_id.is_none()
        && baseline.revision.is_none()
        && !baseline.sets.is_empty()
}

/// Callers validate the captured program context before projecting.
pub fn project(baseline: &EditableSession, body: &V2WorkoutSubmission) -> LoggedSession {
    LoggedSession {
        week: baseline.week.unwrap_or(1),
        day: baseline.day.unwrap_or(1),
        cut_reason: body.cut_reason.map(Into::into),
        sets: baseline
            .sets
            .iter()
            .enumerate()
            .map(|(position, original)| {
                let result = body
                    .sets
                    .iter()
                    .find(|s| s.origin_id == Some(original.id) && !s.removed);
                LoggedSet {
                    exercise: original.exercise.clone(),
                    position: position as u16,
                    prescribed_weight: original.prescribed_weight,
                    prescribed_reps: original.prescribed_reps,
                    actual_weight: result.and_then(|s| s.actual_weight),
                    actual_reps: result.and_then(|s| s.actual_reps),
                    status: result.map_or(athletos_training::SetStatus::Skipped, |s| {
                        match s.status {
                            workouts::SetStatus::Done => athletos_training::SetStatus::Done,
                            workouts::SetStatus::Skipped => athletos_training::SetStatus::Skipped,
                            workouts::SetStatus::Pending => athletos_training::SetStatus::Pending,
                        }
                    }),
                }
            })
            .collect(),
    }
}

async fn duplicate(
    tx: &mut Transaction<'_, Postgres>,
    id: Uuid,
    athlete: Uuid,
) -> ApiResult<Option<V2WorkoutReceipt>> {
    if let Some((owner, receipt)) = sqlx::query_as::<_, (Uuid, Option<Value>)>(
        "select athlete_id,receipt from workouts where id=$1",
    )
    .bind(id)
    .fetch_optional(&mut **tx)
    .await?
    {
        if owner != athlete {
            return Err(ApiError::Conflict("workout id already used".into()));
        }
        let mut receipt: V2WorkoutReceipt = decode(receipt.ok_or_else(|| {
            ApiError::Conflict("workout id belongs to a legacy submission".into())
        })?)?;
        receipt.duplicate = true;
        return Ok(Some(receipt));
    }
    Ok(None)
}

#[utoipa::path(post, path = "/v2/workouts", operation_id = "submit_editable_workout", tag = "workouts", security(("bearer_token" = [])), request_body = V2WorkoutSubmission,
    responses((status = 201, description = "Recorded", body = V2WorkoutReceipt),(status = 200, description = "Already recorded", body = V2WorkoutReceipt)))]
pub async fn submit(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Json(body): Json<V2WorkoutSubmission>,
) -> ApiResult<(StatusCode, Json<V2WorkoutReceipt>)> {
    let mut tx = state.db.begin().await?;
    if let Some(receipt) = duplicate(&mut tx, body.id, athlete.athlete_id).await? {
        return Ok((StatusCode::OK, Json(receipt)));
    }
    let mut baseline = None;
    let mut locked = None;
    let mut eligible = false;
    match body.source {
        WorkoutSource::Program => {
            if body.definition_id.is_some() || body.revision.is_some() {
                return Err(ApiError::Validation(
                    "program sessions cannot name a saved workout".into(),
                ));
            }
            let draft = body
                .draft_id
                .ok_or_else(|| ApiError::Validation("program session needs a draft".into()))?;
            let (enrollment_id,revision,document): (Uuid,i64,Value) = sqlx::query_as("select enrollment_id,enrollment_revision,document from session_drafts where id=$1 and athlete_id=$2")
                .bind(draft).bind(athlete.athlete_id).fetch_optional(&mut *tx).await?.ok_or(ApiError::NotFound)?;
            let (key,stored,status,current): (String,Value,String,i64) = sqlx::query_as("select program_key,state,status,revision from enrollments where id=$1 and athlete_id=$2 for update")
                .bind(enrollment_id).bind(athlete.athlete_id).fetch_optional(&mut *tx).await?.ok_or(ApiError::NotFound)?;
            // Lock order is enrollment -> draft for every program write.
            let used: Option<Uuid> =
                sqlx::query_scalar("select workout_id from session_drafts where id=$1 for update")
                    .bind(draft)
                    .fetch_one(&mut *tx)
                    .await?;
            if let Some(receipt) = duplicate(&mut tx, body.id, athlete.athlete_id).await? {
                return Ok((StatusCode::OK, Json(receipt)));
            }
            if used.is_some() {
                return Err(ApiError::Conflict(
                    "this prepared session has already been recorded".into(),
                ));
            }
            let captured = decode::<EditableSession>(document)?;
            if !valid_program_baseline(&captured)
                || captured.athlete_id != athlete.athlete_id
                || captured.enrollment_id != Some(enrollment_id)
                || captured.draft_id != Some(draft)
                || captured.program_key.as_deref() != Some(key.as_str())
            {
                return Err(ApiError::Internal(
                    "prepared program context is inconsistent".into(),
                ));
            }
            baseline = Some(captured);
            eligible = status == "active" && revision == current;
            locked = Some((enrollment_id, key, stored));
        }
        WorkoutSource::SavedWorkout => {
            if body.draft_id.is_some() {
                return Err(ApiError::Validation(
                    "saved workout cannot name a program draft".into(),
                ));
            }
            let id = body
                .definition_id
                .ok_or_else(|| ApiError::Validation("saved workout needs a definition".into()))?;
            let revision = body
                .revision
                .ok_or_else(|| ApiError::Validation("saved workout needs a revision".into()))?;
            baseline = Some(saved_session(&mut tx, athlete.athlete_id, id, revision).await?);
        }
        WorkoutSource::AdHoc => {
            if body.draft_id.is_some() || body.definition_id.is_some() || body.revision.is_some() {
                return Err(ApiError::Validation(
                    "ad-hoc workout cannot name a source".into(),
                ));
            }
        }
    }
    validate(
        &body,
        baseline
            .as_ref()
            .map(|b| b.sets.as_slice())
            .unwrap_or_default(),
    )?;
    let enrollment_id = locked.as_ref().map(|l| l.0);
    let disposition = if eligible {
        "applied"
    } else if enrollment_id.is_some() {
        "not_applied_stale"
    } else {
        "none"
    };
    let inserted = sqlx::query("insert into workouts(id,athlete_id,enrollment_id,week,day,started_at,ended_at,outcome,cut_reason,notes,schema_version,source,title,definition_id,definition_revision,baseline,submission,progression)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,2,$11,$12,$13,$14,$15,$16,$17) on conflict(id) do nothing")
        .bind(body.id).bind(athlete.athlete_id).bind(enrollment_id)
        .bind(baseline.as_ref().and_then(|b| b.week).map(|w| w as i16)).bind(baseline.as_ref().and_then(|b| b.day).map(|d| d as i16))
        .bind(body.started_at).bind(body.ended_at).bind(match body.outcome {workouts::WorkoutOutcome::Completed=>"completed",workouts::WorkoutOutcome::CutShort=>"cut_short"})
        .bind(body.cut_reason.map(|r| json!(r).as_str().unwrap().to_owned())).bind(&body.notes).bind(body.source.name()).bind(body.title.trim())
        .bind(body.definition_id).bind(body.revision).bind(baseline.as_ref().map(|b|json!(b))).bind(json!(&body)).bind(disposition).execute(&mut *tx).await?;
    if inserted.rows_affected() == 0 {
        let receipt = duplicate(&mut tx, body.id, athlete.athlete_id)
            .await?
            .ok_or_else(|| ApiError::Conflict("workout id already used".into()))?;
        return Ok((StatusCode::OK, Json(receipt)));
    }
    let legacy: Vec<_> = body.sets.iter().map(EditableSubmittedSet::legacy).collect();
    workouts::insert_sets(&mut tx, body.id, &legacy).await?;
    for set in &body.sets {
        sqlx::query("update workout_sets set stable_id=$3,origin_id=$4,block_id=$5,removed=$6,committed_weight=$7::numeric,committed_reps=$8,amrap=$9,logged_order=$10 where workout_id=$1 and position=$2")
            .bind(body.id).bind(set.position as i16).bind(set.id).bind(set.origin_id).bind(set.block_id).bind(set.removed)
            .bind(set.committed_weight).bind(set.committed_reps as i16).bind(set.amrap).bind(set.logged_order.map(|v|v as i32)).execute(&mut *tx).await?;
    }
    let mut progress = None;
    if let Some((enrollment_id, key, stored)) = locked {
        if eligible {
            let program = resolve_stored_program(&key)?;
            let projected = project(baseline.as_ref().expect("program baseline"), &body);
            let advanced = program.advance(ProgramState::from_json(stored.clone()), &projected)?;
            let next = program.progress(&advanced)?;
            sqlx::query("update enrollments set state=$2,status=case when $3 then 'finished' else status end,ended_at=case when $3 then now() else ended_at end where id=$1")
                .bind(enrollment_id).bind(advanced.as_json()).bind(next.is_finished()).execute(&mut *tx).await?;
            sqlx::query("insert into enrollment_advances(workout_id,enrollment_id,state_before,state_after,engine_version,projection_version) values($1,$2,$3,$4,$5,2)")
                .bind(body.id).bind(enrollment_id).bind(stored).bind(advanced.as_json()).bind(env!("CARGO_PKG_VERSION")).execute(&mut *tx).await?;
            progress = Some(json!(enrollments::ProgressView::from(next)));
        }
        sqlx::query("update session_drafts set workout_id=$2 where id=$1")
            .bind(body.draft_id)
            .bind(body.id)
            .execute(&mut *tx)
            .await?;
    }
    let (average, samples) = comparison(&mut tx, athlete.athlete_id, &body).await?;
    let summary = session_report(&body, average);
    let mut change = changes(baseline.as_ref(), &body);
    change.comparison_samples = samples;
    change.comparison_scope = match body.source {
        WorkoutSource::Program => Some("enrollment".into()),
        WorkoutSource::SavedWorkout => Some("saved_workout".into()),
        WorkoutSource::AdHoc => None,
    };
    let receipt = V2WorkoutReceipt {
        id: body.id,
        duplicate: false,
        title: body.title.trim().into(),
        source: body.source,
        progression: disposition.into(),
        progress,
        summary: json!(summary),
        changes: change,
    };
    sqlx::query("update workouts set receipt=$2 where id=$1")
        .bind(body.id)
        .bind(json!(&receipt))
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok((StatusCode::CREATED, Json(receipt)))
}

async fn comparison(
    tx: &mut Transaction<'_, Postgres>,
    athlete: Uuid,
    body: &V2WorkoutSubmission,
) -> ApiResult<(Option<i64>, i64)> {
    if body.source == WorkoutSource::AdHoc {
        return Ok((None, 0));
    }
    let (count,average): (i64,Option<f64>) = sqlx::query_as("select count(*),avg(extract(epoch from (ended_at-started_at)))::float8 from workouts
        where athlete_id=$1 and id<>$2 and ended_at is not null and outcome<>'auto_closed'
        and (($3::uuid is not null and definition_id=$3) or ($4::uuid is not null and enrollment_id=(select enrollment_id from session_drafts where id=$4)))")
        .bind(athlete).bind(body.id).bind(body.definition_id).bind(body.draft_id).fetch_one(&mut **tx).await?;
    Ok((
        if count >= 3 {
            average.map(|a| a.round() as i64)
        } else {
            None
        },
        count,
    ))
}

fn session_report(body: &V2WorkoutSubmission, average: Option<i64>) -> report::SessionReport {
    let rows: Vec<_> = body
        .sets
        .iter()
        .filter(|s| !s.removed)
        .map(|s| report::ReportedSet {
            exercise: s.exercise.clone(),
            label: exercise::find(&s.exercise)
                .map(|e| e.label)
                .unwrap_or(&s.exercise)
                .into(),
            prescribed_weight: s.committed_weight,
            prescribed_reps: s.committed_reps,
            actual_weight: s.actual_weight,
            actual_reps: s.actual_reps,
            done: matches!(s.status, workouts::SetStatus::Done),
        })
        .collect();
    report::compute(
        (body.ended_at - body.started_at).num_seconds(),
        average,
        &rows,
        timing::spread(body.started_at, &timed_sets(body)),
    )
}

fn timed_sets(body: &V2WorkoutSubmission) -> Vec<(u16, timing::TimedSet)> {
    let mut rows: Vec<_> = body.sets.iter().filter(|s| !s.removed).collect();
    rows.sort_by_key(|s| (s.logged_order.unwrap_or(u32::MAX), s.logged_at, s.position));
    rows.into_iter()
        .map(|s| {
            (
                s.position,
                timing::TimedSet {
                    exercise: s.exercise.clone(),
                    label: exercise::find(&s.exercise)
                        .map(|e| e.label)
                        .unwrap_or(&s.exercise)
                        .into(),
                    logged_at: s.logged_at,
                },
            )
        })
        .collect()
}

/// Cached revisions must return the same origin IDs after another request or deploy.
fn revision_id(definition: Uuid, revision: i32, kind: &str, index: usize) -> Uuid {
    use sha2::{Digest, Sha256};
    let hash = Sha256::digest(format!(
        "athletos/workout-revision/v1/{definition}/{revision}/{kind}/{index}"
    ));
    let mut bytes = [0; 16];
    bytes.copy_from_slice(&hash[..16]);
    bytes[6] = (bytes[6] & 0x0f) | 0x80;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    Uuid::from_bytes(bytes)
}

pub async fn saved_session(
    db: &mut PgConnection,
    athlete: Uuid,
    id: Uuid,
    revision: i32,
) -> ApiResult<EditableSession> {
    let content =
        super::workout_definitions::load_revision(&mut *db, athlete, id, revision).await?;
    let session = Session {
        week: 1,
        day: 1,
        focus: None,
        blocks: content.materialize_blocks()?,
    };
    let mut sets = materialize(&session);
    let mut blocks = BTreeMap::new();
    for (index, set) in sets.iter_mut().enumerate() {
        let count = blocks.len();
        let block = *blocks.entry(set.block_id).or_insert(count);
        set.block_id = revision_id(id, revision, "block", block);
        set.id = revision_id(id, revision, "set", index);
    }
    let seconds = pace::measure(&mut *db, athlete, sets.len())
        .await?
        .median_seconds_per_set;
    Ok(EditableSession {
        schema_version: 2,
        athlete_id: athlete,
        title: content.title,
        source: WorkoutSource::SavedWorkout,
        definition_id: Some(id),
        revision: Some(revision),
        draft_id: None,
        enrollment_id: None,
        program_key: None,
        week: None,
        day: None,
        sets,
        exercises: exercise_catalogue(),
        seconds_per_set: seconds,
    })
}

#[utoipa::path(get, path="/v1/workout-definitions/{id}/revisions/{revision}/session", operation_id="materialize_saved_workout", tag="workouts",security(("bearer_token"=[])),
    params(("id"=Uuid,Path),("revision"=i32,Path)),responses((status=200,description="Saved revision ready to start",body=EditableSession)))]
pub async fn materialize_saved(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Path((id, revision)): Path<(Uuid, i32)>,
) -> ApiResult<Json<EditableSession>> {
    let mut connection = state.db.acquire().await?;
    Ok(Json(
        saved_session(&mut connection, athlete.athlete_id, id, revision).await?,
    ))
}

#[utoipa::path(get,path="/v2/blank-session",operation_id="blank_editable_session",tag="workouts",security(("bearer_token"=[])),
    responses((status=200,description="Catalogue for a session built from scratch",body=EditableSession)))]
pub async fn blank(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
) -> ApiResult<Json<EditableSession>> {
    let seconds = pace::measure(&state.db, athlete.athlete_id, 0)
        .await?
        .median_seconds_per_set;
    Ok(Json(EditableSession {
        schema_version: 2,
        athlete_id: athlete.athlete_id,
        title: "Workout".into(),
        source: WorkoutSource::AdHoc,
        definition_id: None,
        revision: None,
        draft_id: None,
        enrollment_id: None,
        program_key: None,
        week: None,
        day: None,
        sets: vec![],
        exercises: exercise_catalogue(),
        seconds_per_set: seconds,
    }))
}

#[derive(Debug, Serialize, ToSchema, sqlx::FromRow)]
pub struct V2WorkoutSummary {
    pub id: Uuid,
    pub title: String,
    pub source: String,
    pub enrollment_id: Option<Uuid>,
    pub program_key: Option<String>,
    pub week: Option<i16>,
    pub day: Option<i16>,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub outcome: Option<String>,
    pub cut_reason: Option<String>,
    pub duration_seconds: Option<i64>,
    pub modified: bool,
    pub progression: String,
    pub schema_version: i16,
}

const SUMMARY_SELECT: &str = "select w.id,coalesce(w.title,e.program_key,'Workout') as title,w.source,w.enrollment_id,e.program_key,w.week,w.day,
    w.started_at,w.ended_at,w.outcome,w.cut_reason,extract(epoch from (w.ended_at-w.started_at))::bigint as duration_seconds,
    coalesce((w.receipt->'changes'->>'modified')::boolean,false) as modified,w.progression,w.schema_version
    from workouts w left join enrollments e on e.id=w.enrollment_id";

#[derive(Debug, Serialize, ToSchema)]
pub struct V2WorkoutHistory {
    pub workouts: Vec<V2WorkoutSummary>,
    pub total: i64,
    pub limit: u32,
    pub offset: u32,
}

fn label_legacy(mut row: V2WorkoutSummary) -> V2WorkoutSummary {
    if row.schema_version == 1 {
        if let Some(p) = row
            .program_key
            .as_deref()
            .and_then(athletos_training::programs::find)
        {
            row.title = p.meta().name.into();
        }
    }
    row
}

#[utoipa::path(get,path="/v2/workouts",operation_id="list_all_workouts",tag="workouts",security(("bearer_token"=[])),params(workouts::HistoryFilter),
    responses((status=200,description="History from every workout source",body=V2WorkoutHistory)))]
pub async fn history(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Query(filter): Query<workouts::HistoryFilter>,
) -> ApiResult<Json<V2WorkoutHistory>> {
    let limit = filter.limit.unwrap_or(25).clamp(1, 100);
    let offset = filter.offset.unwrap_or(0);
    let total=sqlx::query_scalar("select count(*) from workouts where athlete_id=$1 and ($2::uuid is null or enrollment_id=$2)")
        .bind(athlete.athlete_id).bind(filter.enrollment_id).fetch_one(&state.db).await?;
    let rows=sqlx::query_as::<_,V2WorkoutSummary>(&format!("{SUMMARY_SELECT} where w.athlete_id=$1 and ($2::uuid is null or w.enrollment_id=$2) order by w.started_at desc,w.id desc limit $3 offset $4"))
        .bind(athlete.athlete_id).bind(filter.enrollment_id).bind(i64::from(limit)).bind(i64::from(offset)).fetch_all(&state.db).await?;
    Ok(Json(V2WorkoutHistory {
        workouts: rows.into_iter().map(label_legacy).collect(),
        total,
        limit,
        offset,
    }))
}

#[derive(Debug, Default, Serialize, Deserialize, ToSchema)]
pub struct WorkoutChanges {
    pub modified: bool,
    pub removed_sets: u32,
    pub added_sets: u32,
    pub changed_sets: u32,
    pub source_changed_sets: u32,
    pub committed_changed_sets: u32,
    pub baseline_load_kg: f64,
    pub planned_load_kg: f64,
    pub committed_load_kg: f64,
    pub added_load_moved_kg: f64,
    pub comparison_scope: Option<String>,
    pub comparison_samples: i64,
}

fn changes(baseline: Option<&EditableSession>, body: &V2WorkoutSubmission) -> WorkoutChanges {
    let originals: BTreeMap<_, _> = baseline
        .into_iter()
        .flat_map(|b| b.sets.iter())
        .map(|s| (s.id, s))
        .collect();
    let baseline_order: Vec<_> = baseline
        .into_iter()
        .flat_map(|b| b.sets.iter())
        .map(|s| s.id)
        .collect();
    let mut ordered: Vec<_> = body.sets.iter().collect();
    ordered.sort_by_key(|s| s.position);
    let actual_order: Vec<_> = ordered.iter().filter_map(|s| s.origin_id).collect();
    let mut result = WorkoutChanges {
        baseline_load_kg: originals
            .values()
            .map(|s| s.prescribed_weight * f64::from(s.prescribed_reps))
            .sum(),
        ..Default::default()
    };
    for set in &body.sets {
        if set.removed {
            result.removed_sets += 1;
            continue;
        }
        result.planned_load_kg += set.prescribed_weight * f64::from(set.prescribed_reps);
        result.committed_load_kg += set.committed_weight * f64::from(set.committed_reps);
        let committed_changed = set.committed_weight != set.prescribed_weight
            || set.committed_reps != set.prescribed_reps;
        if committed_changed {
            result.committed_changed_sets += 1;
        }
        if let Some(base) = set.origin_id.and_then(|id| originals.get(&id)) {
            let source_changed = base.prescribed_weight != set.prescribed_weight
                || base.prescribed_reps != set.prescribed_reps
                || base.amrap != set.amrap;
            if source_changed {
                result.source_changed_sets += 1;
            }
            if source_changed || committed_changed {
                result.changed_sets += 1;
            }
        } else {
            result.added_sets += 1;
            if matches!(set.status, workouts::SetStatus::Done) {
                result.added_load_moved_kg +=
                    set.actual_weight.unwrap_or(0.0) * f64::from(set.actual_reps.unwrap_or(0));
            }
        }
    }
    result.modified = result.removed_sets > 0
        || result.added_sets > 0
        || result.changed_sets > 0
        || baseline_order != actual_order;
    result
}

#[derive(Debug, Serialize, ToSchema)]
pub struct V2LoggedSet {
    #[serde(flatten)]
    pub set: EditableSubmittedSet,
    pub label: String,
    pub baseline_weight: Option<f64>,
    pub baseline_reps: Option<u32>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct V2WorkoutDetail {
    pub workout: V2WorkoutSummary,
    pub sets: Vec<V2LoggedSet>,
    pub notes: Option<String>,
    pub timing: Option<timing::SessionTiming>,
    #[schema(value_type = crate::report::SessionReport)]
    pub summary: Value,
    pub changes: WorkoutChanges,
}

#[utoipa::path(get,path="/v2/workouts/{id}",operation_id="show_any_workout",tag="workouts",security(("bearer_token"=[])),params(("id"=Uuid,Path)),
    responses((status=200,description="Recorded baseline, edits, and actual work",body=V2WorkoutDetail)))]
pub async fn show(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<V2WorkoutDetail>> {
    let row = sqlx::query_as::<_, V2WorkoutSummary>(&format!(
        "{SUMMARY_SELECT} where w.id=$1 and w.athlete_id=$2"
    ))
    .bind(id)
    .bind(athlete.athlete_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(ApiError::NotFound)?;
    let workout = label_legacy(row);
    if workout.schema_version == 1 {
        let old = workouts::show(State(state), athlete, Path(id)).await?.0;
        let report_rows: Vec<_> = old
            .sets
            .iter()
            .map(|s| report::ReportedSet {
                exercise: s.exercise.clone(),
                label: s.label.clone(),
                prescribed_weight: s.prescribed_weight,
                prescribed_reps: s.prescribed_reps,
                actual_weight: s.actual_weight,
                actual_reps: s.actual_reps,
                done: matches!(s.status, workouts::SetStatus::Done),
            })
            .collect();
        let summary = json!(report::compute(
            workout.duration_seconds.unwrap_or_default(),
            None,
            &report_rows,
            None
        ));
        let sets = old
            .sets
            .into_iter()
            .map(|s| V2LoggedSet {
                label: s.label,
                baseline_weight: Some(s.prescribed_weight),
                baseline_reps: Some(s.prescribed_reps),
                set: EditableSubmittedSet {
                    id: revision_id(id, 1, "legacy", usize::from(s.position)),
                    block_id: revision_id(id, 1, "legacy-block", usize::from(s.position)),
                    origin_id: Some(revision_id(id, 1, "legacy", usize::from(s.position))),
                    position: s.position,
                    exercise: s.exercise,
                    prescribed_weight: s.prescribed_weight,
                    prescribed_reps: s.prescribed_reps,
                    committed_weight: s.prescribed_weight,
                    committed_reps: s.prescribed_reps,
                    amrap: false,
                    removed: false,
                    actual_weight: s.actual_weight,
                    actual_reps: s.actual_reps,
                    status: s.status,
                    logged_at: s.logged_at,
                    logged_order: None,
                    note: s.note,
                    drift_reason: s.drift_reason,
                },
            })
            .collect();
        return Ok(Json(V2WorkoutDetail {
            workout,
            sets,
            notes: old.notes,
            timing: old.timing,
            summary,
            changes: WorkoutChanges::default(),
        }));
    }
    let (baseline, submission, receipt): (Option<Value>, Value, Value) = sqlx::query_as(
        "select baseline,submission,receipt from workouts where id=$1 and athlete_id=$2",
    )
    .bind(id)
    .bind(athlete.athlete_id)
    .fetch_one(&state.db)
    .await?;
    let baseline: Option<EditableSession> = baseline.map(decode).transpose()?;
    let mut body: V2WorkoutSubmission = decode(submission)?;
    // The relational rows are the recorded facts. Read their canonical values
    // and order rather than replaying the client's arbitrary JSON array order
    // or its pre-normalization note text.
    let rows: Vec<Value> = sqlx::query_scalar("select to_jsonb(s) || jsonb_build_object('id',s.stable_id) from workout_sets s where workout_id=$1 order by position")
        .bind(id).fetch_all(&state.db).await?;
    body.sets = rows
        .into_iter()
        .map(decode)
        .collect::<ApiResult<Vec<_>>>()?;
    let originals: BTreeMap<_, _> = baseline
        .iter()
        .flat_map(|b| b.sets.iter())
        .map(|s| (s.id, s))
        .collect();
    let sets = body
        .sets
        .iter()
        .map(|s| V2LoggedSet {
            set: s.clone(),
            label: exercise::find(&s.exercise)
                .map(|e| e.label)
                .unwrap_or(&s.exercise)
                .into(),
            baseline_weight: s
                .origin_id
                .and_then(|id| originals.get(&id))
                .map(|s| s.prescribed_weight),
            baseline_reps: s
                .origin_id
                .and_then(|id| originals.get(&id))
                .map(|s| s.prescribed_reps),
        })
        .collect();
    let time = timing::compute(body.started_at, Some(body.ended_at), &timed_sets(&body));
    let change = receipt
        .get("changes")
        .cloned()
        .map(decode)
        .transpose()?
        .unwrap_or_else(|| changes(baseline.as_ref(), &body));
    Ok(Json(V2WorkoutDetail {
        workout,
        sets,
        notes: body.notes,
        timing: time,
        summary: receipt["summary"].clone(),
        changes: change,
    }))
}

#[derive(Debug, Serialize, ToSchema)]
pub struct WorkoutEstimate {
    pub exercise: String,
    pub label: String,
    pub estimate: f64,
    pub is_lower_bound: bool,
}
#[derive(Debug, Serialize, ToSchema)]
pub struct AllWorkoutProgress {
    pub sessions: i64,
    pub done_sets: i64,
    pub load_moved_kg: f64,
    pub duration_seconds: i64,
    pub estimates: Vec<WorkoutEstimate>,
}

#[utoipa::path(get,path="/v2/progress",operation_id="all_workout_progress",tag="progress",security(("bearer_token"=[])),
    responses((status=200,description="Actual work and estimates across all sources",body=AllWorkoutProgress)))]
pub async fn progress(
    State(state): State<AppState>,
    athlete: AuthenticatedAthlete,
) -> ApiResult<Json<AllWorkoutProgress>> {
    let (sessions,duration):(i64,i64)=sqlx::query_as("select count(*),coalesce(sum(extract(epoch from (ended_at-started_at))),0)::bigint from workouts where athlete_id=$1 and outcome<>'auto_closed'")
        .bind(athlete.athlete_id).fetch_one(&state.db).await?;
    let rows:Vec<(String,f64,i16)>=sqlx::query_as("select s.exercise,s.actual_weight::float8,s.actual_reps from workout_sets s join workouts w on w.id=s.workout_id where w.athlete_id=$1 and w.outcome<>'auto_closed' and s.status='done'")
        .bind(athlete.athlete_id).fetch_all(&state.db).await?;
    let mut best: BTreeMap<String, (f64, bool)> = BTreeMap::new();
    let mut load = 0.0;
    for (key, weight, reps) in &rows {
        load += weight * f64::from(*reps);
        if exercise::find(key).is_some_and(|e| e.is_primary) {
            if let Some(value) = athletos_training::estimate(*weight, *reps as u32) {
                let lower = *reps as u32 > athletos_training::ESTIMATE_REP_CEILING;
                let entry = best.entry(key.clone()).or_insert((value, lower));
                if value > entry.0 || (value == entry.0 && !lower) {
                    *entry = (value, lower);
                }
            }
        }
    }
    Ok(Json(AllWorkoutProgress {
        sessions,
        done_sets: rows.len() as i64,
        load_moved_kg: load,
        duration_seconds: duration,
        estimates: best
            .into_iter()
            .map(|(key, (estimate, is_lower_bound))| WorkoutEstimate {
                label: exercise::find(&key).map(|e| e.label).unwrap_or(&key).into(),
                exercise: key,
                estimate,
                is_lower_bound,
            })
            .collect(),
    }))
}
