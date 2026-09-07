import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { commitEditableSession } from '../../lib/editable-session';

const athleteId = '00000000-0000-4000-8000-000000000001';
const session = commitEditableSession(
	{
		schema_version: 2,
		athlete_id: athleteId,
		title: 'Offline workout',
		source: 'ad_hoc',
		exercises: [{ key: 'squat', label: 'Squat', cues: [], loading: 'barbell', is_primary: true }],
		sets: [
			{
				id: '00000000-0000-4000-8000-000000000002',
				block_id: '00000000-0000-4000-8000-000000000003',
				exercise: 'squat',
				label: 'Squat',
				prescribed_weight: 20,
				prescribed_reps: 5,
				amrap: false,
				plates_per_side: []
			}
		]
	},
	{ id: '00000000-0000-4000-8000-000000000004', startedAt: '' }
);

async function seed(page: Page) {
	await page.goto('/session');
	await expect(page.getByText('No session committed')).toBeVisible();
	await page.evaluate(
		async ({ athleteId, session }) => {
			await new Promise<void>((resolve, reject) => {
				const open = indexedDB.open('athletos', 2);
				open.onsuccess = () => {
					const db = open.result;
					const tx = db.transaction(['active', 'meta'], 'readwrite');
					tx.objectStore('active').put(session, athleteId);
					tx.objectStore('meta').put(athleteId, 'athlete');
					tx.oncomplete = () => {
						db.close();
						resolve();
					};
					tx.onerror = () => reject(tx.error);
				};
			});
		},
		{ athleteId, session }
	);
	await page.reload();
	await expect(page.getByRole('button', { name: 'Start workout', exact: true })).toBeVisible();
}

async function stored(page: Page) {
	return page.evaluate(
		async (athleteId) =>
			new Promise<{ active: unknown; queue: unknown[] }>((resolve) => {
				const open = indexedDB.open('athletos', 2);
				open.onsuccess = () => {
					const db = open.result;
					const tx = db.transaction(['active', 'queue'], 'readonly');
					const active = tx.objectStore('active').get(athleteId);
					const queue = tx.objectStore('queue').getAll();
					tx.oncomplete = () => {
						db.close();
						resolve({ active: active.result ?? null, queue: queue.result });
					};
				};
			}),
		athleteId
	);
}

test('prepared edits survive reload, then finishing offline atomically queues the session', async ({
	page
}, testInfo) => {
	await page.setViewportSize({ width: 440, height: 960 });
	await seed(page);
	await page.getByRole('textbox', { name: 'kg', exact: true }).fill('20,25');
	await page.getByRole('button', { name: 'Add set', exact: true }).click();
	await page.reload();
	await expect(page.getByRole('button', { name: 'Remove set', exact: true })).toHaveCount(2);
	await expect(page.getByRole('textbox', { name: 'kg', exact: true }).first()).toHaveValue('20.25');
	await page.screenshot({ path: testInfo.outputPath('session-editor.png'), fullPage: true });
	await page.getByRole('button', { name: 'Remove set', exact: true }).last().click();
	await page.getByRole('button', { name: 'Start workout', exact: true }).click();
	await page.getByRole('button', { name: 'Log', exact: true }).click();
	await page.route('**/api/athlete', (route) => route.abort());
	await page.getByRole('button', { name: 'Finish session', exact: true }).click();
	await expect(
		page.getByText('Saved on this device and not sent yet.', { exact: false })
	).toBeVisible();
	const documents = await stored(page);
	expect(documents.active).toBeNull();
	expect(documents.queue).toHaveLength(1);
	expect(documents.queue[0]).toMatchObject({
		athleteId,
		schemaVersion: 2,
		submission: { source: 'ad_hoc', sets: [{ status: 'done' }, { removed: true, logged_at: null }] }
	});
});

test('an aborted finish transaction leaves the active session recoverable and no partial queue item', async ({
	page
}) => {
	await seed(page);
	await page.getByRole('button', { name: 'Start workout', exact: true }).click();
	await page.getByRole('button', { name: 'Log', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Finish session', exact: true })).toBeVisible();
	await page.evaluate(() => {
		const original = IDBDatabase.prototype.transaction;
		IDBDatabase.prototype.transaction = function (...args: Parameters<IDBDatabase['transaction']>) {
			const tx = original.apply(this, args);
			if (Array.isArray(args[0]) && args[0].length === 2 && args[0].includes('queue')) {
				IDBDatabase.prototype.transaction = original;
				queueMicrotask(() => tx.abort());
			}
			return tx;
		};
	});
	await page.getByRole('button', { name: 'Finish session', exact: true }).click();
	await expect(
		page.getByText('Could not save the finished workout.', { exact: false })
	).toBeVisible();
	const documents = await stored(page);
	expect(documents.active).toMatchObject({ id: session.id, sets: [{ status: 'done' }] });
	expect(documents.queue).toHaveLength(0);
	await page.reload();
	await expect(page.getByRole('button', { name: 'Finish session', exact: true })).toBeVisible();
});

test('a pre-upgrade session finishes through v1 after verified enrollment ownership', async ({
	page
}) => {
	await page.goto('/session');
	await expect(page.getByText('No session committed')).toBeVisible();
	await page.evaluate(async (session) => {
		await new Promise<void>((resolve) => {
			const open = indexedDB.open('athletos', 2);
			open.onsuccess = () => {
				const db = open.result;
				const tx = db.transaction('active', 'readwrite');
				const legacy = { ...session };
				delete legacy.athleteId;
				delete legacy.schemaVersion;
				delete legacy.source;
				tx.objectStore('active').put(
					{ ...legacy, enrollmentId: 'legacy-enrollment', startedAt: new Date().toISOString() },
					'current'
				);
				tx.oncomplete = () => {
					db.close();
					resolve();
				};
			};
		});
	}, session);
	await page.route('**/api/athlete', (route) =>
		route.fulfill({ json: { id: athleteId, enrollment_ids: ['legacy-enrollment'] } })
	);
	let submitted: unknown;
	await page.route('**/api/workouts', (route) => {
		submitted = route.request().postDataJSON();
		return route.fulfill({ status: 201, json: { id: session.id } });
	});
	await page.reload();
	await page.getByRole('button', { name: 'Log', exact: true }).click();
	await page.getByRole('button', { name: 'Finish session', exact: true }).click();
	await expect(page.getByText('Workout recorded.')).toBeVisible();
	expect(submitted).toMatchObject({
		enrollment_id: 'legacy-enrollment',
		sets: [{ position: 0, status: 'done' }]
	});
	expect(submitted).not.toHaveProperty('source');
	expect((await stored(page)).queue).toHaveLength(0);
});

test('switching athlete scopes hides the other account active workout without deleting it', async ({
	page
}) => {
	await seed(page);
	await page.evaluate(async () => {
		await new Promise<void>((resolve) => {
			const open = indexedDB.open('athletos', 2);
			open.onsuccess = () => {
				const db = open.result;
				const tx = db.transaction('meta', 'readwrite');
				tx.objectStore('meta').put('another-athlete', 'athlete');
				tx.oncomplete = () => {
					db.close();
					resolve();
				};
			};
		});
	});
	await page.reload();
	await expect(page.getByText('No session committed')).toBeVisible();
	expect((await stored(page)).active).toMatchObject({ id: session.id, athleteId });
});
