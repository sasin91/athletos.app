import { fail, redirect } from '@sveltejs/kit';
import { problemDetail, unwrap } from '$lib/server/api';
import { readWorkoutContent } from '$lib/workout-definition';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return unwrap(await locals.api.GET('/v1/exercises', {}), 'Could not load exercises.');
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const form = await request.formData();
		const draft = readWorkoutContent(form.get('content'));
		if (!draft)
			return fail(422, { draft: null, message: 'Could not read this workout. Please try again.' });
		const { data, error, response } = await locals.api.POST('/v1/workout-definitions', {
			body: draft
		});
		if (!data)
			return fail(response.status || 502, {
				draft,
				message: problemDetail(error) ?? 'Could not save the workout.'
			});
		redirect(303, `/workouts/${data.id}`);
	}
};
