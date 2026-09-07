import { expect, test, type Page } from '@playwright/test';

// These flows exercise the actual API and database. Enable against an isolated
// API via API_BASE_URL when starting the frontend; each run owns fresh accounts.
test.skip(process.env.ATHLETOS_LIVE_E2E !== '1', 'Requires an isolated running API and database.');
test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(({ page }) => {
	page.on('pageerror', (error) => console.error('Browser error:', error.message));
	page.on('requestfailed', (request) =>
		console.error('Failed request:', request.url(), request.failure()?.errorText)
	);
});

async function register(page: Page, resumeShare = false) {
	if (!resumeShare) await page.goto('/register');
	await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Workout browser test');
	await page
		.getByRole('textbox', { name: 'Email', exact: true })
		.fill(`workouts-${crypto.randomUUID()}@example.test`);
	await page.getByLabel(/^Password/).fill(`${crypto.randomUUID()}-${crypto.randomUUID()}`);
	await page.getByRole('button', { name: 'Create account', exact: true }).click();
	await expect(page).toHaveURL(resumeShare ? /\/shared\/workouts\// : /\/maxes$/);
}

async function createWorkout(page: Page, title: string) {
	await page.goto('/workouts/new');
	await page.getByRole('textbox', { name: 'Workout name' }).fill(title);
	await page.getByRole('combobox', { name: 'Exercise', exact: true }).selectOption('squat');
	await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
	await page.getByRole('textbox', { name: 'Weight for group 1' }).fill('60,25');
	await page.getByRole('button', { name: 'Save workout', exact: true }).click();
	await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
	return page.url();
}

test('an owned workout can be edited, duplicated and archived', async ({ page }) => {
	await register(page);
	await createWorkout(page, 'Browser pull day');
	await page.screenshot({ path: '/tmp/athletos-workout-detail.png', fullPage: true });
	await page.getByRole('link', { name: 'Edit saved workout' }).click();
	await page.screenshot({ path: '/tmp/athletos-workout-editor.png', fullPage: true });
	await page.getByRole('textbox', { name: 'Workout name' }).fill('Revised pull day');
	await page.getByRole('button', { name: 'Save workout', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Revised pull day' })).toBeVisible();
	await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Edit saved workout' })).toBeVisible();
	await page.getByRole('textbox', { name: 'Workout name' }).fill('Independent copy');
	await page.getByRole('button', { name: 'Save workout', exact: true }).click();
	await page.locator('summary').filter({ hasText: 'Archive workout' }).click();
	await page.getByRole('button', { name: 'Archive workout', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'My workouts' })).toBeVisible();
	await page.screenshot({ path: '/tmp/athletos-workout-library.png', fullPage: true });
	await expect(page.getByRole('heading', { name: 'Revised pull day' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Independent copy' })).not.toBeVisible();
});

test('a stale editor retains its draft and can save it independently', async ({
	page,
	context
}) => {
	await register(page);
	const workoutUrl = await createWorkout(page, 'Shared editing baseline');
	const other = await context.newPage();
	await page.goto(`${workoutUrl}/edit`);
	await other.goto(`${workoutUrl}/edit`);
	await page.getByRole('textbox', { name: 'Workout name' }).fill('Saved on first page');
	await page.getByRole('button', { name: 'Save workout', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Saved on first page' })).toBeVisible();
	await other.getByRole('textbox', { name: 'Workout name' }).fill('Keep my second draft');
	await other.getByRole('button', { name: 'Save workout', exact: true }).click();
	await expect(other.getByRole('alert')).toContainText('edited elsewhere');
	await expect(other.getByRole('textbox', { name: 'Workout name' })).toHaveValue(
		'Keep my second draft'
	);
	await other.getByRole('button', { name: 'Save as new workout', exact: true }).click();
	await expect(other.getByRole('heading', { name: 'Keep my second draft' })).toBeVisible();
	await page.goto(workoutUrl);
	await expect(page.getByRole('heading', { name: 'Saved on first page' })).toBeVisible();
});

test('a shared version survives owner edits in an independent recipient copy', async ({
	page,
	browser
}) => {
	await register(page);
	const workoutUrl = await createWorkout(page, 'Pinned share workout');
	await page.getByRole('button', { name: 'Create share link', exact: true }).click();
	const link = await page.getByRole('textbox', { name: 'Share link' }).inputValue();
	const recipient = await browser.newContext({ baseURL: new URL(workoutUrl).origin });
	try {
		const preview = await recipient.newPage();
		await preview.goto(link);
		await preview.evaluate(async () => {
			await navigator.serviceWorker.ready;
		});
		await preview.reload();
		await expect(preview.getByRole('heading', { name: 'Pinned share workout' })).toBeVisible();
		await expect(preview.getByRole('heading', { name: 'Squat', exact: true })).toBeVisible();
		await preview.screenshot({ path: '/tmp/athletos-workout-shared.png', fullPage: true });
		const cachedPaths = await preview.evaluate(async () => {
			const entries = await Promise.all(
				(await caches.keys()).map(async (name) =>
					(await (await caches.open(name)).keys()).map((request) => new URL(request.url).pathname)
				)
			);
			return entries.flat();
		});
		expect(
			cachedPaths.some(
				(path) =>
					path.startsWith('/shared/') || path.startsWith('/workouts') || path === '/api/athlete'
			)
		).toBe(false);
		await preview.getByRole('button', { name: 'Sign in to save a copy' }).click();
		await preview.getByRole('link', { name: 'Register', exact: true }).click();
		await register(preview, true);
		await preview.getByRole('button', { name: 'Save a copy', exact: true }).click();
		await expect(preview.getByRole('button', { name: 'Start workout', exact: true })).toBeVisible();
		const copyUrl = preview.url();
		await page.getByRole('link', { name: 'Edit saved workout' }).click();
		await page.getByRole('textbox', { name: 'Workout name' }).fill('Author changed this');
		await page.getByRole('button', { name: 'Save workout', exact: true }).click();
		await preview.goto(link);
		await expect(preview.getByRole('heading', { name: 'Pinned share workout' })).toBeVisible();
		await page.getByRole('button', { name: 'Revoke link', exact: true }).click();
		await expect(page.getByRole('status')).toContainText('Link revoked');
		const unavailable = await preview.goto(link);
		expect(unavailable?.status()).toBe(404);
		await preview.goto(copyUrl);
		await expect(preview.getByRole('heading', { name: 'Pinned share workout' })).toBeVisible();
	} finally {
		await recipient.close();
	}
});

test('an ad-hoc session records through the live API and appears in history', async ({ page }) => {
	await register(page);
	await page.goto('/workouts');
	await page.getByRole('button', { name: 'Build a session', exact: true }).click();
	await expect(page).toHaveURL(/\/session$/);
	await page.getByRole('textbox', { name: 'Workout name' }).fill('Live custom session');
	await page.getByRole('combobox', { name: 'Exercise to add' }).selectOption('squat');
	await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
	await page.getByRole('textbox', { name: 'kg', exact: true }).fill('20,25');
	await page.getByRole('button', { name: 'Start workout', exact: true }).click();
	await page.screenshot({ path: '/tmp/athletos-workout-live-session.png', fullPage: true });
	await page.getByRole('button', { name: 'Log', exact: true }).click();
	const recorded = page.waitForResponse(
		(response) => new URL(response.url()).pathname === '/api/v2/workouts'
	);
	await page.getByRole('button', { name: 'Finish session', exact: true }).click();
	expect((await recorded).status()).toBe(201);
	await page.goto('/history');
	await page.getByRole('link').filter({ hasText: 'Live custom session' }).click();
	await expect(page.getByText('20.25 kg × 5', { exact: true })).toBeVisible();
	await expect(page.getByText('Added to this session', { exact: true })).toBeVisible();
	await expect(page.locator('main')).not.toContainText('week 0');
	await page.screenshot({ path: '/tmp/athletos-workout-history.png', fullPage: true });
	await page.goto('/workouts');
	await expect(page.getByRole('heading', { name: 'Build your first workout' })).toBeVisible();
});
