import { describe, expect, it } from 'vitest';

import {
	commitSession,
	editSet,
	isComplete,
	logSet,
	nextSetPosition,
	resetSet,
	setsDone,
	setsRemaining,
	skipSet,
	toSubmission
} from './session';
import type { NextSession } from './session';

/** Two squat sets and one bodyweight set, as the API would send them. */
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
			lifts: [{ sets: 2, reps: 5, amrap: false, weight: 97.5, plates_per_side: [25, 10, 3.75] }]
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
			plates_per_side: [25, 10, 3.75]
		},
		{
			position: 1,
			exercise: 'squat',
			label: 'Squat',
			prescribed_weight: 97.5,
			prescribed_reps: 5,
			amrap: false,
			plates_per_side: [25, 10, 3.75]
		},
		{
			position: 2,
			exercise: 'hanging-leg-raise',
			label: 'Hanging leg raise',
			prescribed_weight: 0,
			prescribed_reps: 12,
			amrap: false,
			plates_per_side: []
		}
	]
};

const options = {
	id: '018f1f2a-0000-7000-8000-0000000000aa',
	startedAt: '2026-07-26T08:00:00.000Z',
	secondsPerSet: 90
};

describe('commitSession', () => {
	it('materialises every prescribed set as pending', () => {
		const session = commitSession(peeked, options);

		expect(session.sets).toHaveLength(3);
		expect(session.sets.every((set) => set.status === 'pending')).toBe(true);
		expect(setsRemaining(session)).toBe(3);
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
		expect(session.sets[2].platesPerSide).toEqual([]);
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
		expect(setsRemaining(session)).toBe(2);
	});

	it('lets the athlete go heavier, and keeps both numbers', () => {
		const session = logSet(editSet(commitSession(peeked, options), 0, { weight: 110 }), 0, AT);

		expect(session.sets[0].prescribedWeight).toBe(97.5);
		expect(session.sets[0].actualWeight).toBe(110);
		expect(session.sets[0].status).toBe('done');
	});

	it('does not count a skipped set as remaining', () => {
		const session = skipSet(commitSession(peeked, options), 2, AT);

		expect(setsRemaining(session)).toBe(2);
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
		expect(nextSetPosition(logSet(skipSet(session, 1, AT), 2, AT))).toBeNull();
	});
});

describe('toSubmission', () => {
	const ending = { endedAt: '2026-07-26T08:52:00.000Z', cutReason: null };

	it('is completed only when every set was done', () => {
		let session = commitSession(peeked, options);
		expect(isComplete(session)).toBe(false);

		session = logSet(logSet(logSet(session, 0, AT), 1, AT), 2, AT);
		expect(isComplete(session)).toBe(true);

		expect(toSubmission(session, ending).outcome).toBe('completed');
		expect(toSubmission(session, ending).cut_reason).toBeNull();
	});

	it('a session where everything was skipped is not a completed session', () => {
		const session = skipSet(skipSet(skipSet(commitSession(peeked, options), 0, AT), 1, AT), 2, AT);

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
		expect(body.sets.map((set) => set.status)).toEqual(['done', 'skipped', 'pending']);
		// The stamps travel with the sets, including on the skip. The pending
		// set has none, and null is what the server reads as "not measured".
		expect(body.sets.map((set) => set.logged_at)).toEqual([AT, AT, null]);
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

		expect(body.sets.map((set) => set.prescribed_weight)).toEqual([97.5, 97.5, 0]);
		expect(body.sets.map((set) => set.prescribed_reps)).toEqual([5, 5, 12]);
		expect(body.sets.map((set) => set.position)).toEqual([0, 1, 2]);
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
