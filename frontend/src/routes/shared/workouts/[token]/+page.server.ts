import { fail, redirect } from '@sveltejs/kit';
import { problemDetail, unwrap } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, setHeaders }) => {
	setHeaders({
		'cache-control': 'private, no-store',
		'referrer-policy': 'strict-origin',
		'x-robots-tag': 'noindex, nofollow'
	});
	const workout = unwrap(
		await locals.api.GET('/v1/shared-workouts/{token}', {
			params: { path: { token: params.token } }
		}),
		'This share link is no longer available.'
	);
	return { workout, authenticated: locals.authenticated };
};

export const actions: Actions = {
	default: async ({ locals, params, request, setHeaders }) => {
		if (request.headers.get('x-sveltekit-action') === 'true')
			setHeaders({ 'cache-control': 'private, no-store', 'referrer-policy': 'strict-origin' });
		if (!locals.authenticated)
			redirect(303, `/login?from=${encodeURIComponent(`/shared/workouts/${params.token}`)}`);
		const { data, error, response } = await locals.api.POST('/v1/shared-workouts/{token}/copies', {
			params: { path: { token: params.token } }
		});
		if (!data)
			return fail(response.status || 502, {
				message: problemDetail(error) ?? 'Could not save a copy of this workout.'
			});
		redirect(303, `/workouts/${data.id}`);
	}
};
