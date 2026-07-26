//! What a program prescribes, and what came back from the gym.
//!
//! Everything in this module is a pure `serde` type with no behaviour and no
//! formatting (D-03). In particular there is no `label` field anywhere: the
//! reference builds `'%d x %d @ %.1fkg'` inside `Lift`'s constructor, which
//! bakes a unit, a decimal precision and an English word order into the domain
//! and makes the type unusable for anyone who wants pounds, another language,
//! or a table cell. Weights are bare numbers. Formatting happens at the UI edge.

use serde::{Deserialize, Serialize};

use crate::loading::Load;

/// One training session: what to do on one day.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Session {
    pub week: u32,
    pub day: u32,
    /// The exercise key this session is built around, when there is one.
    ///
    /// A key rather than a title, so it is data a client can act on rather than
    /// a string it can only print.
    pub focus: Option<String>,
    pub blocks: Vec<Block>,
}

/// One exercise and everything prescribed for it in this session.
///
/// Carries the exercise *key* only. The reference copies the label and the cues
/// into every block, which duplicates the whole exercise registry into every
/// stored session and means a corrected cue never reaches a session already
/// written. Consumers resolve the key through [`crate::exercise::find`], which
/// is a static table they can cache once (D-09).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Block {
    pub exercise: String,
    pub lifts: Vec<Lift>,
}

/// A number of sets at one weight and rep count.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Lift {
    pub sets: u32,
    pub reps: u32,
    /// When true, `reps` is a floor rather than a target — 5/3/1's "5+".
    ///
    /// A separate flag rather than encoding it in `reps`, because the number
    /// still has to pre-fill a logging field and still has to be the
    /// `prescribed_reps` that drift is measured against (D-07).
    pub amrap: bool,
    pub load: Load,
}

impl Lift {
    pub fn new(sets: u32, reps: u32, load: Load) -> Self {
        Self {
            sets,
            reps,
            amrap: false,
            load,
        }
    }

    /// A set taken to as many reps as possible, with `reps` as the minimum.
    pub fn amrap(sets: u32, reps: u32, load: Load) -> Self {
        Self {
            sets,
            reps,
            amrap: true,
            load,
        }
    }

    /// A lift with nothing on it, for exercises loaded by the athlete's own
    /// body.
    pub fn bodyweight(sets: u32, reps: u32) -> Self {
        Self::new(
            sets,
            reps,
            crate::loading::Loading::Bodyweight.round_down(0.0),
        )
    }
}

/// A session that has come back from the gym (D-07, D-08).
///
/// Both what was prescribed and what was actually done, because drift is
/// first-class data and because [`Program::advance`] is the one thing that
/// needs to know whether the athlete hit the numbers.
///
/// [`Program::advance`]: crate::Program::advance
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LoggedSession {
    pub week: u32,
    pub day: u32,
    pub sets: Vec<LoggedSet>,
    /// Why the session ended early, if it did. The program advances either way
    /// (D-08) — this is recorded, not acted on.
    pub cut_reason: Option<CutReason>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LoggedSet {
    pub exercise: String,
    pub position: u16,
    pub prescribed_weight: f64,
    pub prescribed_reps: u32,
    pub actual_weight: Option<f64>,
    pub actual_reps: Option<u32>,
    pub status: SetStatus,
}

impl LoggedSet {
    /// Reps actually performed. A set that was not done is zero reps, not
    /// missing data — for progression purposes, not doing the set and doing it
    /// for no reps are the same outcome.
    pub fn reps_performed(&self) -> u32 {
        match self.status {
            SetStatus::Done => self.actual_reps.unwrap_or(self.prescribed_reps),
            SetStatus::Skipped | SetStatus::Pending => 0,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SetStatus {
    Done,
    Skipped,
    Pending,
}

/// The four answers to the one question asked when a session ends early (D-08).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CutReason {
    OutOfTime,
    Pain,
    Equipment,
    Enough,
}
