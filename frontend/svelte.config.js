import adapter from '@sveltejs/adapter-node';

// The adapter decides what `npm run build` emits, and nothing about the
// deployment works until this file says `adapter-node`. It was `adapter-auto`,
// which picks a target by sniffing CI environment variables for Vercel,
// Netlify or Cloudflare — and finding none of them on a Hetzner box, emits
// nothing runnable at all. AthletOS is served by a plain Node process behind
// Caddy (docs/DEPLOYMENT.md), so the build has to produce `build/index.js` and
// a `build/` tree that boots with `node build`.
//
// This lives in `svelte.config.js` rather than inline in `vite.config.ts` for a
// reason that is easy to get wrong. Since kit 2.62 you *may* pass these options
// straight to the `sveltekit()` plugin — but if you do, kit ignores
// `svelte.config.js` entirely and only tells you so with a console warning
// buried in build output. The two forms are mutually exclusive, and the
// separate file is the one the rest of the ecosystem reads: `svelte-check` and
// `eslint-plugin-svelte` load it directly and never see the Vite config. Put
// the options in one place, and make it the place everything looks.
/** @type {import('@sveltejs/kit').Config} */
export default {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},

	kit: {
		// Defaults are right for this deployment: `build/` as the output
		// directory, `PORT` and `HOST` read from the environment at runtime,
		// `ORIGIN` for the CSRF origin check. Those are set in
		// `/etc/athletos/env` on the box, not baked in here — the same bundle
		// has to be servable from a staging hostname without a rebuild.
		adapter: adapter()
	}
};
