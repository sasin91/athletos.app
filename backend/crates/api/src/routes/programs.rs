//! The program catalogue (D-03, D-05).
//!
//! Programs are compiled-in code, so both handlers here read a `static` and
//! touch no table. What that costs is the hand-written mirror of `ProgramMeta`
//! and its three vocabularies below, and the duplication is deliberate twice
//! over.
//!
//! The training crate depends on exactly `serde`, `serde_json` and `thiserror`
//! and is meant to stay that way (D-15), so it does not derive `ToSchema` and
//! must not start — a `utoipa` derive over there would put this API's wire
//! format inside the pure crate and make the engine answerable to an HTTP
//! contract. And the two shapes genuinely need to be able to move apart: `/v1`
//! may never remove a field or change a type (D-12), while the engine is under
//! no such obligation and should not acquire one by accident.
//!
//! ## Why the catalogue is authenticated
//!
//! Nothing here is anybody's data, so this could be open. It is not, because
//! D-05 wants these cards to carry a "fits your week" marker derived from the
//! athlete's own profile, and the endpoint that grows that has to know who is
//! asking. Opening an endpoint later is additive; closing one is not (D-12).

use axum::extract::Path;
use axum::Json;
use serde::Serialize;
use utoipa::ToSchema;

use athletos_training::{programs, Equipment, Experience, Length, ProgramMeta, RecoveryDemand};

use crate::auth::AuthenticatedAthlete;
use crate::error::{ApiError, ApiResult};

/// Everything an athlete needs in order to judge whether a program fits.
///
/// There is no fit score and no ranking (D-01). `recovery_demand` and
/// `estimated_session_minutes` lead because they are the two axes that matter
/// to someone who over-reaches and who has an hour — a 75-minute program should
/// announce itself before enrolment, not in week three.
#[derive(Debug, Serialize, ToSchema)]
pub struct ProgramSummary {
    /// Stable key. This is what `POST /v1/enrollments` takes.
    #[schema(example = "wendler-531-bbb")]
    pub key: String,
    #[schema(example = "5/3/1 Boring But Big")]
    pub name: String,
    pub days_per_week: u8,
    pub equipment: Vec<ProgramEquipment>,
    pub experience_floor: ProgramExperience,
    pub length: ProgramLength,
    pub recovery_demand: ProgramRecoveryDemand,
    /// Wall-clock minutes for a typical session, including rest.
    #[schema(example = 55)]
    pub estimated_session_minutes: u16,
}

/// The catalogue, in registry order.
///
/// An object rather than a bare array so that the day this needs a cursor, a
/// count or a per-athlete fit marker, it can have one without changing the type
/// of the response (D-12).
#[derive(Debug, Serialize, ToSchema)]
pub struct ProgramCatalogue {
    pub programs: Vec<ProgramSummary>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum ProgramEquipment {
    Barbell,
    SquatRack,
    Bench,
    Dumbbells,
    PullUpBar,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum ProgramExperience {
    Novice,
    Intermediate,
    Advanced,
}

/// How much the program costs to recover from — the axis D-01 cares about most.
/// Three coarse steps on purpose: it is a warning, not a measurement.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum ProgramRecoveryDemand {
    Moderate,
    High,
    /// Will interfere with the rest of your training and the rest of your week.
    Brutal,
}

/// Whether the program ends.
///
/// The same distinction the session payload's `progress.total` makes at runtime:
/// a fixed block has an honest denominator, an open-ended one has none and must
/// not be given an invented one (D-03).
#[derive(Debug, Serialize, ToSchema)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ProgramLength {
    Fixed { weeks: u8, sessions: u16 },
    OpenEnded,
}

impl From<&ProgramMeta> for ProgramSummary {
    fn from(meta: &ProgramMeta) -> Self {
        Self {
            key: meta.key.to_owned(),
            name: meta.name.to_owned(),
            days_per_week: meta.days_per_week,
            equipment: meta.equipment.iter().copied().map(Into::into).collect(),
            experience_floor: meta.experience_floor.into(),
            length: meta.length.into(),
            recovery_demand: meta.recovery_demand.into(),
            estimated_session_minutes: meta.estimated_session_minutes,
        }
    }
}

impl From<Equipment> for ProgramEquipment {
    fn from(equipment: Equipment) -> Self {
        match equipment {
            Equipment::Barbell => Self::Barbell,
            Equipment::SquatRack => Self::SquatRack,
            Equipment::Bench => Self::Bench,
            Equipment::Dumbbells => Self::Dumbbells,
            Equipment::PullUpBar => Self::PullUpBar,
        }
    }
}

impl From<Experience> for ProgramExperience {
    fn from(experience: Experience) -> Self {
        match experience {
            Experience::Novice => Self::Novice,
            Experience::Intermediate => Self::Intermediate,
            Experience::Advanced => Self::Advanced,
        }
    }
}

impl From<RecoveryDemand> for ProgramRecoveryDemand {
    fn from(demand: RecoveryDemand) -> Self {
        match demand {
            RecoveryDemand::Moderate => Self::Moderate,
            RecoveryDemand::High => Self::High,
            RecoveryDemand::Brutal => Self::Brutal,
        }
    }
}

impl From<Length> for ProgramLength {
    fn from(length: Length) -> Self {
        match length {
            Length::Fixed { weeks, sessions } => Self::Fixed { weeks, sessions },
            Length::OpenEnded => Self::OpenEnded,
        }
    }
}

/// Every program an athlete can enrol in.
#[utoipa::path(
    get,
    path = "/v1/programs",
    tag = "programs",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "The catalogue", body = ProgramCatalogue),
        (status = 401, description = "Missing or invalid access token", body = crate::error::ProblemDetails),
    )
)]
pub async fn list(_athlete: AuthenticatedAthlete) -> Json<ProgramCatalogue> {
    Json(ProgramCatalogue {
        programs: programs::REGISTRY
            .iter()
            .map(|program| ProgramSummary::from(program.meta()))
            .collect(),
    })
}

/// One program's catalogue entry.
///
/// Deliberately the same shape the list returns rather than a richer one. A
/// detail view that showed the actual prescribed sessions would have to derive
/// them from the athlete's maxes, which is what enrolling is for — and showing a
/// preview built from maxes the athlete has not entered would mean inventing
/// numbers.
#[utoipa::path(
    get,
    path = "/v1/programs/{key}",
    tag = "programs",
    security(("bearer_token" = [])),
    params(("key" = String, Path, description = "The program's registry key", example = "smolov-jr")),
    responses(
        (status = 200, description = "The program", body = ProgramSummary),
        (status = 401, description = "Missing or invalid access token", body = crate::error::ProblemDetails),
        (status = 404, description = "No program has that key", body = crate::error::ProblemDetails),
    )
)]
pub async fn detail(
    _athlete: AuthenticatedAthlete,
    Path(key): Path<String>,
) -> ApiResult<Json<ProgramSummary>> {
    let program = programs::find(&key).ok_or(ApiError::NotFound)?;

    Ok(Json(ProgramSummary::from(program.meta())))
}
