import { fail, redirect } from '@sveltejs/kit';

import { problemDetail } from '$lib/server/api';
import { storeSession } from '$lib/server/session';
import type { Actions, PageServerLoad } from './$types';

/**
 * Where to land after signing in.
 *
 * Only a path on this origin. `//evil.example` is a protocol-relative URL that
 * a browser follows off-site, so "starts with a slash" is not on its own enough.
 */
function safeDestination(from: string | null): string {
	return from && from.startsWith('/') && !from.startsWith('//') ? from : '/';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.authenticated) redirect(303, safeDestination(url.searchParams.get('from')));
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, locals, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '');
		const password = String(form.get('password') ?? '');

		const { data, error, response } = await locals.api.POST('/v1/auth/login', {
			body: { email, password }
		});

		if (!data) {
			// The password is never echoed back into the form. The address is,
			// because retyping it after a typo in the password is the annoyance
			// that makes people give up on a login screen.
			return fail(response.status || 502, {
				email,
				message:
					problemDetail(error) ??
					(response.status === 401
						? 'That email and password do not match an account.'
						: 'Could not reach the API.')
			});
		}

		storeSession(cookies, data);
		redirect(303, safeDestination(url.searchParams.get('from')));
	}
};
