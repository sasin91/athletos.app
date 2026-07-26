//! What an athlete needs in order to judge whether a program fits (D-05).

use serde::Serialize;

/// The catalogue entry for a program.
///
/// This exists to let the athlete decide, not to be scored by an algorithm
/// (D-01). There is no fit score and no ranking — `recovery_demand` and
/// `estimated_session_minutes` are here so that a brutal 75-minute program
/// announces itself before enrolment rather than in week three.
///
/// `Serialize` but not `Deserialize`, and `&'static str` rather than `String`:
/// programs are code (D-03), so a `ProgramMeta` is authored as a `const` and
/// only ever travels outward, to the catalogue endpoint. Nothing reads one
/// back in. A v2 data-driven authoring path would add the `Deserialize` and
/// the owned strings at that point, and not before.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ProgramMeta {
    pub key: &'static str,
    pub name: &'static str,
    pub days_per_week: u8,
    pub equipment: &'static [Equipment],
    pub experience_floor: Experience,
    pub length: Length,
    pub recovery_demand: RecoveryDemand,
    /// Wall-clock minutes for a typical session, including rest.
    ///
    /// The athlete has an hour (D-01, D-10). A number above 60 here is the
    /// single most useful thing on the card.
    pub estimated_session_minutes: u16,
    /// The exercise keys `start()` will refuse to run without (D-04).
    ///
    /// Added in phase 4. A client has to render a maxes form *before* it can
    /// enrol, and the only signal the API had for which lifts to ask about was
    /// the 422 that `start()` raises — one key at a time, after the athlete has
    /// already pressed enrol. The alternative was a list of lifts hardcoded in
    /// the PWA, which is program knowledge living in a client, and a second
    /// client would have to hold the same list (D-11). So the program says it.
    ///
    /// Declared rather than derived because a program is free to consult a max
    /// anywhere in `start()`, and there is no way to ask a Rust function what it
    /// will ask for. A test keeps the declaration honest: drop any one of these
    /// and `start()` must fail naming that key, and the ones declared must be
    /// enough on their own.
    pub required_maxes: &'static [&'static str],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Equipment {
    Barbell,
    SquatRack,
    Bench,
    Dumbbells,
    PullUpBar,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Experience {
    Novice,
    Intermediate,
    Advanced,
}

/// Whether the program ends.
///
/// The same distinction [`Program::preview`] makes at runtime, stated up front
/// so the catalogue can show "3 weeks, 12 sessions" without instantiating
/// anything. The two must agree, and a test asserts that they do — a program
/// advertising a fixed length while refusing to preview itself would produce
/// exactly the lying progress bar D-03 exists to prevent.
///
/// [`Program::preview`]: crate::Program::preview
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Length {
    Fixed { weeks: u8, sessions: u16 },
    OpenEnded,
}

/// How much the program costs to recover from.
///
/// The axis D-01 cares about most, and the one the reference has no field for
/// at all. Deliberately three coarse steps: it is a warning, not a measurement.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RecoveryDemand {
    Moderate,
    High,
    /// Will interfere with the rest of your training and the rest of your week.
    Brutal,
}
