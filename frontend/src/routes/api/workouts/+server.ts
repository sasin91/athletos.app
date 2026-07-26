/**
 * The one write the browser makes directly (D-09, D-11).
 *
 * The offline queue lives in the browser and has to be flushed from client
 * code, so it needs somewhere to post to. That somewhere is here rather than
 * the API: this endpoint attaches the access token from the cookie session and
 * forwards the body, so the token never leaves the server and the API needs no
 * CORS.
 *
 * Deliberately a pass-through. It does not validate the submission, does not
 * decide what a refusal means, and does not touch the queue — the API owns the
 * first, `queue.ts` owns the second, and the client owns the third. What it
 * does own is the credential.
 */

import { json } from '@sveltejs/kit';

import type { Schemas } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.authenticated) {
		// 401 is retryable (see `classifyStatus`): the athlete signing in again
		// is an action that fixes it, and the queued session is still valid.
		return json({ detail: 'Not signed in.' }, { status: 401 });
	}

	const body = (await request.json()) as Schemas['WorkoutSubmission'];

	const { data, error, response } = await locals.api.POST('/v1/workouts', { body });

	// The status is passed through untouched, and it carries meaning: 201 the
	// first time, 200 for every retry of a submit already accepted. The queue
	// treats both as success, which is the whole point of the idempotency key.
	return json(data ?? error ?? null, { status: response.status });
};
