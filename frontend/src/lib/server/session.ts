/**
 * The cookie session (D-11).
 *
 * Two httpOnly cookies, and no token in `localStorage`, in a `data` payload, or
 * anywhere else the browser's JavaScript can reach:
 *
 * * `athletos_refresh` — the opaque, revocable refresh token. Long-lived, and
 *   the only thing that survives a restart of this process.
 * * `athletos_access` — the 15-minute JWT, cached so that not every request has
 *   to spend a refresh to get one.
 *
 * ## Why the access token is cached in a cookie at all
 *
 * The API's refresh tokens are **single-use and rotating**, and presenting one
 * that was already exchanged revokes its whole family. A BFF that exchanged the
 * cookie on every request would therefore log the athlete out the first time two
 * requests overlapped — which on a page with a form action and a load running
 * together is immediately. Caching the access token means a refresh happens
 * about once every fifteen minutes instead of once per request.
 *
 * That leaves a much smaller race, and `refreshOnce` closes it: concurrent
 * requests holding the same refresh token share a single in-flight exchange
 * rather than racing to spend it. The map is per-process, so this is exact for
 * one instance and best-effort behind a load balancer — noted rather than
 * solved, because v1 is one athlete on one instance and the real fix (a shared
 * lock, or a non-rotating refresh token) is a decision for whoever deploys it.
 */

import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';

import { apiBaseUrl } from './api';
import type { Schemas } from './api';

export const REFRESH_COOKIE = 'athletos_refresh';
export const ACCESS_COOKIE = 'athletos_access';

type TokenPair = Schemas['TokenPair'];

/**
 * `secure` is off in development only, because `localhost` is not https and a
 * secure cookie would simply never be stored. `lax` rather than `strict`: the
 * app is navigated to from the homescreen shortcut, and `strict` drops the
 * cookie on that first navigation.
 */
function cookieOptions(maxAge: number) {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: !dev,
		maxAge: Math.max(1, Math.floor(maxAge))
	};
}

/** Seconds from now until an RFC 3339 instant, floored at zero. */
function secondsUntil(instant: string): number {
	const at = Date.parse(instant);
	if (Number.isNaN(at)) return 0;
	return Math.floor((at - Date.now()) / 1000);
}

/**
 * Writes a freshly issued pair into the two cookies.
 *
 * The access cookie is deliberately given a minute less than the token's real
 * lifetime, so a token cannot be picked out of the jar and used in the second
 * it expires.
 */
export function storeSession(cookies: Cookies, pair: TokenPair): void {
	cookies.set(ACCESS_COOKIE, pair.access_token, cookieOptions(pair.expires_in - 60));
	cookies.set(
		REFRESH_COOKIE,
		pair.refresh_token,
		cookieOptions(secondsUntil(pair.refresh_token_expires_at))
	);
}

export function clearSession(cookies: Cookies): void {
	cookies.delete(ACCESS_COOKIE, { path: '/' });
	cookies.delete(REFRESH_COOKIE, { path: '/' });
}

/** The refresh token this request arrived with, for `POST /v1/auth/logout`. */
export function refreshTokenOf(cookies: Cookies): string | undefined {
	return cookies.get(REFRESH_COOKIE);
}

/**
 * In-flight refreshes, keyed by the token being spent.
 *
 * Not a cache: an entry lives only as long as the exchange it represents.
 */
const inFlight = new Map<string, Promise<Exchange>>();

/**
 * The three outcomes of spending a refresh token, kept apart on purpose.
 *
 * `refused` is the session actually being over — the token was spent, revoked
 * or expired — and is the only one that may clear the cookie. `unreachable` is
 * the API being down, which must not log anybody out: the athlete would come
 * back from a deploy to a login screen, having lost a session they still hold a
 * perfectly good refresh token for.
 */
type Exchange = TokenPair | 'refused' | 'unreachable';

async function exchange(refreshToken: string, fetch: typeof globalThis.fetch): Promise<Exchange> {
	let response: Response;

	try {
		response = await fetch(`${apiBaseUrl()}/v1/auth/refresh`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refresh_token: refreshToken })
		});
	} catch {
		return 'unreachable';
	}

	if (response.status === 401) return 'refused';
	if (!response.ok) return 'unreachable';

	try {
		return (await response.json()) as TokenPair;
	} catch {
		return 'unreachable';
	}
}

function refreshOnce(refreshToken: string, fetch: typeof globalThis.fetch): Promise<Exchange> {
	const existing = inFlight.get(refreshToken);
	if (existing) return existing;

	const attempt = exchange(refreshToken, fetch).finally(() => inFlight.delete(refreshToken));
	inFlight.set(refreshToken, attempt);
	return attempt;
}

/**
 * The access token for this request, refreshing only when there is not one.
 *
 * Returns `null` for an anonymous request and for a session the API has
 * refused; the two are the same thing to everything downstream.
 */
export async function authenticate(event: RequestEvent): Promise<string | null> {
	const cached = event.cookies.get(ACCESS_COOKIE);
	if (cached) return cached;

	const refreshToken = event.cookies.get(REFRESH_COOKIE);
	if (!refreshToken) return null;

	const outcome = await refreshOnce(refreshToken, event.fetch);

	if (outcome === 'refused') {
		clearSession(event.cookies);
		return null;
	}

	if (outcome === 'unreachable') return null;

	storeSession(event.cookies, outcome);
	return outcome.access_token;
}
