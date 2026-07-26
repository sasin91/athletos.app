import { redirect } from '@sveltejs/kit';

import { clearSession, refreshTokenOf } from '$lib/server/session';
import type { Actions, PageServerLoad } from './$types';

/** Nothing to look at: signing out is a POST, never a link. */
export const load: PageServerLoad = async () => {
	redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ cookies, locals }) => {
		// Both credentials go, not just the refresh token. The access token is
		// sent so its `jti` lands on the API's denylist — otherwise the bearer
		// token this process is still holding keeps working for up to fifteen
		// minutes after the athlete pressed sign out.
		//
		// The answer is ignored on purpose: logout is idempotent on that side,
		// and a failure there must not leave cookies here.
		await locals.api.POST('/v1/auth/logout', {
			body: { refresh_token: refreshTokenOf(cookies) ?? null }
		});

		clearSession(cookies);
		redirect(303, '/login');
	}
};
