import { describe, expect, it } from 'vitest';

import {
	barUnchangedFrom,
	commitSession,
	editSet,
	intervalBefore,
	isComplete,
	logSet,
	nextSetPosition,
	noteSet,
	numberFromText,
	plateChangeFor,
	resetSet,
	setDriftReason,
	setsDone,
	setsRemaining,
	skipSet,
	snap,
	summarise,
	toSubmission
} from './session';
import type { CommitOptions, LocalSession, NextSession } from './session';

/**
 * Three squat sets and one bodyweight set, as the API would send them.
 *
 * Squat spans positions 0-2 and hanging leg raise starts at 3, so the
 * `plateChangeFor` tests have a same-exercise chain to disturb (0-2) and a
 * second exercise (3+) that a mess in the first cannot reach.
 */
const peeked: NextSession = {
	enrollment_id: '018f1f2a-0000-7000-8000-000000000001',
	program_key: 'wendler-531-bbb',
	week: 1,
	day: 4,
	focus: 'squat',
	progress: { completed: 3, total: null },
	pace: {
		can_project: true,
		median_seconds_per_set: 90,
		projected_seconds: 270,
		sample_size: 5
	},
	blocks: [
		{
			exercise: 'squat',
			label: 'Squat',
			cues: ['Bar on upper back', 'Brace core'],
			is_primary: true,
			lifts: [{ sets: 3, reps: 5, amrap: false, weight: 97.5, plates_per_side: [25, 10, 3.75] }]
		},
		{
			exercise: 'hanging-leg-raise',
			label: 'Hanging leg raise',
			cues: ['squeeze'],
			is_primary: false,
			lifts: [{ sets: 1, reps: 12, amrap: false, weight: 0, plates_per_side: [] }]
		}
	],
	prescribed_sets: [
		{
			position: 0,
			exercise: 'squat',
			label: 'Squat',
			prescribed_weight: 97.5,
			prescribed_reps: 5,
			amrap: false,
			plates_per_side: [25, 10, 3.75],
			plate_change: { remove: [], add: [25, 10, 3.75], plates_per_side: [25, 10, 3.75] }
		},
		{
			position: 1,
			exercise: 'squat',
			label: 'Squat',
			prescribed_weight: 97.5,
			prescribed_reps: 5,
			amrap: false,
			plates_per_side: [25, 10, 3.75],
			plate_change: { remove: [], add: [], plates_per_side: [25, 10, 3.75] }
		},
		{
			position: 2,
			exercise: 'squat',
			label: 'Squat',
			prescribed_weight: 97.5,
			prescribed_reps: 5,
			amrap: false,
			plates_per_side: [25, 10, 3.75],
			plate_change: { remove: [], add: [], plates_per_side: [25, 10, 3.75] }
		},
		{
			position: 3,
			exercise: 'hanging-leg-raise',
			label: 'Hanging leg raise',
			prescribed_weight: 0,
			prescribed_reps: 12,
			amrap: false,
			plates_per_side: [],
			plate_change: { remove: [], add: [], plates_per_side: [] }
		}
	]
};

const options = {
	id: '018f1f2a-0000-7000-8000-0000000000aa',
	startedAt: '2026-07-26T08:00:00.000Z',
	secondsPerSet: 90
};

/** The committed session other tests build inline, factored out for overrides. */
function fixture(overrides: Partial<CommitOptions> = {}): LocalSession {
	return commitSession(peeked, { ...options, ...overrides });
}

describe('commitSession', () => {
	it('materialises every prescribed set as pending', () => {
		const session = commitSession(peeked, options);

		expect(session.sets).toHaveLength(4);
		expect(session.sets.every((set) => set.status === 'pending')).toBe(true);
		expect(setsRemaining(session)).toBe(4);
		expect(setsDone(session)).toBe(0);
	});

	it('pre-fills the actual numbers with the prescription, so one tap logs it as written', () => {
		const session = commitSession(peeked, options);

		for (const set of session.sets) {
			expect(set.actualWeight).toBe(set.prescribedWeight);
			expect(set.actualReps).toBe(set.prescribedReps);
		}
	});

	it('keeps the plate breakdown the server computed rather than working one out', () => {
		const session = commitSession(peeked, options);

		expect(session.sets[0].platesPerSide).toEqual([25, 10, 3.75]);
		expect(session.sets[3].platesPerSide).toEqual([]);
	});

	it('stamps started_at and the id it was given, and nothing else', () => {
		const session = commitSession(peeked, options);

		expect(session.id).toBe(options.id);
		expect(session.startedAt).toBe(options.startedAt);
		expect(session.secondsPerSet).toBe(90);
		expect(session.enrollmentId).toBe(peeked.enrollment_id);
	});

	it('carries the cues so the logger can show them with no network', () => {
		expect(commitSession(peeked, options).cues).toEqual({
			squat: ['Bar on upper back', 'Brace core'],
			'hanging-leg-raise': ['squeeze']
		});
	});
});

/** A fixed stamp, so the timing assertions are about the rule and not the clock. */
const AT = '2026-07-26T08:05:00.000Z';

describe('logging', () => {
	it('logs a set as written without touching the prescription', () => {
		const session = logSet(commitSession(peeked, options), 0, AT);

		expect(session.sets[0].status).toBe('done');
		expect(session.sets[0].actualWeight).toBe(97.5);
		expect(session.sets[0].prescribedWeight).toBe(97.5);
		expect(setsRemaining(session)).toBe(3);
	});

	it('lets the athlete go heavier, and keeps both numbers', () => {
		const session = logSet(editSet(commitSession(peeked, options), 0, { weight: 110 }), 0, AT);

		expect(session.sets[0].prescribedWeight).toBe(97.5);
		expect(session.sets[0].actualWeight).toBe(110);
		expect(session.sets[0].status).toBe('done');
	});

	it('does not count a skipped set as remaining', () => {
		const session = skipSet(commitSession(peeked, options), 2, AT);

		expect(setsRemaining(session)).toBe(3);
		expect(setsDone(session)).toBe(0);
	});

	it('undoes back to the prescription', () => {
		const edited = logSet(editSet(commitSession(peeked, options), 1, { reps: 8 }), 1, AT);
		const session = resetSet(edited, 1);

		expect(session.sets[1].status).toBe('pending');
		expect(session.sets[1].actualReps).toBe(5);
	});

	it('stamps a log with the moment it was tapped', () => {
		const session = logSet(commitSession(peeked, options), 0, AT);

		expect(session.sets[0].loggedAt).toBe(AT);
		// Untouched sets carry nothing. A default of "now" here would put every
		// unperformed set into the breakdown at the moment of commit.
		expect(session.sets[1].loggedAt).toBeNull();
	});

	it('stamps a skip too, because the gap it spans belongs to the next lift', () => {
		const session = skipSet(commitSession(peeked, options), 1, AT);

		expect(session.sets[1].status).toBe('skipped');
		expect(session.sets[1].loggedAt).toBe(AT);
	});

	it('clears the stamp on undo', () => {
		const logged = logSet(commitSession(peeked, options), 0, AT);
		const session = resetSet(logged, 0);

		// A stamp surviving the undo would report an interval for work the
		// athlete has just said they did not do.
		expect(session.sets[0].loggedAt).toBeNull();
	});

	it('points at the first set nobody has answered', () => {
		const session = logSet(commitSession(peeked, options), 0, AT);

		expect(nextSetPosition(session)).toBe(1);
		expect(nextSetPosition(logSet(logSet(skipSet(session, 1, AT), 2, AT), 3, AT))).toBeNull();
	});
});

describe('toSubmission', () => {
	const ending = { endedAt: '2026-07-26T08:52:00.000Z', cutReason: null };

	it('is completed only when every set was done', () => {
		let session = commitSession(peeked, options);
		expect(isComplete(session)).toBe(false);

		session = logSet(logSet(logSet(logSet(session, 0, AT), 1, AT), 2, AT), 3, AT);
		expect(isComplete(session)).toBe(true);

		expect(toSubmission(session, ending).outcome).toBe('completed');
		expect(toSubmission(session, ending).cut_reason).toBeNull();
	});

	it('a session where everything was skipped is not a completed session', () => {
		const session = skipSet(
			skipSet(skipSet(skipSet(commitSession(peeked, options), 0, AT), 1, AT), 2, AT),
			3,
			AT
		);

		expect(isComplete(session)).toBe(false);
	});

	it('carries pending and skipped sets, because work not done is the data', () => {
		const session = skipSet(logSet(commitSession(peeked, options), 0, AT), 1, AT);

		const body = toSubmission(session, {
			endedAt: '2026-07-26T08:30:00.000Z',
			cutReason: 'out_of_time'
		});

		expect(body.outcome).toBe('cut_short');
		expect(body.cut_reason).toBe('out_of_time');
		expect(body.sets.map((set) => set.status)).toEqual(['done', 'skipped', 'pending', 'pending']);
		// The stamps travel with the sets, including on the skip. The pending
		// set has none, and null is what the server reads as "not measured".
		expect(body.sets.map((set) => set.logged_at)).toEqual([AT, AT, null, null]);
	});

	it('sends actual numbers only for the sets that were done', () => {
		const session = skipSet(logSet(commitSession(peeked, options), 0, AT), 1, AT);

		const body = toSubmission(session, {
			endedAt: '2026-07-26T08:30:00.000Z',
			cutReason: 'enough'
		});

		expect(body.sets[0].actual_weight).toBe(97.5);
		expect(body.sets[0].actual_reps).toBe(5);
		expect(body.sets[1].actual_weight).toBeNull();
		expect(body.sets[2].actual_reps).toBeNull();
	});

	it('sends the prescription for every set, done or not', () => {
		const body = toSubmission(commitSession(peeked, options), {
			endedAt: '2026-07-26T08:05:00.000Z',
			cutReason: 'pain'
		});

		expect(body.sets.map((set) => set.prescribed_weight)).toEqual([97.5, 97.5, 97.5, 0]);
		expect(body.sets.map((set) => set.prescribed_reps)).toEqual([5, 5, 5, 12]);
		expect(body.sets.map((set) => set.position)).toEqual([0, 1, 2, 3]);
	});

	it('carries the id and the timestamps the phone stamped', () => {
		const body = toSubmission(commitSession(peeked, options), ending);

		expect(body.id).toBe(options.id);
		expect(body.enrollment_id).toBe(peeked.enrollment_id);
		expect(body.started_at).toBe(options.startedAt);
		expect(body.ended_at).toBe(ending.endedAt);
	});

	it('sends no notes rather than an empty string', () => {
		const body = toSubmission(commitSession(peeked, options), { ...ending, notes: '' });

		expect(body.notes).toBeNull();
	});
});

describe('intervalBefore', () => {
	it('measures the first set from the commit, which is the lead-in', () => {
		let session = fixture({ startedAt: '2026-07-30T10:00:00.000Z' });
		session = logSet(session, 0, '2026-07-30T10:06:20.000Z');

		expect(intervalBefore(session, 0)).toBe(380);
	});

	it('measures a later set from the previous one that was answered', () => {
		let session = fixture({ startedAt: '2026-07-30T10:00:00.000Z' });
		session = logSet(session, 0, '2026-07-30T10:06:00.000Z');
		session = skipSet(session, 1, '2026-07-30T10:07:00.000Z');
		session = logSet(session, 2, '2026-07-30T10:10:00.000Z');

		// From the skip, not from the log before it: a skip is a tap at a moment
		// in time and the gap that spans it belongs to what came after.
		expect(intervalBefore(session, 2)).toBe(180);
	});

	it('is null for a set that has not been answered', () => {
		const session = fixture({ startedAt: '2026-07-30T10:00:00.000Z' });
		expect(intervalBefore(session, 0)).toBeNull();
	});

	it('is null when the gap is one the product does not believe', () => {
		let session = fixture({ startedAt: '2026-07-30T10:00:00.000Z' });
		session = logSet(session, 0, '2026-07-30T11:30:00.000Z');

		expect(intervalBefore(session, 0)).toBeNull();
	});
});

describe('plateChangeFor', () => {
	it('is the planned change for an untouched set', () => {
		const session = fixture();
		expect(plateChangeFor(session, 0)).toEqual(session.sets[0].plateChange);
	});

	it('is null once this set has been edited, because the plan is for another weight', () => {
		const session = editSet(fixture(), 0, { weight: 105 });
		expect(plateChangeFor(session, 0)).toBeNull();
	});

	// The plan assumes the previous set was loaded as written, so going heavier
	// on set one invalidates every later plan in that exercise, not just the
	// next one. Instructions for a bar that is not in front of you are worse
	// than no instructions.
	it('is null when an earlier set of the same exercise went heavier', () => {
		let session = fixture();
		session = editSet(session, 0, { weight: 105 });
		session = logSet(session, 0, '2026-07-30T10:06:00.000Z');

		expect(plateChangeFor(session, 1)).toBeNull();
		expect(plateChangeFor(session, 2)).toBeNull();
	});

	// A skipped set means the bar was never loaded to that weight, so the chain
	// is broken in exactly the same way.
	it('is null when an earlier set of the same exercise was skipped', () => {
		const session = skipSet(fixture(), 0, '2026-07-30T10:06:00.000Z');
		expect(plateChangeFor(session, 1)).toBeNull();
	});

	it('is unaffected by what happened in a different exercise', () => {
		// The fixture's sets 0-2 are one exercise and 3+ are another; the bar
		// resets between them, so a mess in the first cannot stale the second.
		let session = fixture();
		session = editSet(session, 0, { weight: 105 });
		session = logSet(session, 0, '2026-07-30T10:06:00.000Z');

		expect(plateChangeFor(session, 3)).toEqual(session.sets[3].plateChange);
	});

	it('is null for a set with no plan, such as a dumbbell', () => {
		const session = fixture();
		session.sets[0].plateChange = null;
		expect(plateChangeFor(session, 0)).toBeNull();
	});
});

describe('noteSet', () => {
	it('records what the athlete wrote', () => {
		const session = noteSet(fixture(), 0, 'left shoulder felt off');
		expect(session.sets[0].note).toBe('left shoulder felt off');
	});

	it('clears back to null rather than storing blank', () => {
		let session = noteSet(fixture(), 0, 'left shoulder felt off');
		session = noteSet(session, 0, '   ');
		expect(session.sets[0].note).toBeNull();
	});

	// Undoing a log takes back the numbers, not the sentence the athlete wrote
	// about their shoulder.
	it('survives an undo', () => {
		let session = noteSet(fixture(), 0, 'left shoulder felt off');
		session = logSet(session, 0, '2026-07-30T10:06:00.000Z');
		session = resetSet(session, 0);

		expect(session.sets[0].note).toBe('left shoulder felt off');
		expect(session.sets[0].status).toBe('pending');
	});

	it('travels with the submission', () => {
		const session = noteSet(fixture(), 0, 'left shoulder felt off');
		const body = toSubmission(session, { endedAt: '2026-07-30T11:00:00.000Z', cutReason: null });

		expect(body.sets[0].note).toBe('left shoulder felt off');
		expect(body.sets[1].note).toBeNull();
	});
});

describe('summarise', () => {
	it('counts the session as it was left', () => {
		let session = fixture({ startedAt: '2026-07-30T10:00:00.000Z' });
		session = logSet(session, 0, '2026-07-30T10:06:00.000Z');
		session = logSet(session, 1, '2026-07-30T10:10:00.000Z');
		session = skipSet(session, 2, '2026-07-30T10:12:00.000Z');

		const summary = summarise(session, {
			endedAt: '2026-07-30T10:52:00.000Z',
			cutReason: 'out_of_time'
		});

		expect(summary.durationSeconds).toBe(3120);
		expect(summary.done).toBe(2);
		expect(summary.skipped).toBe(1);
		expect(summary.pending).toBe(session.sets.length - 3);
		expect(summary.total).toBe(session.sets.length);
		expect(summary.cutReason).toBe('out_of_time');
	});
});

const committed = fixture();

/**
 * Squat's main sets (positions 0-1, 90 kg) followed by BBB backoff sets
 * (positions 2-3, 50 kg) under the same `exercise` key — the shape a delta
 * carry has to respect and a flat-weight carry would wreck by pre-filling
 * the backoff sets at the main lift's number.
 */
const peekedWithBackoff: NextSession = {
	enrollment_id: '018f1f2a-0000-7000-8000-000000000002',
	program_key: 'wendler-531-bbb',
	week: 1,
	day: 4,
	focus: 'squat',
	progress: { completed: 0, total: null },
	pace: {
		can_project: false,
		median_seconds_per_set: null,
		projected_seconds: null,
		sample_size: 0
	},
	blocks: [
		{
			exercise: 'squat',
			label: 'Squat',
			cues: [],
			is_primary: true,
			lifts: [
				{ sets: 2, reps: 5, amrap: false, weight: 90, plates_per_side: [] },
				{ sets: 2, reps: 10, amrap: false, weight: 50, plates_per_side: [] }
			]
		}
	],
	prescribed_sets: [
		{
			position: 0,
			exercise: 'squat',
			label: 'Squat',
			prescribed_weight: 90,
			prescribed_reps: 5,
			amrap: false,
			plates_per_side: [],
			plate_change: null
		},
		{
			position: 1,
			exercise: 'squat',
			label: 'Squat',
			prescribed_weight: 90,
			prescribed_reps: 5,
			amrap: false,
			plates_per_side: [],
			plate_change: null
		},
		{
			position: 2,
			exercise: 'squat',
			label: 'Squat (BBB)',
			prescribed_weight: 50,
			prescribed_reps: 10,
			amrap: false,
			plates_per_side: [],
			plate_change: null
		},
		{
			position: 3,
			exercise: 'squat',
			label: 'Squat (BBB)',
			prescribed_weight: 50,
			prescribed_reps: 10,
			amrap: false,
			plates_per_side: [],
			plate_change: null
		}
	]
};

function bbbFixture(): LocalSession {
	return commitSession(peekedWithBackoff, options);
}

describe('a weight edit carries through the exercise', () => {
	it('rewrites every later pending set of the same exercise', () => {
		const edited = editSet(committed, 0, { weight: 100 });

		expect(edited.sets[0].actualWeight).toBe(100);
		expect(edited.sets[1].actualWeight).toBe(100);
		expect(edited.sets[2].actualWeight).toBe(100);
	});

	it('stops at the next exercise, which is a different bar', () => {
		const edited = editSet(committed, 0, { weight: 100 });

		// Position 3 is the hanging leg raise.
		expect(edited.sets[3].actualWeight).toBe(committed.sets[3].actualWeight);
	});

	it('leaves a set that has already been answered alone', () => {
		const logged = logSet(committed, 1, '2026-08-05T10:05:00Z');
		const edited = editSet(logged, 0, { weight: 100 });

		expect(edited.sets[1].actualWeight).toBe(97.5);
		expect(edited.sets[2].actualWeight).toBe(100);
	});

	it('never touches the prescription, because drift is measured against it', () => {
		const edited = editSet(committed, 0, { weight: 100 });

		expect(edited.sets.map((set) => set.prescribedWeight)).toEqual(
			committed.sets.map((set) => set.prescribedWeight)
		);
	});

	it('does not carry a rep edit, which is about one set', () => {
		const edited = editSet(committed, 0, { reps: 3 });

		expect(edited.sets[0].actualReps).toBe(3);
		expect(edited.sets[1].actualReps).toBe(5);
	});

	it('re-propagates on a second edit, last edit winning', () => {
		const once = editSet(committed, 0, { weight: 100 });
		const tweaked = editSet(once, 2, { weight: 102.5 });
		const again = editSet(tweaked, 0, { weight: 105 });

		expect(again.sets[2].actualWeight).toBe(105);
	});

	it('still changes its own weight when the addressed set has already been logged', () => {
		const logged = logSet(committed, 0, '2026-08-05T10:05:00Z');
		const edited = editSet(logged, 0, { weight: 100 });

		expect(edited.sets[0].actualWeight).toBe(100);
	});

	it('does not carry from an addressed set that has already been logged', () => {
		const logged = logSet(committed, 0, '2026-08-05T10:05:00Z');
		const edited = editSet(logged, 0, { weight: 100 });

		expect(edited.sets[1].actualWeight).toBe(97.5);
		expect(edited.sets[2].actualWeight).toBe(97.5);
	});
});

describe('a weight edit carries the difference, not the weight', () => {
	it("applies the delta to each carried set's own prescription, never the edited weight", () => {
		const session = bbbFixture();
		const edited = editSet(session, 0, { weight: 95 });

		// +5 on a 90 kg main set: the other main set gets 90 + 5, and both
		// backoff sets get their own 50 + 5 — never the main lift's 95.
		expect(edited.sets[1].actualWeight).toBe(95);
		expect(edited.sets[2].actualWeight).toBe(55);
		expect(edited.sets[3].actualWeight).toBe(55);
	});

	it('returns every carried set to exactly its own prescription once the delta is zero', () => {
		const session = bbbFixture();
		const edited = editSet(session, 0, { weight: 95 });
		const back = editSet(edited, 0, { weight: 90 });

		expect(back.sets[1].actualWeight).toBe(90);
		expect(back.sets[2].actualWeight).toBe(50);
		expect(back.sets[3].actualWeight).toBe(50);
	});

	it('clamps a carried weight at zero rather than going negative', () => {
		const session = bbbFixture();
		const edited = editSet(session, 0, { weight: 0 });

		// Delta is -90; the backoff sets' own 50 kg would otherwise land at -40.
		expect(edited.sets[2].actualWeight).toBe(0);
		expect(edited.sets[3].actualWeight).toBe(0);
	});
});

describe('the reason for a drift', () => {
	it('carries with the weight it is about', () => {
		const edited = editSet(committed, 0, { weight: 100 });
		const reasoned = setDriftReason(edited, 0, 'too_easy');

		expect(reasoned.sets[1].driftReason).toBe('too_easy');
		expect(reasoned.sets[3].driftReason).toBeNull();
	});

	it('clears when the weight goes back to the prescription', () => {
		const reasoned = setDriftReason(editSet(committed, 0, { weight: 100 }), 0, 'too_easy');
		const back = editSet(reasoned, 0, { weight: 97.5 });

		expect(back.sets[0].driftReason).toBeNull();
		expect(back.sets[1].driftReason).toBeNull();
	});

	it('clears on undo and on skip', () => {
		const reasoned = setDriftReason(editSet(committed, 0, { weight: 100 }), 0, 'too_easy');

		expect(resetSet(reasoned, 0).sets[0].driftReason).toBeNull();
		expect(skipSet(reasoned, 1, '2026-08-05T10:05:00Z').sets[1].driftReason).toBeNull();
	});

	it('is sent only for a set that was done', () => {
		const reasoned = setDriftReason(editSet(committed, 0, { weight: 100 }), 0, 'too_easy');
		const logged = logSet(reasoned, 0, '2026-08-05T10:05:00Z');
		const body = toSubmission(logged, { endedAt: '2026-08-05T11:00:00Z', cutReason: 'enough' });

		expect(body.sets[0].drift_reason).toBe('too_easy');
		// Position 1 carries the reason locally but was never reached. Sending
		// it would arrive with a null actual_weight, the check constraint would
		// refuse it, and the whole session would be lost over a chip.
		expect(body.sets[1].drift_reason).toBeNull();
	});

	it('does not attach to a set that has not deviated from its own prescription', () => {
		const reasoned = setDriftReason(committed, 0, 'too_easy');

		expect(reasoned.sets[0].driftReason).toBeNull();
	});

	it('submits null for a set logged at its own prescription, even after being asked for a reason', () => {
		const reasoned = setDriftReason(committed, 0, 'too_easy');
		const logged = logSet(reasoned, 0, '2026-08-05T10:05:00Z');
		const body = toSubmission(logged, { endedAt: '2026-08-05T11:00:00Z', cutReason: 'enough' });

		expect(body.sets[0].drift_reason).toBeNull();
	});
});

describe('barUnchangedFrom', () => {
	it('is true when the previous answered set of the exercise is the same weight', () => {
		const edited = editSet(committed, 0, { weight: 100 });
		const logged = logSet(edited, 0, '2026-08-05T10:05:00Z');

		expect(barUnchangedFrom(logged, 1)).toBe(true);
	});

	it('is false at the first set of an exercise, which has no predecessor', () => {
		expect(barUnchangedFrom(editSet(committed, 0, { weight: 100 }), 0)).toBe(false);
	});

	it('is false for an exercise that is not loaded with plates', () => {
		// Position 3 is the hanging leg raise: no plate change, so "the bar is
		// already loaded" would be a statement about a bar that is not there.
		const logged = logSet(committed, 3, '2026-08-05T10:30:00Z');
		expect(barUnchangedFrom(logged, 3)).toBe(false);
	});

	it('is false when the previous set at the same weight was skipped rather than lifted', () => {
		// A skip leaves `actualWeight` at whatever was pre-filled — untouched,
		// not a record of what the bar holds. Position 0 skipped at its own
		// prescription (97.5) must not tell position 1, sitting at the same
		// 97.5, that the bar is already loaded: nobody touched it.
		const skipped = skipSet(committed, 0, '2026-08-05T10:05:00Z');
		expect(barUnchangedFrom(skipped, 1)).toBe(false);
	});
});

describe('numberFromText', () => {
	it('reads a comma and a period as the same decimal separator', () => {
		// The comma path used to answer `NaN` and therefore `undefined`, which
		// the logger reads as "no edit" — so the number was accepted by the
		// field, discarded by the state, and the previous weight was logged
		// instead. On a Danish keyboard that is a live risk (D-07).
		expect(numberFromText('142,5')).toBe(142.5);
		expect(numberFromText('142.5')).toBe(142.5);
		expect(numberFromText('142,555556')).toBe(numberFromText('142.555556'));
	});

	it('is undefined for an empty or all-whitespace field, which is not a typed zero', () => {
		// `Number('')` is `0`, finite and indistinguishable from a zero the
		// athlete meant. Clearing the field to retype would otherwise carry a
		// 0 kg to every later pending set of the exercise.
		expect(numberFromText('')).toBeUndefined();
		expect(numberFromText('   ')).toBeUndefined();
	});

	it('is undefined for junk, including a string with two separators', () => {
		expect(numberFromText('abc')).toBeUndefined();
		expect(numberFromText('142,5,5')).toBeUndefined();
		expect(numberFromText('-')).toBeUndefined();
	});

	it('still reads a plain integer and a zero the athlete actually typed', () => {
		expect(numberFromText('100')).toBe(100);
		expect(numberFromText('0')).toBe(0);
	});

	it('is undefined for a trailing separator, which is half a typed number', () => {
		// `Number('142.')` is `142`. Reporting that as an edit would move the
		// state, and the controlled `value` binding would write `142` back into
		// the field and eat the point before the athlete typed the digit after
		// it. The field is `type="text"`, so this function sees the half-typed
		// state that a number input used to hide — and has to recognise it.
		expect(numberFromText('142.')).toBeUndefined();
		expect(numberFromText('142,')).toBeUndefined();
		expect(numberFromText('.')).toBeUndefined();
	});

	it('reads the number once the digit after the separator arrives', () => {
		// The other half of the keystroke sequence above: `142.` is refused,
		// `142.5` is not, so the point survives long enough to be used.
		expect(numberFromText('142.5')).toBe(142.5);
		expect(numberFromText('142,5')).toBe(142.5);
	});
});

describe('snap', () => {
	it('rounds to the nearest half kilo, halves going up', () => {
		expect(snap(142.555556)).toBe(142.5);
		expect(snap(97.6)).toBe(97.5);
		expect(snap(0.25)).toBe(0.5);
		expect(snap(0.75)).toBe(1);
		expect(snap(102.3)).toBe(102.5);
	});

	it('leaves a multiple of half a kilo exactly where it is', () => {
		for (const kg of [0.5, 2.5, 20, 97.5, 100, 142.5, 227.5]) {
			expect(snap(kg)).toBe(kg);
		}
	});

	it('handles zero, which is what bodyweight work is prescribed at', () => {
		expect(snap(0)).toBe(0);
	});

	/**
	 * The claim the D-11 exception rests on: snapping cannot disturb a weight
	 * the program is able to prescribe. Every loading mode in the catalogue
	 * resolves to a multiple of 0.5 — the barbell at 2.5
	 * (`loading.rs`, `BARBELL_RESOLUTION`, on top of a 20 kg bar), the dumbbell
	 * rack at 2.0 (`exercise.rs`, `RACK`), bodyweight at 0 — so no correct
	 * number is ever changed behind the athlete's back. If a future loading
	 * mode breaks that, this test is where it surfaces.
	 */
	it('leaves every weight the catalogue can prescribe unchanged', () => {
		for (let i = 0; i <= 120; i++) {
			const barbell = 20 + 2.5 * i;
			expect(snap(barbell)).toBe(barbell);

			const dumbbell = 2 * i;
			expect(snap(dumbbell)).toBe(dumbbell);
		}

		// And the ones the fixtures actually carry, end to end.
		for (const set of fixture().sets) {
			expect(snap(set.prescribedWeight)).toBe(set.prescribedWeight);
		}
		for (const set of bbbFixture().sets) {
			expect(snap(set.prescribedWeight)).toBe(set.prescribedWeight);
		}
	});
});

describe('logging snaps the weight where it cannot be bypassed', () => {
	it('rounds a six-decimal weight to the nearest half kilo as the set is logged', () => {
		// `change` on the field snaps too, but `change` only fires when the
		// field is left, and one tap on Log without blurring is the normal way
		// this screen is used.
		const edited = editSet(committed, 0, { weight: 142.555556 });
		const logged = logSet(edited, 0, AT);

		expect(logged.sets[0].actualWeight).toBe(142.5);
	});

	it('leaves a weight already on a half kilo alone', () => {
		const logged = logSet(editSet(committed, 0, { weight: 110 }), 0, AT);
		expect(logged.sets[0].actualWeight).toBe(110);
	});

	it('drops the drift reason when snapping lands back on the prescription', () => {
		// 97.6 shows the chips, 97.5 is the prescription. A reason travelling
		// on a set the submission reports as sitting at its own prescription is
		// what the server's check constraint refuses — and it would take the
		// whole session down over a chip.
		const reasoned = setDriftReason(editSet(committed, 0, { weight: 97.6 }), 0, 'too_heavy');
		const logged = logSet(reasoned, 0, AT);

		expect(logged.sets[0].actualWeight).toBe(97.5);
		expect(logged.sets[0].driftReason).toBeNull();
	});

	it('keeps the drift reason when the snapped weight is still a deviation', () => {
		const reasoned = setDriftReason(editSet(committed, 0, { weight: 110.2 }), 0, 'too_easy');
		const logged = logSet(reasoned, 0, AT);

		expect(logged.sets[0].actualWeight).toBe(110);
		expect(logged.sets[0].driftReason).toBe('too_easy');
	});

	it('does not touch the carried weights of sets that have not been logged yet', () => {
		// Snapping is what the *record* gets. A pending set still holds whatever
		// the carry made it until it is logged in its own right.
		const edited = editSet(committed, 0, { weight: 142.555556 });
		const logged = logSet(edited, 0, AT);

		// Carried through the delta, so it is the same number give or take the
		// last bit of a double — and still not a weight anybody can load.
		expect(logged.sets[1].actualWeight).toBeCloseTo(142.555556, 6);
		expect(logSet(logged, 1, AT).sets[1].actualWeight).toBe(142.5);
	});

	it('never touches the prescription, which is still what drift is measured against', () => {
		const logged = logSet(editSet(committed, 0, { weight: 142.555556 }), 0, AT);
		expect(logged.sets[0].prescribedWeight).toBe(97.5);
	});
});
