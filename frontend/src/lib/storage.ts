/**
 * IndexedDB: the committed session and the submit queue (D-09).
 *
 * Deliberately thin. Every rule about what to store, when to retry and what a
 * refusal means lives in `session.ts` and `queue.ts`, which are pure and tested;
 * this file is the part that cannot be tested without a browser, so there is as
 * little of it as possible.
 *
 * Two stores:
 *
 * * `active` — the one session currently committed, keyed by a constant. One at
 *   a time is the whole model: you are either in a session or you are not.
 * * `queue` — submissions waiting to land, keyed by workout id.
 *
 * `localStorage` would have been simpler and is the wrong tool: it is
 * synchronous on the main thread, and a session's worth of sets is written back
 * on every single tap.
 */

import type { QueuedWorkout, QueueStore } from './queue';
import type { LocalSession } from './session';

const DATABASE = 'athletos';
const VERSION = 1;
const ACTIVE = 'active';
const QUEUE = 'queue';
const ACTIVE_KEY = 'current';

function open(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DATABASE, VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(ACTIVE)) db.createObjectStore(ACTIVE);
			if (!db.objectStoreNames.contains(QUEUE)) db.createObjectStore(QUEUE, { keyPath: 'id' });
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
export function loadActiveSession(): Promise<LocalSession | null> {
	return run<LocalSession | undefined>(ACTIVE, 'readonly', (store) => store.get(ACTIVE_KEY)).then(
		(session) => session ?? null
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
export function saveActiveSession(session: LocalSession): Promise<void> {
	return run(ACTIVE, 'readwrite', (store) => store.put(session, ACTIVE_KEY));
}

export function clearActiveSession(): Promise<void> {
	return run(ACTIVE, 'readwrite', (store) => store.delete(ACTIVE_KEY));
}

/** The queue, as `flushQueue` wants it. */
export const queueStore: QueueStore = {
	all: () => run<QueuedWorkout[]>(QUEUE, 'readonly', (store) => store.getAll()),
	put: (item) => run(QUEUE, 'readwrite', (store) => store.put(item)),
	remove: (id) => run(QUEUE, 'readwrite', (store) => store.delete(id))
};
