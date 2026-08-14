# Technique Review Local Retention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the athlete deliberately keep one analyzed Technique clip per Set in browser storage, review it on that device, and explicitly delete it.

**Architecture:** One IndexedDB schema module owns database version 2 and all upgrades. Existing active-session and queue adapters keep their current interfaces, while a new technique-store interface atomically writes small metadata, a separate large Blob, and versioned Tracking result records; storage persistence/quota is reported honestly by a small capability adapter.

**Tech Stack:** IndexedDB 2, StorageManager `persist()`/`estimate()`, Svelte 5, TypeScript 6, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-13-side-view-squat-technique-review-design.md`

## Global Constraints

- Upgrade database `athletos` from version 1 to version 2 without deleting `active` or `queue` data.
- One module owns `indexedDB.open`; do not create a second version owner.
- Add `technique_clips`, `technique_media`, and `tracking_results` stores.
- Store the Blob separately so upload-state edits do not rewrite media.
- Keep/delete transact across all three technique stores.
- Allow at most one kept clip for `(workoutId, setPosition)`.
- Keep succeeds only after transaction completion.
- Persisted-storage denial does not forbid keep; copy remains “on this device.”
- A failed keep leaves transient review available and makes no durability claim.
- This plan adds no server, object storage, background transfer, AI, or coach concepts.

---

### Task 1: Centralize and migrate the IndexedDB schema

**Files:**
- Create: `frontend/src/lib/database.ts`
- Modify: `frontend/src/lib/storage.ts`
- Test: `frontend/src/routes/session/storage.e2e.ts`

**Interfaces:**
- Consumes: browser `indexedDB`.
- Produces: `openAthletosDatabase(): Promise<IDBDatabase>` and `runTransaction<T>(stores, mode, work): Promise<T>`; existing `loadActiveSession`, `saveActiveSession`, `clearActiveSession`, and `queueStore` retain signatures.

- [ ] **Step 1: Write a failing version-1-to-version-2 browser migration test**

Create `storage.e2e.ts` that opens version 1 directly, creates `active` and
`queue`, stores one active session and one queued submission, closes it, imports
the production page, then asserts version 2 contains all five stores and both
old records unchanged:

```ts
test('version 2 keeps the active session and queue while adding technique stores', async ({ page }) => {
	await page.goto('/session');
	const result = await page.evaluate(async () => {
		const request = indexedDB.open('athletos');
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
		return { version: db.version, stores: [...db.objectStoreNames] };
	});
	expect(result.version).toBe(2);
	expect(result.stores).toEqual(
		expect.arrayContaining(['active', 'queue', 'technique_clips', 'technique_media', 'tracking_results'])
	);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `cd frontend; npx playwright test src/routes/session/storage.e2e.ts`

Expected: FAIL with database version 1 and missing technique stores.

- [ ] **Step 3: Move schema ownership without changing existing interfaces**

`database.ts` defines:

```ts
export const DATABASE_NAME = 'athletos';
export const DATABASE_VERSION = 2;
export const STORES = {
	active: 'active',
	queue: 'queue',
	techniqueClips: 'technique_clips',
	techniqueMedia: 'technique_media',
	trackingResults: 'tracking_results'
} as const;
```

In `onupgradeneeded`, create missing old stores exactly as version 1 did; create
`technique_clips` with `keyPath: 'id'` and a unique index
`by_workout_set` over `['workoutId', 'setPosition']`; create `technique_media`
with `keyPath: 'clipId'`; and create `tracking_results` with `keyPath: 'id'`.
Abort the upgrade on any exception. `runTransaction` resolves only from
`transaction.oncomplete`, aborts on a thrown/rejected work callback, and always
closes the database.

Refactor `storage.ts` to call those helpers while preserving exports and active
key `current`. Update its comments from two stores to centralized schema
ownership.

- [ ] **Step 4: Verify migration and all existing offline tests**

Run:

```powershell
cd frontend
npx playwright test src/routes/session/storage.e2e.ts src/routes/session/page.e2e.ts
npm run test:unit
npm run check
```

Expected: PASS.

- [ ] **Step 5: Commit the migration seam**

```powershell
git add frontend/src/lib/database.ts frontend/src/lib/storage.ts frontend/src/routes/session/storage.e2e.ts
git commit -m "refactor: centralize offline database schema"
```

---

### Task 2: Define the technique store and atomic IndexedDB adapter

**Files:**
- Create: `frontend/src/lib/technique/store.ts`
- Create: `frontend/src/lib/technique/indexeddb-store.ts`
- Test: `frontend/src/lib/technique/store.test.ts`
- Test: `frontend/src/routes/session/technique-store.e2e.ts`
- Modify: `frontend/src/lib/technique/types.ts`

**Interfaces:**
- Consumes: `TrackingResult`, UUIDv7 helper, and `runTransaction` from Task 1.
- Produces: `TechniqueClip`, `TechniqueMedia`, `LocalUploadState`, `TechniqueStore`, `createIndexedDbTechniqueStore()`, and `keepTechniqueClip(input, store, now, id): Promise<TechniqueClip>`.

- [ ] **Step 1: Write failing pure store-policy tests**

```ts
import { expect, it } from 'vitest';
import { keepTechniqueClip } from './store';
import type { TechniqueClip, TechniqueStore } from './store';

const input = {
	target: { workoutId: 'workout-id', setPosition: 3, exercise: 'squat' as const },
	clip: {
		blob: new Blob(['clip'], { type: 'video/webm' }),
		mimeType: 'video/webm',
		durationMs: 1000,
		width: 1280,
		height: 720,
		frameRate: 30,
		rotationDegrees: 0 as const
	},
	tracking: {
		schemaVersion: 1 as const,
		sourceWidth: 1280,
		sourceHeight: 720,
		poseModel: {
			name: 'pose_landmarker_lite',
			version: 'float16-v1',
			assetDigest: '59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a'
		},
		tracker: { name: 'normalized-cross-correlation' as const, version: 1 as const, confidenceThreshold: 0.75 as const },
		samplingPolicy: { kind: 'fixed' as const, hz: 10 as const },
		calibration: { mediaTimeMs: 0, x: 0.5, y: 0.5, patchSize: 48 as const },
		samples: []
	}
};

function emptyStore(existing: TechniqueClip | null = null): TechniqueStore {
	return {
		findBySet: async () => existing,
		put: async () => undefined,
		get: async () => null,
		delete: async () => undefined,
		listForWorkout: async () => [],
		updateUpload: async () => undefined
	};
}

it('writes metadata, media and tracking as one keep request', async () => {
	const calls: unknown[] = [];
	const store: TechniqueStore = {
		findBySet: async () => null,
		put: async (...records: unknown[]) => calls.push(records),
		get: async () => null,
		delete: async () => undefined,
		listForWorkout: async () => [],
		updateUpload: async () => undefined
	};
	const clip = await keepTechniqueClip(input, store, () => '2026-08-13T12:00:00Z', () => 'clip-id');
	expect(clip.id).toBe('clip-id');
	expect(clip.upload).toEqual({ kind: 'local' });
	expect(calls).toHaveLength(1);
});

it('refuses a second kept clip for the same set', async () => {
	const existing = { id: 'existing' } as TechniqueClip;
	await expect(keepTechniqueClip(input, emptyStore(existing), () => 'now', () => 'new')).rejects.toThrow(
		/delete the kept clip first/i
	);
});
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `cd frontend; npm run test:unit -- src/lib/technique/store.test.ts`

Expected: FAIL because store types/functions do not exist.

- [ ] **Step 3: Define exact local records and policy interface**

```ts
export type LocalUploadState =
	| { kind: 'local' }
	| { kind: 'uploading'; serverClipId: string; attemptedAt: string }
	| { kind: 'uploaded'; serverClipId: string; completedAt: string }
	| { kind: 'upload_failed'; serverClipId: string | null; attemptedAt: string; reason: string };

export type TechniqueClip = {
	schemaVersion: 1;
	id: string;
	workoutId: string;
	setPosition: number;
	exercise: 'squat';
	createdAt: string;
	mimeType: string;
	durationMs: number;
	width: number;
	height: number;
	sourceFrameRate: number | null;
	rotationDegrees: 0 | 90 | 180 | 270;
	trackingResultId: string;
	upload: LocalUploadState;
};

export type TechniqueMedia = { clipId: string; media: Blob };

export type KeepTechniqueInput = {
	target: TechniqueTarget;
	clip: CapturedClip;
	tracking: TrackingResult;
};

export type TechniqueStore = {
	findBySet(workoutId: string, setPosition: number): Promise<TechniqueClip | null>;
	put(clip: TechniqueClip, media: TechniqueMedia, tracking: StoredTrackingResult): Promise<void>;
	get(id: string): Promise<{ clip: TechniqueClip; media: Blob; tracking: TrackingResult } | null>;
	delete(id: string): Promise<void>;
	listForWorkout(workoutId: string): Promise<TechniqueClip[]>;
	updateUpload(id: string, upload: LocalUploadState): Promise<void>;
};
```

`StoredTrackingResult` adds `{ id, clipId }` to the public Tracking result.
`keepTechniqueClip` checks the unique Set invariant before constructing records,
but IndexedDB's unique index remains the concurrency authority.

- [ ] **Step 4: Implement and browser-test atomic IndexedDB behavior**

`createIndexedDbTechniqueStore` uses one readwrite transaction over all three
stores for `put` and `delete`; `updateUpload` transacts only
`technique_clips`; `get` reads all three stores and returns null if any member is
missing, while leaving corrupt records untouched for diagnosis. In
`technique-store.e2e.ts`, write a 2 MiB Blob, read and compare bytes, prove the
unique Set index rejects a concurrent second clip, update upload state and prove
media bytes remain equal, then delete and prove all records are absent.

- [ ] **Step 5: Verify and commit the store**

Run:

```powershell
cd frontend
npm run test:unit -- src/lib/technique/store.test.ts
npx playwright test src/routes/session/technique-store.e2e.ts
npm run check
git add src/lib/technique src/routes/session/technique-store.e2e.ts
git commit -m "feat: store kept technique clips atomically"
```

---

### Task 3: Add honest persistence and quota reporting

**Files:**
- Create: `frontend/src/lib/technique/storage-capacity.ts`
- Test: `frontend/src/lib/technique/storage-capacity.test.ts`
- Modify: `frontend/src/lib/technique/types.ts`

**Interfaces:**
- Consumes: `navigator.storage.persist`, `persisted`, and `estimate` when available.
- Produces: `inspectStorageCapacity(requiredBytes, manager?): Promise<StorageCapacity>`.

- [ ] **Step 1: Write failing granted, denied, unavailable, and low-quota tests**

```ts
import { expect, it, vi } from 'vitest';
import { inspectStorageCapacity } from './storage-capacity';

it('reports a granted persistent bucket and available bytes', async () => {
	const result = await inspectStorageCapacity(10, {
		persisted: vi.fn(async () => false),
		persist: vi.fn(async () => true),
		estimate: vi.fn(async () => ({ usage: 100, quota: 1000 }))
	});
	expect(result).toEqual({ persistence: 'granted', usage: 100, quota: 1000, enoughForClip: true });
});

it('does not claim durability when the browser has no StorageManager', async () => {
	expect(await inspectStorageCapacity(10, undefined)).toEqual({
		persistence: 'unavailable', usage: null, quota: null, enoughForClip: null
	});
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `cd frontend; npm run test:unit -- src/lib/technique/storage-capacity.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement best-effort capability reporting**

```ts
export type StorageCapacity = {
	persistence: 'already-granted' | 'granted' | 'denied' | 'unavailable';
	usage: number | null;
	quota: number | null;
	enoughForClip: boolean | null;
};
```

Call `persisted()` first, call `persist()` only when not already granted, call
`estimate()` independently so one failure does not erase the other result, and
compute `quota - usage >= requiredBytes * 1.1` to leave transaction overhead.
Exceptions return the narrow unknown value rather than rejecting Keep.

- [ ] **Step 4: Run tests and type-check**

Run: `cd frontend; npm run test:unit -- src/lib/technique/storage-capacity.test.ts; npm run check`

Expected: PASS.

- [ ] **Step 5: Commit capacity reporting**

```powershell
git add frontend/src/lib/technique/storage-capacity.ts frontend/src/lib/technique/storage-capacity.test.ts frontend/src/lib/technique/types.ts
git commit -m "feat: report local media persistence honestly"
```

---

### Task 4: Wire Keep, reopen, and explicit local deletion into review

**Files:**
- Modify: `frontend/src/lib/technique/review.ts`
- Modify: `frontend/src/lib/technique/review.test.ts`
- Modify: `frontend/src/lib/TechniqueReview.svelte`
- Create: `frontend/src/lib/LocalTechniqueClips.svelte`
- Modify: `frontend/src/routes/session/+page.svelte`
- Modify: `frontend/src/routes/(app)/history/[id]/+page.svelte`
- Test: `frontend/src/routes/session/technique-retention.e2e.ts`
- Test: `frontend/src/routes/(app)/history/[id]/page.e2e.ts`

**Interfaces:**
- Consumes: `TechniqueStore`, `inspectStorageCapacity`, completed `CapturedClip`, and completed `TrackingResult`.
- Produces: intents `keep`, `open-kept`, and `delete-local`; render states for keeping, kept, capacity warning, and keep failure; `LocalTechniqueClips.svelte` for post-Session device-local review.

- [ ] **Step 1: Write failing review policy and browser-flow tests**

Add unit tests proving Keep is unavailable before Tracking result exists, calls
capacity inspection before store put, enters `kept` only after put resolves,
stays in transient review after a rejected put, and refuses re-record while a
kept clip exists until delete succeeds.

In `technique-retention.e2e.ts`, seed an active squat Session, use fake recorder
and analyzer adapters, record/analyze/calibrate, click **Keep on this device**,
close and reopen review, assert playback and overlays still exist, then click
**Delete from this device**, confirm, and assert the Set again offers Record with
no kept marker.

In the history-detail browser test, seed a kept clip for the loaded Workout ID,
open that history page, assert **Review kept technique clip** appears without a
server media field, replay it, and delete it locally.

- [ ] **Step 2: Run focused tests and verify failure**

Run:

```powershell
cd frontend
npm run test:unit -- src/lib/technique/review.test.ts
npx playwright test src/routes/session/technique-retention.e2e.ts
```

Expected: FAIL because keep/delete states and UI do not exist.

- [ ] **Step 3: Implement retention orchestration**

Inject `TechniqueStore` and capacity inspector into `createTechniqueReview`.
Before Keep, inspect `clip.blob.size`; surface one of:

- `Persistent browser storage granted.`
- `Kept on this device. The browser may remove it if space is needed.`
- `Storage space could not be estimated.`
- `This clip may not fit in the browser's remaining storage.`

The low-space message asks for confirmation but does not silently forbid Keep.
After a successful keep, release the transient object URL and reopen media from
the store through a new URL. Delete requires explicit confirmation, deletes the
store transaction first, then revokes the URL and returns to preview/closed.

- [ ] **Step 4: Render the retained state without changing workout controls**

The current squat Set shows **Review kept technique clip** when one exists and
**Record technique** otherwise. The technique view renders **Keep on this
device** only after successful analysis and calibration, labels the result
**Kept on this device**, and separately renders **Delete from this device**.
Do not say saved, backed up, synced, or permanent. Logging, skipping, undoing,
and finishing a Session do not delete the clip.

`LocalTechniqueClips.svelte` takes `{ workoutId: string }`, loads
`listForWorkout` inside `$effect`, and opens `TechniqueReview` in read-only mode
with stored Blob and Tracking result. Mount it on the Session completion view
using `recordId` and on history detail using `workout.id`. It reads only
IndexedDB, renders nothing when no local clips exist, and adds no media field to
the server's Workout response.

- [ ] **Step 5: Verify and commit local retention**

Run:

```powershell
cd frontend
npm run test:unit
npx playwright test src/routes/session/storage.e2e.ts src/routes/session/technique-store.e2e.ts src/routes/session/technique-retention.e2e.ts src/routes/session/page.e2e.ts 'src/routes/(app)/history/[id]/page.e2e.ts'
npm run check
npm run lint
npm run build
git add src/lib src/routes/session 'src/routes/(app)/history/[id]'
git commit -m "feat: keep technique clips on this device"
```

---

### Task 5: Physical storage-pressure and lifecycle verification

**Files:**
- Modify: `docs/spikes/2026-08-13-technique-review-device-results.md`

**Interfaces:**
- Consumes: production local-retention flow on target physical devices.
- Produces: evidence for granted/denied persistence, quota copy, relaunch, deletion, and logger isolation.

- [ ] **Step 1: Run keep/relaunch/delete on both installed PWAs**

Record, analyze, calibrate, keep, fully close the PWA, relaunch, review, then
delete. Record whether persistence was granted, reported quota/usage, Blob size,
relaunch success, and whether deletion removed all three records.

- [ ] **Step 2: Exercise denied and failed storage paths**

Use browser developer tooling/test profiles to deny persistent storage and to
force IndexedDB write failure. Confirm warning copy is honest, a denied
persistence request can still keep, and a failed transaction leaves transient
review playable without a kept marker.

- [ ] **Step 3: Verify session completion does not orphan or erase local media**

Keep a clip, log its Set, finish the Session online and offline, and confirm the
clip remains addressable by Workout ID/Set position even after `active` is
cleared. Record the result.

- [ ] **Step 4: Run full frontend verification**

Run: `cd frontend; npm run test:unit; npm run check; npm run lint; npm run build; npm run test:e2e`

Expected: PASS.

- [ ] **Step 5: Commit the device evidence**

```powershell
git add docs/spikes/2026-08-13-technique-review-device-results.md
git commit -m "docs: verify local technique clip retention"
```

Proceed next to `2026-08-13-technique-review-cloud-upload.md`.
