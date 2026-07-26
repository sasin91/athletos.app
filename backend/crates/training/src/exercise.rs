//! The exercise catalogue.
//!
//! Exercises are code and live in a static table (D-03). The reference models
//! each one as a class implementing an `Exercise` interface whose five methods
//! all return constants; here that is a `const` value in an array, which says
//! the same thing with none of the ceremony and — unlike a trait — leaves the
//! v2 data-driven authoring path able to *construct* an exercise at runtime
//! rather than having to compile a new type.
//!
//! `cues` are ported verbatim from the reference, capitalisation and all. They
//! are the author's own words from his own training and are not ours to tidy.

use serde::Serialize;

use crate::loading::Loading;

/// One exercise: what to call it, how to do it, and what it can be loaded with.
#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
pub struct Exercise {
    pub key: &'static str,
    pub label: &'static str,
    pub cues: &'static [&'static str],
    /// A competition lift or a close variant, as opposed to accessory work.
    pub is_primary: bool,
    /// Drives rounding, per-exercise (D-04).
    pub loading: Loading,
}

/// A typical dumbbell rack: pairs every 2 kg.
const RACK: Loading = Loading::Dumbbell { increment: 2.0 };

pub const SQUAT: Exercise = Exercise {
    key: "squat",
    label: "Squat",
    cues: &[
        "Bar on upper back",
        "Feet shoulder width",
        "Brace core",
        "Break at hips and knees",
        "Depth to parallel or below",
        "Drive up through heels",
    ],
    is_primary: true,
    loading: Loading::Barbell,
};

pub const BENCH: Exercise = Exercise {
    key: "bench",
    label: "Bench Press",
    cues: &[
        "Lie flat on bench",
        "Feet planted on floor",
        "Retract shoulder blades",
        "Bar over mid-chest",
        "Lower with control",
        "Press to lockout",
    ],
    is_primary: true,
    loading: Loading::Barbell,
};

pub const DEADLIFT: Exercise = Exercise {
    key: "deadlift",
    label: "Deadlift",
    cues: &[
        "Barbell over midfoot",
        "shins slightly touching",
        "shoulder width grip",
        "squeeze the bar",
        "twist hands inwards, feel back tension",
        "push floor away",
    ],
    is_primary: true,
    loading: Loading::Barbell,
};

/// The reference's `MilitaryPress`, which is also 5/3/1's press day.
pub const MILITARY_PRESS: Exercise = Exercise {
    key: "military-press",
    label: "Military Press",
    cues: &[
        "Strict overhead press",
        "Core tight",
        "Don't lean back",
        "Lock out at top",
    ],
    is_primary: false,
    loading: Loading::Barbell,
};

pub const BARBELL_ROW: Exercise = Exercise {
    key: "barbell-row",
    label: "Barbell Row",
    cues: &[
        "Hinge at the hips",
        "Keep back straight",
        "Pull the bar to your lower chest/upper abdomen",
        "Squeeze shoulder blades together",
        "Control the eccentric",
    ],
    is_primary: true,
    loading: Loading::Barbell,
};

/// The reference defines this by extending `Deadlift` and appending two cues,
/// so the inherited six are repeated here in the order PHP would produce them.
pub const ROMANIAN_DEADLIFT: Exercise = Exercise {
    key: "romanian-deadlift",
    label: "Romanian deadlift",
    cues: &[
        "Barbell over midfoot",
        "shins slightly touching",
        "shoulder width grip",
        "squeeze the bar",
        "twist hands inwards, feel back tension",
        "push floor away",
        "push bottom back",
        "keep legs straight",
    ],
    is_primary: false,
    loading: Loading::Barbell,
};

/// `is_primary` is `true` here because the reference says so. It is a curious
/// call for an arm exercise, but this is a port, and the flag drives nothing in
/// the engine.
pub const BARBELL_CURL: Exercise = Exercise {
    key: "barbell-curl",
    label: "Barbell Curl",
    cues: &[
        "Stand up straight",
        "Grip shoulder width apart",
        "Keep elbows pinned to your sides",
        "Curl the bar up, squeezing the biceps",
        "Lower the bar under control",
    ],
    is_primary: true,
    loading: Loading::Barbell,
};

pub const HANGING_LEG_RAISE: Exercise = Exercise {
    key: "hanging-leg-raise",
    label: "Hanging leg raise",
    cues: &["Grab handles or bar", "squeeze", "pull knees up to sternum"],
    is_primary: false,
    loading: Loading::Bodyweight,
};

pub const LATERAL_RAISE: Exercise = Exercise {
    key: "lateral-raise",
    label: "Lateral Raise",
    cues: &[
        "Stand with dumbbells at your sides",
        "Slight bend in the elbows",
        "Raise arms out to your sides to shoulder height",
        "Lead with the elbows, not the hands",
        "Lower under control — no swinging",
    ],
    is_primary: false,
    loading: RACK,
};

pub const DUMBBELL_TRICEP_EXTENSION: Exercise = Exercise {
    key: "dumbbell-tricep-extension",
    label: "Dumbbell Tricep Extension",
    cues: &["Lower behind neck", "feel tension"],
    is_primary: false,
    loading: RACK,
};

pub const INCLINE_DUMBBELL_PRESS: Exercise = Exercise {
    key: "incline-dumbbell-press",
    label: "Dumbbell Press",
    cues: &[
        "Hands rotated slightly inwards",
        "dumbbells starts aligned with nipple line",
        "brace core and push back into pad",
        "drive hands up towards the ceiling",
    ],
    is_primary: false,
    loading: RACK,
};

pub const HAMMER_CURL: Exercise = Exercise {
    key: "hammer-curl",
    label: "Hammer Curl",
    cues: &[
        "Hold dumbbells with a neutral (hammer) grip",
        "Keep elbows pinned to your sides",
        "Curl both dumbbells up simultaneously",
        "Squeeze at the top",
        "Lower under control",
    ],
    is_primary: false,
    loading: RACK,
};

/// Every exercise the compiled-in programs can prescribe.
pub const REGISTRY: &[Exercise] = &[
    SQUAT,
    BENCH,
    DEADLIFT,
    MILITARY_PRESS,
    BARBELL_ROW,
    ROMANIAN_DEADLIFT,
    BARBELL_CURL,
    HANGING_LEG_RAISE,
    LATERAL_RAISE,
    DUMBBELL_TRICEP_EXTENSION,
    INCLINE_DUMBBELL_PRESS,
    HAMMER_CURL,
];

/// Resolves an exercise key, for consumers holding a [`Block`] and wanting its
/// label and cues.
///
/// [`Block`]: crate::Block
pub fn find(key: &str) -> Option<&'static Exercise> {
    REGISTRY.iter().find(|exercise| exercise.key == key)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_key_is_unique_and_resolvable() {
        for exercise in REGISTRY {
            assert_eq!(find(exercise.key), Some(exercise), "{}", exercise.key);
        }

        let mut keys: Vec<_> = REGISTRY.iter().map(|exercise| exercise.key).collect();
        keys.sort_unstable();
        let count = keys.len();
        keys.dedup();
        assert_eq!(keys.len(), count, "duplicate exercise key");
    }

    #[test]
    fn every_exercise_says_something_about_how_to_do_it() {
        for exercise in REGISTRY {
            assert!(!exercise.cues.is_empty(), "{} has no cues", exercise.key);
            assert!(!exercise.label.is_empty());
        }
    }
}
