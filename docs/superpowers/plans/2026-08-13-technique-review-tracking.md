# Technique Review Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Analyze transient squat clips locally at timestamped 10 Hz, seed the bar with one tap, and render confidence-aware body, nose, bar, knee, and foot evidence during synchronized review.

**Architecture:** A pinned, self-hosted MediaPipe model runs synchronously inside a dedicated worker while a main-thread sampler transfers decoded `ImageBitmap`s at explicit media timestamps. Pure TypeScript modules own timestamp policy, normalized-coordinate transforms, confidence gating, template-based bar tracking, interpolation, and overlay drawing; the review state machine coordinates those modules through one analyzer interface.

**Tech Stack:** MediaPipe Tasks Vision 1.0.1, Pose Landmarker lite v1, Web Workers, WebAssembly, `ImageBitmap`, `requestVideoFrameCallback`, Canvas 2D, Svelte 5, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-13-side-view-squat-technique-review-design.md`

## Global Constraints

- Pin `@mediapipe/tasks-vision` to exact version `1.0.1`.
- Commit Pose Landmarker lite v1 from the immutable `/float16/1/` URL; expected bytes `5777746`, SHA-256 `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`.
- Serve model and WASM from AthletOS; no runtime CDN or network fetch.
- Fixed 10 Hz is a sampling policy, never an assumption of equal stored spacing.
- Every sample stores its actual decoded `mediaTimeMs`.
- Use normalized source coordinates; never store canvas pixels.
- Inference runs in a worker and closes transferred bitmaps.
- Missing confidence hides a guide; no extrapolation through lost pose or bar tracking.
- One-tap bar calibration is required and may be replaced without rerunning pose inference.
- Evidence only: no measurement, rep count, phase, grade, verdict, or cue.
- Execution pauses before adding real fixture media until the project owner explicitly approves a consented/licensed source.

---

### Task 1: Pin offline model assets and timestamped analysis types

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `.gitignore`
- Create: `frontend/scripts/sync-mediapipe-assets.mjs`
- Create: `frontend/static/models/pose_landmarker_lite_v1.task`
- Create: `frontend/static/models/README.md`
- Create: `frontend/src/lib/technique/tracking.ts`
- Test: `frontend/src/lib/technique/tracking.test.ts`

**Interfaces:**
- Consumes: `CapturedClip` from the local-capture plan.
- Produces: `SamplingPolicy`, `PoseLandmark`, `TrackingSample`, `TrackingResult`, `fixedSampleTargets(durationMs, hz)`, and pinned asset constants.

- [ ] **Step 1: Write failing policy and timestamp tests**

```ts
import { describe, expect, it } from 'vitest';
import { fixedSampleTargets, nearestSample } from './tracking';

it('generates fixed targets without storing an implied interval', () => {
	expect(fixedSampleTargets(340, 10)).toEqual([0, 100, 200, 300]);
});

it('selects by actual timestamp when samples are irregular', () => {
	const samples = [
		{ mediaTimeMs: 0 },
		{ mediaTimeMs: 104 },
		{ mediaTimeMs: 197 }
	];
	expect(nearestSample(samples, 150)?.mediaTimeMs).toBe(197);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `cd frontend; npm run test:unit -- src/lib/technique/tracking.test.ts`

Expected: FAIL because `tracking.ts` does not exist.

- [ ] **Step 3: Pin the package and self-hosted assets**

Run:

```powershell
cd frontend
npm install --save-exact @mediapipe/tasks-vision@1.0.1
Invoke-WebRequest -Uri 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task' -OutFile 'static/models/pose_landmarker_lite_v1.task'
```

Add a Node script that copies the package's `wasm` directory into
`frontend/static/generated/mediapipe/wasm`, deleting only that exact generated
directory first. Add `/frontend/static/generated/mediapipe/` to `.gitignore`.
Make `dev`, `build`, and `preview` run `npm run sync:mediapipe` first. The script
must fail if the expected package directory is missing.

In `static/models/README.md`, record model URL, bytes, SHA-256, model card URL,
Google's Apache-2.0 code/model notice, and the date retrieved. Verify the binary:

```powershell
$file = 'static/models/pose_landmarker_lite_v1.task'
if ((Get-Item $file).Length -ne 5777746) { throw 'unexpected model length' }
if ((Get-FileHash -Algorithm SHA256 $file).Hash.ToLowerInvariant() -ne '59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a') { throw 'unexpected model digest' }
```

- [ ] **Step 4: Define versioned, irregular-timestamp types**

```ts
export const POSE_MODEL = {
	name: 'pose_landmarker_lite',
	version: 'float16-v1',
	assetDigest: '59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a'
} as const;

export type SamplingPolicy = { kind: 'fixed'; hz: 10 };
export type PoseLandmark = {
	x: number;
	y: number;
	z: number | null;
	visibility: number;
	presence: number;
};
export type BarPoint = { mediaTimeMs: number; x: number; y: number; confidence: number };
export type TrackingSample = {
	mediaTimeMs: number;
	landmarks: Partial<Record<number, PoseLandmark>>;
	bar: BarPoint | null;
};
export type TrackingResult = {
	schemaVersion: 1;
	sourceWidth: number;
	sourceHeight: number;
	poseModel: typeof POSE_MODEL;
	tracker: { name: 'normalized-cross-correlation'; version: 1; confidenceThreshold: 0.75 };
	samplingPolicy: SamplingPolicy;
	calibration: { mediaTimeMs: number; x: number; y: number; patchSize: 48 } | null;
	samples: TrackingSample[];
};
```

Implement `fixedSampleTargets` using `1000 / hz`, clip the final target below duration, and implement binary-search `nearestSample` against actual times.

- [ ] **Step 5: Verify and commit assets/types**

Run:

```powershell
cd frontend
npm run sync:mediapipe
npm run test:unit -- src/lib/technique/tracking.test.ts
npm run check
npm run build
git add ../.gitignore package.json package-lock.json scripts static/models src/lib/technique/tracking.ts src/lib/technique/tracking.test.ts
git commit -m "build: pin offline pose analysis assets"
```

Expected: generated WASM is present for the build but absent from `git status`; model and metadata are committed.

---

### Task 2: Decode timestamped frames and run pose inference in a worker

**Files:**
- Create: `frontend/src/lib/technique/analyzer.ts`
- Create: `frontend/src/lib/technique/pose.worker.ts`
- Test: `frontend/src/lib/technique/analyzer.test.ts`
- Modify: `frontend/src/lib/technique/types.ts`

**Interfaces:**
- Consumes: `CapturedClip`, `fixedSampleTargets`, pinned `/models/pose_landmarker_lite_v1.task`, and `/generated/mediapipe/wasm`.
- Produces: `AnalyzerPort.analyze(clip, onProgress, signal): Promise<TrackingResult>` and `createBrowserAnalyzer(): AnalyzerPort`.

- [ ] **Step 1: Write failing decode-order, progress, and cancellation tests**

```ts
import { expect, it, vi } from 'vitest';
import { analyzeFrames } from './analyzer';

it('stores decoder times rather than requested times', async () => {
	const worker = { analyze: vi.fn(async (_frame, requested) => ({ requested, landmarks: {} })) };
	const result = await analyzeFrames(
		{ durationMs: 300, width: 1280, height: 720 },
		async (target) => ({ bitmap: {} as ImageBitmap, mediaTimeMs: target + 3 }),
		worker,
		() => {},
		new AbortController().signal
	);
	expect(result.samples.map((sample) => sample.mediaTimeMs)).toEqual([3, 103, 203]);
});

it('aborts before decoding another frame', async () => {
	const abort = new AbortController();
	const decode = vi.fn(async () => {
		abort.abort();
		return { bitmap: {} as ImageBitmap, mediaTimeMs: 0 };
	});
	await expect(
		analyzeFrames(
			{ durationMs: 300, width: 1, height: 1 },
			decode,
			{ analyze: vi.fn() },
			() => {},
			abort.signal
		)
	).rejects.toThrow(/aborted/i);
	expect(decode).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `cd frontend; npm run test:unit -- src/lib/technique/analyzer.test.ts`

Expected: FAIL because analyzer functions do not exist.

- [ ] **Step 3: Implement the analyzer interface and decoder**

Add to `types.ts`:

```ts
export type AnalysisProgress = { completed: number; total: number; mediaTimeMs: number };
export type AnalyzerPort = {
	analyze(
		clip: CapturedClip,
		onProgress: (progress: AnalysisProgress) => void,
		signal: AbortSignal
	): Promise<TrackingResult>;
	dispose(): Promise<void>;
};
```

The browser analyzer creates a muted, `playsInline` video from the Blob URL,
waits for metadata, seeks monotonically through `fixedSampleTargets`, waits for
`requestVideoFrameCallback` when available and otherwise `seeked` plus a painted
frame, then transfers `await createImageBitmap(video)` to the worker. Capture
`video.currentTime * 1000` after decode as the sample time. Deduplicate equal
decoded times. Terminate worker and revoke its private Blob URL on abort/dispose.

- [ ] **Step 4: Implement the worker and normalized result mapping**

The worker imports `FilesetResolver` and `PoseLandmarker` from
`@mediapipe/tasks-vision`; initializes once with running mode `VIDEO`,
`numPoses: 1`, all three confidence thresholds `0.5`, and segmentation disabled;
runs `detectForVideo(bitmap, Math.round(mediaTimeMs))` directly on the
`ImageBitmap`; maps the first pose's 33
landmarks to `PoseLandmark`; closes the bitmap in `finally`; and posts a stable
error message without stack or frame content.

Worker messages are exactly:

```ts
type WorkerRequest =
	| { type: 'init'; wasmRoot: string; modelUrl: string }
	| { type: 'frame'; requestId: number; mediaTimeMs: number; bitmap: ImageBitmap }
	| { type: 'close' };
type WorkerResponse =
	| { type: 'ready' }
	| { type: 'result'; requestId: number; mediaTimeMs: number; landmarks: TrackingSample['landmarks']; elapsedMs: number }
	| { type: 'error'; requestId: number | null; message: string };
```

- [ ] **Step 5: Verify worker build and commit**

Run:

```powershell
cd frontend
npm run test:unit -- src/lib/technique/analyzer.test.ts
npm run check
npm run build
git add src/lib/technique/analyzer.ts src/lib/technique/analyzer.test.ts src/lib/technique/pose.worker.ts src/lib/technique/types.ts
git commit -m "feat: analyze timestamped pose frames off thread"
```

Expected: PASS and Vite emits a separate worker chunk.

---

### Task 3: Implement deterministic one-tap bar tracking

**Files:**
- Create: `frontend/src/lib/technique/bar-tracker.ts`
- Create: `frontend/src/lib/technique/bar-decoder.ts`
- Test: `frontend/src/lib/technique/bar-tracker.test.ts`
- Test: `frontend/src/lib/technique/bar-decoder.test.ts`

**Interfaces:**
- Consumes: `CapturedClip`, Tracking sample timestamps, normalized calibration `{ mediaTimeMs, x, y }`, and bounded grayscale search crops.
- Produces: pure `trackBarSamples(frames, calibration, config): Map<number, BarPoint | null>` for policy/tests plus `BarTrackerPort.track(clip, sampleTimes, calibration, onProgress, signal): Promise<Map<number, BarPoint | null>>` for bounded browser decoding; no Svelte dependency.

- [ ] **Step 1: Write failing forward/backward/loss tests with synthetic frames**

```ts
import { expect, it } from 'vitest';
import { trackBarSamples } from './bar-tracker';

function frame(time: number, dotX: number): { mediaTimeMs: number; width: number; height: number; gray: Uint8Array } {
	const width = 64;
	const height = 32;
	const gray = new Uint8Array(width * height);
	for (let y = 13; y < 19; y += 1) for (let x = dotX - 3; x < dotX + 3; x += 1) gray[y * width + x] = 255;
	return { mediaTimeMs: time, width, height, gray };
}

it('tracks from the calibrated frame in both time directions', () => {
	const result = trackBarSamples(
		[frame(0, 20), frame(100, 22), frame(200, 24)],
		{ mediaTimeMs: 100, x: 22 / 64, y: 16 / 32 },
		{ patchSize: 8, searchRadius: 6, confidenceThreshold: 0.75 }
	);
	expect(result.get(0)?.x).toBeCloseTo(20 / 64, 2);
	expect(result.get(200)?.x).toBeCloseTo(24 / 64, 2);
});

it('stops a direction instead of extrapolating after confidence loss', () => {
	const blank = frame(200, 1000);
	const result = trackBarSamples(
		[frame(0, 20), frame(100, 22), blank, frame(300, 26)],
		{ mediaTimeMs: 100, x: 22 / 64, y: 16 / 32 },
		{ patchSize: 8, searchRadius: 6, confidenceThreshold: 0.75 }
	);
	expect(result.get(200)).toBeNull();
	expect(result.get(300)).toBeNull();
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `cd frontend; npm run test:unit -- src/lib/technique/bar-tracker.test.ts`

Expected: FAIL because the tracker does not exist.

- [ ] **Step 3: Implement normalized cross-correlation tracking**

Extract the calibration patch, compare zero-mean normalized cross-correlation
over the bounded search window in each adjacent frame, select the unique maximum,
and convert the patch center back to normalized coordinates. Track forward and
backward independently from the calibration frame. Return `null` for the first
score below `0.75` and every later frame in that direction. Reject calibration
within half a patch of the image edge with a user-facing recalibration error.

Structure the pure implementation around a stateful direction tracker that
holds only the fixed 48×48 calibration template, previous normalized point, and
lost flag. `trackBarSamples` feeds synthetic frames through that state machine;
it exists to make direction/loss policy deterministic, not as the production
decoder contract.

Use these exact config defaults in production:

```ts
export const BAR_TRACKER_V1 = {
	name: 'normalized-cross-correlation' as const,
	version: 1 as const,
	patchSize: 48,
	searchRadius: 64,
	confidenceThreshold: 0.75
};
```

- [ ] **Step 4: Implement bounded browser crop decoding**

`createBrowserBarTracker()` creates a private muted video from the original
Blob. It seeks first to the nearest calibration sample, draws only the 48×48
template crop to a small canvas, and then walks sample times forward and
backward. At each step it draws at most the bounded
`(patchSize + 2 * searchRadius)` square around the previous point, converts that
single crop to grayscale, feeds the direction tracker, and releases the pixel
buffer before decoding the next sample. It never retains full grayscale frames
or an array of search crops. At v1 defaults the live search image is at most
176×176 bytes plus canvas backing storage.

Use `createImageBitmap`/canvas crop when supported and a hidden video + canvas
fallback otherwise. Yield to the event loop after each crop, report progress,
honor `AbortSignal`, revoke the Blob URL, and clear canvas dimensions on dispose.
Record actual decoded time for matching to the nearest pose sample; never infer
position from nominal 10 Hz indices.

Add decoder tests with an injected seek/crop adapter proving forward/backward
order, one live crop at a time, abort cleanup, decoded-time preservation, and no
decode after a direction becomes lost.

- [ ] **Step 5: Run tracker and all technique unit tests**

Run: `cd frontend; npm run test:unit -- src/lib/technique/bar-tracker.test.ts src/lib/technique/bar-decoder.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the tracker**

```powershell
git add frontend/src/lib/technique/bar-tracker.ts frontend/src/lib/technique/bar-tracker.test.ts frontend/src/lib/technique/bar-decoder.ts frontend/src/lib/technique/bar-decoder.test.ts
git commit -m "feat: track a calibrated bar point"
```

---

### Task 4: Render confidence-aware, synchronized overlays

**Files:**
- Create: `frontend/src/lib/technique/overlay.ts`
- Test: `frontend/src/lib/technique/overlay.test.ts`
- Modify: `frontend/src/lib/TechniqueReview.svelte`
- Modify: `frontend/src/lib/technique/review.ts`
- Modify: `frontend/src/lib/technique/types.ts`
- Test: `frontend/src/lib/technique/review.test.ts`

**Interfaces:**
- Consumes: `TrackingResult`, current `video.currentTime`, source dimensions, canvas viewport, and overlay toggles.
- Produces: `drawTechniqueOverlay(context, input): OverlayAvailability`; new review phases `processing`, `calibrating`, and analyzed `review`.

- [ ] **Step 1: Write failing transform, confidence, interpolation, and gap tests**

```ts
import { expect, it } from 'vitest';
import { fitContain, interpolatePoint, sourceToViewport } from './overlay';

it('maps normalized source coordinates through letterboxing', () => {
	const fit = fitContain({ width: 1280, height: 720 }, { width: 400, height: 400 });
	expect(fit).toEqual({ x: 0, y: 87.5, width: 400, height: 225 });
});

it('rotates source coordinates before applying letterboxing', () => {
	const point = sourceToViewport(
		{ x: 0, y: 0 },
		{ width: 1280, height: 720, rotationDegrees: 90 },
		{ width: 400, height: 400 }
	);
	expect(point).toEqual({ x: 312.5, y: 0 });
});

it('does not interpolate across more than one 10 Hz interval', () => {
	expect(
		interpolatePoint(
			{ mediaTimeMs: 0, x: 0, y: 0 },
			{ mediaTimeMs: 250, x: 1, y: 1 },
			100,
			110
		)
	).toBeNull();
});
```

Add review tests proving analysis failure returns to raw review, bar
recalibration replaces bar samples without calling the pose analyzer again, and
discard aborts active analysis.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `cd frontend; npm run test:unit -- src/lib/technique/overlay.test.ts src/lib/technique/review.test.ts`

Expected: FAIL on missing overlay functions and phases.

- [ ] **Step 3: Implement pure overlay selection and drawing**

Use landmark presence and visibility thresholds of `0.5`, stored as
`POSE_GUIDE_CONFIDENCE_V1`. Draw body connections only when both endpoints pass;
nose plumb only for landmark 0; knee traces from accepted landmarks 25/26; foot
reference from same-side ankle/heel/foot indices 27/29/31 or 28/30/32; and bar
point/path/plumb only for non-null bar samples. Do not connect across a missing
sample. Interpolate only when adjacent accepted samples are at most 110 ms apart.

Pose selection uses `TrackingSample.mediaTimeMs`; bar selection and
interpolation use each `BarPoint.mediaTimeMs`, preserving the bar decoder's
actual timestamp instead of borrowing the nearest pose time. `OverlayAvailability` is:

```ts
export type OverlayAvailability = {
	body: 'visible' | 'unavailable';
	nose: 'visible' | 'unavailable';
	bar: 'visible' | 'needs-calibration' | 'tracking-lost';
	kneeFeet: 'visible' | 'unavailable';
};
```

Canvas styling uses solid/long-dash distinctions plus text labels; color is not
the sole state carrier. Apply clockwise source rotation around normalized image
space before contain-fit letterboxing,
then device pixel ratio while CSS size stays in layout pixels. The inverse
calibration transform applies those operations in reverse. Preview mirroring is
an explicit transform input and is false for the requested rear camera.

- [ ] **Step 4: Extend review orchestration and UI**

After recording, show raw review immediately and start pose analysis with visible
`completed / total` progress. Preserve raw playback if analysis fails. When pose
is ready, enter calibration: pause video, let the athlete seek, translate one
canvas pointer through the inverse fit transform, run `BarTrackerPort` against
bounded re-decoded crops, and render analyzed review. Store only bar point,
confidence, and decoded timestamp per sample; no pixels enter `TrackingResult`.

Add independent toggle buttons with `aria-pressed`: **Body**, **Nose**, **Bar**,
and **Knee & feet**. Add adjacent text for unavailable/lost guides. Add
**Recalibrate bar**, which clears only calibration/bar fields and reuses pose
samples. Drive drawing from `requestVideoFrameCallback` where available and
`requestAnimationFrame` otherwise.

- [ ] **Step 5: Verify and commit overlays**

Run:

```powershell
cd frontend
npm run test:unit -- src/lib/technique
npm run check
npm run lint
npm run build
git add src/lib/technique src/lib/TechniqueReview.svelte
git commit -m "feat: overlay squat pose and calibrated bar evidence"
```

---

### Task 5: Add approved fixture-video and physical-device gates

**Files:**
- Create after explicit media approval: `frontend/tests/fixtures/technique/side-squat.*`
- Create after explicit media approval: `frontend/tests/fixtures/technique/occluded-squat.*`
- Create after explicit media approval: `frontend/tests/fixtures/technique/camera-movement.*`
- Create: `frontend/tests/fixtures/technique/README.md`
- Create: `frontend/src/routes/session/tracking.e2e.ts`
- Modify: `docs/spikes/2026-08-13-technique-review-device-results.md`

**Interfaces:**
- Consumes: a project-owner-approved, consented or redistribution-licensed fixture source and the production analyzer/tracker.
- Produces: tolerance-based browser tests plus named-device latency and accuracy evidence.

- [ ] **Step 1: Obtain explicit fixture approval before writing media**

Present the exact source, license/consent, filenames, visible identity, repository
history implications, and total bytes. Continue only after the project owner
approves committing those exact files. If approval is withheld, keep physical
acceptance mandatory and do not claim fixture-video coverage.

- [ ] **Step 2: Record fixture provenance and expected invariants**

`README.md` names source, consent/license, capture orientation, MIME, dimensions,
duration, SHA-256, and why it may remain in repository history. Expected results
are invariants, not coordinates: a pose is present for most clear samples;
occlusion yields missing landmarks; bar tracking stops at occlusion; camera
movement does not create an uninterrupted plausible bar path.

- [ ] **Step 3: Write browser tests against model-version tolerances**

Tests load each fixture into the analyzer and assert monotonic actual timestamps,
at least 70% confident-pose samples for the clear clip, at least one confidence
gap for occlusion, no bar samples after the first lost frame until explicit
recalibration, and no stored interpolation. They never assert exact landmark
pixels.

- [ ] **Step 4: Run the full physical matrix**

On installed iPhone and Android PWAs, record a 30-second clip, analyze, calibrate,
play, pause, scrub, toggle every guide, force bar loss, recalibrate, and discard.
Record total analysis time, UI responsiveness, timestamp synchronization, memory
recovery where observable, and thermal symptoms. The acceptance gate is analysis
within 30 seconds on the named oldest supported devices.

- [ ] **Step 5: Verify and commit tests/evidence**

Run:

```powershell
cd frontend
npm run test:unit
npm run check
npm run lint
npm run build
npx playwright test src/routes/session/tracking.e2e.ts
git add tests/fixtures src/routes/session/tracking.e2e.ts ../docs/spikes/2026-08-13-technique-review-device-results.md
git commit -m "test: verify side-view squat tracking"
```

Proceed next to `2026-08-13-technique-review-local-retention.md`.
