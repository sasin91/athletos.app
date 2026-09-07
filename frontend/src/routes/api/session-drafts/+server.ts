import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	if (!locals.authenticated) return json({ detail: 'Not signed in.' }, { status: 401 });
	if (request.headers.get('origin') !== url.origin)
		return json({ detail: 'Invalid origin.' }, { status: 403 });
	const result = await locals.api.POST('/v2/session-drafts', { body: await request.json() });
	return json(result.data ?? result.error ?? null, { status: result.response.status });
};
