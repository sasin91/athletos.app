//! Where a year of training went (D-13, amended).
//!
//! One endpoint, everything derived. There is no table behind this: the
//! estimate is computed from stored sets, load and drift are sums over the
//! same rows, and the training max comes from `readout()` applied to the
//! `state_before` that [`crate::advances`] already records — because
//! `readout()` is a pure function of state, and storing its output as well
//! would materialise a fact another table implies.
//!
//! # Indicators are a shape, not a store
//!
//! Every figure that renders as a card travels as `{ key, label, value, unit }`
//! so the client has one card component and a new metric touches no client
//! code. `unit` is a semantic tag rather than a display string; formatting
//! lives at the UI edge, as D-04 requires of every weight in this system.
//!
//! An indicator with nothing to say is **omitted**, never sent as zero. A
//! median session duration across no sessions is not zero minutes, and the
//! card should be absent rather than wrong — the same rule `timing` follows in
//! omitting itself rather than serving an empty breakdown.

use std::collections::HashMap;

// `State` is taken twice over in this module: axum's extractor and the
// program's opaque memory (D-03). Both are aliased at the import rather than
// written out at every use, so neither reads as the other.
use axum::extract::State as ExtractState;
use axum::Json;
use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::Value;
use sqlx::PgPool;
use utoipa::ToSchema;
use uuid::Uuid;

use athletos_training::{estimate, exercise, programs, Readout, State as ProgramState};

use crate::auth::AuthenticatedAthlete;
use crate::error::ApiResult;
use crate::state::AppState;
use crate::timing::{self, TimedSet};

/// What a figure is measured in. A tag, not a display string — the client
/// decides whether 3600 seconds reads as "1:00" or "60 min" (D-04).
#[derive(Debug, Clone, Copy, Serialize, ToSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Unit {
    Kg,
    Count,
    Seconds,
}

/// One card. Every figure on the screen is one of these, so the client has one
/// component and a new metric touches no client code.
#[derive(Debug, Clone, Serialize, ToSchema, PartialEq)]
pub struct Indicator {
    #[schema(example = "load_moved")]
    pub key: String,
    #[schema(example = "Load moved")]
    pub label: String,
    pub value: f64,
    pub unit: Unit,
}

/// One session's contribution to a lift's trend.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct TrendPoint {
    pub workout_id: Uuid,
    pub at: DateTime<Utc>,
    /// The best estimate across that session's done sets of this lift. `None`
    /// when every set was skipped, or every set was above the rep ceiling.
    pub estimate: Option<f64>,
    /// What the program was prescribing from during that session. `None` for
    /// every session logged before `enrollment_advances` existed — the chart
    /// must draw a gap rather than a zero.
    pub training_max: Option<f64>,
    /// Signed: positive is heavier than prescribed, negative lighter. Summed
    /// over that session's done sets of this lift, against the same sets'
    /// prescriptions, so it is weight drift uncontaminated by work not done.
    pub drift_kg: f64,
    pub sets_over: u32,
    pub sets_under: u32,
    /// Every reason the athlete gave on this lift that session. Travels on
    /// every point; the screen renders them only on downward moves, and that
    /// test is presentation rather than a fact about training.
    pub reasons: Vec<String>,
}

/// One cell of the rep-max grid: the heaviest weight lifted for **at least**
/// `reps` reps, and the set it came from.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct Best {
    /// The bucket, not the reps performed.
    pub reps: u32,
    pub weight: f64,
    /// What was actually done at that weight — always at least `reps`.
    pub actual_reps: u32,
    pub at: DateTime<Utc>,
    pub workout_id: Uuid,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct LiftTrend {
    #[schema(example = "squat")]
    pub exercise: String,
    #[schema(example = "Squat")]
    pub label: String,
    pub points: Vec<TrendPoint>,
    pub bests: Vec<Best>,
}

/// One session, for the load panel and the drift band.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct SessionFigures {
    pub workout_id: Uuid,
    pub enrollment_id: Uuid,
    pub at: DateTime<Utc>,
    pub load_moved_kg: f64,
    pub load_prescribed_kg: f64,
    pub sets_over: u32,
    pub sets_under: u32,
    pub duration_seconds: Option<i64>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ProgramTotals {
    pub enrollment_id: Uuid,
    #[schema(example = "wendler-531-bbb")]
    pub program_key: String,
    #[schema(example = "5/3/1 Boring But Big")]
    pub program_name: String,
    #[schema(example = "active")]
    pub status: String,
    pub indicators: Vec<Indicator>,
}

/// The whole screen, in one round trip.
///
/// # Why the component is called `AthleteProgress`
///
/// `routes::enrollments::ProgressView` — sessions completed out of a block —
/// has been shipping under the component name `ProgressView` since the first
/// release, and utoipa names a component after the type's last path segment.
/// Registering a second `ProgressView` does not collide loudly; it overwrites,
/// and the generated TypeScript would silently start describing this screen
/// wherever an enrolment's `progress` field is read. D-12 forbids changing what
/// an existing `/v1` field means, so the older name stays with the older type
/// and the newcomer takes an alias. The Rust name is unchanged and the JSON on
/// the wire is unaffected: this renames a schema, not a field.
#[derive(Debug, Clone, Serialize, ToSchema)]
#[schema(as = AthleteProgress)]
pub struct ProgressView {
    pub lifts: Vec<LiftTrend>,
    pub sessions: Vec<SessionFigures>,
    pub programs: Vec<ProgramTotals>,
    pub overall: Vec<Indicator>,
}

/// What an indicator set is built from. Not serialised — this is the
/// accumulator, and `indicators_from` is the only thing that reads it.
#[derive(Debug, Default, Clone)]
pub struct Totals {
    pub sessions: u32,
    pub load_moved_kg: f64,
    pub sets_over: u32,
    pub sets_under: u32,
    /// One per session that has both stamps.
    pub durations: Vec<i64>,
    /// Every believable gap between two answered sets, across every session.
    pub intervals: Vec<i64>,
}

fn indicator(key: &str, label: &str, value: f64, unit: Unit) -> Indicator {
    Indicator {
        key: key.to_owned(),
        label: label.to_owned(),
        value,
        unit,
    }
}

/// The shipped set of cards, in the order they are offered.
///
/// A server-side constant rather than a contract the screen depends on:
/// adding one here makes a card appear, removing one makes it vanish, and the
/// client never learns what any particular metric means (D-11).
pub fn indicators_from(totals: &Totals) -> Vec<Indicator> {
    let mut indicators = vec![
        indicator(
            "sessions",
            "Sessions",
            f64::from(totals.sessions),
            Unit::Count,
        ),
        indicator("load_moved", "Load moved", totals.load_moved_kg, Unit::Kg),
        indicator(
            "sets_over",
            "Sets over",
            f64::from(totals.sets_over),
            Unit::Count,
        ),
        indicator(
            "sets_under",
            "Sets under",
            f64::from(totals.sets_under),
            Unit::Count,
        ),
    ];

    // Omitted rather than zeroed: a median across nothing is not a number, and
    // an absent card is the honest way to say so.
    let mut durations = totals.durations.clone();
    if let Some(seconds) = median(&mut durations) {
        indicators.push(indicator(
            "median_duration",
            "Typical session",
            seconds as f64,
            Unit::Seconds,
        ));
    }

    let mut intervals = totals.intervals.clone();
    if let Some(seconds) = median(&mut intervals) {
        indicators.push(indicator(
            "median_interval",
            "Typical gap between sets",
            seconds as f64,
            Unit::Seconds,
        ));
    }

    indicators
}

/// Median, sorting in place. `None` for an empty sample.
///
/// Median rather than mean throughout this module, for the reason `pace` gives:
/// the tail of these distributions is not signal. An even sample takes the
/// mean of the middle pair, matching `pace::median`, so the figure does not
/// depend on which side of the list a tie fell.
pub fn median(values: &mut [i64]) -> Option<i64> {
    if values.is_empty() {
        return None;
    }

    values.sort_unstable();
    let middle = values.len() / 2;

    Some(if values.len() % 2 == 1 {
        values[middle]
    } else {
        (values[middle - 1] + values[middle]) / 2
    })
}

// --- loading it, and the four queries that do ------------------------------

/// How far back the three **series** look.
///
/// Twelve months, written into those queries rather than bound as a parameter:
/// `interval '12 months'` is calendar arithmetic Postgres does correctly across
/// leap days and month lengths, and a `now() - $2` with a duration computed in
/// Rust would be the same window measured worse. It is a `const` and never a
/// caller's string, so the formatting below cannot become an injection.
///
/// It bounds the trend, the sessions and the training maxes because each of
/// those grows one row per session forever, and a chart of five years of
/// training is neither drawable nor a statement about how somebody trains now.
///
/// **[`bests`] does not use it, and that is the point rather than an oversight.**
/// See that function: a record is not a series and does not expire.
const WINDOW: &str = "12 months";

/// The rep buckets the grid offers.
///
/// One, two, three, five, eight, ten: the numbers a strength athlete already
/// thinks in, and the ceiling matches [`athletos_training::ESTIMATE_REP_CEILING`]
/// so no cell is filled by a set the estimator itself refuses to read.
const BEST_REPS: &[i32] = &[1, 2, 3, 5, 8, 10];

/// One session, as the sessions query returns it.
///
/// The enrolment's key and status ride along on the join rather than costing a
/// second query: `programs` is a grouping of these same rows, so everything it
/// needs is already in flight.
type SessionRow = (
    Uuid,
    Uuid,
    String,
    String,
    DateTime<Utc>,
    Option<DateTime<Utc>>,
);

/// One logged set, named rather than a ten-element tuple.
#[derive(sqlx::FromRow)]
struct SetRow {
    workout_id: Uuid,
    position: i16,
    exercise: String,
    prescribed_weight: f64,
    prescribed_reps: i16,
    actual_weight: Option<f64>,
    actual_reps: Option<i16>,
    status: String,
    logged_at: Option<DateTime<Utc>>,
    drift_reason: Option<String>,
}

/// One cell of the grid, as the bests query returns it.
#[derive(sqlx::FromRow)]
struct BestRow {
    exercise: String,
    /// The bucket, not the reps performed.
    reps: i32,
    weight: f64,
    actual_reps: i16,
    at: DateTime<Utc>,
    workout_id: Uuid,
}

/// Everything the four queries found, before any of it means anything.
///
/// Separated from [`assemble`] for the reason [`crate::pace`] separates
/// `measure` from `project`: the part that is easy to get subtly wrong — which
/// sets count toward what, where a gap belongs, what an "at least" best is — is
/// the part with no database in it.
struct Loaded {
    sessions: Vec<SessionRow>,
    /// Keyed by workout, each in `position` order. A workout with no sets is
    /// absent rather than present and empty.
    sets: HashMap<Uuid, Vec<SetRow>>,
    /// Keyed by workout, then by exercise. A workout with no recorded advance
    /// is absent — a gap in the chart, never a zero.
    training_maxes: HashMap<Uuid, HashMap<String, f64>>,
    /// Keyed by exercise, buckets ascending.
    bests: HashMap<String, Vec<Best>>,
}

/// Where a year of training went.
///
/// # One round trip, and nothing stored
///
/// Four queries, no writes, and no table behind any of it (D-13, amended). The
/// estimate is [`athletos_training::estimate`] over stored sets, load and drift
/// are sums over the same rows, the training max is `readout()` applied to the
/// `state_before` [`crate::advances`] already records, and the intervals come
/// off [`crate::timing`]'s own walk. Every figure here is implied by rows that
/// exist for other reasons, which is exactly why a metrics table was declined:
/// a stored total is a second copy of an arithmetic fact, and the day it
/// disagrees with the rows there is no way to tell which one is wrong.
///
/// # The scope, and the index that does not serve it
///
/// `workouts` has no `athlete_id`, so ownership arrives through the join on
/// `enrollments` in all four queries — the same shape, and the same accepted
/// cost, that [`crate::routes::workouts::history`] documents at length. The
/// window bounds it: this is one person's twelve months, which is hundreds of
/// sessions and low thousands of sets at the volume this product is designed
/// for.
#[utoipa::path(
    get,
    path = "/v1/progress",
    operation_id = "athlete_progress",
    tag = "progress",
    security(("bearer_token" = [])),
    responses(
        (status = 200, description = "A year of training, derived", body = ProgressView),
        (status = 401, description = "Missing or invalid access token", body = crate::error::ProblemDetails),
    )
)]
pub async fn show(
    ExtractState(state): ExtractState<AppState>,
    athlete: AuthenticatedAthlete,
) -> ApiResult<Json<ProgressView>> {
    let athlete_id = athlete.athlete_id;

    Ok(Json(assemble(Loaded {
        sessions: sessions(&state.db, athlete_id).await?,
        sets: sets(&state.db, athlete_id).await?,
        training_maxes: training_maxes(&state.db, athlete_id).await?,
        bests: bests(&state.db, athlete_id).await?,
    })))
}

/// Query 1 — every session in the window, oldest first.
///
/// Oldest first because these are chart points and a chart reads left to right,
/// unlike `routes::workouts::history` where the newest row is the one the
/// athlete came to see. `w.id` breaks the tie so two sessions sharing a
/// `started_at` do not leave the order to the planner.
async fn sessions(db: &PgPool, athlete_id: Uuid) -> ApiResult<Vec<SessionRow>> {
    Ok(sqlx::query_as(&format!(
        "select w.id, w.enrollment_id, e.program_key, e.status, w.started_at, w.ended_at
         from workouts w
         join enrollments e on e.id = w.enrollment_id
         where e.athlete_id = $1 and w.started_at >= now() - interval '{WINDOW}'
         order by w.started_at, w.id"
    ))
    .bind(athlete_id)
    .fetch_all(db)
    .await?)
}

/// Query 2 — every set of those sessions, grouped by workout in performed order.
///
/// One query rather than one per session, and one pass over the result rather
/// than five aggregate queries. Everything per-set that the screen shows —
/// estimate, drift, over and under, reasons, load moved, load prescribed, and
/// the timing walk's input — is a fold over these same rows, and computing each
/// in SQL would mean five scans of the same index for figures that share every
/// row they read.
///
/// `position` order is what [`crate::timing`] requires of its input: it walks a
/// cursor through the stamps, and a walk of unordered stamps is not a walk.
async fn sets(db: &PgPool, athlete_id: Uuid) -> ApiResult<HashMap<Uuid, Vec<SetRow>>> {
    let rows: Vec<SetRow> = sqlx::query_as(&format!(
        "select s.workout_id, s.\"position\", s.exercise,
                s.prescribed_weight::float8, s.prescribed_reps,
                s.actual_weight::float8, s.actual_reps, s.status,
                s.logged_at, s.drift_reason
         from workout_sets s
         join workouts w on w.id = s.workout_id
         join enrollments e on e.id = w.enrollment_id
         where e.athlete_id = $1 and w.started_at >= now() - interval '{WINDOW}'
         order by s.workout_id, s.\"position\""
    ))
    .bind(athlete_id)
    .fetch_all(db)
    .await?;

    let mut grouped: HashMap<Uuid, Vec<SetRow>> = HashMap::new();
    for row in rows {
        grouped.entry(row.workout_id).or_default().push(row);
    }

    Ok(grouped)
}

/// Query 3 — what each session's program was prescribing from at the time.
///
/// The number is not stored and must not be: `readout()` is a pure function of
/// state, `enrollment_advances.state_before` is the state as it stood when that
/// session was folded in, and storing the output alongside the input would
/// materialise a fact the input already implies. So this reads the blob and
/// asks the program (D-03) — the `State` is never indexed into here or anywhere
/// else outside the crate that wrote it.
///
/// Three ways to have no answer, all of them the same answer: no advance row
/// (every session logged before that table existed — D-12, no backfill), a
/// `program_key` this binary no longer compiles in, or a state a newer build
/// wrote that this `readout` cannot decode. Each leaves the workout out of the
/// map, and [`assemble`] turns a missing entry into `None`. A zero would be a
/// claim that the program was prescribing from nothing.
async fn training_maxes(
    db: &PgPool,
    athlete_id: Uuid,
) -> ApiResult<HashMap<Uuid, HashMap<String, f64>>> {
    let rows: Vec<(Uuid, String, Value)> = sqlx::query_as(&format!(
        "select a.workout_id, e.program_key, a.state_before
         from enrollment_advances a
         join workouts w on w.id = a.workout_id
         join enrollments e on e.id = a.enrollment_id
         where e.athlete_id = $1 and w.started_at >= now() - interval '{WINDOW}'"
    ))
    .bind(athlete_id)
    .fetch_all(db)
    .await?;

    let mut per_workout = HashMap::with_capacity(rows.len());

    for (workout_id, program_key, state_before) in rows {
        let Some(program) = programs::find(&program_key) else {
            continue;
        };
        let Ok(readouts) = program.readout(&ProgramState::from_json(state_before)) else {
            continue;
        };

        // A program may report more than one number for a lift — 5/3/1 reports
        // a training max, a prescriptive program reports the entered 1RM — and
        // no compiled program reports both for the same exercise today. The
        // training max wins where a future one does, because that is the number
        // the field is named for and the only one that moves; the entered max
        // is a fallback so a prescriptive program still draws a line rather
        // than a gap.
        let mut per_exercise: HashMap<String, (f64, bool)> = HashMap::new();
        for readout in readouts {
            let is_training_max = readout.label == Readout::TRAINING_MAX;
            let weight = readout.weight;
            let slot = per_exercise
                .entry(readout.exercise)
                .or_insert((weight, is_training_max));

            if is_training_max && !slot.1 {
                *slot = (weight, is_training_max);
            }
        }

        per_workout.insert(
            workout_id,
            per_exercise
                .into_iter()
                .map(|(exercise, (weight, _))| (exercise, weight))
                .collect(),
        );
    }

    Ok(per_workout)
}

/// Query 4 — the rep-max grid, in one `distinct on` rather than a query a cell.
///
/// # "At least", not "exactly"
///
/// Five reps at 200 kg proves three reps at 200 kg, and a grid that reported
/// only sets performed at exactly three reps would show a 3RM lower than the
/// 5RM beside it — which is not a fact about the athlete, it is a fact about
/// what they happened to be asked for that day. So the buckets are joined by
/// `actual_reps >= b.reps`, and every cell still names the set it came from:
/// `actual_reps` says what was really done, so nothing here is inferred.
///
/// # Zero-weight sets are excluded
///
/// A bodyweight lift's record is reps, not kilograms. Left in, a chin-up would
/// fill all six cells with `0.0` and the grid would read as six achievements of
/// nothing — worse than no grid, because it looks like an answer. The day
/// bodyweight work earns a record it needs a different shape, not this one with
/// a zero in it.
///
/// # This query is deliberately **not** windowed
///
/// The other three carry `WINDOW`; this one does not, and a reader who
/// "consistently" adds it back would be removing a feature. Spec section 6 asks
/// for the heaviest weight lifted for at least N reps **over all history and
/// all programs**, and the reason is that *a record does not expire*. An
/// athlete who pulled a best five at 140 kg fourteen months ago and has been
/// running a hypertrophy block since would open a windowed grid and be shown a
/// lower number labelled as their best — and since every cell is meant to be
/// backed by a set that actually happened, that is the screen stating something
/// false about their training rather than merely being incomplete.
///
/// The window exists to bound things that grow one row per session forever. A
/// rep-max grid is six rows whatever the history, so it has nothing to bound:
/// the cost of dropping the window is a wider index scan, not a wider response.
///
/// `distinct on (exercise, reps)` with the matching `order by` takes the first
/// row of each group, which the ordering makes the heaviest; ties go to the
/// earliest, because the athlete lifted it then. `s.id` closes the tie a shared
/// timestamp would otherwise leave to the planner.
async fn bests(db: &PgPool, athlete_id: Uuid) -> ApiResult<HashMap<String, Vec<Best>>> {
    let rows: Vec<BestRow> = sqlx::query_as(
        "select distinct on (s.exercise, b.reps)
                s.exercise, b.reps, s.actual_weight::float8 as weight, s.actual_reps,
                coalesce(s.logged_at, w.started_at) as at, w.id as workout_id
         from workout_sets s
         join workouts w on w.id = s.workout_id
         join enrollments e on e.id = w.enrollment_id
         cross join unnest($2::int[]) as b(reps)
         where e.athlete_id = $1
           and s.status = 'done'
           and s.actual_weight > 0
           and s.actual_reps >= b.reps
         order by s.exercise, b.reps, s.actual_weight desc,
                  coalesce(s.logged_at, w.started_at), s.id",
    )
    .bind(athlete_id)
    .bind(BEST_REPS)
    .fetch_all(db)
    .await?;

    let mut grouped: HashMap<String, Vec<Best>> = HashMap::new();
    for row in rows {
        grouped.entry(row.exercise).or_default().push(Best {
            reps: u32::try_from(row.reps).unwrap_or_default(),
            weight: row.weight,
            actual_reps: u32::try_from(row.actual_reps).unwrap_or_default(),
            at: row.at,
            workout_id: row.workout_id,
        });
    }

    Ok(grouped)
}

// --- the rules, with the database left outside ----------------------------

/// What one lift did in one session, while the session is being walked.
#[derive(Default)]
struct LiftTally {
    estimate: Option<f64>,
    drift_kg: f64,
    sets_over: u32,
    sets_under: u32,
    reasons: Vec<String>,
    /// Whether anything was actually performed. A lift whose every set was
    /// skipped contributes no point: the drift band and the compliance figures
    /// are where work-not-done is accounted for, and a trend point of zeroes
    /// would draw a line through a session this lift did not happen in.
    performed: bool,
}

/// One enrolment's running totals, and when it was last trained.
struct ProgramRun {
    program_key: String,
    status: String,
    /// The most recent session in the window, which is what the list is sorted
    /// by. Not the enrolment's `started_at`: the block being run now is the one
    /// the athlete came to read about.
    last_at: DateTime<Utc>,
    totals: Totals,
}

/// Turns the four query results into the screen.
///
/// One pass per session, and the session is walked once: the lift tallies, the
/// session's own load figures, the running totals and `timing`'s input all come
/// off the same iteration over the same rows.
fn assemble(loaded: Loaded) -> ProgressView {
    let Loaded {
        sessions,
        sets,
        training_maxes,
        mut bests,
    } = loaded;

    // Insertion-ordered, like `timing::compute`'s exercises: a lift appears in
    // the order it was first performed. Alphabetical would put whatever
    // accessory begins with an `a` above the main lift the athlete opened with,
    // and this list is somebody walking back through their own training.
    let mut lift_order: Vec<String> = Vec::new();
    let mut points: HashMap<String, Vec<TrendPoint>> = HashMap::new();

    let mut figures: Vec<SessionFigures> = Vec::with_capacity(sessions.len());
    let mut overall = Totals::default();
    let mut per_program: HashMap<Uuid, ProgramRun> = HashMap::new();

    for (workout_id, enrollment_id, program_key, status, started_at, ended_at) in sessions {
        let rows = sets.get(&workout_id).map(Vec::as_slice).unwrap_or_default();

        // Insertion-ordered again, and a linear scan rather than a map: a
        // session has a handful of exercises in it, and preserving the order
        // they were performed in is worth more here than a hash lookup.
        let mut tallies: Vec<(&str, LiftTally)> = Vec::new();
        let mut load_moved = 0.0_f64;
        let mut load_prescribed = 0.0_f64;

        for row in rows {
            // Every set, whatever its status. This is what the program asked
            // for, so a set skipped or never answered still counts toward it —
            // otherwise skipping half a session would read as perfect
            // compliance, which is the one thing this figure exists to catch.
            load_prescribed += row.prescribed_weight * f64::from(row.prescribed_reps);

            let index = match tallies.iter().position(|(key, _)| *key == row.exercise) {
                Some(index) => index,
                None => {
                    tallies.push((row.exercise.as_str(), LiftTally::default()));
                    tallies.len() - 1
                }
            };
            let tally = &mut tallies[index].1;

            // Drift is measured over performed sets only, against those same
            // sets' prescriptions, so it is weight drift uncontaminated by work
            // not done — the two are different answers to D-13's second
            // question and folding them together would hide both.
            if row.status != "done" {
                continue;
            }
            let (Some(actual_weight), Some(actual_reps)) = (row.actual_weight, row.actual_reps)
            else {
                // The `workout_sets_done_is_logged` check constraint makes this
                // unreachable. Skipped rather than defaulted: a fabricated zero
                // would land in the load total as a real lift.
                continue;
            };

            tally.performed = true;

            let reps = u32::try_from(actual_reps).unwrap_or_default();
            load_moved += actual_weight * f64::from(reps);

            // The best estimate of the session, not the last one: a heavy
            // single and a set of ten are both admissible readings of the same
            // day, and the athlete's one-rep max is the larger of them.
            if let Some(estimated) = estimate(actual_weight, reps) {
                tally.estimate = Some(tally.estimate.map_or(estimated, |best| best.max(estimated)));
            }

            let drift = actual_weight - row.prescribed_weight;
            tally.drift_kg += drift;
            if drift > 0.0 {
                tally.sets_over += 1;
            } else if drift < 0.0 {
                tally.sets_under += 1;
            }

            // Deduplicated, order preserved. "Out of time" given on five sets
            // of the same lift is one reason, and repeating it five times would
            // make a busy day look like five separate explanations.
            if let Some(reason) = &row.drift_reason {
                if !tally.reasons.iter().any(|seen| seen == reason) {
                    tally.reasons.push(reason.clone());
                }
            }
        }

        let sets_over: u32 = tallies.iter().map(|(_, tally)| tally.sets_over).sum();
        let sets_under: u32 = tallies.iter().map(|(_, tally)| tally.sets_under).sum();
        let maxes = training_maxes.get(&workout_id);

        for (exercise, tally) in tallies {
            if !tally.performed {
                continue;
            }

            if !points.contains_key(exercise) {
                lift_order.push(exercise.to_owned());
            }

            points
                .entry(exercise.to_owned())
                .or_default()
                .push(TrendPoint {
                    workout_id,
                    at: started_at,
                    estimate: tally.estimate,
                    training_max: maxes.and_then(|maxes| maxes.get(exercise)).copied(),
                    drift_kg: tally.drift_kg,
                    sets_over: tally.sets_over,
                    sets_under: tally.sets_under,
                    reasons: tally.reasons,
                });
        }

        // The one interval walk (D-10). `timing` owns the ceiling and the
        // discard-rather-than-clamp rule; restating either here would be a
        // second definition of a believable gap.
        let timed: Vec<(u16, TimedSet)> = rows
            .iter()
            .map(|row| {
                (
                    u16::try_from(row.position).unwrap_or_default(),
                    TimedSet {
                        exercise: row.exercise.clone(),
                        label: row.exercise.clone(),
                        logged_at: row.logged_at,
                    },
                )
            })
            .collect();
        let intervals = timing::intervals(started_at, &timed);

        let duration_seconds = ended_at.map(|end| (end - started_at).num_seconds());

        let run = per_program
            .entry(enrollment_id)
            .or_insert_with(|| ProgramRun {
                program_key,
                status,
                last_at: started_at,
                totals: Totals::default(),
            });
        run.last_at = started_at;

        // The same figures counted twice, into the overall card set and into
        // this enrolment's. Deliberately not "sum the programs to get the
        // overall": an athlete can log a session under an enrolment that later
        // ends, and the two lists are answers to different questions rather
        // than a total and its parts.
        for totals in [&mut overall, &mut run.totals] {
            totals.sessions += 1;
            totals.load_moved_kg += load_moved;
            totals.sets_over += sets_over;
            totals.sets_under += sets_under;
            totals.durations.extend(duration_seconds);
            totals.intervals.extend(intervals.iter().copied());
        }

        figures.push(SessionFigures {
            workout_id,
            enrollment_id,
            at: started_at,
            load_moved_kg: load_moved,
            load_prescribed_kg: load_prescribed,
            sets_over,
            sets_under,
            duration_seconds,
        });
    }

    // Most recently trained first: the block the athlete is running now is the
    // one they came to read about, and a list ordered by when each enrolment
    // started would bury it under everything they have ever enrolled in. The
    // id closes the tie so two enrolments trained on the same day do not leave
    // the order to the hash map's iteration.
    let mut runs: Vec<(Uuid, ProgramRun)> = per_program.into_iter().collect();
    runs.sort_by(|left, right| {
        right
            .1
            .last_at
            .cmp(&left.1.last_at)
            .then_with(|| left.0.cmp(&right.0))
    });

    let programs = runs
        .into_iter()
        .map(|(enrollment_id, run)| ProgramTotals {
            // The registry's name, falling back to the key — the same fallback
            // `routes::workouts` uses, and for the same reason: a program
            // dropped from the registry in some future deploy must not erase
            // the sessions somebody ran under it.
            program_name: programs::find(&run.program_key)
                .map(|program| program.meta().name.to_owned())
                .unwrap_or_else(|| run.program_key.clone()),
            indicators: indicators_from(&run.totals),
            enrollment_id,
            program_key: run.program_key,
            status: run.status,
        })
        .collect();

    // A lift last trained more than twelve months ago has a record and no trend
    // points, because `bests` is not windowed and the other three queries are.
    // `lift_order` is built from the points, so without this the record would be
    // fetched and then silently dropped on the way out — the query change alone
    // does not deliver the feature.
    //
    // Appended after everything actually trained in the window, because this
    // list is somebody walking back through their own training and a lift they
    // have not touched in a year does not belong above one they did on Tuesday.
    // Sorted, so the order does not come from a hash map's iteration.
    let mut dormant: Vec<String> = bests
        .keys()
        .filter(|exercise| !points.contains_key(*exercise))
        .cloned()
        .collect();
    dormant.sort();
    lift_order.extend(dormant);

    let lifts = lift_order
        .into_iter()
        .map(|exercise| LiftTrend {
            label: exercise::find(&exercise)
                .map(|found| found.label.to_owned())
                .unwrap_or_else(|| exercise.clone()),
            points: points.remove(&exercise).unwrap_or_default(),
            bests: bests.remove(&exercise).unwrap_or_default(),
            exercise,
        })
        .collect();

    ProgressView {
        lifts,
        sessions: figures,
        programs,
        overall: indicators_from(&overall),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn totals() -> Totals {
        Totals {
            sessions: 4,
            load_moved_kg: 20_000.0,
            sets_over: 6,
            sets_under: 1,
            durations: vec![3_600, 3_300, 4_200],
            intervals: vec![120, 180, 90],
        }
    }

    #[test]
    fn every_indicator_carries_a_unit_the_client_can_format() {
        let indicators = indicators_from(&totals());

        assert!(indicators
            .iter()
            .all(|indicator| matches!(indicator.unit, Unit::Kg | Unit::Count | Unit::Seconds)));
    }

    #[test]
    fn an_indicator_with_nothing_to_say_is_absent_rather_than_zero() {
        // No sessions at all: there is no median duration, and a card reading
        // "0:00" would be a claim about training that never happened.
        let empty = Totals {
            sessions: 0,
            load_moved_kg: 0.0,
            sets_over: 0,
            sets_under: 0,
            durations: Vec::new(),
            intervals: Vec::new(),
        };

        // Bound to a local first: borrowing `&str` out of an unbound temporary
        // `Vec<Indicator>` is E0716, since the vector dies at the end of the
        // statement while `keys` outlives it.
        let indicators = indicators_from(&empty);
        let keys: Vec<&str> = indicators
            .iter()
            .map(|indicator| indicator.key.as_str())
            .collect();

        assert!(!keys.contains(&"median_duration"));
        assert!(!keys.contains(&"median_interval"));
    }

    #[test]
    fn the_shipped_set_is_present_when_there_is_data() {
        let indicators = indicators_from(&totals());
        let keys: Vec<&str> = indicators
            .iter()
            .map(|indicator| indicator.key.as_str())
            .collect();

        for expected in [
            "sessions",
            "load_moved",
            "sets_over",
            "sets_under",
            "median_duration",
            "median_interval",
        ] {
            assert!(keys.contains(&expected), "missing {expected}");
        }
    }

    #[test]
    fn the_median_takes_the_middle_pair_when_the_sample_is_even() {
        // Matching `pace::median`: an even sample has no single middle, and
        // taking either neighbour would make the figure depend on which side
        // of the list the tie fell.
        assert_eq!(median(&mut [60, 120]), Some(90));
        assert_eq!(median(&mut [90, 60, 120]), Some(90));
        assert_eq!(median(&mut []), None);
    }
}
