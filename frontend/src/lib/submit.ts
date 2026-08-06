/**
 * Getting a queued session from the phone to Rust.
 *
 * The browser posts to **this app**, not to the API: `POST /api/workouts` is a
 * SvelteKit endpoint that attaches the access token from the cookie session and
 * forwards the body. The token stays server-side (D-11), and the API needs no
 * CORS.
 *
 * A form action would have done the same job for the submit the athlete
 * presses. It would not do for the flush that runs on launch, which has to send
 * several bodies from client code and read each answer — so both paths go
 * through the endpoint, rather than having two ways to send the same thing.
 */

import { classifyStatus, enqueued, flushQueue } from './queue';
import type { FlushReport, SendOutcome } from './queue';
import { queueStore } from './storage';
import type { WorkoutReceipt, WorkoutSubmission } from './session';

export type { FlushReport };

/** One attempt, translated into an outcome the queue understands. */
export async function send(submission: WorkoutSubmission): Promise<SendOutcome> {
	let response: Response;

	try {
		response = await fetch('/api/workouts', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(submission)
		});
	} catch {
		// No network, or the app was closed mid-flight. Always worth another go.
		return { kind: 'retry', reason: 'no connection' };
	}

	let detail: string | null = null;
	let receipt: WorkoutReceipt | null = null;

	try {
		const body: unknown = await response.json();

		if (typeof body === 'object' && body !== null) {
			if ('detail' in body && typeof body.detail === 'string') {
				detail = body.detail;
			}
			// Trusted as far as the generated type goes and no further: this is
			// our own API through our own BFF, and a body that is not the shape
			// it claims is a bug we want loud rather than silently swallowed.
			if ('summary' in body) receipt = body as WorkoutReceipt;
		}
	} catch {
		// A body that is not JSON tells us nothing the status has not already.
	}

	return classifyStatus(response.status, detail, receipt);
}

/**
 * Queues a finished session and tries it once, straight away.
 *
 * Queue first, then send. The other order loses the session if the tab is
 * closed while the request is in flight, which on a phone that has just been
 * put back in a pocket is not a remote possibility.
 */
export async function submitSession(submission: WorkoutSubmission): Promise<FlushReport> {
	await queueStore.put(enqueued(submission, new Date().toISOString()));
	return flushQueue(queueStore, send);
}

/** Retries everything outstanding. Run on launch and when the phone reconnects. */
export function flushPending(): Promise<FlushReport> {
	return flushQueue(queueStore, send);
}

/** How many submissions are still waiting, and how many will never be taken. */
export async function queueSummary(): Promise<{ queued: number; rejected: number }> {
	const items = await queueStore.all();

	return {
		queued: items.filter((item) => item.state === 'queued').length,
		rejected: items.filter((item) => item.state === 'rejected').length
	};
}
