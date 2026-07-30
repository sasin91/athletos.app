//! AthletOS's training engine: programs, the weights they prescribe, and the
//! rounding rule that keeps those weights loadable — with no Axum, sqlx, clock
//! or database anywhere near any of it.
//!
//! The crate exists so that the genuinely hard parts of the product are
//! testable in milliseconds and without a database (D-03). Those parts are:
//!
//! - **Two kinds of program, one consuming trait.** A prescriptive block has a
//!   knowable end; an adaptive program's numbers move as the athlete trains.
//!   Consumers hold [`dyn Program`](Program) and never learn which they have —
//!   see [`program`] for how the blanket impl erases the difference and what
//!   the compiler will and will not permit.
//! - **Rounding down, always.** Every prescribed weight falls to the nearest
//!   weight that can actually be loaded, never up and never to nearest. A
//!   systematic bias toward the lighter loadable weight is the cheapest
//!   governor in the system for an athlete whose failure mode is over-reaching
//!   (D-01, D-04), and it costs one function.
//!
//! Two rules hold throughout:
//!
//! - **[`State`] is opaque.** It is a program's private memory. Only the
//!   program that wrote it reads it; everyone else moves it between Postgres
//!   and [`Program::advance`] without looking inside.
//! - **Nothing here formats anything.** Weights are bare numbers with kilogram
//!   semantics. No type in this crate contains a unit string, a decimal
//!   precision or an English word — the reference builds
//!   `'%d x %d @ %.1fkg'` inside `Lift`'s constructor, and that is precisely
//!   what makes its domain unusable from a second client (D-03).
//!
//! ```
//! use athletos_training::{programs, Maxes, Program};
//!
//! let maxes: Maxes = [("squat", 140.0), ("bench", 100.0), ("deadlift", 180.0)]
//!     .into_iter()
//!     .collect();
//!
//! let program = programs::find("smolov-jr").unwrap();
//! let state = program.start(&maxes).unwrap();
//! let session = program.session(&state).unwrap();
//!
//! // Week 1 day 1 opens with 6×6 at 70% of a 140 kg squat — 98 kg, which is
//! // not loadable, so the athlete is prescribed 97.5.
//! let top_set = session.blocks[0].lifts.last().unwrap();
//! assert_eq!((top_set.sets, top_set.reps), (6, 6));
//! assert_eq!(top_set.load.weight, 97.5);
//! assert_eq!(top_set.load.plates_per_side, vec![25.0, 10.0, 2.5, 1.25]);
//! ```

#![forbid(unsafe_code)]

mod error;
pub mod exercise;
mod loading;
mod maxes;
mod meta;
pub mod program;
pub mod programs;
mod session;
pub mod testing;

pub use error::{ProgramError, Result};
pub use exercise::Exercise;
pub use loading::{plan, Load, Loading, PlateChange, BARBELL_RESOLUTION, BAR_WEIGHT, PLATES};
pub use maxes::Maxes;
pub use meta::{Equipment, Experience, Length, ProgramMeta, RecoveryDemand};
pub use program::{Catalogued, Prescriptive, Program, Progress, Readout, State};
pub use session::{Block, CutReason, Lift, LoggedSession, LoggedSet, Session, SetStatus};
