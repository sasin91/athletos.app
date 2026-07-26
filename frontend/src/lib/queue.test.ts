import { describe, expect, it } from 'vitest';

import { classifyStatus, enqueued, flushQueue } from './queue';
import type { QueuedWorkout, QueueStore, SendOutcome } from './queue';
import type { WorkoutSubmission } from './session';

function submission(id: string): WorkoutSubmission {
	return {
		id,
		enrollment_id: '00000000-0000-7000-8000-000000000001',
		started_at: '2026-07-26T08:00:00Z',
		ended_at: '2026-07-26T08:55:00Z',
		outcome: 'completed',
		cut_reason: null,
		notes: null,
		sets: []
	};
}

/** The store, without IndexedDB. Insertion order is not relied upon. */
function memoryStore(
	items: QueuedWorkout[] = []
): QueueStore & { items: Map<string, QueuedWorkout> } {
	const map = new Map(items.map((item) => [item.id, item]));

	return {
		items: map,
		all: async () => [...map.values()],
		put: async (item) => void map.set(item.id, item),
		remove: async (id) => void map.delete(id)
	};
}

describe('classifyStatus', () => {
	it('treats a duplicate as success, because that is what it is', () => {
		expect(classifyStatus(201, null)).toEqual({ kind: 'accepted', duplicate: false });
		expect(classifyStatus(200, null)).toEqual({ kind: 'accepted', duplicate: true });
	});

	it('retries what waiting can fix', () => {
		for (const status of [401, 408, 429, 500, 502, 503]) {
			expect(classifyStatus(status, null).kind, `${status}`).toBe('retry');
		}
	});

	it('gives up on what waiting cannot fix', () => {
		for (const status of [400, 404, 409, 413, 422]) {
			expect(classifyStatus(status, null).kind, `${status}`).toBe('rejected');
		}
	});

	it('keeps the wording the API sent, when it sent one', () => {
		expect(classifyStatus(422, 'a session that was cut short must say why')).toEqual({
			kind: 'rejected',
			reason: 'a session that was cut short must say why'
		});
	});
});

describe('flushQueue', () => {
	it('sends the oldest session first', async () => {
		const store = memoryStore([
			{ ...enqueued(submission('later'), '2026-07-26T10:00:00Z') },
			{ ...enqueued(submission('earlier'), '2026-07-25T10:00:00Z') }
		]);

		const sent: string[] = [];
		await flushQueue(store, async (body) => {
			sent.push(body.id);
			return { kind: 'accepted', duplicate: false };
		});

		expect(sent).toEqual(['earlier', 'later']);
	});

	it('drops what landed and keeps what did not', async () => {
		const store = memoryStore([
			enqueued(submission('landed'), '2026-07-25T10:00:00Z'),
			enqueued(submission('offline'), '2026-07-26T10:00:00Z')
		]);

		const report = await flushQueue(store, async (body) =>
			body.id === 'landed'
				? { kind: 'accepted', duplicate: false }
				: { kind: 'retry', reason: 'no signal' }
		);

		expect(report.accepted).toEqual(['landed']);
		expect(report.retrying).toEqual(['offline']);
		expect([...store.items.keys()]).toEqual(['offline']);
		expect(store.items.get('offline')?.attempts).toBe(1);
		expect(store.items.get('offline')?.lastError).toBe('no signal');
		expect(store.items.get('offline')?.state).toBe('queued');
	});

	it('drops a duplicate as readily as a fresh accept — the retry is the point', async () => {
		const store = memoryStore([enqueued(submission('sent-twice'), '2026-07-26T10:00:00Z')]);

		const report = await flushQueue(store, async () => ({ kind: 'accepted', duplicate: true }));

		expect(report.duplicate).toEqual(['sent-twice']);
		expect(store.items.size).toBe(0);
	});

	it('stops retrying what the server will never take, but does not throw it away', async () => {
		const store = memoryStore([enqueued(submission('refused'), '2026-07-26T10:00:00Z')]);

		const report = await flushQueue(store, async () => ({
			kind: 'rejected',
			reason: 'no such enrolment'
		}));

		expect(report.rejected).toEqual(['refused']);
		expect(store.items.get('refused')?.state).toBe('rejected');
		expect(store.items.get('refused')?.lastError).toBe('no such enrolment');
	});

	it('leaves a rejected submission alone on the next launch', async () => {
		const store = memoryStore([
			{ ...enqueued(submission('refused'), '2026-07-26T10:00:00Z'), state: 'rejected' }
		]);

		let attempts = 0;
		const report = await flushQueue(store, async () => {
			attempts += 1;
			return { kind: 'accepted', duplicate: false } satisfies SendOutcome;
		});

		expect(attempts).toBe(0);
		expect(report).toEqual({ accepted: [], duplicate: [], retrying: [], rejected: [] });
	});

	it('counts attempts across launches rather than resetting them', async () => {
		const store = memoryStore([
			{ ...enqueued(submission('stubborn'), '2026-07-26T10:00:00Z'), attempts: 4 }
		]);

		await flushQueue(store, async () => ({ kind: 'retry', reason: 'still offline' }));

		expect(store.items.get('stubborn')?.attempts).toBe(5);
	});
});
