import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { components } from '$lib/api/schema';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.authenticated) return json({ detail: 'Not signed in.' }, { status: 401 });
	const expectedAthlete = request.headers.get('x-athlete-id');
	const athlete = await locals.api.GET('/v1/auth/me');
	if (!expectedAthlete || !athlete.data || athlete.data.athlete_id !== expectedAthlete) {
		return json(
			{ detail: 'Sign in with the account that recorded this workout.' },
			{ status: 401 }
		);
	}
	const body = (await request.json()) as components['schemas']['V2WorkoutSubmission'];
	const { data, error, response } = await locals.api.POST('/v2/workouts', { body });
	return json(data ?? error ?? null, { status: response.status });
};
