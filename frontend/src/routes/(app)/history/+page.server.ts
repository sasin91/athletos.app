import { unwrap } from '$lib/server/api';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 25;

export const load: PageServerLoad = async ({ locals, url }) => {
	const offset = Number(url.searchParams.get('offset') ?? 0);

	const history = unwrap(
		await locals.api.GET('/v1/workouts', {
			params: {
				query: { limit: PAGE_SIZE, offset: Number.isFinite(offset) ? Math.max(0, offset) : 0 }
			}
		}),
		'Could not load your history.'
	);

	return { history };
};
