use crate::Maxes;

pub type Result<T> = std::result::Result<T, ProgramError>;

/// Everything a program can refuse to do.
///
/// The variants are deliberately about *inputs*, not about internal failure:
/// a program is a pure function of its state and the athlete's maxes, so the
/// only way it can fail is that one of those two is not something it can work
/// with. There is no I/O here to go wrong.
#[derive(Debug, thiserror::Error)]
pub enum ProgramError {
    /// The athlete has not entered a max this program needs.
    ///
    /// The reference defaults a missing max to zero
    /// ([`ExtractsPowerliftingMaxes`]) and then happily prescribes 0 kg for
    /// every set of a twelve-session block. Refusing at enrolment is the whole
    /// difference between a program that cannot start and a program that is
    /// silently useless.
    ///
    /// [`ExtractsPowerliftingMaxes`]: crate::programs
    #[error("this program needs a one-rep max for {exercise}")]
    MissingMax { exercise: String },

    /// The stored state is not a shape this program recognises.
    ///
    /// Reachable in exactly one way: a row written by an older build of the
    /// program is read back by a newer one. It is an error rather than a panic
    /// because the enrolment it came from is recoverable — the athlete can be
    /// told to restart the block — and a panic in a pure crate would take the
    /// request handler with it.
    #[error("the stored state does not belong to this program: {reason}")]
    UnreadableState { reason: String },

    /// The block is over; there is no session after the last one.
    ///
    /// Only a fixed-length program can return this. An open-ended one has no
    /// end to run off (D-03).
    #[error("this program has no session left to prescribe")]
    Finished,
}

impl ProgramError {
    pub(crate) fn missing_max(exercise: &str) -> Self {
        Self::MissingMax {
            exercise: exercise.to_owned(),
        }
    }

    pub(crate) fn unreadable(reason: impl std::fmt::Display) -> Self {
        Self::UnreadableState {
            reason: reason.to_string(),
        }
    }
}

impl Maxes {
    /// The entered one-rep max for an exercise, or [`ProgramError::MissingMax`].
    ///
    /// Every program should reach for this rather than [`Maxes::get`] at
    /// `start()` time, so that a missing number is caught once, at enrolment,
    /// instead of turning into a zero-kilo prescription three weeks later.
    pub fn require(&self, exercise: &str) -> Result<f64> {
        self.get(exercise)
            .ok_or_else(|| ProgramError::missing_max(exercise))
    }
}
