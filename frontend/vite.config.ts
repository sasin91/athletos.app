import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// `sveltekit()` deliberately takes no arguments. Kit 2.62+ will accept its
	// configuration here too, but passing even one option makes it ignore
	// `svelte.config.js` outright — adapter and all — with nothing but a console
	// warning in the build log to say so. The adapter and the compiler options
	// live in `svelte.config.js`, which is also the only one of the two files
	// `svelte-check` and `eslint-plugin-svelte` know how to read.
	plugins: [tailwindcss(), sveltekit()]
});
