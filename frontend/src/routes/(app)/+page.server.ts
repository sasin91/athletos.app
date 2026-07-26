import { unwrap } from '$lib/server/api';
import type { PageServerLoad } from './$types';

/**
 * What the athlete is running, current program first.
 *
 * `GET /v1/enrollments` already orders active enrolments first and already
 * counts progress, so there is nothing to sort or compute here (D-11).
 */
export const load: PageServerLoad = async ({ locals }) => {
	const enrollments = unwrap(
		await locals.api.GET('/v1/enrollments', {}),
		'Could not load your programs.'
	);

	return { enrollments: enrollments.enrollments };
};
