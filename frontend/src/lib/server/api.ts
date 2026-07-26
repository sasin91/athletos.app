/**
 * The one place this app talks to Rust (D-11).
 *
 * SvelteKit is a backend-for-frontend: the browser calls SvelteKit, SvelteKit
 * calls the API, and the access token never crosses the second boundary
 * outward. Everything here is `$lib/server`, which SvelteKit refuses to bundle
 * into client code — so an accidental `import` from a `.svelte` file is a build
 * error rather than a leaked credential.
 *
 * The types are generated from `backend/openapi.json` by `npm run generate:api`
 * and committed. They are not hand-written and must not be edited: the point of
 * D-11 is that the contract is machine-derived, so that the second client gets
 * the same one for free.
 */

import createClient from 'openapi-fetch';
import type { Client } from 'openapi-fetch';
import { error, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

import type { components, paths } from '$lib/api/schema';

export type ApiClient = Client<paths>;
export type Schemas = components['schemas'];
export type ProblemDetails = Schemas['ProblemDetails'];

/**
 * Where the Rust API lives.
 *
 * Read at request time rather than build time, so one built image can be
 * pointed at a different API without rebuilding. The default is what
 * `cargo run --bin api` binds to (see DEVELOPMENT.md).
 */
export function apiBaseUrl(): string {
	return env.API_BASE_URL ?? 'http://127.0.0.1:8080';
}

/**
 * A client bound to one request's credentials and one request's `fetch`.
 *
 * `event.fetch` rather than the global, so that SvelteKit's request tracing and
 * its `AbortSignal` propagation apply to the outbound call too.
 */
export function createApi(accessToken: string | null, fetch: typeof globalThis.fetch): ApiClient {
	return createClient<paths>({
		baseUrl: apiBaseUrl(),
		fetch,
		headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
	});
}

/** The shape every `openapi-fetch` call resolves to. */
export type ApiResult<T> = {
	data?: T;
	error?: unknown;
	response: Response;
};

/**
 * The `detail` out of an RFC 9457 body, when the API sent one.
 *
 * The API answers problem details on every refusal and the `detail` string is
 * written for a human — "this program needs a one-rep max for squat" — so it is
 * very nearly always a better message than anything this side could invent.
 */
export function problemDetail(body: unknown): string | null {
	if (typeof body !== 'object' || body === null) return null;
	const detail = (body as Partial<ProblemDetails>).detail;
	return typeof detail === 'string' && detail.length > 0 ? detail : null;
}

/**
 * Unwraps a load-time call, turning a refusal into the right SvelteKit outcome.
 *
 * A 401 here means the refresh cookie is gone or spent, so the answer is the
 * login page rather than an error page. Anything else becomes an error with the
 * API's own wording.
 *
 * Form actions deliberately do **not** use this: a 422 on a form belongs in the
 * form, as a `fail()`, not on a full-page error screen.
 */
export function unwrap<T>(result: ApiResult<T>, fallback: string): T {
	if (result.response.status === 401) {
		redirect(303, '/login');
	}

	if (result.data === undefined) {
		error(result.response.status || 502, problemDetail(result.error) ?? fallback);
	}

	return result.data;
}
