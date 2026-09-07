import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.authenticated) return json({ detail: 'Not signed in.' }, { status: 401 });
	const [me, enrollments] = await Promise.all([
		locals.api.GET('/v1/auth/me', {}),
		locals.api.GET('/v1/enrollments', {})
	]);
	if (!me.data || !enrollments.data) {
		const failed = !me.data ? me : enrollments;
		return json(failed.error ?? { detail: 'Could not verify this account.' }, {
			status: failed.response.status || 502
		});
	}
	return json(
		{ id: me.data.athlete_id, enrollment_ids: enrollments.data.enrollments.map((e) => e.id) },
		{
			headers: { 'cache-control': 'private, no-store' }
		}
	);
};
