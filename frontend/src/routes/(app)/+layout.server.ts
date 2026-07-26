import { redirect } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';

/**
 * The gate for everything that needs an athlete.
 *
 * One check for the whole group, rather than a check per page — a page that
 * forgot one would leak an error from the API instead of a login screen.
 *
 * Nothing about the token is returned. `data` is serialised into the HTML and
 * shipped to the browser, so the only thing that crosses is the fact that
 * somebody is signed in (D-11).
 */
export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.authenticated) {
		redirect(303, `/login?from=${encodeURIComponent(url.pathname)}`);
	}

	return {};
};
