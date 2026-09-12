use athletos_training::{programs, testing, Maxes, ProgramError, Session};

fn maxes() -> Maxes {
    [
        ("bench", 200.0),
        ("barbell-row", 200.0),
        ("squat", 200.0),
        ("deadlift", 200.0),
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
fn percentage_schedule_progresses_into_two_deload_sessions_and_finishes() {
    let program = programs::find("bench-row-specialization").unwrap();
    let mut state = program.start(&maxes()).unwrap();
    let preview = program.preview(&state).unwrap().unwrap();
    #[rustfmt::skip]
    let expected = [
        vec![("bench", 4, 6, 135.0), ("barbell-row", 3, 8, 130.0), ("squat", 3, 5, 130.0)],
        vec![("bench", 5, 5, 145.0), ("barbell-row", 4, 5, 145.0), ("deadlift", 2, 2, 140.0)],
        vec![("bench", 6, 4, 155.0), ("barbell-row", 3, 8, 120.0), ("squat", 3, 3, 150.0)],
        vec![("bench", 7, 3, 165.0), ("barbell-row", 4, 3, 155.0)],
        vec![("bench", 4, 6, 140.0), ("barbell-row", 3, 8, 135.0), ("squat", 3, 5, 130.0)],
        vec![("bench", 5, 5, 150.0), ("barbell-row", 4, 5, 150.0), ("deadlift", 2, 2, 140.0)],
        vec![("bench", 6, 4, 160.0), ("barbell-row", 3, 8, 125.0), ("squat", 3, 3, 150.0)],
        vec![("bench", 7, 3, 170.0), ("barbell-row", 4, 3, 160.0)],
        vec![("bench", 4, 6, 145.0), ("barbell-row", 3, 8, 140.0), ("squat", 3, 5, 130.0)],
        vec![("bench", 5, 5, 155.0), ("barbell-row", 4, 5, 155.0)],
        vec![("bench", 6, 4, 165.0), ("barbell-row", 3, 8, 130.0), ("squat", 3, 3, 150.0)],
        vec![("bench", 7, 3, 175.0), ("barbell-row", 4, 3, 165.0)],
        vec![("bench", 3, 3, 120.0), ("barbell-row", 2, 5, 115.0), ("squat", 2, 3, 120.0)],
        vec![("bench", 3, 3, 120.0), ("barbell-row", 2, 5, 115.0)],
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
    assert!(matches!(
        program.session(&state),
        Err(ProgramError::Finished)
    ));
}

#[test]
fn every_week_scales_only_from_each_exercises_own_max() {
    let program = programs::find("bench-row-specialization").unwrap();
    let original = program
        .preview(&program.start(&maxes()).unwrap())
        .unwrap()
        .unwrap();

    for exercise in ["bench", "barbell-row", "squat", "deadlift"] {
        let mut entered = maxes();
        entered.set(exercise, entered.get(exercise).unwrap() / 2.0);
        let scaled = program
            .preview(&program.start(&entered).unwrap())
            .unwrap()
            .unwrap();

        for (before, after) in original.iter().zip(&scaled) {
            for (before_block, after_block) in before.blocks.iter().zip(&after.blocks) {
                if before_block.exercise == exercise {
                    assert_eq!(
                        after_block.lifts[0].load.weight,
                        before_block.lifts[0].load.weight / 2.0
                    );
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

    let mut entered = maxes();
    entered.set("bench", 147.0);
    let state = program.start(&entered).unwrap();
    // 67.5% of 147 = 99.225, so the load must round down to 97.5.
    let first = program.session(&state).unwrap();
    assert_eq!(first.blocks[0].lifts[0].load.weight, 97.5);
    entered.set("bench", 200.0);
    assert_eq!(program.session(&state).unwrap(), first);
}
