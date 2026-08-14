# Technique Review Bar Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add transient, one-tap, deterministic bar tracking and a synchronized bar-path overlay to raw side-view squat review.

**Architecture:** A pure TypeScript tracking core owns fixed-rate timestamp policy, normalized coordinates, confidence/loss policy, and deterministic template matching. A browser adapter decodes bounded grayscale crops and delegates matching to a dedicated worker; the existing `TechniqueReview` state machine owns cancellation and result lifetime, while a pure canvas renderer and focused Svelte view own calibration and playback presentation.

**Tech Stack:** SvelteKit 2.63, Svelte 5 runes, TypeScript 6, Web Workers, HTML video/canvas, `requestVideoFrameCallback`, Vitest 4, Playwright 1.60.

**Spec:** `docs/superpowers/specs/2026-08-14-bar-path-evidence-design.md`

## Global Constraints

- Bar only: no pose model, MediaPipe, browser ML, skeleton, nose, knee, foot, measurement, grade, verdict, or cue.
- Calibration is one athlete tap on a paused clear top/start frame at the visible sleeve or plate center.
- The sampling policy targets fixed 10 Hz, but every retained observation stores its actual decoded `mediaTimeMs`.
- Coordinates are normalized source coordinates; no canvas pixel, image patch, frame, grayscale crop, or interpolated point enters `BarTrackingResult`.
- Tracking runs independently backward and forward and stops in a direction at the first rejected sample; it never extrapolates or resumes automatically.
- A rejected decoded sample stores `{ mediaTimeMs, point: null }`; samples never decoded after loss are not fabricated.
- The visible overlay is a progressive accepted path through current playback time, a current marker, and a dashed vertical reference through calibration X.
- Record again, Discard, Close, teardown, and failure abort tracking and release every private URL, worker, canvas, crop, and late result.
- Tracking and its failures never mutate `LocalSession`, disable Log/Skip, retain a clip, or upload data.
- Preserve front-camera-first capture, three-second countdown, 45-second monotonic hard stop, raw review, offline `/session`, and discard-by-default behavior.
- Do not add a real fixture video without explicit approval of its consent/license provenance.
- Physical acceptance target: a 30-second clip completes 10 Hz tracking within 30 seconds on the Pixel 6a without freezing playback controls.

---

### Task 1: Define timestamped bar evidence and the deterministic tracking core

**Files:**
- Create: `frontend/src/lib/technique/bar-path.ts`
- Test: `frontend/src/lib/technique/bar-path.test.ts`

**Interfaces:**
- Consumes: normalized calibration coordinates and small grayscale frames supplied by Task 2.
- Produces: `BAR_TRACKER_V1`, `BarCalibration`, `BarPoint`, `BarSample`, `BarTrackingResult`, `GrayFrame`, `GrayCrop`, `BarTemplate`, `fixedBarSampleTargets(durationMs)`, `nearestBarSample(samples, mediaTimeMs)`, `createBarTemplate(crop, calibration, config?)`, `matchBarCrop(template, crop, previous, config?)`, and `trackBarFrames(frames, calibration, config?)`.

- [x] **Step 1: Write failing timestamp, forward/backward, ambiguity, and loss tests**

Create `bar-path.test.ts` with synthetic frames only:

```ts
import { describe, expect, it } from 'vitest';
import { BAR_TRACKER_V1, fixedBarSampleTargets, nearestBarSample, trackBarFrames } from './bar-path';

function frame(mediaTimeMs: number, dotX: number | null): {
	mediaTimeMs: number;
	width: number;
	height: number;
	gray: Uint8Array;
} {
	const width = 96;
	const height = 48;
	const gray = new Uint8Array(width * height).fill(24);
	if (dotX !== null) {
		for (let y = 20; y < 28; y += 1) {
			for (let x = dotX - 4; x < dotX + 4; x += 1) gray[y * width + x] = 230;
		}
	}
	return { mediaTimeMs, width, height, gray };
}

describe('fixedBarSampleTargets', () => {
	it('targets 10 Hz without including a target at or beyond duration', () => {
		expect(fixedBarSampleTargets(340)).toEqual([0, 100, 200, 300]);
	});
});

it('tracks independently backward and forward from one calibration', () => {
	const result = trackBarFrames(
		[frame(0, 36), frame(100, 38), frame(200, 40)],
		{ mediaTimeMs: 100, x: 38 / 96, y: 24 / 48 },
		{ ...BAR_TRACKER_V1, patchSize: 8, searchRadius: 8, coarseStep: 2, refineRadius: 2 }
	);
	expect(result.samples.map((sample) => sample.mediaTimeMs)).toEqual([0, 100, 200]);
	expect(result.samples[0].point?.x).toBeCloseTo(36 / 96, 2);
	expect(result.samples[2].point?.x).toBeCloseTo(40 / 96, 2);
});

it('stores the rejected timestamp and fabricates no later samples after loss', () => {
	const result = trackBarFrames(
		[frame(0, 36), frame(100, 38), frame(200, null), frame(300, 42)],
		{ mediaTimeMs: 100, x: 38 / 96, y: 24 / 48 },
		{ ...BAR_TRACKER_V1, patchSize: 8, searchRadius: 8, coarseStep: 2, refineRadius: 2 }
	);
	expect(result.samples.find((sample) => sample.mediaTimeMs === 200)?.point).toBeNull();
	expect(result.samples.some((sample) => sample.mediaTimeMs === 300)).toBe(false);
});
```

Also add tests that:

- `nearestBarSample` selects by actual irregular timestamp rather than array index;
- calibration within half a patch of any source edge throws `Choose a clearer frame with the bar away from the edge.`;
- two candidates within `ambiguityMargin` reject the sample instead of picking one arbitrarily; and
- input frames and output samples remain sorted by actual media time.

- [x] **Step 2: Run the focused test and verify red**

Run: `cd frontend; npm run test:unit -- src/lib/technique/bar-path.test.ts`

Expected: FAIL because `bar-path.ts` does not exist.

- [x] **Step 3: Add exact types, constants, and timestamp helpers**

Define:

```ts
export const BAR_TRACKER_V1 = {
	name: 'normalized-cross-correlation' as const,
	version: 1 as const,
	patchSize: 32,
	searchRadius: 48,
	coarseStep: 4,
	refineRadius: 4,
	confidenceThreshold: 0.75,
	ambiguityMargin: 0.03
};

export type BarCalibration = { mediaTimeMs: number; x: number; y: number };
export type BarPoint = { x: number; y: number; confidence: number };
export type BarSample = { mediaTimeMs: number; point: BarPoint | null };
export type GrayFrame = { mediaTimeMs: number; width: number; height: number; gray: Uint8Array };
export type GrayCrop = GrayFrame & {
	originX: number;
	originY: number;
	sourceWidth: number;
	sourceHeight: number;
};
export type BarTemplate = {
	width: number;
	height: number;
	centered: Float32Array;
	centeredNorm: number;
};

export type BarTrackingResult = {
	schemaVersion: 1;
	sourceWidth: number;
	sourceHeight: number;
	rotationDegrees: 0 | 90 | 180 | 270;
	samplingPolicy: { kind: 'fixed'; hz: 10 };
	tracker: {
		name: typeof BAR_TRACKER_V1.name;
		version: typeof BAR_TRACKER_V1.version;
		confidenceThreshold: number;
	};
	calibration: BarCalibration & { patchSize: number };
	samples: BarSample[];
};
```

`fixedBarSampleTargets` uses `1000 / 10`, emits values from zero while `< durationMs`, and never rounds stored decoded times. `nearestBarSample` uses binary search and resolves equal distance toward the later sample.

- [x] **Step 4: Implement coarse-to-fine normalized cross-correlation**

Extract one fixed template at the calibration frame. Precompute its mean and centered norm. For each adjacent frame in a direction:

1. Search offsets within `searchRadius` around the prior accepted source point at `coarseStep` spacing.
2. Retain the best and second-best non-overlapping candidate scores.
3. Search pixel offsets inside `refineRadius` around the coarse winner.
4. Reject when the best score is below `confidenceThreshold` or its lead over the second-best score is below `ambiguityMargin`.
5. On acceptance, convert the candidate center to normalized source coordinates and continue from it.
6. On rejection, append exactly one timestamped `point: null` and stop that direction.

Use integral sums and squared sums for candidate mean/norm; do not allocate a patch per candidate. Track backward and forward from the nearest calibration frame with independent last-point/lost state, then return sorted samples. The calibration sample is accepted at confidence `1`.

`createBarTemplate` extracts and normalizes the fixed calibration patch.
`matchBarCrop` accepts a bounded crop with source-pixel origin/dimensions and a
previous normalized source point, then returns one timestamped `BarSample`.
`trackBarFrames` exercises those same two exported primitives against synthetic
full frames (`originX = originY = 0`); production worker code in Task 2 must not
contain a second matching implementation.

- [x] **Step 5: Run focused tests, type-check, and commit**

Run:

```powershell
cd frontend
npm run test:unit -- src/lib/technique/bar-path.test.ts
npm run check
git diff --check
```

Expected: PASS.

Commit:

```powershell
git add frontend/src/lib/technique/bar-path.ts frontend/src/lib/technique/bar-path.test.ts
git commit -m "feat: model deterministic bar tracking"
```

---

### Task 2: Decode bounded crops and match them off the rendering thread

**Files:**
- Create: `frontend/src/lib/technique/bar-decoder.ts`
- Create: `frontend/src/lib/technique/bar-matcher.worker.ts`
- Test: `frontend/src/lib/technique/bar-decoder.test.ts`

**Interfaces:**
- Consumes: `CapturedClip`, `BarCalibration`, `BAR_TRACKER_V1`, and Task 1 result types.
- Produces: `BarTrackerPort`, `BarTrackingProgress`, `trackDecodedBar(input, decode, matcher, signal)`, and `createBrowserBarTracker(environment?): BarTrackerPort`.

- [x] **Step 1: Write failing decode-order, timestamp, loss, abort, and cleanup tests**

Define injected seams in the test:

```ts
import { expect, it, vi } from 'vitest';
import { trackDecodedBar } from './bar-decoder';

it('decodes from calibration backward and forward and preserves actual times', async () => {
	const decode = vi.fn(async (target: number) => ({
		mediaTimeMs: target + 3,
		width: 64,
		height: 64,
		originX: 0,
		originY: 0,
		gray: new Uint8Array(64 * 64)
	}));
	const matcher = {
		calibrate: vi.fn(async () => undefined),
		step: vi.fn(async ({ mediaTimeMs }: { mediaTimeMs: number }) => ({
			mediaTimeMs,
			point: { x: 0.5, y: 0.5, confidence: 0.9 }
		})),
		dispose: vi.fn(async () => undefined)
	};
	const result = await trackDecodedBar(
		{ durationMs: 340, width: 64, height: 64, rotationDegrees: 0 },
		{ mediaTimeMs: 200, x: 0.5, y: 0.5 },
		decode,
		matcher,
		() => {},
		new AbortController().signal
	);
	expect(decode.mock.calls.map(([time]) => time)).toEqual([200, 100, 0, 300]);
	expect(result.samples.map((sample) => sample.mediaTimeMs)).toEqual([3, 103, 203, 303]);
});
```

Add tests proving:

- a `point: null` result stops further decode in that direction but not the other direction;
- abort is checked before every decode and disposes decoder/matcher once;
- equal actual decoded timestamps are deduplicated;
- progress is monotonic and reports completed/total plus the actual media time; and
- only one crop buffer is live at a time—the prior transferred/released buffer is not retained before the next decode.

- [x] **Step 2: Run the focused test and verify red**

Run: `cd frontend; npm run test:unit -- src/lib/technique/bar-decoder.test.ts`

Expected: FAIL because the decoder does not exist.

- [x] **Step 3: Define the browser adapter contract and pure orchestration**

```ts
export type BarTrackingProgress = { completed: number; total: number; mediaTimeMs: number };

export type BarTrackerPort = {
	track(
		clip: CapturedClip,
		calibration: BarCalibration,
		onProgress: (progress: BarTrackingProgress) => void,
		signal: AbortSignal
	): Promise<BarTrackingResult>;
	dispose(): Promise<void>;
};
```

`trackDecodedBar` generates 10 Hz targets, chooses the nearest calibration target, decodes the calibration frame once, walks earlier targets in descending order and later targets in ascending order, records actual decoder times, and returns sorted/deduplicated samples. It stops only the lost direction.

- [x] **Step 4: Implement bounded video crop decoding**

`createBrowserBarTracker`:

- creates a private muted `playsInline` metadata video from `clip.blob`;
- uses the clip's decoded source dimensions and `rotationDegrees` as result metadata;
- seeks monotonically within each direction and captures `video.currentTime * 1000` after decode;
- uses `requestVideoFrameCallback` when available, otherwise `seeked` plus a painted-frame task;
- draws only the calibration patch or `(patchSize + 2 * searchRadius)` search square to a small canvas;
- converts that bounded crop to one grayscale `Uint8Array` and transfers its buffer to the worker;
- checks `AbortSignal` before seek, crop, and worker dispatch;
- yields after every completed crop; and
- revokes its Blob URL, pauses/clears the video, zeroes canvas dimensions, terminates the worker, and settles pending requests on dispose.

If a crop crosses a source edge, return the calibration edge message during calibration or a timestamped lost sample during tracking.

- [x] **Step 5: Implement the worker protocol and matcher**

Use exact messages:

```ts
type MatcherRequest =
	| { type: 'calibrate'; gray: Uint8Array; width: number; height: number; config: typeof BAR_TRACKER_V1 }
	| { type: 'step'; requestId: number; direction: 'backward' | 'forward'; mediaTimeMs: number; gray: Uint8Array; width: number; height: number; originX: number; originY: number; sourceWidth: number; sourceHeight: number }
	| { type: 'close' };

type MatcherResponse =
	| { type: 'ready' }
	| { type: 'result'; requestId: number; sample: BarSample }
	| { type: 'error'; requestId: number | null; message: string };
```

The worker owns the `BarTemplate` and independent direction state, calls Task 1
`createBarTemplate`/`matchBarCrop`, transfers no pixels back, and drops direction
state after loss. Stable errors contain no frame data or stack.

- [x] **Step 6: Verify adapter behavior and commit**

Run:

```powershell
cd frontend
npm run test:unit -- src/lib/technique/bar-path.test.ts src/lib/technique/bar-decoder.test.ts
npm run check
npm run build
git diff --check
```

Expected: PASS and Vite emits a worker chunk.

Commit:

```powershell
git add frontend/src/lib/technique/bar-decoder.ts frontend/src/lib/technique/bar-decoder.test.ts frontend/src/lib/technique/bar-matcher.worker.ts
git commit -m "feat: decode bar tracking samples off thread"
```

---

### Task 3: Orchestrate calibration and draw the synchronized bar overlay

**Files:**
- Create: `frontend/src/lib/technique/bar-overlay.ts`
- Test: `frontend/src/lib/technique/bar-overlay.test.ts`
- Modify: `frontend/src/lib/technique/types.ts`
- Modify: `frontend/src/lib/technique/review.ts`
- Modify: `frontend/src/lib/technique/review.test.ts`
- Modify: `frontend/src/lib/TechniqueReview.svelte`
- Modify: `frontend/src/routes/session/page.e2e.ts`

**Interfaces:**
- Consumes: `BarTrackerPort`, `BarTrackingResult`, raw review video time, source dimensions, viewport, and captured rotation.
- Produces: calibration/tracking review phases and intents; `fitContainedVideo`, `viewportToSource`, `barEvidenceAt`, and `drawBarOverlay`.

- [x] **Step 1: Write failing transform, interpolation, and gap tests**

Create `bar-overlay.test.ts`:

```ts
import { expect, it } from 'vitest';
import { barEvidenceAt, fitContainedVideo, viewportToSource } from './bar-overlay';

it('fits landscape source inside a portrait viewport', () => {
	expect(fitContainedVideo({ width: 1280, height: 720 }, { width: 400, height: 400 })).toEqual({
		x: 0,
		y: 87.5,
		width: 400,
		height: 225
	});
});

it('inverts letterboxing and clockwise source rotation for calibration', () => {
	expect(
		viewportToSource(
			{ x: 312.5, y: 0 },
			{ width: 1280, height: 720, rotationDegrees: 90 },
			{ width: 400, height: 400 }
		)
	).toEqual({ x: 0, y: 0 });
});

it('does not bridge a rejected sample', () => {
	const evidence = barEvidenceAt(
		[
			{ mediaTimeMs: 0, point: { x: 0.4, y: 0.4, confidence: 0.9 } },
			{ mediaTimeMs: 100, point: null },
			{ mediaTimeMs: 200, point: { x: 0.5, y: 0.5, confidence: 0.9 } }
		],
		150
	);
	expect(evidence.current).toBeNull();
	expect(evidence.path).toHaveLength(1);
});
```

Add DPR, mirror=false, progressive-path, current-marker interpolation, calibration-reference X, and >110 ms gap tests.

- [x] **Step 2: Write failing review lifecycle tests**

Extend `review.test.ts` with a fake `BarTrackerPort` and prove:

- raw `review` appears before tracking;
- `start-bar-calibration` enters `calibrating` without losing clip/url;
- `calibrate-bar` enters `tracking`, publishes monotonic progress, then returns `review` with the result;
- a tracker failure returns to raw `review` with `bar.kind === 'failure'`;
- recalibration aborts/replaces only bar work and its result;
- Record again, Discard, Close/dispose abort active tracking and dispose the tracker once;
- a late result after cancellation cannot recreate review state or a Blob URL; and
- none of the new intents receive or mutate `LocalSession`.

- [x] **Step 3: Run focused tests and verify red**

Run:

```powershell
cd frontend
npm run test:unit -- src/lib/technique/bar-overlay.test.ts src/lib/technique/review.test.ts
```

Expected: FAIL on missing overlay functions, states, and intents.

- [x] **Step 4: Extend review types and orchestration**

Add:

```ts
export type BarReviewState =
	| { kind: 'idle' }
	| { kind: 'ready'; result: BarTrackingResult }
	| { kind: 'failure'; message: string };

export type TechniqueBarProgress = BarTrackingProgress;
```

Review-related phases become:

```ts
| { phase: 'review'; clip: CapturedClip; url: string; bar: BarReviewState }
| { phase: 'calibrating'; clip: CapturedClip; url: string }
| { phase: 'tracking'; clip: CapturedClip; url: string; progress: TechniqueBarProgress }
```

Add intents:

```ts
| { type: 'start-bar-calibration' }
| { type: 'calibrate-bar'; calibration: BarCalibration }
| { type: 'cancel-bar-calibration' }
| { type: 'recalibrate-bar' }
```

Change `createTechniqueReview` to accept `barTracker: BarTrackerPort` before the clock. Own one `AbortController` per tracking attempt. Publish progress only for the current attempt, retain the raw clip/url through every bar phase, and map calibration edge rejection to its exact user message. Tracking failure is non-terminal raw review, not `phase: 'failure'`.

- [x] **Step 5: Implement pure coordinate and drawing functions**

`fitContainedVideo` and `viewportToSource` share the same tested rotation/contain transform. `barEvidenceAt(samples, mediaTimeMs)` returns:

```ts
{
	path: BarPoint[];
	current: BarPoint | null;
	lost: boolean;
}
```

The path contains accepted samples at or before current playback time and stops at a rejected/gap sample. Interpolate only between adjacent accepted samples at most 110 ms apart. `drawBarOverlay` renders:

- solid progressive path;
- filled current marker with contrasting outline; and
- long-dashed vertical reference through calibration X across the contained video bounds.

Return `{ bar: 'visible' | 'needs-calibration' | 'tracking-lost' }` so Svelte can render adjacent text. Canvas CSS dimensions remain layout pixels while backing dimensions multiply by device pixel ratio.

- [x] **Step 6: Add the calibration and playback UI**

In `TechniqueReview.svelte`:

- construct `createBrowserBarTracker()` alongside the recorder and pass both adapters to `createTechniqueReview`;
- bind the raw review video and an absolutely overlaid canvas inside one `object-contain` wrapper;
- show **Track bar** in raw review idle/failure states;
- on calibration, pause video, show `Pause at the top, then tap the visible sleeve or plate center.`, and accept one pointer tap inside the contained source image;
- show determinate `Tracking bar: {completed}/{total}` progress without hiding raw video;
- show **Bar path** with `aria-pressed` to toggle only rendering;
- show **Recalibrate bar** without re-recording;
- show `Tracking lost — recalibrate bar.` beside the canvas when appropriate; and
- preserve Record again and primary Discard controls.

Drive redraw with `requestVideoFrameCallback` when available and `requestAnimationFrame` otherwise. Cancel the callback on phase change/dispose. Pointer handling exists only in calibration; the overlay is otherwise pointer-transparent.

- [x] **Step 7: Extend browser coverage**

In `page.e2e.ts`, extend the existing fake media environment with a deterministic fake `Worker`, metadata/video-frame behavior, and canvas image data sufficient to exercise calibration. Add tests that:

- raw review offers **Track bar**;
- calibration instruction appears and a pointer tap starts progress;
- ready review exposes **Bar path** and **Recalibrate bar**;
- toggling Bar path does not change `0/{total} done` workout state;
- tracking failure leaves raw playback, Record again, and Discard usable; and
- immediate Discard during tracking aborts the worker and stops/revokes media resources.

- [x] **Step 8: Run full frontend verification and commit**

Run:

```powershell
cd frontend
npm run test:unit
npm run check
npm run lint
npm run build
npx playwright test
git diff --check
Get-Item .svelte-kit/output/prerendered/pages/session.html
```

Expected: all pass and `/session` remains prerendered.

Commit:

```powershell
git add frontend/src/lib/technique/bar-overlay.ts frontend/src/lib/technique/bar-overlay.test.ts frontend/src/lib/technique/types.ts frontend/src/lib/technique/review.ts frontend/src/lib/technique/review.test.ts frontend/src/lib/TechniqueReview.svelte frontend/src/routes/session/page.e2e.ts
git commit -m "feat: review a calibrated bar path"
```

---

### Task 4: Validate the path on the Pixel 6a and record the evidence

**Files:**
- Modify: `docs/spikes/2026-08-13-technique-review-device-results.md`
- Modify: `docs/DESIGN.md`

**Interfaces:**
- Consumes: production capture-through-discard bar-path flow from Tasks 1–3.
- Produces: an observed support entry and a durable D-09 amendment that bar-path lines are local screen-space evidence, not measurements or judgments.

- [x] **Step 1: Deploy the production build to the existing HTTPS device-test route**

Use the same adapter-node/ngrok method proven by the capture slice. Do not commit generated `frontend/build`, a seed page, tunnel configuration, or device media.

- [x] **Step 2: Run the accepted physical flow**

On the Pixel 6a installed PWA, record a consented 10–30 second side-view squat clip and test:

1. raw review appears immediately;
2. Track bar → seek/pause → one tap;
3. progress remains responsive;
4. play, pause, and scrub keep path/current marker synchronized;
5. the dashed reference stays fixed at calibration X;
6. an occlusion/loss produces a gap, not a guessed continuation;
7. Recalibrate replaces the path;
8. Discard removes the transient clip and overlay;
9. ordinary Log/Skip remain usable; and
10. repeat offline after the app shell has loaded once.

Record clip duration, sample count, wall time, tracking loss/recovery observation, UI responsiveness, cleanup, offline result, browser/PWA mode, and whether the 30-second-within-30-second gate passed.

- [x] **Step 3: Document only observed behavior**

Append a `Bar-path slice` table to the device-results document. Mark any unrun step `not observed`; do not infer support from unit/browser tests.

Amend D-09 in established prose style with:

> Bar-path overlays are transient, local screen-space evidence derived from one athlete calibration. Missing confidence creates a visible gap; no path line is a measurement, verdict, or cue.

- [x] **Step 4: Run repository checks and commit documentation**

Run:

```powershell
git diff --check
cd frontend
npm run check
npm run test:unit
npm run build
```

Expected: PASS.

Commit:

```powershell
git add docs/spikes/2026-08-13-technique-review-device-results.md docs/DESIGN.md
git commit -m "docs: record bar path device evidence"
```

After this gate, proceed to `2026-08-13-technique-review-local-retention.md`. Do not begin Hetzner inference experiments until deliberate retention/upload and separate experiment-consent designs are implemented.
