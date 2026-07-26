//! The compiled-in program catalogue.
//!
//! Programs are code (D-03): no DSL, no authoring UI, no user-defined programs
//! in v1. Adding one means a deploy, which is an accepted cost for a catalogue
//! that fits on two hands.
//!
//! Note what the registry's type says. It is a slice of `&dyn Program` — one
//! element authored as [`Prescriptive`] and one authored as [`Program`] — and
//! nothing downstream of this line can tell which is which.
//!
//! [`Prescriptive`]: crate::Prescriptive
//! [`Program`]: crate::Program

mod smolov_jr;
mod wendler_531_bbb;

pub use smolov_jr::SmolovJr;
pub use wendler_531_bbb::Wendler531Bbb;

use crate::Program;

/// Every program an athlete can enrol in.
pub static REGISTRY: &[&dyn Program] = &[&SmolovJr, &Wendler531Bbb];

/// Resolves a program key, for an enrolment reading `program_key` back out of
/// the database.
pub fn find(key: &str) -> Option<&'static dyn Program> {
    REGISTRY
        .iter()
        .copied()
        .find(|program| program.meta().key == key)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::exercise;
    use crate::meta::Length;

    #[test]
    fn every_program_is_resolvable_by_its_own_key() {
        for program in REGISTRY {
            let key = program.meta().key;
            assert!(find(key).is_some(), "{key} is not in the registry");
        }

        assert!(find("no-such-program").is_none());
    }

    /// Every exercise a program can name must be resolvable, or the session
    /// screen has a block it cannot label or cue.
    #[test]
    fn every_prescribed_exercise_is_in_the_exercise_registry() {
        let maxes = crate::testing::maxes();

        for program in REGISTRY {
            let state = program.start(&maxes).expect("starts");
            let session = program.session(&state).expect("has a first session");

            for block in &session.blocks {
                assert!(
                    exercise::find(&block.exercise).is_some(),
                    "{} prescribes unknown exercise {}",
                    program.meta().key,
                    block.exercise
                );
            }
        }
    }

    /// The catalogue's advertised length and the runtime preview must agree.
    /// A program claiming a fixed length while refusing to preview itself is
    /// the lying progress bar D-03 exists to prevent.
    #[test]
    fn advertised_length_agrees_with_preview() {
        let maxes = crate::testing::maxes();

        for program in REGISTRY {
            let state = program.start(&maxes).expect("starts");
            let preview = program.preview(&state).expect("previews");
            let progress = program.progress(&state).expect("reports progress");

            match program.meta().length {
                Length::Fixed { sessions, .. } => {
                    let plan = preview.expect("a fixed block previews");
                    assert_eq!(plan.len(), sessions as usize, "{}", program.meta().key);
                    assert_eq!(progress.total, Some(sessions as u32));
                }
                Length::OpenEnded => {
                    assert!(preview.is_none(), "{}", program.meta().key);
                    assert!(progress.total.is_none());
                }
            }
        }
    }

    /// `required_maxes` is a hand-written declaration and the client's maxes
    /// form is built from it, so it has to be exactly what `start()` asks for —
    /// not a superset that makes the athlete enter a number nothing reads, and
    /// not a subset that lets them press enrol and be refused.
    ///
    /// Both directions are checked. Removing any declared key must fail
    /// *naming that key*, and the declared keys on their own must be enough.
    #[test]
    fn required_maxes_is_exactly_what_starting_needs() {
        for program in REGISTRY {
            let key = program.meta().key;
            let required = program.meta().required_maxes;

            assert!(!required.is_empty(), "{key} requires no maxes at all");

            for exercise in required {
                assert!(
                    exercise::find(exercise).is_some(),
                    "{key} requires unknown exercise {exercise}"
                );
            }

            let complete: crate::Maxes = required
                .iter()
                .map(|exercise| ((*exercise).to_owned(), 100.0))
                .collect();

            program
                .start(&complete)
                .unwrap_or_else(|_| panic!("{key} needs a max it does not declare"));

            for missing in required {
                let partial: crate::Maxes = required
                    .iter()
                    .filter(|exercise| *exercise != missing)
                    .map(|exercise| ((*exercise).to_owned(), 100.0))
                    .collect();

                match program.start(&partial) {
                    Err(crate::ProgramError::MissingMax { exercise }) => {
                        assert_eq!(&exercise, missing, "{key} blamed the wrong lift")
                    }
                    Err(other) => panic!("{key} without {missing}: {other}"),
                    Ok(_) => panic!("{key} declares {missing} but starts without it"),
                }
            }
        }
    }
}
