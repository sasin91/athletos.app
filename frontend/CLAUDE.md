# Frontend

SvelteKit 2.63 · **Svelte 5 (runes)** · Tailwind 4 · DaisyUI 5 · TypeScript 6 ·
Vitest · Playwright · `adapter-auto`.

## Svelte documentation

`.mcp.json` configures a Svelte MCP server (`https://mcp.svelte.dev/mcp`). **It
is frequently not connected**, and earlier revisions of this file instructed
readers to call `list-sections`, `get-documentation` and `svelte-autofixer`
unconditionally — tools that then do not exist. Check whether the server is
actually attached before reaching for it.

When it is not, fetch the docs directly. These are complete and need no server:

- `https://svelte.dev/llms-full.txt` — Svelte 5 core, including runes
- `https://svelte.dev/docs/kit/llms.txt` — SvelteKit
- `https://svelte.dev/docs/kit/service-workers` — the offline layer. The index
  above is thin on this one; fetch the page.

## Rules that are not style preferences

**Runes, always.** `$state`, `$derived`, `$props`, `$effect`. Never `export let`,
and never a legacy store where a rune fits. Runes mode is forced in
`vite.config.ts` for everything outside `node_modules`.

**The browser never holds a token (D-11).** Two httpOnly cookies, read and
written server-side in `hooks.server.ts`. Every call to the Rust API goes
through `event.locals.api` from a `+page.server.ts` load, a form action, or a
`+server.ts` route. `$lib/server/**` is server-only by SvelteKit's own rule, so
importing it from a component is a build error rather than a leak.

**No business logic here (D-11).** Rounding, plate breakdowns, next-session
selection, progress denominators and drift are computed in Rust and arrive in
the response. Anything computed in a `+page.server.ts` is something the future
native client has to reimplement in another language. If you find yourself
working out a weight, stop.

**The API client is generated, never hand-written.**

```
npm run generate:api      # backend/openapi.json -> src/lib/api/schema.d.ts
```

The output is committed and is in `.prettierignore` and eslint's `ignores`.
Regenerate it in the same change as any backend DTO edit.

## Layout

```
src/lib/*.ts          pure logic: uuid, time, pace, session, queue. Unit tested.
src/lib/storage.ts    IndexedDB. Deliberately thin — it cannot be unit tested.
src/lib/server/**     API client and the cookie session. Server-only.
src/routes/(app)/**   everything that needs an athlete; one auth gate for all of it
src/routes/session/   the offline logger: `ssr = false`, `prerender = true`
src/service-worker.ts the app shell cache
```

The root layout has **no** `+layout.server.ts` on purpose: `/session` is
prerendered so the service worker can serve it with no network, and a server
load above it would want cookies at build time.

## Commands

```
npm run dev
npm run check        # svelte-check. Must be clean.
npm run lint         # prettier --check && eslint
npm run format
npm run build
npm run test:unit    # vitest — pure logic, no browser, genuinely runs
npm run test:e2e     # playwright — needs a build; downloads a browser
npm run test         # both
```

## What cannot be verified here

There is no Postgres and no running API on the development machine. Every screen
below the login page is type-checked against the generated contract and has
never been exercised against a real response. See the phase 4 notes in
`../docs/MILESTONE-1.md` for the explicit list.
