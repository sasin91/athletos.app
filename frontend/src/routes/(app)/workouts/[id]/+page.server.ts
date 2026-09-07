import { fail, redirect } from '@sveltejs/kit';
import { problemDetail, unwrap } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store', 'referrer-policy': 'strict-origin' });
	const workout = unwrap(
		await locals.api.GET('/v1/workout-definitions/{id}', { params: { path: { id: params.id } } }),
		'Could not load this workout.'
	);
	const [materialized, shared] = await Promise.all([
		locals.api.GET('/v1/workout-definitions/{id}/revisions/{revision}/session', {
			params: { path: { id: params.id, revision: workout.revision } }
		}),
		locals.api.GET('/v1/workout-definitions/{id}/shares', { params: { path: { id: params.id } } })
	]);
	return {
		workout,
		session: unwrap(materialized, 'Could not prepare this workout.'),
		shares: unwrap(shared, 'Could not load sharing details.').shares
	};
};

export const actions: Actions = {
	duplicate: async ({ locals, params, request }) => {
		const revision = Number((await request.formData()).get('revision'));
		const { data, error, response } = await locals.api.POST('/v1/workout-definitions/{id}/copies', {
			params: { path: { id: params.id } },
			body: { revision }
		});
		if (!data)
			return fail(response.status || 502, {
				message: problemDetail(error) ?? 'Could not duplicate this workout.'
			});
		redirect(303, `/workouts/${data.id}/edit`);
	},
	archive: async ({ locals, params }) => {
		const { error, response } = await locals.api.DELETE('/v1/workout-definitions/{id}', {
			params: { path: { id: params.id } }
		});
		if (!response.ok)
			return fail(response.status || 502, {
				message: problemDetail(error) ?? 'Could not archive this workout.'
			});
		redirect(303, '/workouts');
	},
	share: async ({ locals, params, request, url, setHeaders }) => {
		// Enhanced forms return action JSON directly; ordinary forms run load,
		// which sets these headers once for the rendered response.
		if (request.headers.get('x-sveltekit-action') === 'true')
			setHeaders({ 'cache-control': 'private, no-store', 'referrer-policy': 'strict-origin' });
		const revision = Number((await request.formData()).get('revision'));
		const { data, error, response } = await locals.api.POST('/v1/workout-definitions/{id}/shares', {
			params: { path: { id: params.id } },
			body: { revision }
		});
		if (!data)
			return fail(response.status || 502, {
				message: problemDetail(error) ?? 'Could not create a share link.'
			});
		return { shareUrl: `${url.origin}/shared/workouts/${encodeURIComponent(data.token)}` };
	},
	revoke: async ({ locals, params, request }) => {
		const shareId = String((await request.formData()).get('share_id') ?? '');
		const { error, response } = await locals.api.DELETE(
			'/v1/workout-definitions/{id}/shares/{share_id}',
			{ params: { path: { id: params.id, share_id: shareId } } }
		);
		if (!response.ok)
			return fail(response.status || 502, {
				message: problemDetail(error) ?? 'Could not revoke this link.'
			});
		return { message: 'Link revoked. Previously saved copies remain available to their owners.' };
	}
};
