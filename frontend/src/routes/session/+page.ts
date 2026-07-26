/**
 * The logger is a static shell, on purpose (D-09).
 *
 * `ssr = false` — there is nothing to render on the server. The committed
 * session lives in IndexedDB on this device and the server has never heard of
 * it; `started_at` reaches Rust only with the finished submit.
 *
 * `prerender = true` — this is what makes the page open with no network. The
 * built HTML is emitted at build time, lands in `$service-worker`'s
 * `prerendered` list, and is cached by the service worker on install. The
 * athlete can be in a basement, launch the app from the homescreen, and get the
 * logger.
 *
 * A page with a `+page.server.ts` could do neither.
 */
export const ssr = false;
export const prerender = true;
