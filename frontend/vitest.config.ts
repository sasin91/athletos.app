import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

/**
 * Unit tests for pure logic and server-renderable route composition.
 *
 * A separate config from `vite.config.ts` on purpose: these tests need no
 * SvelteKit, no DOM and no build. The offline queue, the UUIDv7 generation, the
 * pace projection and the elapsed-time formatting are plain TypeScript
 * precisely so that the parts most likely to be wrong can be checked in
 * milliseconds — the same reasoning D-15 applies to the training crate.
 *
 * Browser-owned behavior (IndexedDB in `storage.ts`) stays in Playwright. Pure
 * Svelte components may render through `svelte/server` here: that exercises
 * their markup and accessibility without introducing a DOM or a browser.
 */
export default defineConfig({
	plugins: [svelte()],
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
			'$app/paths': fileURLToPath(new URL('./src/lib/test/app-paths.ts', import.meta.url))
		}
	},
	test: {
		include: ['src/lib/**/*.test.ts', 'src/routes/**/*.test.ts'],
		environment: 'node'
	}
});
