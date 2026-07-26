// See https://svelte.dev/docs/kit/types#app.d.ts

import type { Client } from 'openapi-fetch';
import type { paths } from '$lib/api/schema';

declare global {
	namespace App {
		interface Locals {
			/**
			 * The access token for this request, and nothing longer-lived than
			 * that (D-11).
			 *
			 * Read from — or minted into — an httpOnly cookie in
			 * `hooks.server.ts`, and dead by the time the response is written.
			 * Nothing serialises it into `data`, so the browser's JavaScript
			 * never holds it. Page code should reach for `api` rather than this:
			 * the token is here because the client is built from it, not because
			 * pages need it.
			 */
			accessToken: string | null;

			/**
			 * The generated API client, already carrying this request's
			 * credentials.
			 *
			 * Every call to the Rust API goes through one of these, from a
			 * `+page.server.ts` load, a form action, or a `+server.ts` route.
			 * There is no browser-side API client, which is why the API needs no
			 * CORS.
			 */
			api: Client<paths>;

			/** Whether this request has a usable access token. */
			authenticated: boolean;
		}
	}
}

export {};
