/**
 * Every request enters here, and this is where the token lives (D-11).
 *
 * The browser holds two httpOnly cookies and nothing else. This hook turns them
 * into an access token, hangs a bound API client off `event.locals`, and lets
 * both die with the response. No page, no component and no serialised `data`
 * payload ever sees a credential.
 */

import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';

import { createApi } from '$lib/server/api';
import { authenticate } from '$lib/server/session';

export const handle: Handle = async ({ event, resolve }) => {
	// Prerendering runs this pipeline with no request behind it, and there are
	// no cookies to read — `/session`, the offline logger, is a static shell by
	// design (see its `+page.ts`). Guarding here rather than letting the cookie
	// jar throw keeps the build honest about which pages are static.
	if (building) {
		event.locals.accessToken = null;
		event.locals.authenticated = false;
		event.locals.api = createApi(null, event.fetch);
		return resolve(event);
	}

	const accessToken = await authenticate(event);

	event.locals.accessToken = accessToken;
	event.locals.authenticated = accessToken !== null;
	event.locals.api = createApi(accessToken, event.fetch);

	return resolve(event);
};
