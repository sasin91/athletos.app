import { unwrap } from '$lib/server/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return unwrap(
		await locals.api.GET('/v1/workout-definitions', {}),
		'Could not load your workouts.'
	);
};
