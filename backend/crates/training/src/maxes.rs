use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

/// What the athlete has entered, keyed by exercise (D-04).
///
/// Maxes are entered directly per lift and are never derived from a formula or
/// from logged sets. Each program takes its own view of the number — 5/3/1
/// works from 90% of it, a prescriptive block takes it straight — so the
/// conservatism lives in the program rather than in a settings form the athlete
/// has to be trusted to fill in pessimistically.
///
/// A `BTreeMap` rather than a struct of named lifts: the set of exercises an
/// athlete has a max for is open, and a program asks for the ones it needs by
/// key. Ordered rather than hashed only so that serialising a `Maxes` twice
/// produces the same bytes twice, which makes test failures readable.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Maxes(BTreeMap<String, f64>);

impl Maxes {
    pub fn new() -> Self {
        Self::default()
    }

    /// The entered max for an exercise, if there is one.
    pub fn get(&self, exercise: &str) -> Option<f64> {
        self.0.get(exercise).copied()
    }

    pub fn set(&mut self, exercise: impl Into<String>, weight: f64) {
        self.0.insert(exercise.into(), weight);
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    pub fn iter(&self) -> impl Iterator<Item = (&str, f64)> {
        self.0.iter().map(|(key, weight)| (key.as_str(), *weight))
    }
}

impl<K: Into<String>> FromIterator<(K, f64)> for Maxes {
    fn from_iter<I: IntoIterator<Item = (K, f64)>>(entries: I) -> Self {
        Self(
            entries
                .into_iter()
                .map(|(key, weight)| (key.into(), weight))
                .collect(),
        )
    }
}
