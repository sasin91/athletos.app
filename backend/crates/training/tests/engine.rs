//! The tests milestone 1 exists to produce.
//!
//! An integration test rather than a unit test, deliberately: it sees the crate
//! exactly as the API will, through the public surface only. If something here
//! needs an item that is not exported, that is a finding about the surface and
//! not something to fix by reaching inside.

use std::collections::BTreeMap;

use athletos_training::{
    exercise, programs, testing, Length, Loading, LoggedSession, Maxes, Program, Readout, Session,
    State,
};

/// 5/3/1's four main lifts and what a completed cycle adds to each.
const MAIN_LIFTS: [(&str, f64); 4] = [
    ("military-press", 2.5),
    ("deadlift", 5.0),
    ("bench", 2.5),
    ("squat", 5.0),
];

const SESSIONS_PER_CYCLE: usize = 16;

fn wendler() -> &'static dyn Program {
    programs::find("wendler-531-bbb").expect("5/3/1 is in the registry")
}

fn smolov() -> &'static dyn Program {
    programs::find("smolov-jr").expect("Smolov Jr is in the registry")
}

/// One lift's training max, as the program itself reports it.
///
/// This used to index into the raw `State` JSON — `state.as_json()["training_max"][lift]`
/// — with a comment explaining that a white-box assertion was the only way to
/// reach a number the design deliberately gave no accessor. The comment was
/// right about the constraint and wrong about the conclusion: a test that has to
/// take a program's private memory apart to check the product's central rule is
/// a report that the consuming trait is missing a method, and it was. `readout()`
/// is that method, so this now reads the number the same way the athlete's screen
/// does, through `&dyn Program`, with no idea which program it is holding.
fn training_max(program: &dyn Program, state: &State, lift: &str) -> f64 {
    let readout = program
        .readout(state)
        .expect("a program reports its numbers");

    readout
        .iter()
        .find(|entry| entry.exercise == lift)
        .unwrap_or_else(|| panic!("5/3/1 reports a training max for {lift}"))
        .weight
}

fn training_maxes(program: &dyn Program, state: &State) -> BTreeMap<&'static str, f64> {
    MAIN_LIFTS
        .iter()
        .map(|(lift, _)| (*lift, training_max(program, state, lift)))
        .collect()
}

// ---------------------------------------------------------------------------
// The milestone's first "done when": two full cycles of 5/3/1.
// ---------------------------------------------------------------------------

/// Drives 5/3/1 through two complete cycles logging everything as prescribed,
/// and asserts that each lift's training max moved **exactly once per cycle**
/// and by exactly its own increment.
///
/// This is the assertion the whole adaptive trait exists for. It is also the
/// one that would catch the D-09 idempotency bug from the other side: a
/// training max that moved twice in a cycle is what a duplicated submit looks
/// like from in here.
#[test]
fn the_training_max_moves_exactly_once_per_cycle() {
    let program = wendler();
    let mut state = program.start(&testing::maxes()).expect("5/3/1 starts");

    // 90% of the entered max, per D-04. Nothing is rounded: the training max is
    // a number the program reasons with, and only the weights derived from it
    // have to be loadable.
    assert_eq!(training_max(program, &state, "squat"), 126.0);
    assert_eq!(training_max(program, &state, "bench"), 90.0);
    assert_eq!(training_max(program, &state, "deadlift"), 162.0);
    assert_eq!(training_max(program, &state, "military-press"), 54.0);

    let starting = training_maxes(program, &state);

    // Every session at which each lift's training max changed, and by how much.
    let mut moves: BTreeMap<&str, Vec<(usize, f64)>> = BTreeMap::new();

    for session_number in 1..=SESSIONS_PER_CYCLE * 2 {
        let session = program.session(&state).expect("has a session");
        let logged = testing::logged_as_prescribed(&session);

        let before = training_maxes(program, &state);
        state = program.advance(state, &logged).expect("advances");
        let after = training_maxes(program, &state);

        for (lift, _) in MAIN_LIFTS {
            let change = after[lift] - before[lift];
            if change.abs() > f64::EPSILON {
                moves
                    .entry(lift)
                    .or_default()
                    .push((session_number, change));
            }
        }
    }

    for (lift, increment) in MAIN_LIFTS {
        let observed = moves.get(lift).map(Vec::as_slice).unwrap_or_default();

        assert_eq!(
            observed,
            [
                (SESSIONS_PER_CYCLE, increment),
                (SESSIONS_PER_CYCLE * 2, increment)
            ],
            "{lift} should gain {increment} kg at the end of each cycle and at \
             no other time; it moved at {observed:?}"
        );

        // ...and the arithmetic adds up over the two cycles.
        assert_eq!(
            training_max(program, &state, lift),
            starting[lift] + increment * 2.0,
            "{lift} after two cycles"
        );
    }

    // Two cycles of sixteen sessions, and the position landed back at the top.
    assert_eq!(program.progress(&state).unwrap().completed, 32);
    let session = program.session(&state).unwrap();
    assert_eq!((session.week, session.day), (1, 1));
}

/// The position walks 4×4 and rolls over, so "week 3" is always the week whose
/// AMRAP decides whether the training max moves.
#[test]
fn the_cycle_position_walks_four_weeks_of_four_days() {
    let program = wendler();
    let mut state = program.start(&testing::maxes()).expect("starts");

    let mut positions = Vec::new();
    for _ in 0..SESSIONS_PER_CYCLE + 1 {
        let session = program.session(&state).expect("has a session");
        positions.push((session.week, session.day));

        let logged = testing::logged_as_prescribed(&session);
        state = program.advance(state, &logged).expect("advances");
    }

    let expected: Vec<(u32, u32)> = (1..=4)
        .flat_map(|week| (1..=4).map(move |day| (week, day)))
        .collect();
    assert_eq!(positions[..SESSIONS_PER_CYCLE], expected[..]);
    // Session 17 is the first of the next cycle.
    assert_eq!(positions[SESSIONS_PER_CYCLE], (1, 1));
}

/// A missed AMRAP holds that lift's training max — and only that lift's.
///
/// The documented rule (see `wendler_531_bbb.rs`): hold, rather than bump or
/// deload. This test is what stops that rule being quietly changed.
#[test]
fn a_missed_amrap_holds_only_that_lifts_training_max() {
    let program = wendler();
    let mut state = program.start(&testing::maxes()).expect("starts");
    let starting = training_maxes(program, &state);

    for _ in 0..SESSIONS_PER_CYCLE {
        let session = program.session(&state).expect("has a session");

        // Week 3 day 4 is the squat's 95% single. Come up one rep short on it
        // and nothing else in the entire cycle.
        let logged = if (session.week, session.day) == (3, 4) {
            testing::logged_missing_top_set(&session, "squat")
        } else {
            testing::logged_as_prescribed(&session)
        };

        state = program.advance(state, &logged).expect("advances");
    }

    assert_eq!(
        training_max(program, &state, "squat"),
        starting["squat"],
        "a missed 95% single holds the squat training max"
    );

    for (lift, increment) in MAIN_LIFTS {
        if lift == "squat" {
            continue;
        }
        assert_eq!(
            training_max(program, &state, lift),
            starting[lift] + increment,
            "{lift} made its AMRAP and should still have gained"
        );
    }

    // The hold lasts one cycle: clear the next one and the squat gains again.
    for _ in 0..SESSIONS_PER_CYCLE {
        let session = program.session(&state).expect("has a session");
        let logged = testing::logged_as_prescribed(&session);
        state = program.advance(state, &logged).expect("advances");
    }

    assert_eq!(
        training_max(program, &state, "squat"),
        starting["squat"] + 5.0
    );
}

/// The percentages from the design, and the Boring But Big work behind them.
#[test]
fn the_five_three_one_week_structure_is_what_the_design_says() {
    let program = wendler();
    let mut state = program.start(&testing::maxes()).expect("starts");

    // Day 1 is the press, so every session below is 54 kg of training max.
    let expected: [(&[(f64, u32)], bool); 4] = [
        (&[(65.0, 5), (75.0, 5), (85.0, 5)], true),
        (&[(70.0, 3), (80.0, 3), (90.0, 3)], true),
        (&[(75.0, 5), (85.0, 3), (95.0, 1)], true),
        (&[(40.0, 5), (50.0, 5), (60.0, 5)], false),
    ];

    for (week, (sets, has_bbb)) in expected.into_iter().enumerate() {
        let session = program.session(&state).expect("has a session");
        assert_eq!((session.week, session.day), (week as u32 + 1, 1));
        assert_eq!(session.focus.as_deref(), Some("military-press"));

        let main = &session.blocks[0];
        assert_eq!(main.lifts.len(), 3);

        for (index, (percentage, reps)) in sets.iter().enumerate() {
            let lift = &main.lifts[index];
            assert_eq!(lift.sets, 1);
            assert_eq!(lift.reps, *reps);
            assert_eq!(
                lift.load.weight,
                Loading::Barbell
                    .round_down(54.0 * percentage / 100.0)
                    .weight,
                "week {} set {index} at {percentage}%",
                week + 1
            );

            // Only the last set of weeks 1-3 is AMRAP.
            let last = index == sets.len() - 1;
            assert_eq!(lift.amrap, last && has_bbb, "week {} set {index}", week + 1);
        }

        // Boring But Big: 5×10 of the same lift at 50% of the training max,
        // and nothing at all in the deload week. 50% of a 54 kg training max is
        // 27 kg, which is not loadable, so it falls to 25.
        if has_bbb {
            let bbb = &session.blocks[1];
            assert_eq!(bbb.exercise, "military-press");
            assert_eq!((bbb.lifts[0].sets, bbb.lifts[0].reps), (5, 10));
            assert_eq!(bbb.lifts[0].load.weight, 25.0);
        } else {
            assert_eq!(session.blocks.len(), 1, "the deload week has no BBB work");
        }

        // Skip to the same day of the next week.
        for _ in 0..4 {
            let session = program.session(&state).expect("has a session");
            let logged = testing::logged_as_prescribed(&session);
            state = program.advance(state, &logged).expect("advances");
        }
    }
}

// ---------------------------------------------------------------------------
// The milestone's second "done when": consumers never branch.
// ---------------------------------------------------------------------------

/// Every method of `Program`, exercised through a trait object, without the
/// caller ever learning which kind of program it is holding.
///
/// This function is the actual assertion. It is written the way a route handler
/// or a session view would be written, it takes `&dyn Program`, and there is no
/// `match` on program kind in it — nor anywhere else outside the blanket impl.
/// The only place the difference surfaces is `preview()` returning `Option`,
/// which is a fact about *this program's plan*, not a discriminant: the caller
/// handles `None` the same way it would handle a block it has run past the end
/// of.
fn drive(program: &dyn Program, maxes: &Maxes) {
    let meta = program.meta();
    assert!(!meta.key.is_empty());
    assert!(meta.days_per_week > 0);
    assert!(meta.estimated_session_minutes > 0);

    let state = program.start(maxes).expect("starts");

    let session: Session = program.session(&state).expect("has a first session");
    assert!(!session.blocks.is_empty());

    let progress = program.progress(&state).expect("reports progress");
    assert_eq!(progress.completed, 0);
    assert!(!progress.is_finished());

    // A plan if there is one, and no special case if there is not.
    if let Some(plan) = program.preview(&state).expect("previews") {
        assert_eq!(plan.first(), Some(&session));
        assert_eq!(progress.total, Some(plan.len() as u32));
    }

    // Whatever the program is working from, named. The caller has no idea
    // whether it is holding training maxes or the entered 1RMs, and does not
    // need one — which is the same property `progress()` has and for the same
    // reason.
    let readout: Vec<Readout> = program.readout(&state).expect("reports its numbers");
    assert!(
        !readout.is_empty(),
        "a program with no numbers prescribes air"
    );

    for entry in &readout {
        assert!(
            exercise::find(&entry.exercise).is_some(),
            "readout names unknown exercise {}",
            entry.exercise
        );
        assert!(!entry.label.is_empty(), "{} is unlabelled", entry.exercise);
        assert!(entry.weight > 0.0, "{} weighs nothing", entry.exercise);
    }

    let logged: LoggedSession = testing::logged_as_prescribed(&session);
    let advanced = program.advance(state, &logged).expect("advances");

    assert_eq!(program.progress(&advanced).unwrap().completed, 1);
    assert_ne!(
        program.session(&advanced).expect("has a second session"),
        session,
        "advancing should change the prescription"
    );
}

/// The assumption the entire milestone exists to test.
///
/// A `Vec<Box<dyn Program>>` holding one program authored as `Prescriptive` and
/// one authored as `Program` directly. If `Program` were not object-safe, or if
/// the blanket impl did not make a `Prescriptive` type into a `Program`, this
/// would not compile — which is the point. It is a compile-time assertion with
/// a runtime one stapled to it.
#[test]
fn both_kinds_of_program_are_the_same_thing_to_a_consumer() {
    let maxes = testing::maxes();

    let catalogue: Vec<Box<dyn Program>> = vec![
        Box::new(programs::SmolovJr), // impl Prescriptive — reaches Program via the blanket impl
        Box::new(programs::Wendler531Bbb), // impl Program directly
    ];

    assert_eq!(catalogue.len(), 2);

    for program in &catalogue {
        drive(program.as_ref(), &maxes);
    }

    // The same through a shared reference and through the static registry, so
    // every way a consumer can hold a program is covered.
    for program in programs::REGISTRY {
        drive(*program, &maxes);
    }

    let borrowed: &dyn Program = &programs::SmolovJr;
    drive(borrowed, &maxes);
}

/// `preview()` is the one place the two kinds differ, and it differs in the way
/// D-03 says it should: a knowable end previews, an open-ended program does not.
#[test]
fn only_a_fixed_block_can_show_you_the_plan() {
    let maxes = testing::maxes();

    let smolov = smolov();
    let state = smolov.start(&maxes).unwrap();
    let plan = smolov
        .preview(&state)
        .unwrap()
        .expect("Smolov Jr is 12 sessions");
    assert_eq!(plan.len(), 12);
    assert_eq!(smolov.progress(&state).unwrap().total, Some(12));
    assert!(matches!(smolov.meta().length, Length::Fixed { .. }));

    let wendler = wendler();
    let state = wendler.start(&maxes).unwrap();
    assert!(
        wendler.preview(&state).unwrap().is_none(),
        "5/3/1 does not end, so there is no plan to show"
    );
    assert_eq!(wendler.progress(&state).unwrap().total, None);
    assert!(matches!(wendler.meta().length, Length::OpenEnded));
}

/// `readout()` answers with the kind of number each program actually
/// prescribes from, and says which kind it is.
///
/// The gap this closes is a real one an athlete hits: enter a 140 kg squat, and
/// 5/3/1 will prescribe off 126 on day one and off something above 140 within a
/// year, while the maxes screen still says 140. Two numbers with no relationship
/// on the screen and no explanation. The label is what makes the screen able to
/// explain it.
#[test]
fn a_readout_says_what_kind_of_number_it_is() {
    let maxes = testing::maxes();

    let wendler = wendler();
    let state = wendler.start(&maxes).unwrap();
    let training = wendler.readout(&state).expect("5/3/1 reports its numbers");

    // Wendler's day order, not alphabetical: it is the order the athlete meets
    // the lifts in the week.
    assert_eq!(
        training,
        vec![
            Readout {
                exercise: "military-press".to_owned(),
                label: Readout::TRAINING_MAX,
                weight: 54.0,
            },
            Readout {
                exercise: "deadlift".to_owned(),
                label: Readout::TRAINING_MAX,
                weight: 162.0,
            },
            Readout {
                exercise: "bench".to_owned(),
                label: Readout::TRAINING_MAX,
                weight: 90.0,
            },
            Readout {
                exercise: "squat".to_owned(),
                label: Readout::TRAINING_MAX,
                weight: 126.0,
            },
        ],
        "90% of the entered maxes, and labelled as the program's own number"
    );

    let smolov = smolov();
    let state = smolov.start(&maxes).unwrap();
    let entered = smolov
        .readout(&state)
        .expect("Smolov Jr reports its numbers");

    // Not a training max, because Smolov Jr does not have one. It takes the
    // entered number straight, so the honest readout is the snapshot it started
    // from — inventing a governor the program does not have would be the same
    // lie as an invented progress denominator.
    for entry in &entered {
        assert_eq!(entry.label, Readout::ENTERED_MAX, "{}", entry.exercise);
        assert_eq!(
            entry.weight,
            maxes.get(&entry.exercise).expect("a max was entered"),
            "{} is the entered number, untouched",
            entry.exercise
        );
    }

    // Every lift the athlete had at enrolment, including the press that Smolov
    // Jr does not use: a snapshot is a snapshot of the document, not of the
    // subset this program happened to read.
    let listed: Vec<&str> = entered
        .iter()
        .map(|entry| entry.exercise.as_str())
        .collect();
    assert!(listed.contains(&"squat"));
    assert!(listed.contains(&"bench"));
    assert!(listed.contains(&"deadlift"));
}

/// The readout of an adaptive program moves; the readout of a fixed block does
/// not. This is the whole reason the athlete needs to see both numbers.
#[test]
fn only_an_adaptive_programs_readout_moves_under_the_athlete() {
    let maxes = testing::maxes();

    // 5/3/1: nothing for fifteen sessions, then every lift gains at once.
    let wendler = wendler();
    let mut state = wendler.start(&maxes).unwrap();
    let opening = wendler.readout(&state).unwrap();

    for _ in 0..SESSIONS_PER_CYCLE - 1 {
        let session = wendler.session(&state).unwrap();
        let logged = testing::logged_as_prescribed(&session);
        state = wendler.advance(state, &logged).unwrap();

        assert_eq!(
            wendler.readout(&state).unwrap(),
            opening,
            "the training max moves at the cycle boundary and nowhere else"
        );
    }

    let session = wendler.session(&state).unwrap();
    let logged = testing::logged_as_prescribed(&session);
    state = wendler.advance(state, &logged).unwrap();

    let crossed = wendler.readout(&state).unwrap();
    assert_ne!(crossed, opening, "a completed cycle moves the training max");

    for (before, after) in opening.iter().zip(&crossed) {
        let increment = MAIN_LIFTS
            .iter()
            .find(|(lift, _)| *lift == before.exercise)
            .map(|(_, increment)| *increment)
            .expect("the readout names a main lift");

        assert_eq!(after.exercise, before.exercise);
        assert_eq!(after.weight, before.weight + increment);
    }

    // Smolov Jr: the same twelve sessions of logging, and the numbers are the
    // ones the athlete typed, unchanged. A prescriptive block's readout is a
    // snapshot, and a snapshot does not move.
    let smolov = smolov();
    let mut state = smolov.start(&maxes).unwrap();
    let opening = smolov.readout(&state).unwrap();

    for _ in 0..12 {
        let session = smolov.session(&state).unwrap();
        let logged = testing::logged_as_prescribed(&session);
        state = smolov.advance(state, &logged).unwrap();

        assert_eq!(
            smolov.readout(&state).unwrap(),
            opening,
            "a fixed block prescribes from what it started with, start to finish"
        );
    }
}

/// A fixed block runs out, and says so rather than wrapping or panicking.
#[test]
fn a_fixed_block_ends() {
    let program = smolov();
    let mut state = program.start(&testing::maxes()).unwrap();

    for _ in 0..12 {
        let session = program.session(&state).expect("has a session");
        let logged = testing::logged_as_prescribed(&session);
        state = program.advance(state, &logged).expect("advances");
    }

    let progress = program.progress(&state).unwrap();
    assert_eq!(
        progress,
        athletos_training::Progress {
            completed: 12,
            total: Some(12)
        }
    );
    assert!(progress.is_finished());
    assert!(matches!(
        program.session(&state),
        Err(athletos_training::ProgramError::Finished)
    ));
}

// ---------------------------------------------------------------------------
// Port fidelity.
// ---------------------------------------------------------------------------

/// Smolov Jr is 4 days × 3 weeks, and the squat progression is the one from the
/// reference: the same set-and-rep scheme each day of the week, climbing 2.5%
/// and then 5% across the three weeks.
#[test]
fn smolov_jr_is_twelve_sessions_of_the_reference_percentages() {
    let program = smolov();
    let maxes = testing::maxes();
    let state = program.start(&maxes).unwrap();
    let plan = program.preview(&state).unwrap().expect("previews");

    assert_eq!(plan.len(), 12, "4 days x 3 weeks");

    // (week, day, sets, reps, percentage of the 140 kg squat max)
    #[rustfmt::skip]
    let expected: [(u32, u32, u32, u32, f64); 12] = [
        (1, 1, 6, 6, 70.0), (1, 2, 7, 5, 75.0), (1, 3, 8, 4, 80.0), (1, 4, 10, 3, 85.0),
        (2, 1, 6, 6, 72.5), (2, 2, 7, 5, 77.5), (2, 3, 8, 4, 82.5), (2, 4, 10, 3, 87.5),
        (3, 1, 6, 6, 75.0), (3, 2, 7, 5, 80.0), (3, 3, 8, 4, 85.0), (3, 4, 10, 3, 90.0),
    ];

    for (session, (week, day, sets, reps, percentage)) in plan.iter().zip(expected) {
        assert_eq!((session.week, session.day), (week, day));

        // The squat is always the first block — it is a squat program.
        let squat = &session.blocks[0];
        assert_eq!(squat.exercise, "squat");

        // ...and the working set is always the last of the ramp.
        let working = squat.lifts.last().expect("the squat block has lifts");
        assert_eq!(
            (working.sets, working.reps),
            (sets, reps),
            "week {week} day {day}"
        );
        assert_eq!(
            working.load.weight,
            Loading::Barbell
                .round_down(140.0 * percentage / 100.0)
                .weight,
            "week {week} day {day} at {percentage}%"
        );

        // Nothing in a prescriptive block is ever AMRAP.
        assert!(session
            .blocks
            .iter()
            .flat_map(|b| &b.lifts)
            .all(|l| !l.amrap));
    }
}

/// Every weight either program can prescribe is loadable, and the plate
/// breakdown that comes with it adds up. This is the governor (D-04) checked
/// against real prescriptions rather than against synthetic numbers.
#[test]
fn every_prescribed_weight_in_the_catalogue_is_loadable() {
    let maxes = testing::maxes();

    for program in programs::REGISTRY {
        let mut state = program.start(&maxes).unwrap();

        // Twenty sessions is more than a Smolov Jr block and more than a 5/3/1
        // cycle, so both programs are walked past their first rollover.
        for _ in 0..20 {
            let Ok(session) = program.session(&state) else {
                break; // a fixed block that has ended
            };

            for block in &session.blocks {
                let exercise = exercise::find(&block.exercise).expect("a known exercise");

                for lift in &block.lifts {
                    let load = &lift.load;

                    match exercise.loading {
                        Loading::Barbell => {
                            assert!(load.weight >= 20.0);
                            let pairs = (load.weight - 20.0) / 2.5;
                            assert_eq!(pairs, pairs.round(), "{} kg is not 20 + 2.5n", load.weight);

                            let from_plates = load.plates_per_side.iter().sum::<f64>() * 2.0 + 20.0;
                            assert!(
                                (from_plates - load.weight).abs() < 1e-9,
                                "{:?} per side does not make {} kg",
                                load.plates_per_side,
                                load.weight
                            );
                        }
                        Loading::Bodyweight => assert_eq!(load.weight, 0.0),
                        Loading::Dumbbell { increment } | Loading::Machine { increment } => {
                            let steps = load.weight / increment;
                            assert_eq!(steps, steps.round());
                            assert!(load.plates_per_side.is_empty());
                        }
                    }
                }
            }

            let logged = testing::logged_as_prescribed(&session);
            state = program.advance(state, &logged).unwrap();
        }
    }
}

/// A program refuses to start rather than prescribing an empty bar for three
/// weeks, which is what the reference does with a missing max.
#[test]
fn a_missing_max_is_refused_at_enrolment() {
    let incomplete: Maxes = [("squat", 140.0)].into_iter().collect();

    for program in programs::REGISTRY {
        let error = program
            .start(&incomplete)
            .expect_err("should refuse to start without every max it needs");

        assert!(
            matches!(error, athletos_training::ProgramError::MissingMax { .. }),
            "{}: {error}",
            program.meta().key
        );
    }

    // And with everything present, both start.
    for program in programs::REGISTRY {
        assert!(program.start(&testing::maxes()).is_ok());
    }
}

/// State survives the round trip through the shape Postgres will store it in.
#[test]
fn state_survives_a_round_trip_through_json() {
    let program = wendler();
    let state = program.start(&testing::maxes()).unwrap();

    let stored = serde_json::to_string(&state).expect("serialises");
    let read_back: State = serde_json::from_str(&stored).expect("deserialises");

    assert_eq!(
        program.session(&read_back).unwrap(),
        program.session(&state).unwrap()
    );
}
