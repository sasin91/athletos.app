//! Two authoring traits, one consuming trait (D-03).
//!
//! Programs come in two genuinely different kinds and the difference is
//! user-visible: a prescriptive block has a knowable end and an honest progress
//! denominator, an adaptive program has neither. The difference must not reach
//! consumers, because encoding it as an enum puts a `match` in the next-session
//! lookup, the session view, the preview, the progress bar and end-of-program
//! handling — five branches on day one and one more per feature thereafter.
//!
//! So the kind is a *choice of trait to implement*, and it is erased by a
//! blanket impl:
//!
//! ```text
//!     impl Prescriptive ──┐
//!                         ├──> dyn Program   (what every consumer holds)
//!     impl Program     ───┘
//! ```
//!
//! # What the compiler does and does not allow here
//!
//! `impl<P: Prescriptive> Program for P` coexisting with a hand-written
//! `impl Program for Wendler531Bbb` looks like it should be a coherence error,
//! and would be if the compiler had to assume `Wendler531Bbb` might one day
//! implement `Prescriptive`. It does not have to assume that: the orphan rule
//! means only the crate defining `Wendler531Bbb` can give it a `Prescriptive`
//! impl, and until it does, the two impls provably do not overlap.
//!
//! The moment a type implements *both* traits, that reasoning fails and rustc
//! reports E0119 against the blanket impl. That is not a limitation to work
//! around — it is the invariant, enforced: **a program is prescriptive or
//! adaptive, never both.** There is no runtime check because there is no way to
//! reach the runtime.
//!
//! One ergonomic detail follows from the shape. `meta()` lives on a third
//! trait, [`Catalogued`], rather than on both authoring traits, because a
//! method present on both `Prescriptive` and `Program` is ambiguous (E0034) on
//! any concrete prescriptive type — `SmolovJr.meta()` would not compile, and
//! the error would land on whoever wrote the next program rather than on
//! whoever designed this.

use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};

use crate::error::{ProgramError, Result};
use crate::{LoggedSession, Maxes, ProgramMeta, Session};

/// A program's catalogue entry, common to both ways of authoring one.
///
/// `Send + Sync` because the registry is a `static` shared by every request
/// handler, and `Debug` because a `dyn Program` that cannot be printed makes
/// every test failure involving one unreadable.
pub trait Catalogued: std::fmt::Debug + Send + Sync {
    fn meta(&self) -> &ProgramMeta;
}

/// What the author of a fixed-percentage program writes. Pure, and that is all.
///
/// One method. Everything else — starting, advancing, previewing, counting
/// progress — is derived by the blanket impl below, which is the entire point
/// of the split.
pub trait Prescriptive: Catalogued {
    /// The whole block, in order, derived from the athlete's maxes.
    ///
    /// Fallible, unlike the reference, which defaults a missing max to zero and
    /// then prescribes an empty bar for twelve sessions without complaining.
    fn schemas(&self, maxes: &Maxes) -> Result<Vec<Session>>;
}

/// What every consumer sees. Object-safe, stateful.
///
/// Consumers hold `&dyn Program` or `Box<dyn Program>` and never learn which
/// kind they have.
pub trait Program: Catalogued {
    /// The state an enrolment begins in. The place a program validates that the
    /// athlete has the maxes it needs.
    fn start(&self, maxes: &Maxes) -> Result<State>;

    /// The session this state is currently pointing at.
    fn session(&self, state: &State) -> Result<Session>;

    /// The state after a session has been logged.
    ///
    /// Takes `state` by value: advancing consumes the old state and produces
    /// the new one, so there is no way to accidentally keep using the stale
    /// copy. Runs exactly once per accepted workout (D-09).
    fn advance(&self, state: State, logged: &LoggedSession) -> Result<State>;

    /// The rest of the block, or `None` for an open-ended program (D-03).
    fn preview(&self, state: &State) -> Result<Option<Vec<Session>>>;

    /// How far in the athlete is — and, only if it is knowable, how far there
    /// is to go.
    ///
    /// This method is why the progress bar does not have to branch. Without it
    /// a consumer wanting "session 7 of 12" would have to read [`State`], which
    /// only the program is allowed to interpret, and would therefore have to
    /// know which program it was holding.
    fn progress(&self, state: &State) -> Result<Progress>;
}

/// Sessions completed, and the denominator if there is an honest one.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Progress {
    pub completed: u32,
    /// `None` for an open-ended program. A consumer showing a percentage must
    /// have this; one that invented a denominator would be lying (D-03).
    pub total: Option<u32>,
}

impl Progress {
    pub fn is_finished(&self) -> bool {
        self.total.is_some_and(|total| self.completed >= total)
    }
}

/// A program's private memory, opaque to everyone else (D-03).
///
/// JSON because that is what Postgres stores it as, and a newtype rather than a
/// bare `serde_json::Value` so that "opaque" is enforced rather than merely
/// documented: there is no way to index into a `State` from outside this crate.
/// Nothing but the program that wrote it reads it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct State(serde_json::Value);

impl State {
    /// Packs a program's own state type into the opaque blob.
    pub fn encode<T: Serialize>(value: &T) -> Result<Self> {
        serde_json::to_value(value)
            .map(Self)
            .map_err(ProgramError::unreadable)
    }

    /// Unpacks it again. The error case is a row written by an older build of
    /// the same program.
    pub fn decode<T: DeserializeOwned>(&self) -> Result<T> {
        serde_json::from_value(self.0.clone()).map_err(ProgramError::unreadable)
    }

    /// The underlying JSON, for the persistence layer to hand to Postgres.
    /// Reading it in order to make a decision is a bug.
    pub fn as_json(&self) -> &serde_json::Value {
        &self.0
    }

    pub fn from_json(value: serde_json::Value) -> Self {
        Self(value)
    }
}

/// The state every prescriptive program shares: a cursor, and the maxes the
/// block was derived from.
///
/// The maxes are copied in at `start()` rather than read live, so a block is a
/// snapshot of what the athlete enrolled in. Editing a max mid-block must not
/// silently rewrite the remaining sessions of a program already in progress —
/// that would make `prescribed_weight` disagree with what the athlete was
/// actually shown, and drift is measured against that number (D-07).
#[derive(Debug, Clone, Serialize, Deserialize)]
struct Cursor {
    index: u32,
    maxes: Maxes,
}

/// Every prescriptive program is trivially a `Program`.
///
/// `advance` is `index++` and `preview` is the whole remaining plan, exactly as
/// D-03 says. Note that nothing here inspects `logged`: a fixed block prescribes
/// what it prescribes regardless of how the session went, and the session
/// advances even if it was cut short (D-08).
impl<P: Prescriptive> Program for P {
    fn start(&self, maxes: &Maxes) -> Result<State> {
        // Derived and thrown away purely to fail here, at enrolment, if the
        // athlete is missing a max this program needs.
        self.schemas(maxes)?;

        State::encode(&Cursor {
            index: 0,
            maxes: maxes.clone(),
        })
    }

    fn session(&self, state: &State) -> Result<Session> {
        let cursor: Cursor = state.decode()?;

        self.schemas(&cursor.maxes)?
            .into_iter()
            .nth(cursor.index as usize)
            .ok_or(ProgramError::Finished)
    }

    fn advance(&self, state: State, _logged: &LoggedSession) -> Result<State> {
        let cursor: Cursor = state.decode()?;
        let total = self.schemas(&cursor.maxes)?.len() as u32;

        State::encode(&Cursor {
            // Clamped at the end rather than wrapping or growing without bound,
            // so a duplicate submit that slipped past the idempotency key
            // cannot walk the cursor off into nonsense.
            index: cursor.index.saturating_add(1).min(total),
            maxes: cursor.maxes,
        })
    }

    fn preview(&self, state: &State) -> Result<Option<Vec<Session>>> {
        let cursor: Cursor = state.decode()?;
        Ok(Some(self.schemas(&cursor.maxes)?))
    }

    fn progress(&self, state: &State) -> Result<Progress> {
        let cursor: Cursor = state.decode()?;

        Ok(Progress {
            completed: cursor.index,
            total: Some(self.schemas(&cursor.maxes)?.len() as u32),
        })
    }
}
