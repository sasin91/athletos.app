import { describe, expect, it } from 'vitest';
import {
	addExercise,
	addPendingSet,
	commitEditableSession,
	editPendingPrescription,
	movePendingBlock,
	movePendingSet,
	removePendingBlock,
	removePendingSet,
	startEditableSession,
	toEditableSubmission
} from './editable-session';
import type { EditableSession } from './editable-session';
import {
	intervalBefore,
	isComplete,
	logSet,
	nextSetPosition,
	setsRemaining,
	summarise
} from './session';

const doc: EditableSession = {
	schema_version: 2,
	athlete_id: 'athlete',
	title: 'Workout',
	source: 'program',
	draft_id: 'draft',
	enrollment_id: 'enrollment',
	exercises: [
		{ key: 'squat', label: 'Squat', cues: [], loading: 'barbell', is_primary: true },
		{ key: 'chin_up', label: 'Chin-up', cues: [], loading: 'bodyweight', is_primary: false }
	],
	sets: [0, 1, 2].map((position) => ({
		id: `set-${position}`,
		block_id: 'block',
		exercise: 'squat',
		label: 'Squat',
		prescribed_weight: 100,
		prescribed_reps: 5,
		amrap: false,
		plates_per_side: [20, 20],
		plate_change: { remove: [], add: position === 0 ? [20, 20] : [], plates_per_side: [20, 20] }
	}))
};
const prepared = () => commitEditableSession(doc, { id: 'workout', startedAt: '' });
const started = () => startEditableSession(prepared(), '2026-09-07T10:00:00Z');
const ending = { endedAt: '2026-09-07T11:00:00Z', cutReason: null };

describe('editable sessions', () => {
	it('retains server plate stacks and transitions while the prescription is unedited', () => {
		expect(started().sets[0]).toMatchObject({
			platesPerSide: [20, 20],
			plateChange: { remove: [], add: [20, 20], plates_per_side: [20, 20] }
		});
	});
	it('records two-decimal custom loads without legacy half-kilo snapping', () => {
		const session = editPendingPrescription(started(), 'set-0', { weight: 20.25 });
		expect(logSet(session, 0, '2026-09-07T10:02:00Z').sets[0].actualWeight).toBe(20.25);
	});
	it('freezes targets at Start, while retaining authoritative origins through later target edits', () => {
		let session = editPendingPrescription(prepared(), 'set-0', { weight: 90 });
		expect(session.startedAt).toBe('');
		session = startEditableSession(session, '2026-09-07T10:00:00Z');
		session = editPendingPrescription(session, 'set-0', { weight: 80 });
		const set = toEditableSubmission(session, ending).sets[0];
		expect(set).toMatchObject({ origin_id: 'set-0', committed_weight: 90, prescribed_weight: 80 });
		expect(doc.sets[0].prescribed_weight).toBe(100);
	});
	it('reorders pending sets without retargeting legacy clips or stable IDs', () => {
		let session = movePendingSet(started(), 'set-1', -1);
		expect(session.sets[0]).toMatchObject({ id: 'set-1', position: 1 });
		expect(nextSetPosition(session)).toBe(1);
		session = logSet(session, 1, '2026-09-07T10:02:00Z');
		expect(session.sets[0].status).toBe('done');
		expect(toEditableSubmission(session, ending).sets[0]).toMatchObject({
			id: 'set-1',
			position: 0
		});
	});
	it('removal has no fabricated tap and preserves answered work', () => {
		let session = logSet(started(), 0, '2026-09-07T10:01:00Z');
		session = removePendingBlock(session, 'block');
		expect(session.sets[0].status).toBe('done');
		expect(session.sets[1]).toMatchObject({
			originId: 'set-1',
			removed: true,
			status: 'skipped',
			loggedAt: null
		});
		expect(setsRemaining(session)).toBe(0);
		expect(isComplete(session)).toBe(true);
		expect(summarise(session, ending)).toMatchObject({ done: 1, skipped: 0, removed: 2, total: 1 });
	});
	it('does not reuse removed added-set identities or legacy clip positions', () => {
		let session = addPendingSet(started(), 'block');
		const added = session.sets.at(-1)!;
		expect(added.originId).toBeNull();
		session = removePendingSet(session, added.id!);
		session = addPendingSet(session, 'block');
		const newSet = session.sets.find((set) => !set.removed && set.originId === null)!;
		expect(newSet.position).toBeGreaterThan(added.position);
		expect(newSet.id).not.toBe(added.id);
	});
	it('adding after a logged set clears its answer timestamp and sequence', () => {
		const logged = logSet(started(), 2, '2026-09-07T10:01:00Z');
		const added = addPendingSet(logged, 'block').sets.at(-1)!;
		expect(added).toMatchObject({ status: 'pending', loggedAt: null, loggedOrder: null });
	});
	it('separates repeated blocks and excludes additions from baseline provenance', () => {
		let session = addExercise(started(), 'squat');
		const added = session.sets.at(-1)!;
		expect(added.blockId).not.toBe('block');
		session = movePendingBlock(session, added.blockId!, -1);
		expect(session.sets[0].id).toBe(added.id);
		expect(toEditableSubmission(session, ending).sets[0].origin_id).toBeNull();
	});
	it('invalidates all plate guidance after structural or prescription changes', () => {
		const session = editPendingPrescription(started(), 'set-0', { weight: 90 });
		expect(
			session.sets.every((set) => set.plateChange === null && set.platesPerSide.length === 0)
		).toBe(true);
	});
	it('measures intervals by tap sequence after reordering, and preserves backwards-clock detection', () => {
		let session = movePendingSet(started(), 'set-1', -1);
		session = logSet(session, 1, '2026-09-07T10:02:00Z');
		session = logSet(session, 0, '2026-09-07T10:03:00Z');
		expect(intervalBefore(session, 0)).toBe(60);
		session = logSet(session, 2, '2026-09-07T10:01:00Z');
		expect(intervalBefore(session, 2)).toBeNull();
		expect(toEditableSubmission(session, ending).sets.map((set) => set.logged_order)).toEqual([
			0, 1, 2
		]);
	});
	it('bounds removed plus visible rows and validates loading inputs', () => {
		let session = addExercise(started(), 'chin_up');
		expect(() =>
			editPendingPrescription(session, session.sets.at(-1)!.id!, { weight: 10 })
		).toThrow('Bodyweight');
		expect(() => editPendingPrescription(session, 'set-0', { weight: NaN })).toThrow('Weight');
		expect(() => editPendingPrescription(session, 'set-0', { weight: 1001 })).toThrow('1000');
		expect(() => editPendingPrescription(session, 'set-0', { weight: 20.125 })).toThrow('decimal');
		expect(() => editPendingPrescription(session, 'set-0', { reps: 1.5 })).toThrow('Reps');
		session = { ...session, sets: Array.from({ length: 500 }, () => session.sets[0]) };
		expect(() => addPendingSet(session, 'block')).toThrow('500');
	});
});
