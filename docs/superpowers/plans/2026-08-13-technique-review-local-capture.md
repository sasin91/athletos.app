# Technique Review Local Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional, transient, discard-by-default side-view squat recording and raw review flow to the active offline logger.

**Architecture:** A deep `TechniqueReview` module owns a discriminated state machine and accepts a recorder adapter; a browser adapter hides camera permission, codec negotiation, timers, track cleanup, Blob URLs, and MediaRecorder events. A focused Svelte view renders module state, while the existing logger merely opens it for the current squat Set and never changes workout state in response to camera behavior.

**Tech Stack:** SvelteKit 2.63, Svelte 5 runes, TypeScript 6, Vitest 4, Playwright 1.60, Media Capture and Streams, MediaRecorder, `<video>`.

**Spec:** `docs/superpowers/specs/2026-08-13-side-view-squat-technique-review-design.md`

## Global Constraints

- Do not begin until the feasibility result says `Proceed` without unapproved limit changes.
- Entry exists only for the current Set when `exercise === "squat"`.
- Request rear camera, no audio, ideal 1280×720 at 30 fps.
- Countdown is three seconds; recording hard-stops at 45 seconds using a monotonic clock.
- Codec selection uses `MediaRecorder.isTypeSupported()` and stores `recorder.mimeType`.
- Recording, denial, error, discard, and dispose never mutate `LocalSession`.
- Every exit stops every media track and revokes every replaced Blob URL.
- Raw review works offline; this slice adds no model, tracking, keep, upload, or native code.
- Use Svelte 5 runes and preserve `/session` as `ssr = false`, `prerender = true`.

---

### Task 1: Define and test the review state machine

**Files:**
- Create: `frontend/src/lib/technique/types.ts`
- Create: `frontend/src/lib/technique/review.ts`
- Test: `frontend/src/lib/technique/review.test.ts`
- Modify: `frontend/src/lib/index.ts`

**Interfaces:**
- Consumes: `TechniqueTarget { workoutId: string; setPosition: number; exercise: 'squat' }` and a `RecorderPort` supplied by Task 2.
- Produces: `createTechniqueReview(target, recorder, clock): TechniqueReview`, `TechniqueReviewState`, `TechniqueReviewIntent`, and `TechniqueReviewSnapshot` for the Svelte view.

- [ ] **Step 1: Write failing transition and cleanup tests**

Create `review.test.ts` around an in-memory recorder:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createTechniqueReview } from './review';
import type { RecorderPort } from './types';

function fakeRecorder(): RecorderPort & { dispose: ReturnType<typeof vi.fn> } {
	return {
		capabilities: () => ({ secure: true, camera: true, recorder: true, supported: true }),
		requestPreview: vi.fn(async () => ({ width: 1280, height: 720, frameRate: 30 })),
		start: vi.fn(async () => undefined),
		stop: vi.fn(async () => ({
			blob: new Blob(['clip'], { type: 'video/webm' }),
			mimeType: 'video/webm',
			durationMs: 9000,
			width: 1280,
			height: 720,
			frameRate: 30,
			rotationDegrees: 0
		})),
		dispose: vi.fn(async () => undefined)
	};
}

it('moves through checking, preview, countdown, recording and review', async () => {
	const recorder = fakeRecorder();
	const review = createTechniqueReview(
		{ workoutId: 'w', setPosition: 2, exercise: 'squat' },
		recorder,
		{ now: () => 1000 }
	);
	await review.send({ type: 'request-camera' });
	expect(review.snapshot().phase).toBe('preview');
	await review.send({ type: 'start-countdown' });
	expect(review.snapshot().phase).toBe('countdown');
	await review.send({ type: 'countdown-finished' });
	expect(review.snapshot().phase).toBe('recording');
	await review.send({ type: 'stop' });
	expect(review.snapshot().phase).toBe('review');
});

it('disposes the recorder from failure and review states', async () => {
	const recorder = fakeRecorder();
	const review = createTechniqueReview(
		{ workoutId: 'w', setPosition: 0, exercise: 'squat' },
		recorder,
		{ now: () => 0 }
	);
	await review.send({ type: 'discard' });
	expect(recorder.dispose).toHaveBeenCalledOnce();
	await review.dispose();
	expect(recorder.dispose).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run the test and verify the red state**

Run: `cd frontend; npm run test:unit -- src/lib/technique/review.test.ts`

Expected: FAIL because the module and types do not exist.

- [ ] **Step 3: Add exact public types and minimal transitions**

Define in `types.ts`:

```ts
export type TechniqueTarget = {
	workoutId: string;
	setPosition: number;
	exercise: 'squat';
};

export type RecorderCapabilities = {
	secure: boolean;
	camera: boolean;
	recorder: boolean;
	supported: boolean;
};

export type CaptureSettings = { width: number; height: number; frameRate: number | null };

export type CapturedClip = CaptureSettings & {
	blob: Blob;
	mimeType: string;
	durationMs: number;
	rotationDegrees: 0 | 90 | 180 | 270;
};

export type RecorderPort = {
	capabilities(): RecorderCapabilities;
	requestPreview(video: HTMLVideoElement): Promise<CaptureSettings>;
	start(): Promise<void>;
	stop(): Promise<CapturedClip>;
	dispose(): Promise<void>;
};

export type TechniqueReviewState =
	| { phase: 'checking' }
	| { phase: 'unsupported'; reason: string }
	| { phase: 'permission'; error: string | null }
	| { phase: 'preview'; settings: CaptureSettings }
	| { phase: 'countdown'; remaining: 3 | 2 | 1 }
	| { phase: 'recording'; startedAt: number }
	| { phase: 'review'; clip: CapturedClip; url: string }
	| { phase: 'failure'; stage: 'camera' | 'recording' | 'review'; message: string }
	| { phase: 'closed' };

export type TechniqueReviewIntent =
	| { type: 'request-camera'; video?: HTMLVideoElement }
	| { type: 'start-countdown' }
	| { type: 'countdown-tick'; remaining: 2 | 1 }
	| { type: 'countdown-finished' }
	| { type: 'stop' }
	| { type: 'record-again'; video?: HTMLVideoElement }
	| { type: 'discard' };
```

`createTechniqueReview` owns subscribers, serializes `send()` calls, converts thrown DOM exceptions into stable messages, creates the review URL only after stop, revokes the prior URL on record-again/discard/dispose, and calls recorder dispose once. Export only the public constructors/types from `$lib/index.ts`.

- [ ] **Step 4: Run focused tests and type-check**

Run:

```powershell
cd frontend
npm run test:unit -- src/lib/technique/review.test.ts
npm run check
```

Expected: PASS.

- [ ] **Step 5: Commit the state machine**

Run:

```powershell
git add frontend/src/lib/technique frontend/src/lib/index.ts
git commit -m "feat: model transient technique review"
```

---

### Task 2: Implement the browser recorder adapter

**Files:**
- Create: `frontend/src/lib/technique/recorder.ts`
- Test: `frontend/src/lib/technique/recorder.test.ts`

**Interfaces:**
- Consumes: browser globals injected as `RecorderEnvironment` and a preview `HTMLVideoElement`.
- Produces: `createBrowserRecorder(environment?): RecorderPort`; codec helper `chooseRecorderMimeType(MediaRecorder): string | undefined`.

- [ ] **Step 1: Write failing codec, hard-stop, and disposal tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { chooseRecorderMimeType, createBrowserRecorder } from './recorder';

it('chooses the first actually supported media type', () => {
	const supported = vi.fn((value: string) => value === 'video/webm;codecs=vp8');
	expect(chooseRecorderMimeType({ isTypeSupported: supported } as typeof MediaRecorder)).toBe(
		'video/webm;codecs=vp8'
	);
});

it('reports unsupported when the context is not secure', () => {
	const recorder = createBrowserRecorder({
		isSecureContext: false,
		mediaDevices: undefined,
		MediaRecorder: undefined,
		setTimeout,
		clearTimeout,
		performance
	});
	expect(recorder.capabilities().supported).toBe(false);
});

it('stops every track on dispose', async () => {
	const stop = vi.fn();
	const getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop }] }) as unknown as MediaStream);
	const recorder = createBrowserRecorder({
		isSecureContext: true,
		mediaDevices: { getUserMedia } as unknown as MediaDevices,
		MediaRecorder: class {} as unknown as typeof MediaRecorder,
		setTimeout,
		clearTimeout,
		performance
	});
	await expect(recorder.requestPreview({ play: async () => {} } as HTMLVideoElement)).rejects.toThrow();
	await recorder.dispose();
	expect(stop).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `cd frontend; npm run test:unit -- src/lib/technique/recorder.test.ts`

Expected: FAIL because `recorder.ts` does not exist.

- [ ] **Step 3: Implement camera, recorder, and cleanup behavior**

Use this ordered MIME list:

```ts
const CANDIDATE_TYPES = [
	'video/mp4;codecs=avc1.42E01E',
	'video/webm;codecs=vp9',
	'video/webm;codecs=vp8',
	'video/webm'
] as const;
```

Request exactly:

```ts
await mediaDevices.getUserMedia({
	audio: false,
	video: {
		facingMode: { ideal: 'environment' },
		width: { ideal: 1280 },
		height: { ideal: 720 },
		frameRate: { ideal: 30 }
	}
});
```

Read actual `track.getSettings()`, set `video.srcObject`, call `video.play()`, start `MediaRecorder` with a supported explicit MIME when one exists, call `start(1000)`, and schedule a 45,000 ms stop. Duration is `performance.now() - startedAt`, not chunk count. After `onstop`, load the Blob into a private metadata-only video and use its decoded `videoWidth`/`videoHeight` as the canonical analysis dimensions. Set `rotationDegrees: 0` because all MVP coordinates are defined in browser-decoded display orientation; retain the field so imported/native media can later represent container rotation without a schema change. Revoke this private URL before resolving. Track `ended`, recorder `error`, page disposal, and repeated dispose without throwing.

- [ ] **Step 4: Run focused and full unit tests**

Run:

```powershell
cd frontend
npm run test:unit -- src/lib/technique/recorder.test.ts
npm run test:unit
```

Expected: PASS.

- [ ] **Step 5: Commit the adapter**

```powershell
git add frontend/src/lib/technique/recorder.ts frontend/src/lib/technique/recorder.test.ts
git commit -m "feat: capture squat clips in the browser"
```

---

### Task 3: Render the focused capture and raw review view

**Files:**
- Create: `frontend/src/lib/TechniqueReview.svelte`
- Modify: `frontend/src/routes/session/+page.svelte`
- Test: `frontend/src/routes/session/page.e2e.ts`

**Interfaces:**
- Consumes: `TechniqueTarget`, `createTechniqueReview`, and `createBrowserRecorder` from Tasks 1–2.
- Produces: `TechniqueReview.svelte` with props `{ target: TechniqueTarget; onclose: () => void }`; a `Record technique` action only on the current squat Set.

- [ ] **Step 1: Add a failing logger entry-point browser test**

Extend `page.e2e.ts`:

```ts
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
	await page.getByRole('button', { name: 'Log' }).click();
	await expect(page.getByRole('button', { name: 'Record technique' })).toHaveCount(0);
});
```

Add a second test that installs fake `navigator.mediaDevices.getUserMedia` and fake `MediaRecorder` with `page.addInitScript`, opens the review, advances the countdown, emits a Blob, sees raw playback, presses Discard, and asserts every fake track's `stop()` was called while the Set still says `0/{total} done`.

- [ ] **Step 2: Run the focused Playwright test and verify failure**

Run: `cd frontend; npx playwright test src/routes/session/page.e2e.ts -g "technique recording"`

Expected: FAIL because the button and view do not exist.

- [ ] **Step 3: Implement the Svelte view and logger seam**

`TechniqueReview.svelte` creates one review in `$effect`, subscribes state into `$state`, and disposes it in the effect cleanup. Render a full-viewport dialog-like layer with:

- capability/permission explanation and **Allow camera**;
- live rear-camera preview with a side silhouette/framing rectangle;
- three-second visible countdown;
- elapsed recording time and **Stop**;
- raw `<video controls playsinline>` review;
- **Record again** and primary **Discard**;
- one concise alert for each stable failure stage; and
- no Keep or Upload controls in this slice.

In `+page.svelte`, add:

```ts
import TechniqueReview from '$lib/TechniqueReview.svelte';
import type { TechniqueTarget } from '$lib/technique/types';

let techniqueTarget = $state<TechniqueTarget | null>(null);
```

Inside the current Set card, after cues and before inputs, render **Record technique** only when `set.exercise === 'squat'`. Set `techniqueTarget` from `session.id` and `set.position`; never pass `apply` or a LocalSession mutation function. Render the focused view outside the logger layout when the target is non-null and close it by assigning null.

- [ ] **Step 4: Verify accessibility, offline build, and existing logger behavior**

Run:

```powershell
cd frontend
npx playwright test src/routes/session/page.e2e.ts -g "technique recording"
npm run test:unit
npm run check
npm run lint
npm run build
```

Expected: all pass; `/session` remains in the prerendered output.

- [ ] **Step 5: Commit the raw review slice**

```powershell
git add frontend/src/lib/TechniqueReview.svelte frontend/src/routes/session/+page.svelte frontend/src/routes/session/page.e2e.ts
git commit -m "feat: review transient squat recordings"
```

---

### Task 4: Verify raw capture on physical devices and document support

**Files:**
- Modify: `docs/spikes/2026-08-13-technique-review-device-results.md`
- Modify: `docs/DESIGN.md`

**Interfaces:**
- Consumes: production `TechniqueReview` raw capture flow.
- Produces: confirmed supported device/browser floor and a durable D-09 amendment stating that optional camera failure cannot block offline logging.

- [ ] **Step 1: Run the accepted raw flow on both target devices**

On installed iPhone and Android PWAs, test allow → preview → countdown → record → manual stop → replay → record again → hard stop → discard. Repeat offline after first loading the build. Deny permission once and confirm Log/Skip remain usable.

- [ ] **Step 2: Record observed production behavior**

Append a `Raw capture slice` table with actual MIME, settings, manual-stop duration, hard-stop duration, offline result, track cleanup, and logger isolation for both devices.

- [ ] **Step 3: Amend the durable design decision**

In `docs/DESIGN.md` amend D-09 with this exact rule in the document's established prose style: Technique review is optional local media around the logger; camera or media failure never blocks logging; recordings are transient until a separate retention choice.

- [ ] **Step 4: Run documentation and repository checks**

Run: `git diff --check; cd frontend; npm run check; npm run test:unit; npm run build`

Expected: PASS.

- [ ] **Step 5: Commit the verified slice documentation**

```powershell
git add docs/spikes/2026-08-13-technique-review-device-results.md docs/DESIGN.md
git commit -m "docs: record raw technique capture support"
```

Proceed next to `2026-08-13-technique-review-tracking.md`.
