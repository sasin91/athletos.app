import { fail, redirect } from '@sveltejs/kit';

import { problemDetail, unwrap } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const [detail, stored] = await Promise.all([
		locals.api.GET('/v1/programs/{key}', { params: { path: { key: params.key } } }),
		locals.api.GET('/v1/athlete/maxes', {})
	]);

	const program = unwrap(detail, 'No program has that key.');
	const maxes = unwrap(stored, 'Could not load your maxes.').maxes;

	// Which of this program's requirements are already answered. The API would
	// refuse the enrolment with a 422 naming the first missing lift anyway; this
	// only saves the athlete from finding that out one lift at a time.
	return {
		program,
		missing: program.required_maxes.filter((required) => !(required.exercise in maxes))
	};
};

export const actions: Actions = {
	default: async ({ locals, params }) => {
		const { data, error, response } = await locals.api.POST('/v1/enrollments', {
			body: { program_key: params.key }
		});

		if (!data) {
			return fail(response.status || 502, {
				message: problemDetail(error) ?? 'Could not start that program.'
			});
		}

		redirect(303, `/peek/${data.id}`);
	}
};
