import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.authenticated) return json({ detail: 'Not signed in.' }, { status: 401 });
	const result = await locals.api.GET('/v2/blank-session', {});
	return json(result.data ?? result.error ?? null, {
		status: result.response.status,
		headers: { 'cache-control': 'private, no-store' }
	});
};
