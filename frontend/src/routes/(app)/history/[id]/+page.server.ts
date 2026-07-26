import { unwrap } from '$lib/server/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const detail = unwrap(
		await locals.api.GET('/v1/workouts/{id}', { params: { path: { id: params.id } } }),
		'No such workout.'
	);

	return { detail };
};
