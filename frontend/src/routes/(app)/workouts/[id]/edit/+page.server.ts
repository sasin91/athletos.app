import { fail, redirect } from '@sveltejs/kit';
import { problemDetail, unwrap } from '$lib/server/api';
import { readWorkoutContent } from '$lib/workout-definition';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const [definition, catalogue] = await Promise.all([
		locals.api.GET('/v1/workout-definitions/{id}', { params: { path: { id: params.id } } }),
		locals.api.GET('/v1/exercises', {})
	]);
	return {
		workout: unwrap(definition, 'Could not load this workout.'),
		exercises: unwrap(catalogue, 'Could not load exercises.').exercises
	};
};

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		const form = await request.formData();
		const draft = readWorkoutContent(form.get('content'));
		const expectedRevision = Number(form.get('expected_revision'));
		if (!draft || !Number.isInteger(expectedRevision) || expectedRevision < 1)
			return fail(422, {
				draft: null,
				expectedRevision,
				conflict: false,
				message: 'Could not read this workout. Please try again.'
			});
		const { data, error, response } = await locals.api.PATCH('/v1/workout-definitions/{id}', {
			params: { path: { id: params.id } },
			body: { ...draft, expected_revision: expectedRevision }
		});
		if (!data)
			return fail(response.status || 502, {
				draft,
				expectedRevision,
				conflict: response.status === 409,
				message:
					response.status === 409
						? 'This workout was edited elsewhere. Your draft is still here. Save it as a new workout or reload to see the latest version.'
						: (problemDetail(error) ?? 'Could not save this workout.')
			});
		redirect(303, `/workouts/${data.id}`);
	},
	copy: async ({ locals, request }) => {
		const draft = readWorkoutContent((await request.formData()).get('content'));
		if (!draft)
			return fail(422, {
				draft: null,
				expectedRevision: null,
				conflict: true,
				message: 'Could not read this workout.'
			});
		const { data, error, response } = await locals.api.POST('/v1/workout-definitions', {
			body: draft
		});
		if (!data)
			return fail(response.status || 502, {
				draft,
				expectedRevision: null,
				conflict: true,
				message: problemDetail(error) ?? 'Could not save a copy.'
			});
		redirect(303, `/workouts/${data.id}`);
	}
};
