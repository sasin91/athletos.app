import { defineConfig } from 'vitest/config';

/**
 * Unit tests for the pure logic, and nothing else.
 *
 * A separate config from `vite.config.ts` on purpose: these tests need no
 * SvelteKit, no DOM and no build. The offline queue, the UUIDv7 generation, the
 * pace projection and the elapsed-time formatting are plain TypeScript
 * precisely so that the parts most likely to be wrong can be checked in
 * milliseconds — the same reasoning D-15 applies to the training crate.
 *
 * Anything that needs a browser (IndexedDB in `storage.ts`, the Svelte
 * components) is deliberately not here. See `playwright.config.ts` for what
 * would test those, and MILESTONE-1 for why none of it has been run.
 */
export default defineConfig({
	test: {
		include: ['src/lib/**/*.test.ts'],
		environment: 'node'
	}
});
