/**
 * The offline submit queue (D-09).
 *
 * A finished session becomes one `POST /v1/workouts` carrying a client-minted
 * UUIDv7. If that post fails — no signal, API down, laptop asleep — the
 * submission stays here and is retried on the next launch. A retry is safe by
 * construction: the server does `on conflict (id) do nothing` and answers 200
 * with `duplicate: true`, so the program advances exactly once no matter how
 * many times the phone tries.
 *
 * The logic is deliberately separate from IndexedDB. Everything below is a pure
 * function of a store interface and a send function, which is what makes the
 * retry rules testable without a browser — and the retry rules are the part
 * most likely to be wrong.
 */

import type { WorkoutReceipt, WorkoutSubmission } from './session';

/** A submission waiting to land, and its history of trying. */
export type QueuedWorkout = {
	/** The workout id, which is also the store's key and the idempotency key. */
	id: string;
	submission: WorkoutSubmission;
	queuedAt: string;
	attempts: number;
	lastError: string | null;
	/**
	 * `queued` will be tried again; `rejected` will not.
	 *
	 * A rejected item is kept rather than deleted. It is a training session the
	 * athlete actually performed, and silently dropping it is the one outcome
	 * this queue exists to prevent — even when the server will never take it.
	 */
	state: 'queued' | 'rejected';
};

/** What one attempt at sending came to. */
export type SendOutcome =
	| { kind: 'accepted'; duplicate: boolean; receipt: WorkoutReceipt | null }
	| { kind: 'retry'; reason: string }
	| { kind: 'rejected'; reason: string };

/**
 * Whether a status code means "try again later" or "this will never work".
 *
 * The distinction matters in both directions. Retrying forever on a 422 is a
 * loop the athlete can do nothing about; giving up on a 503 loses a session to
 * a deploy that happened to overlap with the ride home.
 *
 * * **2xx** — landed. 200 rather than 201 means a retry of one already
 *   accepted, which is success and not an error.
 * * **401** — retried, not rejected. The BFF's session expired; signing in
 *   again is an action the athlete can take, and the submission is still valid.
 * * **408, 429, 5xx** — the API's own "later".
 * * **anything else in 4xx** — the submission itself is unacceptable. 404 (the
 *   enrolment is gone), 409 (the id belongs to another enrolment), 413, 422.
 *   No amount of waiting changes any of them.
 */
export function classifyStatus(
	status: number,
	detail: string | null,
	receipt: WorkoutReceipt | null = null
): SendOutcome {
	if (status === 200 || status === 201) {
		return { kind: 'accepted', duplicate: status === 200, receipt };
	}

	if (status === 401 || status === 408 || status === 429 || status >= 500) {
		return { kind: 'retry', reason: detail ?? `the server answered ${status}` };
	}

	if (status >= 400) {
		return { kind: 'rejected', reason: detail ?? `the server refused it with ${status}` };
	}

	return { kind: 'retry', reason: detail ?? `unexpected status ${status}` };
}

/** Where the queue is kept. Implemented over IndexedDB in `storage.ts`. */
export type QueueStore = {
	all(): Promise<QueuedWorkout[]>;
	put(item: QueuedWorkout): Promise<void>;
	remove(id: string): Promise<void>;
};

/** How one flush went, per workout id. */
export type FlushReport = {
	accepted: string[];
	duplicate: string[];
	retrying: string[];
	rejected: string[];
	/**
	 * What the server said about each workout that landed, keyed by its id.
	 *
	 * Keyed rather than a single field, because a flush sends everything
	 * outstanding: an older session landing alongside this one would otherwise
	 * have its numbers shown on the ending of the session just finished.
	 *
	 * A landed workout with no entry is possible and not an error — the
	 * response body may not have parsed, and losing the numbers is not losing
	 * the session.
	 */
	receipts: Record<string, WorkoutReceipt>;
};

export function enqueued(submission: WorkoutSubmission, queuedAt: string): QueuedWorkout {
	return {
		id: submission.id,
		submission,
		queuedAt,
		attempts: 0,
		lastError: null,
		state: 'queued'
	};
}

/**
 * Tries everything still queued, oldest first.
 *
 * Sequential rather than parallel, and deliberately so: two submissions against
 * the same enrolment each run `advance()` under a row lock, and sending them at
 * once would have one wait on the other's transaction for no gain. There are
 * never more than a handful of these.
 */
export async function flushQueue(
	store: QueueStore,
	send: (submission: WorkoutSubmission) => Promise<SendOutcome>
): Promise<FlushReport> {
	const report: FlushReport = {
		accepted: [],
		duplicate: [],
		retrying: [],
		rejected: [],
		receipts: {}
	};

	const pending = (await store.all())
		.filter((item) => item.state === 'queued')
		.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));

	for (const item of pending) {
		const outcome = await send(item.submission);

		if (outcome.kind === 'accepted') {
			await store.remove(item.id);
			if (outcome.receipt) report.receipts[item.id] = outcome.receipt;
			(outcome.duplicate ? report.duplicate : report.accepted).push(item.id);
			continue;
		}

		await store.put({
			...item,
			attempts: item.attempts + 1,
			lastError: outcome.reason,
			state: outcome.kind === 'rejected' ? 'rejected' : 'queued'
		});

		(outcome.kind === 'rejected' ? report.rejected : report.retrying).push(item.id);
	}

	return report;
}
