import { json } from '@sveltejs/kit';
import type { WorkoutContent } from '$lib/workout-definition';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request, url }) => {
	if (request.headers.get('origin') !== url.origin)
		return json({ detail: 'Request origin is not allowed.' }, { status: 403 });
	if (!locals.authenticated)
		return json({ detail: 'Sign in to save this workout.' }, { status: 401 });
	const expectedAthlete = request.headers.get('x-athlete-id');
	if (expectedAthlete) {
		const athlete = await locals.api.GET('/v1/auth/me', {});
		if (!athlete.data || athlete.data.athlete_id !== expectedAthlete)
			return json(
				{ detail: 'Sign in with the account that created this workout.' },
				{ status: 401 }
			);
	}
	let body: WorkoutContent;
	try {
		body = await request.json();
	} catch {
		return json({ detail: 'Invalid workout document.' }, { status: 400 });
	}
	const { data, error, response } = await locals.api.POST('/v1/workout-definitions', { body });
	return json(data ?? error ?? { detail: 'Could not save this workout.' }, {
		status: response.status,
		headers: { 'cache-control': 'private, no-store' }
	});
};
