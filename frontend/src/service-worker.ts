/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * The app shell, cached so the logger opens with no network (D-09).
 *
 * What this has to guarantee is narrow: launching the app from the homescreen
 * in a basement must reach `/session`, which is prerendered for exactly that
 * reason and therefore lands in `prerendered` below. The committed session
 * itself is in IndexedDB and is not this file's business.
 *
 * What this must **not** do is cache API responses. There is no API traffic
 * from the browser to cache — every call goes through SvelteKit server-side —
 * and the one request the browser does make, `POST /api/workouts`, is not a GET
 * and is skipped. A cached prescription would be a stale prescription.
 */

import { base, build, files, prerendered, version } from '$service-worker';

const worker = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `athletos-${version}`;

/** The built app, the static assets, and every prerendered page. */
const SHELL = [...build, ...files, ...prerendered];

worker.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(SHELL))
			// Take over immediately rather than waiting for every tab to close.
			// A stale shell that cannot open the logger is worse than a reload.
			.then(() => worker.skipWaiting())
	);
});

worker.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
			)
			.then(() => worker.clients.claim())
	);
});

worker.addEventListener('fetch', (event) => {
	const request = event.request;

	// Only GETs, only this origin. The submit is a POST and must reach the
	// network or fail honestly so the queue can retry it — a service worker
	// that quietly answered it would break the one guarantee D-09 makes.
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== location.origin) return;

	event.respondWith(respond(request, url));
});

async function respond(request: Request, url: URL): Promise<Response> {
	const cache = await caches.open(CACHE);

	// Hashed build output and static files are immutable: cache wins, always,
	// and there is no reason to ask the network.
	const path = url.pathname;
	if (SHELL.includes(path) || SHELL.includes(path.replace(base, ''))) {
		const cached = await cache.match(path);
		if (cached) return cached;
	}

	try {
		const response = await fetch(request);

		// Only opaque-free, successful, non-partial responses are worth keeping.
		if (response.status === 200 && response.type === 'basic') {
			cache.put(request, response.clone());
		}

		return response;
	} catch (failure) {
		const cached = await cache.match(request);
		if (cached) return cached;

		throw failure;
	}
}
