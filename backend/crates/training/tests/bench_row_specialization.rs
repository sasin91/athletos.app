use athletos_training::{programs, testing, Maxes, ProgramError, Session};

fn reference_maxes() -> Maxes {
    [
        ("bench", 147.0),
        ("barbell-row", 175.0),
        ("squat", 170.0),
        ("deadlift", 245.0),
    ]
    .into_iter()
    .collect()
}

fn prescription(session: &Session) -> Vec<(&str, u32, u32, f64)> {
    session
        .blocks
        .iter()
        .map(|block| {
            assert_eq!(block.lifts.len(), 1);
            let lift = &block.lifts[0];
            assert!(!lift.amrap);
            (
                block.exercise.as_str(),
                lift.sets,
                lift.reps,
                lift.load.weight,
            )
        })
        .collect()
}

#[test]
fn reference_loads_progress_into_two_deload_sessions_and_finish() {
    let program = programs::find("bench-row-specialization").unwrap();
    let mut state = program.start(&reference_maxes()).unwrap();
    let preview = program.preview(&state).unwrap().unwrap();
    #[rustfmt::skip]
    let expected = vec![
        vec![("bench", 4, 6, 97.5), ("barbell-row", 3, 8, 110.0), ("squat", 3, 5, 110.0)],
        vec![("bench", 5, 5, 105.0), ("barbell-row", 4, 5, 125.0), ("deadlift", 2, 2, 170.0)],
        vec![("bench", 6, 4, 112.5), ("barbell-row", 3, 8, 105.0), ("squat", 3, 3, 125.0)],
        vec![("bench", 7, 3, 120.0), ("barbell-row", 4, 3, 135.0)],
        vec![("bench", 4, 6, 100.0), ("barbell-row", 3, 8, 112.5), ("squat", 3, 5, 110.0)],
        vec![("bench", 5, 5, 107.5), ("barbell-row", 4, 5, 127.5), ("deadlift", 2, 2, 170.0)],
        vec![("bench", 6, 4, 115.0), ("barbell-row", 3, 8, 107.5), ("squat", 3, 3, 125.0)],
        vec![("bench", 7, 3, 122.5), ("barbell-row", 4, 3, 137.5)],
        vec![("bench", 4, 6, 102.5), ("barbell-row", 3, 8, 115.0), ("squat", 3, 5, 110.0)],
        vec![("bench", 5, 5, 110.0), ("barbell-row", 4, 5, 130.0)],
        vec![("bench", 6, 4, 117.5), ("barbell-row", 3, 8, 110.0), ("squat", 3, 3, 125.0)],
        vec![("bench", 7, 3, 125.0), ("barbell-row", 4, 3, 140.0)],
        vec![("bench", 3, 3, 90.0), ("barbell-row", 2, 5, 100.0), ("squat", 2, 3, 100.0)],
        vec![("bench", 3, 3, 90.0), ("barbell-row", 2, 5, 100.0)],
    ];

    assert_eq!(preview.len(), expected.len());
    for (index, expected_session) in expected.iter().enumerate() {
        let session = program.session(&state).unwrap();
        assert_eq!(session, preview[index]);
        assert_eq!(session.week, index as u32 / 4 + 1);
        assert_eq!(session.day, index as u32 % 4 + 1);
        assert_eq!(session.focus.as_deref(), Some("bench"));
        assert_eq!(&prescription(&session), expected_session);
        let progress = program.progress(&state).unwrap();
        assert_eq!(progress.completed, index as u32);
        assert_eq!(progress.total, Some(14));
        state = program
            .advance(state, &testing::logged_as_prescribed(&session))
            .unwrap();
    }
    assert!(program.progress(&state).unwrap().is_finished());
    assert!(matches!(program.session(&state), Err(ProgramError::Finished)));
}

#[test]
fn each_exercise_scales_only_from_its_own_max_and_keeps_fixed_increments() {
    let program = programs::find("bench-row-specialization").unwrap();
    let original = program
        .preview(&program.start(&reference_maxes()).unwrap())
        .unwrap()
        .unwrap();

    for exercise in ["bench", "barbell-row", "squat", "deadlift"] {
        let mut maxes = reference_maxes();
        maxes.set(exercise, maxes.get(exercise).unwrap() / 2.0);
        let scaled = program
            .preview(&program.start(&maxes).unwrap())
            .unwrap()
            .unwrap();

        for (before, after) in original.iter().zip(&scaled) {
            for (before_block, after_block) in before.blocks.iter().zip(&after.blocks) {
                if before_block.exercise == exercise {
                    assert!(after_block.lifts[0].load.weight < before_block.lifts[0].load.weight);
                } else {
                    assert_eq!(before_block, after_block);
                }
            }
        }
        if exercise == "bench" || exercise == "barbell-row" {
            let block = usize::from(exercise == "barbell-row");
            let load = |index: usize| scaled[index].blocks[block].lifts[0].load.weight;
            assert_eq!(load(4) - load(0), 2.5);
            assert_eq!(load(8) - load(4), 2.5);
        }
    }

    let mut maxes = reference_maxes();
    maxes.set("bench", 100.0);
    let state = program.start(&maxes).unwrap();
    // 97.5 * 100 / 147 = 66.326..., so the load must round down to 65.
    let first = program.session(&state).unwrap();
    assert_eq!(first.blocks[0].lifts[0].load.weight, 65.0);
    maxes.set("bench", 147.0);
    assert_eq!(program.session(&state).unwrap(), first);
}
