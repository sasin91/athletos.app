import { expect, test } from '@playwright/test';

/**
 * The only end-to-end test there is, and it is deliberately small.
 *
 * There is no Postgres and no running API on the development machine (see
 * DEVELOPMENT.md), so nothing that touches an athlete, a program or a workout
 * can be exercised end to end. Writing tests that mock the API at this level
 * would prove that the mocks agree with each other and nothing else.
 *
 * What this *does* prove needs no API at all, and is worth proving: the built
 * app boots under `vite preview`, `hooks.server.ts` survives a request with no
 * cookies without reaching for a token, and the first screen an athlete sees
 * renders. Every one of those broke at least once while phase 4 was written.
 */
test('the app serves its sign-in page with no API behind it', async ({ page }) => {
	await page.goto('/login');

	await expect(page.getByRole('heading', { name: 'AthletOS' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
});

test('an anonymous visitor is sent to sign in rather than to an error', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveURL(/\/login/);
});
