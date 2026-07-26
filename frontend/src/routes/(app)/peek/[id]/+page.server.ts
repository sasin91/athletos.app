import { problemDetail, unwrap } from '$lib/server/api';
import type { ApiClient } from '$lib/server/api';
import { medianSecondsPerSet } from '$lib/pace';
import type { PageServerLoad } from './$types';

/**
 * How many past sessions to measure the athlete's pace over.
 *
 * Each one costs a detail request (see below), so this is a deliberate ceiling
 * rather than "all of them". Five is comfortably above the three D-10 needs and
 * recent enough to reflect how the athlete is training now.
 */
const PACE_SAMPLE_SIZE = 5;

/**
 * The athlete's median seconds per set (D-10), or `null` if there is not enough
 * history yet.
 *
 * This costs one list request plus up to five detail requests, because
 * `WorkoutSummary` carries `duration_seconds` but not how many sets were in the
 * session — and seconds *per set* needs both. Noted in the phase 4 report: the
 * cheap fix is a `set_count` on the history row, which is additive (D-12).
 *
 * It is computed here, at peek time, so that the number can be cached with the
 * committed session and the logger can draw its header with no network at all.
 */
async function pace(api: ApiClient): Promise<number | null> {
	const history = await api.GET('/v1/workouts', {
		params: { query: { limit: PACE_SAMPLE_SIZE } }
	});

	if (!history.data) return null;

	const details = await Promise.all(
		history.data.workouts.map((workout) =>
			api.GET('/v1/workouts/{id}', { params: { path: { id: workout.id } } })
		)
	);

	return medianSecondsPerSet(
		details
			.filter((detail) => detail.data !== undefined)
			.map((detail) => ({
				durationSeconds: detail.data!.workout.duration_seconds,
				// Sets that were never done still took none of the athlete's
				// time, so the denominator is what was actually performed.
				sets: detail.data!.sets.filter((set) => set.status === 'done').length
			}))
	);
}

/**
 * Peek: **read-only** (D-08).
 *
 * `GET /v1/enrollments/{id}/next-session` writes nothing, starts no timer and
 * moves no state. This is the "what am I doing today" click, and the fact that
 * it is free is the entire reason it is a separate action from committing. If
 * this load ever acquires a write, the distinction is gone and the athlete is
 * back to backing out of a screen to avoid inflating a clock.
 */
export const load: PageServerLoad = async ({ locals, params }) => {
	const peeked = await locals.api.GET('/v1/enrollments/{id}/next-session', {
		params: { path: { id: params.id } }
	});

	// A block that is over is a page with something to say, not an error page.
	if (peeked.response.status === 409) {
		return {
			session: null,
			secondsPerSet: null,
			finished: problemDetail(peeked.error) ?? 'This program has nothing left to prescribe.'
		};
	}

	const session = unwrap(peeked, 'Could not load the next session.');

	return { session, secondsPerSet: await pace(locals.api), finished: null };
};
