import { unwrap } from '$lib/server/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const catalogue = unwrap(
		await locals.api.GET('/v1/programs', {}),
		'Could not load the program catalogue.'
	);

	return { programs: catalogue.programs };
};
