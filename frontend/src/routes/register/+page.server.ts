import { fail, redirect } from '@sveltejs/kit';

import { problemDetail } from '$lib/server/api';
import { storeSession } from '$lib/server/session';
import { safeDestination } from '$lib/auth-destination';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store', 'referrer-policy': 'strict-origin' });
	if (locals.authenticated) redirect(303, safeDestination(url.searchParams.get('from')));
	return { from: safeDestination(url.searchParams.get('from'), '') };
};

export const actions: Actions = {
	default: async ({ request, cookies, locals, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '');
		const displayName = String(form.get('display_name') ?? '');
		const password = String(form.get('password') ?? '');

		const { data, error, response } = await locals.api.POST('/v1/auth/register', {
			body: { email, display_name: displayName, password }
		});

		if (!data) {
			// 409 (address taken) and 422 (password refused) both arrive with a
			// `detail` written for a human, and both belong in the form rather
			// than on an error page — a refused password is something to fix
			// here, not something to navigate away from.
			return fail(response.status || 502, {
				email,
				displayName,
				message: problemDetail(error) ?? 'Could not reach the API.'
			});
		}

		storeSession(cookies, data);
		redirect(303, safeDestination(url.searchParams.get('from'), '/maxes'));
	}
};
