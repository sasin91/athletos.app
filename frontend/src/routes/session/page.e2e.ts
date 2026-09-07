import { expect, test, type Page } from '@playwright/test';
import type {
	LocalSession,
	LocalSet,
	PlateChange,
	WorkoutReceipt,
	WorkoutSubmission
} from '$lib/session';

/**
 * The logger reads a committed session out of IndexedDB and never touches the
 * network (`ssr = false`, `prerender = true` — see `+page.ts`). That is what
 * makes it cheap to test end to end: there is no API, no auth and no real
 * workout to stand up, only a database row to write before the page loads.
 *
 * This writes that row exactly the way `storage.ts` does — same database
 * (`athletos`), same store (`active`), same key (`current`) — so the app's own
 * `loadActiveSession` finds it without knowing it was not `saveActiveSession`
 * that put it there. Done through `page.evaluate` against a page already
 * loaded on the app's origin, and awaited to completion, so the seed is
 * durable before the next `page.goto` triggers the logger's own read.
 *
 * `/login` is where that first navigation lands: static, needs no API, and
 * already proven to boot with nothing behind it. `about:blank` would not
 * do — IndexedDB is denied outright on its opaque origin.
 */
async function seedSession(page: Page, session: LocalSession) {
	// Finishing verifies ownership before draining the device queue. Keep that
	// request real up to its BFF boundary, just like the receipt fixture below.
	await page.route('/api/athlete', (route) =>
		route.fulfill({
			json: { id: 'e2e-athlete', enrollment_ids: [session.enrollmentId] }
		})
	);
	await page.goto('/login');
	await page.evaluate(async (data) => {
		await new Promise<void>((resolve, reject) => {
			// First seed creates v1; later seeds also work after the logger's v2 upgrade.
			const request = indexedDB.open('athletos');

			request.onupgradeneeded = () => {
				const db = request.result;
				if (!db.objectStoreNames.contains('active')) db.createObjectStore('active');
				if (!db.objectStoreNames.contains('queue'))
					db.createObjectStore('queue', { keyPath: 'id' });
			};

			request.onsuccess = () => {
				const db = request.result;
				const tx = db.transaction('active', 'readwrite');
				tx.objectStore('active').put(data, 'current');
				tx.oncomplete = () => {
					db.close();
					resolve();
				};
				tx.onerror = () => reject(tx.error);
			};

			request.onerror = () => reject(request.error);
		});
	}, session);
}

/** One set, defaulted to sitting at its own prescription, untouched. */
function set(overrides: Partial<LocalSet> = {}): LocalSet {
	return {
		position: 0,
		exercise: 'squat',
		label: 'Squat',
		prescribedWeight: 100,
		prescribedReps: 5,
		amrap: false,
		platesPerSide: [20, 5],
		plateChange: null,
		actualWeight: 100,
		actualReps: 5,
		status: 'pending',
		loggedAt: null,
		note: null,
		driftReason: null,
		...overrides
	};
}

function session(sets: LocalSet[], overrides: Partial<LocalSession> = {}): LocalSession {
	return {
		id: 'e2e-session',
		enrollmentId: 'e2e-enrollment',
		programKey: 'wendler-531-bbb',
		week: 1,
		day: 1,
		focus: 'squat',
		startedAt: '2026-08-05T09:55:00.000Z',
		secondsPerSet: null,
		sets,
		cues: {},
		...overrides
	};
}

function plateChange(overrides: Partial<PlateChange> = {}): PlateChange {
	return { add: [], remove: [], plates_per_side: [], ...overrides };
}

function completionReceipt(): WorkoutReceipt {
	return {
		id: 'e2e-session',
		enrollment_id: 'e2e-enrollment',
		week: 1,
		day: 1,
		duplicate: false,
		progress: { completed: 1, total: 4 },
		summary: {
			load_moved_kg: 570,
			load_prescribed_kg: 520,
			sets_over: 3,
			sets_under: 0,
			weight_changes: [
				{
					exercise: 'barbell-row',
					label: 'Barbell row',
					prescribed_weight: 85,
					actual_weight: 100,
					sets: 2
				},
				{
					exercise: 'bench-press',
					label: 'Bench press',
					prescribed_weight: 80,
					actual_weight: 90,
					sets: 1
				}
			],
			duration_seconds: 3300,
			average_duration_seconds: null,
			intervals: {
				min_seconds: 45,
				average_seconds: 75,
				median_seconds: 60,
				max_seconds: 120,
				discarded: 0
			}
		}
	};
}

// ---------------------------------------------------------------------------
// Arm 1 — a live plate change.
// ---------------------------------------------------------------------------

test('a live plate change instructs what to move, and draws the resulting stack', async ({
	page
}) => {
	await seedSession(
		page,
		session([
			set({
				plateChange: plateChange({ remove: [5, 2.5], add: [10], plates_per_side: [20, 10] })
			})
		])
	);
	await page.goto('/session');

	await expect(page.getByText('take off', { exact: true })).toBeVisible();
	await expect(page.getByText('5, 2.5', { exact: true })).toBeVisible();
	await expect(page.getByText('add', { exact: true })).toBeVisible();
	// The whole instruction rather than the bare number. `10` on its own stopped
	// being unique once the plate drawing started printing each plate's value on
	// its face: it matched the instruction and the 10 kg plate both, and a
	// strict-mode violation is not the same thing as a regression.
	await expect(page.getByText('add 10 per side', { exact: true })).toBeVisible();

	// The plate diagram's accessible text — what anyone actually loading the
	// bar needs said out loud, per Plates.svelte.
	await expect(page.getByText('20 kg bar plus 20, 10 kg per side', { exact: true })).toBeVisible();
});

test('plate layout defaults to Bumper and persists Old school', async ({ page }) => {
	await seedSession(
		page,
		session([set({ plateChange: plateChange({ plates_per_side: [20, 10] }) })])
	);
	await page.goto('/session');

	const twenty = page.locator('[data-plate-weight="20"]').first();
	const ten = page.locator('[data-plate-weight="10"]').first();
	const bumper = page.getByRole('button', { name: 'Bumper', exact: true });
	const oldSchool = page.getByRole('button', { name: 'Old school', exact: true });

	await expect(bumper).toHaveAttribute('aria-pressed', 'true');
	let twentyBox = await twenty.boundingBox();
	let tenBox = await ten.boundingBox();
	expect(twentyBox?.height).toBe(tenBox?.height);
	expect(twentyBox?.width).not.toBe(tenBox?.width);

	await oldSchool.click();
	twentyBox = await twenty.boundingBox();
	tenBox = await ten.boundingBox();
	expect(twentyBox?.height).toBeGreaterThan(tenBox?.height ?? 0);
	expect(twentyBox?.width).toBe(tenBox?.width);

	await page.reload();
	await expect(page.getByRole('button', { name: 'Old school', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
});

// ---------------------------------------------------------------------------
// Arm 2 — "bar is already loaded". The Critical bug (fixed in b8b0c61) was
// here: a skipped set stood in for a lifted one because `barUnchangedFrom`
// filtered on `status !== 'pending'` instead of `status === 'done'`.
// ---------------------------------------------------------------------------

test('a previous done set at the same weight says the bar is already loaded, with no diagram', async ({
	page
}) => {
	await seedSession(
		page,
		session([
			// Logged as prescribed: 100 kg, no drift.
			set({ position: 0, status: 'done', loggedAt: '2026-08-05T10:00:00.000Z' }),
			// A skip between the two — same weight, never touched — which is
			// what stales the *plan* for position 2 without being the set
			// `barUnchangedFrom` is allowed to answer from.
			set({ position: 1, status: 'skipped', loggedAt: '2026-08-05T10:05:00.000Z' }),
			// Same 100 kg again. Its own plan exists but is stale because of
			// the skip; the true instruction is that the bar never moved.
			set({ position: 2, plateChange: plateChange({ plates_per_side: [20, 20] }) })
		])
	);
	await page.goto('/session');

	await expect(page.getByText('bar is already loaded', { exact: true })).toBeVisible();
	await expect(page.getByText('20 kg bar plus', { exact: false })).not.toBeVisible();
});

test('a previous skipped set at the same weight does not say the bar is loaded', async ({
	page
}) => {
	// The regression guard for b8b0c61. A skip leaves `actualWeight` at
	// whatever was pre-filled — untouched, not a record of what the bar
	// holds. Nobody touched this bar, so the screen must not claim it is
	// loaded; it should fall through to the dimmed breakdown instead.
	await seedSession(
		page,
		session([
			set({ position: 0, status: 'skipped', loggedAt: '2026-08-05T10:00:00.000Z' }),
			set({ position: 1, plateChange: plateChange({ plates_per_side: [20, 20] }) })
		])
	);
	await page.goto('/session');

	await expect(page.getByText('bar is already loaded', { exact: true })).not.toBeVisible();
	await expect(page.getByText('for the prescribed 100 kg', { exact: true })).toBeVisible();
});

// ---------------------------------------------------------------------------
// Arm 3 — the dimmed absolute breakdown.
// ---------------------------------------------------------------------------

test('a stale plan at the set’s own prescription shows the dimmed breakdown', async ({ page }) => {
	await seedSession(
		page,
		session([
			// An earlier set of the same exercise was skipped, which stales
			// the plan below without making the bar "already loaded" — that
			// needs a *done* predecessor, which this set does not have.
			set({ position: 0, status: 'skipped', loggedAt: '2026-08-05T10:00:00.000Z' }),
			set({
				position: 1,
				plateChange: plateChange({ plates_per_side: [20, 20] }),
				platesPerSide: [20, 20]
			})
		])
	);
	await page.goto('/session');

	await expect(page.getByText('for the prescribed 100 kg', { exact: true })).toBeVisible();
	await expect(page.getByText('20 kg bar plus 20, 20 kg per side', { exact: true })).toBeVisible();
	await expect(page.getByText('bar is already loaded', { exact: true })).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// Arm 4 — nothing. A deviated set with no usable plan shows none of the
// other three arms, not merely one of them.
// ---------------------------------------------------------------------------

test('a deviated set with no usable plan shows no plate guidance at all', async ({ page }) => {
	await seedSession(
		page,
		session([
			set({
				actualWeight: 115,
				// A plan exists, but it is for the 100 kg this set was never
				// loaded to — `plateChangeFor` must not let it leak through
				// just because it is present.
				plateChange: plateChange({ remove: [5], add: [15], plates_per_side: [25] }),
				platesPerSide: [20, 5]
			})
		])
	);
	await page.goto('/session');

	await expect(page.getByText('take off', { exact: true })).not.toBeVisible();
	await expect(page.getByText('add', { exact: true })).not.toBeVisible();
	await expect(page.getByText('bar is already loaded', { exact: true })).not.toBeVisible();
	await expect(page.getByText('for the prescribed 100 kg', { exact: true })).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// The drift-reason chips, on the same screen and equally unrendered by any
// test until now.
// ---------------------------------------------------------------------------

test('drift-reason chips are hidden at the prescription and appear once the weight is edited', async ({
	page
}) => {
	await seedSession(page, session([set()]));
	await page.goto('/session');

	await expect(page.getByRole('button', { name: 'too easy', exact: true })).not.toBeVisible();

	await page.getByLabel('Weight in kilograms').fill('110');

	await expect(page.getByRole('button', { name: 'too easy', exact: true })).toBeVisible();
});

test('the live weight shows its signed change from prescription', async ({ page }) => {
	await seedSession(page, session([set({ actualWeight: 115 })]));
	await page.goto('/session');
	await expect(page.getByTestId('weight-change')).toHaveText('+15 kg');
	await page.getByLabel('Weight in kilograms').fill('90');
	await expect(page.getByTestId('weight-change')).toHaveText('-10 kg');
	await page.getByLabel('Weight in kilograms').fill('100');
	await expect(page.getByTestId('weight-change')).not.toBeVisible();
});

test('the live weight formats a decimal change without floating-point noise', async ({ page }) => {
	await seedSession(page, session([set({ prescribedWeight: 97.5, actualWeight: 97.5 })]));
	await page.goto('/session');
	await page.getByLabel('Weight in kilograms').fill('99.9');
	await expect(page.getByTestId('weight-change')).toHaveText('+2.4 kg');
});

test('an inherited weight hides reasons until directly edited', async ({ page }) => {
	await seedSession(page, session([set({ actualWeight: 115, weightInherited: true })]));
	await page.goto('/session');
	await expect(page.getByRole('button', { name: 'too easy', exact: true })).not.toBeVisible();
	await page.getByLabel('Reps').fill('3');
	await expect(page.getByRole('button', { name: 'too easy', exact: true })).not.toBeVisible();
	await page.getByLabel('Weight in kilograms').fill('110');
	await expect(page.getByRole('button', { name: 'too easy', exact: true })).toBeVisible();
});

test('Add note has a full touch target and opens the editor', async ({ page }) => {
	await seedSession(page, session([set()]));
	await page.goto('/session');
	const addNote = page.getByRole('button', { name: 'Add note', exact: true });
	const box = await addNote.boundingBox();
	expect(box?.width).toBeGreaterThanOrEqual(44);
	expect(box?.height).toBeGreaterThanOrEqual(44);
	await addNote.click();
	await expect(page.getByLabel('Note for this set')).toBeVisible();
});

test('tapping a drift-reason chip marks it pressed, and tapping it again clears it', async ({
	page
}) => {
	await seedSession(page, session([set({ actualWeight: 115 })]));
	await page.goto('/session');

	const tooHeavy = page.getByRole('button', { name: 'too heavy', exact: true });
	await expect(tooHeavy).toHaveAttribute('aria-pressed', 'false');

	await tooHeavy.click();
	await expect(tooHeavy).toHaveAttribute('aria-pressed', 'true');

	await tooHeavy.click();
	await expect(tooHeavy).toHaveAttribute('aria-pressed', 'false');
});

// ---------------------------------------------------------------------------
// Completion means every set is answered. A skip is an answer, so a mixed
// logger gets the ordinary finish button; ending reasons are only for work
// that remains pending. The receipt is server-computed and rendered verbatim,
// apart from local number and duration formatting.
// ---------------------------------------------------------------------------

test('a fully answered mixed session finishes normally and shows its receipt', async ({ page }) => {
	await seedSession(
		page,
		session([
			set({ position: 0 }),
			set({
				position: 1,
				exercise: 'barbell-row',
				label: 'Barbell row',
				prescribedWeight: 85,
				actualWeight: 100
			}),
			set({ position: 2 })
		])
	);
	await page.route('/api/workouts', async (route) => {
		await route.fulfill({ status: 201, json: completionReceipt() });
	});
	await page.goto('/session');

	// This catches a completion predicate that counts skips as pending work.
	await page.getByRole('button', { name: 'Skip set' }).first().click();
	await page.getByRole('button', { name: 'Log', exact: true }).first().click();
	await page.getByRole('button', { name: 'Skip set' }).first().click();

	await expect(page.getByRole('button', { name: 'Finish session' })).toBeVisible();
	await expect(page.getByText('End session early')).not.toBeVisible();

	await page.getByRole('button', { name: 'Finish session' }).click();

	for (const label of ['Load moved', 'Load prescribed', 'Fastest', 'Average', 'Longest']) {
		await expect(page.getByText(label, { exact: true })).toBeVisible();
	}
	for (const value of ['Barbell row', '85 → 100 kg', '+15 kg', '2 sets']) {
		await expect(page.getByText(value, { exact: true })).toBeVisible();
	}
	const rows = page.getByTestId('between-set-interval-row');
	await expect(rows).toHaveCount(3);
	const tops = await rows.evaluateAll((items) =>
		items.map((item) => item.getBoundingClientRect().top)
	);
	expect(new Set(tops).size).toBe(3);
	await expect(page.getByText('fastest · average · longest', { exact: false })).not.toBeVisible();
	await expect(page.getByText('Bench press', { exact: true })).toBeVisible();
	await expect(page.getByText('80 → 90 kg', { exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'See where the hour went' })).toBeVisible();
});

test('ending early still offers the ordered reason choices while a set is pending', async ({
	page
}) => {
	await seedSession(page, session([set({ position: 0 }), set({ position: 1 })]));
	await page.goto('/session');

	await page.getByRole('button', { name: 'End session early' }).click();

	const reasons = page
		.getByRole('button')
		.filter({ hasText: /Ran out of time|Pain or injury|Equipment unavailable|Done enough/ });
	await expect(reasons).toHaveText([
		'Ran out of time',
		'Pain or injury',
		'Equipment unavailable',
		'Done enough'
	]);
	await expect(page.getByRole('button', { name: 'Keep going' })).toBeVisible();
});

test('answering the final set after opening early ending submits a completed session', async ({
	page
}) => {
	let submitted: WorkoutSubmission | null = null;

	await seedSession(page, session([set()]));
	await page.route('/api/workouts', async (route) => {
		submitted = route.request().postDataJSON() as WorkoutSubmission;
		await route.fulfill({ status: 201, json: completionReceipt() });
	});
	await page.goto('/session');

	await page.getByRole('button', { name: 'End session early' }).click();
	await page.getByRole('button', { name: 'Log', exact: true }).click();

	await expect(page.getByText('Why are you stopping?', { exact: true })).not.toBeVisible();
	await expect(page.getByRole('button', { name: 'Finish session' })).toBeVisible();

	await page.getByRole('button', { name: 'Finish session' }).click();
	await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible();
	// The intercepted BFF response leaves the logger and queue path real; this
	// is the body that would be persisted and sent, not a mock call assertion.
	expect(submitted).toMatchObject({ outcome: 'completed', cut_reason: null });
});

test('completion renders distinct weight changes whose old concatenated keys collide', async ({
	page
}) => {
	const receipt = completionReceipt();
	receipt.summary.weight_changes = [
		{
			exercise: 'same-lift',
			label: 'Same lift',
			prescribed_weight: 20,
			actual_weight: 510,
			sets: 1
		},
		{
			exercise: 'same-lift',
			label: 'Same lift',
			prescribed_weight: 205,
			actual_weight: 10,
			sets: 1
		}
	];

	await seedSession(page, session([set({ status: 'done', loggedAt: new Date().toISOString() })]));
	await page.route('/api/workouts', (route) => route.fulfill({ status: 201, json: receipt }));
	await page.goto('/session');
	await page.getByRole('button', { name: 'Finish session' }).click();

	await expect(page.getByText('20 → 510 kg', { exact: true })).toBeVisible();
	await expect(page.getByText('205 → 10 kg', { exact: true })).toBeVisible();
});

test('logging a set takes one click, whether or not a drift reason was chosen', async ({
	page
}) => {
	// Branch 1: no reason chosen. Honesty must never cost more than
	// dishonesty (D-07) — logging as deviated cannot demand an explanation
	// before Log takes effect.
	await seedSession(page, session([set({ actualWeight: 115 })]));
	await page.goto('/session');

	await page.getByRole('button', { name: 'Log', exact: true }).click();
	await expect(page.getByText('Logged 115 kg × 5', { exact: true })).toBeVisible();

	// Branch 2: a reason chosen first. Selecting a chip must not add a
	// confirmation step or a second tap before Log takes effect.
	await seedSession(page, session([set({ actualWeight: 90 })]));
	await page.goto('/session');

	await page.getByRole('button', { name: 'too easy', exact: true }).click();
	await page.getByRole('button', { name: 'Log', exact: true }).click();
	await expect(page.getByText('Logged 90 kg × 5', { exact: true })).toBeVisible();
});

// ---------------------------------------------------------------------------
// The cues, folded away. Squat carries six of them, and six lines of body text
// is a large fraction of a phone card that also has to hold the weight, the
// plate drawing and two inputs.
// ---------------------------------------------------------------------------

test('cues stay folded until asked for, and are folded again on the next set', async ({ page }) => {
	await seedSession(
		page,
		session([set({ position: 0 }), set({ position: 1 })], {
			cues: { squat: ['Brace core', 'Drive up through heels'] }
		})
	);
	await page.goto('/session');

	const summary = page.getByText('form cues', { exact: true });
	const firstCue = page.getByText('Brace core', { exact: true });

	await expect(summary).toBeVisible();
	await expect(firstCue).not.toBeVisible();

	await summary.click();
	await expect(firstCue).toBeVisible();

	// Advancing mounts a fresh `<details>` for the next set, which is closed
	// because nothing about the open state is stored — the intent, not an
	// omission. Someone who wants the cues every set taps once per set.
	await page.getByRole('button', { name: 'Log', exact: true }).first().click();

	await expect(page.getByText('form cues', { exact: true })).toBeVisible();
	await expect(page.getByText('Brace core', { exact: true })).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// Six decimals. "What happens if u input more decimals, like 142,555556?" —
// the answer was a defect on both spellings of the number.
// ---------------------------------------------------------------------------

test('a weight typed with six decimals reads back as a multiple of half a kilo', async ({
	page
}) => {
	await seedSession(page, session([set()]));
	await page.goto('/session');

	const weight = page.getByLabel('Weight in kilograms');
	await weight.fill('142.555556');

	// Not snapped yet, on purpose: snapping every keystroke would rewrite the
	// field mid-typing, since `142.5` passes through `142.` on its way.
	await expect(weight).toHaveValue('142.555556');

	await weight.blur();
	await expect(weight).toHaveValue('142.5');
});

test('a weight typed with six decimals and never blurred is still logged snapped', async ({
	page
}) => {
	// The path that matters at a rack: type the number, tap Log with the same
	// thumb, never leave the field. `change` never fires, so `logSet` is the
	// only thing standing between six decimals and the permanent record.
	await seedSession(page, session([set()]));
	await page.goto('/session');

	await page.getByLabel('Weight in kilograms').fill('142.555556');
	await page.getByRole('button', { name: 'Log', exact: true }).click();

	await expect(page.getByText('Logged 142.5 kg × 5', { exact: true })).toBeVisible();
});

test('a weight typed with a comma is recorded rather than dropped', async ({ page }) => {
	// Typed key by key rather than filled, because the separator is the whole
	// point and `fill` would hand the field a string it never had to parse.
	//
	// This test failed on CI and passed on the machine it was written on, and
	// the difference was the browser, not the code. While the field was
	// `type="number"`, where a comma goes was the engine's business: Chromium
	// on Windows normalises `99,5` to `"99.5"` at every locale tried, and
	// Chromium on Linux reports `""` with `validity.badInput`. On the second,
	// the comma never reached `numberFromText` at all, so accepting commas
	// there fixed nothing — the field showed `99,5` and the set logged at the
	// 100 kg prescription, which is precisely the defect this change exists to
	// close.
	//
	// The field is `type="text" inputmode="decimal"` now, so what the athlete
	// typed reaches our parser on every engine and this assertion means the
	// same thing everywhere. Keep it typed key by key: `fill` sets the value in
	// one shot and would not exercise the half-typed `99,` state that
	// `numberFromText` has to refuse.
	await seedSession(page, session([set()]));
	await page.goto('/session');

	const weight = page.getByLabel('Weight in kilograms');
	await weight.click();
	await weight.press('Control+a');
	await weight.pressSequentially('99,5');

	await page.getByRole('button', { name: 'Log', exact: true }).click();

	await expect(page.getByText('Logged 99.5 kg × 5', { exact: true })).toBeVisible();
});

test('only the current squat set offers technique recording', async ({ page }) => {
	await seedSession(
		page,
		session([
			set({ position: 0, exercise: 'squat', label: 'Squat' }),
			set({ position: 1, exercise: 'bench-press', label: 'Bench press' })
		])
	);
	await page.goto('/session');
	await expect(page.getByRole('button', { name: 'Record technique' })).toHaveCount(1);
	await page.getByRole('button', { name: 'Log' }).first().click();
	await expect(page.getByRole('button', { name: 'Record technique' })).toHaveCount(0);
});

async function installTechniqueBarMedia(
	page: Page,
	options: { workerFailure?: boolean; holdTracking?: boolean } = {}
) {
	await page.addInitScript(({ workerFailure, holdTracking }) => {
		const stoppedTracks: boolean[] = [];
		const revokedUrls: string[] = [];
		let terminatedWorkers = 0;
		let releaseTracking = () => undefined;
		Object.defineProperties(window, {
			__techniqueTracksStopped: {
				get: () => stoppedTracks.every(Boolean) && stoppedTracks.length > 0
			},
			__techniqueRevokedUrls: { get: () => [...revokedUrls] },
			__techniqueTerminatedWorkers: { get: () => terminatedWorkers },
			__releaseTechniqueTracking: { value: () => releaseTracking() }
		});

		const sourceObjects = new WeakMap<HTMLMediaElement, unknown>();
		Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
			configurable: true,
			get() {
				return sourceObjects.get(this);
			},
			set(value) {
				sourceObjects.set(this, value);
			}
		});
		HTMLMediaElement.prototype.play = async () => undefined;
		HTMLMediaElement.prototype.pause = () => undefined;
		HTMLMediaElement.prototype.load = () => undefined;

		let objectUrl = 0;
		URL.createObjectURL = () => `blob:technique-review-${++objectUrl}`;
		URL.revokeObjectURL = (url) => revokedUrls.push(url);
		const nativeSource = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
		Object.defineProperty(HTMLMediaElement.prototype, 'src', {
			configurable: true,
			get() {
				return nativeSource?.get?.call(this) ?? '';
			},
			set(value: string) {
				if (!value.startsWith('blob:technique-review-')) nativeSource?.set?.call(this, value);
				else this.setAttribute('src', value);
				queueMicrotask(() => this.dispatchEvent(new Event('loadedmetadata')));
			}
		});
		Object.defineProperties(HTMLVideoElement.prototype, {
			videoWidth: { configurable: true, get: () => 1280 },
			videoHeight: { configurable: true, get: () => 720 }
		});

		const currentTimes = new WeakMap<HTMLMediaElement, number>();
		const frameVersions = new WeakMap<HTMLVideoElement, number>();
		const deliveredVersions = new WeakMap<HTMLVideoElement, number>();
		const pendingFrames = new WeakMap<HTMLVideoElement, Map<number, () => void>>();
		let frameCallbackId = 0;
		function deliverFrame(video: HTMLVideoElement) {
			const version = frameVersions.get(video) ?? 0;
			if (version <= (deliveredVersions.get(video) ?? -1)) return;
			const pending = pendingFrames.get(video);
			const callback = pending?.entries().next().value as [number, () => void] | undefined;
			if (!callback) return;
			pending?.delete(callback[0]);
			deliveredVersions.set(video, version);
			queueMicrotask(callback[1]);
		}
		Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
			configurable: true,
			get() {
				return currentTimes.get(this) ?? 0;
			},
			set(value: number) {
				currentTimes.set(this, value);
				if (this instanceof HTMLVideoElement) {
					frameVersions.set(this, (frameVersions.get(this) ?? 0) + 1);
					deliverFrame(this);
				}
			}
		});
		Object.defineProperties(HTMLVideoElement.prototype, {
			requestVideoFrameCallback: {
				configurable: true,
				value(callback: () => void) {
					const id = ++frameCallbackId;
					let pending = pendingFrames.get(this);
					if (!pending) {
						pending = new Map();
						pendingFrames.set(this, pending);
					}
					pending.set(id, callback);
					if (!frameVersions.has(this)) frameVersions.set(this, 0);
					deliverFrame(this);
					return id;
				}
			},
			cancelVideoFrameCallback: {
				configurable: true,
				value(id: number) {
					pendingFrames.get(this)?.delete(id);
				}
			}
		});

		HTMLCanvasElement.prototype.getContext = (() => ({
			drawImage: () => undefined,
			getImageData: (_x: number, _y: number, width: number, height: number) => ({
				data: new Uint8ClampedArray(width * height * 4).fill(120)
			}),
			setTransform: () => undefined,
			clearRect: () => undefined,
			setLineDash: () => undefined,
			beginPath: () => undefined,
			moveTo: () => undefined,
			lineTo: () => undefined,
			stroke: () => undefined,
			arc: () => undefined,
			fill: () => undefined
		})) as unknown as typeof HTMLCanvasElement.prototype.getContext;

		const track = {
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			getSettings: () => ({ width: 1280, height: 720, frameRate: 30 }),
			stop: () => {
				stoppedTracks[0] = true;
			}
		};
		stoppedTracks.push(false);
		const stream = {
			getTracks: () => [track],
			getVideoTracks: () => [track]
		};
		Object.defineProperty(navigator, 'mediaDevices', {
			configurable: true,
			value: { getUserMedia: async () => stream }
		});

		class FakeMediaRecorder {
			static isTypeSupported() {
				return true;
			}

			mimeType = 'video/webm';
			state: RecordingState = 'inactive';
			ondataavailable: ((event: BlobEvent) => void) | null = null;
			onerror: ((event: Event) => void) | null = null;
			onstop: ((event: Event) => void) | null = null;

			start() {
				this.state = 'recording';
			}

			stop() {
				this.state = 'inactive';
				this.ondataavailable?.(
					new BlobEvent('dataavailable', { data: new Blob(['raw'], { type: this.mimeType }) })
				);
				this.onstop?.(new Event('stop'));
			}
		}
		Object.defineProperty(window, 'MediaRecorder', {
			configurable: true,
			value: FakeMediaRecorder
		});

		type FakeStep = {
			type: 'step';
			requestId?: number;
			mediaTimeMs?: number;
		};
		const pendingSteps: Array<{ worker: FakeWorker; message: FakeStep }> = [];
		let trackingHeld = holdTracking ?? false;
		function respondToStep(worker: FakeWorker, message: FakeStep) {
			queueMicrotask(() =>
				worker.onmessage?.({
					data: {
						type: 'result',
						requestId: message.requestId,
						sample: {
							mediaTimeMs: message.mediaTimeMs,
							point: { x: 0.5, y: 0.5, confidence: 0.95 }
						}
					}
				} as MessageEvent)
			);
		}

		class FakeWorker {
			onmessage: ((event: MessageEvent) => void) | null = null;
			onerror: (() => void) | null = null;

			constructor() {
				queueMicrotask(() => this.onmessage?.({ data: { type: 'ready' } } as MessageEvent));
			}

			postMessage(message: {
				type: 'calibrate' | 'step' | 'close';
				requestId?: number;
				mediaTimeMs?: number;
			}) {
				if (message.type === 'calibrate') {
					queueMicrotask(() =>
						this.onmessage?.({
							data: workerFailure
								? { type: 'error', requestId: null, message: 'fake worker failed' }
								: { type: 'ready' }
						} as MessageEvent)
					);
				} else if (message.type === 'step') {
					if (trackingHeld) pendingSteps.push({ worker: this, message: message as FakeStep });
					else respondToStep(this, message as FakeStep);
				}
			}

			terminate() {
				terminatedWorkers += 1;
			}
		}
		releaseTracking = () => {
			trackingHeld = false;
			for (const pending of pendingSteps.splice(0)) respondToStep(pending.worker, pending.message);
		};
		Object.defineProperty(window, 'Worker', { configurable: true, value: FakeWorker });
	}, options);
}

async function recordTechniqueToRawReview(page: Page) {
	await page.getByRole('button', { name: 'Record technique' }).click();
	await page.getByRole('button', { name: 'Allow camera' }).click();
	await page.getByRole('button', { name: 'Start recording' }).click();
	await page.clock.fastForward(3000);
	await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
	await page.clock.fastForward(200);
	await page.getByRole('button', { name: 'Stop' }).click();
	await expect(page.getByText('Raw review', { exact: true })).toBeVisible();
}

test('one tap tracks the bar and toggles only its synchronized overlay', async ({ page }) => {
	await installTechniqueBarMedia(page, { holdTracking: true });
	await seedSession(page, session([set()]));
	await page.clock.install();
	await page.goto('/session');
	await recordTechniqueToRawReview(page);

	await expect(page.getByRole('button', { name: 'Track bar' })).toBeVisible();
	await page.getByRole('button', { name: 'Track bar' }).click();
	await expect(
		page.getByText('Pause at the top, then tap the visible sleeve or plate center.', {
			exact: true
		})
	).toBeVisible();
	await page.getByTestId('bar-calibration-surface').click({ position: { x: 320, y: 180 } });
	await expect(page.getByText(/Tracking bar: \d+\/\d+/)).toBeVisible();
	await page.evaluate(() => Reflect.get(window, '__releaseTechniqueTracking')());
	await page.clock.fastForward(100);

	const toggle = page.getByRole('button', { name: 'Bar path' });
	await expect(toggle).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByRole('button', { name: 'Recalibrate bar' })).toBeVisible();
	await expect(page.getByText('Week 1, day 1 · 0/1 done', { exact: true })).toBeVisible();
	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-pressed', 'false');
	await expect(page.getByText('Week 1, day 1 · 0/1 done', { exact: true })).toBeVisible();
});

test('bar tracking failure leaves raw playback and discard-by-default controls usable', async ({
	page
}) => {
	await installTechniqueBarMedia(page, { workerFailure: true });
	await seedSession(page, session([set()]));
	await page.clock.install();
	await page.goto('/session');
	await recordTechniqueToRawReview(page);
	await page.getByRole('button', { name: 'Track bar' }).click();
	await page.getByTestId('bar-calibration-surface').click({ position: { x: 320, y: 180 } });
	await page.clock.fastForward(100);

	await expect(
		page.getByText('Bar tracking failed. Try recalibrating.', { exact: true })
	).toBeVisible();
	await expect(page.locator('video[controls]')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Record again' })).toBeEnabled();
	await expect(page.getByRole('button', { name: 'Discard' })).toBeEnabled();
});

test('discard during bar tracking aborts the worker and revokes transient media', async ({
	page
}) => {
	await installTechniqueBarMedia(page, { holdTracking: true });
	await seedSession(page, session([set()]));
	await page.clock.install();
	await page.goto('/session');
	await recordTechniqueToRawReview(page);
	await page.getByRole('button', { name: 'Track bar' }).click();
	await page.getByTestId('bar-calibration-surface').click({ position: { x: 320, y: 180 } });
	await expect(page.getByText(/Tracking bar: \d+\/\d+/)).toBeVisible();

	await page.getByRole('button', { name: 'Discard' }).click();

	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect
		.poll(() => page.evaluate(() => Reflect.get(window, '__techniqueTerminatedWorkers')))
		.toBe(1);
	await expect
		.poll(() => page.evaluate(() => Reflect.get(window, '__techniqueRevokedUrls').length))
		.toBeGreaterThanOrEqual(2);
	expect(await page.evaluate(() => Reflect.get(window, '__techniqueTracksStopped'))).toBe(true);
	await expect(page.getByText('Week 1, day 1 · 0/1 done', { exact: true })).toBeVisible();
});

test('technique recording closes while camera permission is still pending', async ({ page }) => {
	await page.addInitScript(() => {
		let resolveCamera!: () => void;
		let trackStopped = false;

		const track = {
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			getSettings: () => ({ width: 1280, height: 720, frameRate: 30 }),
			stop: () => {
				trackStopped = true;
			}
		};
		const stream = {
			getTracks: () => [track],
			getVideoTracks: () => [track]
		};
		const pendingCamera = new Promise<typeof stream>((resolve) => {
			resolveCamera = () => resolve(stream);
		});

		Object.defineProperty(window, '__resolveTechniqueCamera', { value: () => resolveCamera() });
		Object.defineProperty(window, '__lateTechniqueTrackStopped', {
			get: () => trackStopped
		});
		Object.defineProperty(navigator, 'mediaDevices', {
			configurable: true,
			value: { getUserMedia: () => pendingCamera }
		});
		Object.defineProperty(window, 'MediaRecorder', {
			configurable: true,
			value: class {
				static isTypeSupported() {
					return true;
				}
			}
		});
		Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
			configurable: true,
			writable: true
		});
		HTMLMediaElement.prototype.play = async () => undefined;
	});

	await seedSession(page, session([set()]));
	await page.goto('/session');

	await page.getByRole('button', { name: 'Record technique' }).click();
	await page.getByRole('button', { name: 'Allow camera' }).click();
	await page.getByRole('button', { name: 'Close' }).click();

	await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 500 });
	await expect(page.getByRole('button', { name: 'Log', exact: true })).toBeEnabled();
	await page.getByRole('button', { name: 'Add note' }).click();
	await expect(page.getByLabel('Note for this set')).toBeVisible();
	await expect(page.getByText('Week 1, day 1 · 0/1 done', { exact: true })).toBeVisible();

	await page.evaluate(() => Reflect.get(window, '__resolveTechniqueCamera')());
	await expect
		.poll(() => page.evaluate(() => Reflect.get(window, '__lateTechniqueTrackStopped')))
		.toBe(true);
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page.getByText('Week 1, day 1 · 0/1 done', { exact: true })).toBeVisible();
});

test('technique recording stays transient from camera preview through discard', async ({
	page
}) => {
	await page.addInitScript(() => {
		const stoppedTracks: boolean[] = [];
		Object.defineProperty(window, '__techniqueTracksStopped', {
			get: () => stoppedTracks.every(Boolean) && stoppedTracks.length > 0
		});

		const sourceObjects = new WeakMap<HTMLMediaElement, unknown>();
		Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
			configurable: true,
			get() {
				return sourceObjects.get(this);
			},
			set(value) {
				sourceObjects.set(this, value);
			}
		});
		HTMLMediaElement.prototype.play = async () => undefined;

		let objectUrl = 0;
		URL.createObjectURL = () => `blob:technique-review-${++objectUrl}`;
		URL.revokeObjectURL = () => undefined;
		const nativeSource = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
		Object.defineProperty(HTMLMediaElement.prototype, 'src', {
			configurable: true,
			get() {
				return nativeSource?.get?.call(this) ?? '';
			},
			set(value: string) {
				if (!value.startsWith('blob:technique-review-')) nativeSource?.set?.call(this, value);
				else this.setAttribute('src', value);
				queueMicrotask(() => this.dispatchEvent(new Event('loadedmetadata')));
			}
		});
		Object.defineProperties(HTMLVideoElement.prototype, {
			videoWidth: { configurable: true, get: () => 1280 },
			videoHeight: { configurable: true, get: () => 720 }
		});

		const track = {
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			getSettings: () => ({ width: 1280, height: 720, frameRate: 30 }),
			stop: () => {
				stoppedTracks[0] = true;
			}
		};
		stoppedTracks.push(false);
		const stream = {
			getTracks: () => [track],
			getVideoTracks: () => [track]
		};
		Object.defineProperty(navigator, 'mediaDevices', {
			configurable: true,
			value: { getUserMedia: async () => stream }
		});

		class FakeMediaRecorder {
			static isTypeSupported() {
				return true;
			}

			mimeType = 'video/webm';
			state: RecordingState = 'inactive';
			ondataavailable: ((event: BlobEvent) => void) | null = null;
			onerror: ((event: Event) => void) | null = null;
			onstop: ((event: Event) => void) | null = null;

			start() {
				this.state = 'recording';
			}

			stop() {
				this.state = 'inactive';
				this.ondataavailable?.(
					new BlobEvent('dataavailable', { data: new Blob(['raw'], { type: this.mimeType }) })
				);
				this.onstop?.(new Event('stop'));
			}
		}
		Object.defineProperty(window, 'MediaRecorder', {
			configurable: true,
			value: FakeMediaRecorder
		});
	});

	await seedSession(page, session([set()]));
	await page.clock.install();
	await page.goto('/session');

	await page.getByRole('button', { name: 'Record technique' }).click();
	await page.getByRole('button', { name: 'Allow camera' }).click();
	await expect(page.getByText('Camera ready', { exact: true })).toBeVisible();

	await page.getByRole('button', { name: 'Start recording' }).click();
	await expect(page.getByText('3', { exact: true })).toBeVisible();
	await page.clock.fastForward(3000);
	await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();

	await page.getByRole('button', { name: 'Stop' }).click();
	await expect(page.getByText('Raw review', { exact: true })).toBeVisible();
	await expect(page.locator('video[controls]')).toBeVisible();

	await page.getByRole('button', { name: 'Discard' }).click();
	await expect(page.getByRole('button', { name: 'Record technique' })).toBeVisible();
	await expect(page.getByText('Week 1, day 1 · 0/1 done', { exact: true })).toBeVisible();
	expect(await page.evaluate(() => Reflect.get(window, '__techniqueTracksStopped'))).toBe(true);

	// Closing owns the countdown timer too. Advancing fake time after teardown
	// must not let a stale callback enqueue a late recording intent.
	await page.getByRole('button', { name: 'Record technique' }).click();
	await page.getByRole('button', { name: 'Allow camera' }).click();
	await page.getByRole('button', { name: 'Start recording' }).click();
	await expect(page.getByText('3', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Close' }).click();
	await page.clock.fastForward(3000);

	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Record technique' })).toBeVisible();
	await expect(page.getByText('Week 1, day 1 · 0/1 done', { exact: true })).toBeVisible();
	expect(await page.evaluate(() => Reflect.get(window, '__techniqueTracksStopped'))).toBe(true);
});
