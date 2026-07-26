import { fail, redirect } from '@sveltejs/kit';

import { problemDetail } from '$lib/server/api';
import { storeSession } from '$lib/server/session';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.authenticated) redirect(303, '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
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
		redirect(303, '/maxes');
	}
};
