/**
 * IndexedDB: the committed session and the submit queue (D-09).
 *
 * Deliberately thin. Every rule about what to store, when to retry and what a
 * refusal means lives in `session.ts` and `queue.ts`, which are pure and tested;
 * this file is the part that cannot be tested without a browser, so there is as
 * little of it as possible.
 *
 * Stores:
 *
 * * `active` — one prepared or started session per athlete. The original
 *   `current` key is retained until its enrollment ownership is verified.
 * * `queue` — submissions waiting to land, keyed by workout id.
 * * `meta` — last verified athlete and an optional recoverable workout draft.
 *
 * `localStorage` would have been simpler and is the wrong tool: it is
 * synchronous on the main thread, and a session's worth of sets is written back
 * on every single tap.
 */

import type { QueuedWorkout, QueueStore } from './queue';
import type { LocalSession } from './session';
import type { WorkoutContent } from './workout-definition';

const DATABASE = 'athletos';
const VERSION = 2;
const ACTIVE = 'active';
const QUEUE = 'queue';
const ACTIVE_KEY = 'current';
const META = 'meta';
let activeAthlete: string | null = null;

export async function setActiveAthlete(id: string, enrollmentIds: string[] = []): Promise<void> {
	const db = await open();
	try {
		await new Promise<void>((resolve, reject) => {
			const transaction = db.transaction([META, ACTIVE, QUEUE], 'readwrite');
			transaction.objectStore(META).put(id, 'athlete');
			const active = transaction.objectStore(ACTIVE);
			const legacyRequest = active.get(ACTIVE_KEY);
			legacyRequest.onsuccess = () => {
				const legacy = legacyRequest.result as LocalSession | undefined;
				if (!legacy || legacy.athleteId || !enrollmentIds.includes(legacy.enrollmentId)) return;
				const scoped = active.get(id);
				scoped.onsuccess = () => {
					// Never overwrite another session if two tabs race during migration.
					if (scoped.result && scoped.result.id !== legacy.id) return;
					active.put({ ...legacy, athleteId: id, schemaVersion: 1 }, id);
					active.delete(ACTIVE_KEY);
				};
			};
			const queue = transaction.objectStore(QUEUE);
			const cursor = queue.openCursor();
			cursor.onsuccess = () => {
				const entry = cursor.result;
				if (!entry) return;
				const item = entry.value as QueuedWorkout;
				if (
					!item.athleteId &&
					'enrollment_id' in item.submission &&
					enrollmentIds.includes(item.submission.enrollment_id)
				)
					entry.update({ ...item, athleteId: id, schemaVersion: 1 });
				entry.continue();
			};
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () => reject(transaction.error);
		});
		activeAthlete = id;
	} finally {
		db.close();
	}
}

export async function getActiveAthlete(): Promise<string | null> {
	return (
		activeAthlete ??
		(await run<string | undefined>(META, 'readonly', (store) => store.get('athlete'))) ??
		null
	);
}

export async function saveWorkoutDraft(draft: WorkoutContent, athleteId?: string): Promise<void> {
	const athlete = athleteId ?? (await getActiveAthlete());
	if (!athlete) throw new Error('Sign in before saving a workout.');
	await run(META, 'readwrite', (store) =>
		store.put(JSON.parse(JSON.stringify(draft)), `workout-draft:${athlete}`)
	);
}
export async function loadWorkoutDraft(): Promise<WorkoutContent | null> {
	const athlete = await getActiveAthlete();
	if (!athlete) return null;
	return (
		(await run<WorkoutContent | undefined>(META, 'readonly', (store) =>
			store.get(`workout-draft:${athlete}`)
		)) ?? null
	);
}
export async function clearWorkoutDraft(athleteId?: string): Promise<void> {
	const athlete = athleteId ?? (await getActiveAthlete());
	if (athlete) await run(META, 'readwrite', (store) => store.delete(`workout-draft:${athlete}`));
}

function open(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DATABASE, VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(ACTIVE)) db.createObjectStore(ACTIVE);
			if (!db.objectStoreNames.contains(QUEUE)) db.createObjectStore(QUEUE, { keyPath: 'id' });
			if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

/**
 * Runs one transaction and resolves with the request's result.
 *
 * Resolving on the *transaction* rather than the request, because a write is
 * only durable once the transaction commits, and a session logged in a gym is
 * not something to be optimistic about.
 */
async function run<T>(
	store: string,
	mode: IDBTransactionMode,
	work: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
	const db = await open();

	try {
		return await new Promise<T>((resolve, reject) => {
			const transaction = db.transaction(store, mode);
			const request = work(transaction.objectStore(store));

			transaction.oncomplete = () => resolve(request.result as T);
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () => reject(transaction.error);
		});
	} finally {
		db.close();
	}
}

/** The committed session, or `null` if the athlete is not in one. */
export async function loadActiveSession(): Promise<LocalSession | null> {
	const athlete = await getActiveAthlete();
	return (
		(await run<LocalSession | undefined>(ACTIVE, 'readonly', (store) =>
			store.get(athlete ?? ACTIVE_KEY)
		)) ?? null
	);
}

/**
 * Writes the committed session back.
 *
 * Called after every tap. The whole session is a few kilobytes and IndexedDB is
 * asynchronous, so rewriting it wholesale is cheaper than the bookkeeping that
 * would let it be written incrementally — and it cannot leave a half-updated
 * session behind.
 */
export async function saveActiveSession(session: LocalSession): Promise<void> {
	// Local documents are JSON; detach Svelte proxies before IndexedDB's structured clone.
	session = JSON.parse(JSON.stringify(session)) as LocalSession;
	const athlete = session.athleteId ?? (await getActiveAthlete());
	const db = await open();
	try {
		await new Promise<void>((resolve, reject) => {
			const transaction = db.transaction(ACTIVE, 'readwrite');
			const store = transaction.objectStore(ACTIVE);
			const key = athlete ?? ACTIVE_KEY;
			const request = store.get(key);
			request.onsuccess = () => {
				if (request.result && request.result.id !== session.id) {
					transaction.abort();
					return;
				}
				store.put({ ...session, ...(athlete ? { athleteId: athlete } : {}) }, key);
			};
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () =>
				reject(
					new Error(
						'Another workout is already on this device. Resume it before starting a new one.'
					)
				);
		});
	} finally {
		db.close();
	}
}

export async function clearActiveSession(expected?: LocalSession): Promise<void> {
	const athlete = expected?.athleteId ?? (await getActiveAthlete());
	await run(ACTIVE, 'readwrite', (store) => {
		const key = athlete ?? ACTIVE_KEY;
		const request = store.get(key);
		request.onsuccess = () => {
			if (!expected || request.result?.id === expected.id) store.delete(key);
		};
		return request;
	});
}

/** Queue and release the active slot in one durable transaction. */
export async function enqueueAndClearActive(item: QueuedWorkout): Promise<void> {
	const athlete = item.athleteId ?? (await getActiveAthlete());
	const db = await open();
	try {
		await new Promise<void>((resolve, reject) => {
			const transaction = db.transaction([ACTIVE, QUEUE], 'readwrite');
			const active = transaction.objectStore(ACTIVE);
			const key = athlete ?? ACTIVE_KEY;
			const request = active.get(key);
			request.onsuccess = () => {
				transaction.objectStore(QUEUE).put({ ...item, ...(athlete ? { athleteId: athlete } : {}) });
				if (request.result?.id === item.id) active.delete(key);
			};
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () =>
				reject(transaction.error ?? new Error('Could not save the finished workout.'));
		});
	} finally {
		db.close();
	}
}

/** The queue, as `flushQueue` wants it. */
export const queueStore: QueueStore = {
	all: async () => {
		const athlete = await getActiveAthlete();
		const items = await run<QueuedWorkout[]>(QUEUE, 'readonly', (store) => store.getAll());
		return items.filter((item) => (athlete ? item.athleteId === athlete : !item.athleteId));
	},
	put: (item) => run(QUEUE, 'readwrite', (store) => store.put(item)),
	remove: (id) => run(QUEUE, 'readwrite', (store) => store.delete(id))
};
