import { expect, test, type Page } from '@playwright/test';
import type { LocalSession, LocalSet, PlateChange } from '$lib/session';

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
	await page.goto('/login');
	await page.evaluate(async (data) => {
		await new Promise<void>((resolve, reject) => {
			const request = indexedDB.open('athletos', 1);

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
	// Where the comma is normalised is the browser's business and differs by
	// engine and locale: Chromium reports `142,5` back as `"142.5"` from
	// `input.value` even at an en-US locale, so on this engine `numberFromText`
	// never sees the comma at all. That is exactly why this is an end-to-end
	// assertion about the *record* and not about the parser — the unit test in
	// `session.test.ts` is what pins the comma path itself down, for the
	// engines and locales that do hand it over unnormalised. Before the fix,
	// those produced a set logged at 100 kg here.
	await seedSession(page, session([set()]));
	await page.goto('/session');

	const weight = page.getByLabel('Weight in kilograms');
	await weight.click();
	await weight.press('Control+a');
	await weight.pressSequentially('99,5');

	await page.getByRole('button', { name: 'Log', exact: true }).click();

	await expect(page.getByText('Logged 99.5 kg × 5', { exact: true })).toBeVisible();
});
