import { problemDetail, unwrap } from '$lib/server/api';
import type { PageServerLoad } from './$types';

/**
 * Peek: **read-only** (D-08).
 *
 * `GET /v1/enrollments/{id}/next-session` writes nothing, starts no timer and
 * moves no state. This is the "what am I doing today" click, and the fact that
 * it is free is the entire reason it is a separate action from committing. If
 * this load ever acquires a write, the distinction is gone and the athlete is
 * back to backing out of a screen to avoid inflating a clock.
 *
 * One request. It used to be six: the session, plus the history list and a
 * detail request per recent workout, because the athlete's median seconds-per-
 * set was computed here out of durations and set counts the API would only hand
 * over separately. That calculation now lives in Rust and rides along on this
 * response as `session.pace` (D-10, D-11).
 */
export const load: PageServerLoad = async ({ locals, params }) => {
	const peeked = await locals.api.GET('/v1/enrollments/{id}/next-session', {
		params: { path: { id: params.id } }
	});

	// A block that is over is a page with something to say, not an error page.
	if (peeked.response.status === 409) {
		return {
			session: null,
			finished: problemDetail(peeked.error) ?? 'This program has nothing left to prescribe.'
		};
	}

	return { session: unwrap(peeked, 'Could not load the next session.'), finished: null };
};
