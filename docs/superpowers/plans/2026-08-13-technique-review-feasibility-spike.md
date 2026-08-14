# Technique Review Feasibility Spike Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure whether installed iPhone/Safari and Android/Chrome PWAs can capture, decode, analyze, replay, and persist a side-view squat clip without making the logger unresponsive.

**Architecture:** Build a deliberately temporary `/technique-spike` route and worker on a disposable implementation branch, run it on physical devices over a trusted HTTPS origin, record actual capabilities and timings, then delete every spike source and dependency. The only lasting artifact is an evidence table and a go/no-go decision; no spike implementation becomes production code.

**Tech Stack:** SvelteKit 2.63, Svelte 5 runes, TypeScript 6, Vite 8, MediaRecorder, IndexedDB, Web Workers, `ImageBitmap`, MediaPipe Tasks Vision 1.0.1, Pose Landmarker lite v1.

**Spec:** `docs/superpowers/specs/2026-08-13-side-view-squat-technique-review-design.md`

## Global Constraints

- Run this plan before every production Technique review plan.
- Use rear camera, no audio, ideal 1280×720 at 30 fps, and a 45-second hard cap.
- Analyze fixed media timestamps at 10 Hz; record actual decoded timestamps.
- Do not upload or retain any test recording outside the tested browser profile.
- Use only consented recordings made by the person running the spike.
- Test installed-PWA and ordinary-browser modes on one real iPhone/Safari and one real Android/Chrome device.
- The temporary route must not be merged or deployed as production functionality.
- Pin `@mediapipe/tasks-vision` to `1.0.1`; do not use a CDN or `latest` URL.
- Pin the lite model to `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task` and verify SHA-256 `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a` before serving it.

---

### Task 1: Build the disposable capability harness

**Files:**
- Modify temporarily: `frontend/package.json`
- Modify temporarily: `frontend/package-lock.json`
- Create temporarily: `frontend/static/models/pose_landmarker_lite_v1.task`
- Create temporarily: `frontend/src/routes/technique-spike/+page.ts`
- Create temporarily: `frontend/src/routes/technique-spike/+page.svelte`
- Create temporarily: `frontend/src/routes/technique-spike/spike.ts`
- Create temporarily: `frontend/src/routes/technique-spike/spike.worker.ts`
- Test: `frontend/src/routes/technique-spike/spike.test.ts`

**Interfaces:**
- Consumes: browser `MediaRecorder`, `HTMLVideoElement`, `createImageBitmap`, Worker, IndexedDB, and MediaPipe `PoseLandmarker`.
- Produces: downloadable `SpikeReport` JSON containing capabilities, actual capture settings, codec, blob bytes, decode timestamps, analysis timings, landmark count/confidence, Web Crypto SHA-256 timing, IndexedDB round-trip result, memory observations when available, and cleanup result.

- [ ] **Step 1: Install the exact temporary dependency and model**

Run:

```powershell
cd frontend
npm install --save-exact @mediapipe/tasks-vision@1.0.1
Invoke-WebRequest -Uri 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task' -OutFile 'static/models/pose_landmarker_lite_v1.task'
New-Item -ItemType Directory -Force 'static/mediapipe/wasm' | Out-Null
Copy-Item 'node_modules/@mediapipe/tasks-vision/wasm/*' 'static/mediapipe/wasm/'
(Get-FileHash -Algorithm SHA256 'static/models/pose_landmarker_lite_v1.task').Hash.ToLowerInvariant()
```

Expected: the final line is exactly `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`.

- [ ] **Step 2: Write the failing report-shape and fixed-timestamp tests**

Create `spike.test.ts` with tests that require actual timestamps rather than an implied constant rate:

```ts
import { describe, expect, it } from 'vitest';
import { fixedSampleTargets, summariseSpike } from './spike';

describe('technique spike report', () => {
	it('requests fixed 10 Hz targets without inventing decoded timestamps', () => {
		expect(fixedSampleTargets(350)).toEqual([0, 100, 200, 300]);
	});

	it('retains irregular decoded timestamps in the report', () => {
		const report = summariseSpike({
			requestedMs: [0, 100, 200],
			decodedMs: [0, 101.4, 198.8],
			analysisMs: [12, 11, 14]
		});
		expect(report.decodedMs).toEqual([0, 101.4, 198.8]);
		expect(report.analysis.totalMs).toBe(37);
	});
});
```

- [ ] **Step 3: Run the focused test and observe the expected failure**

Run: `cd frontend; npm run test:unit -- src/routes/technique-spike/spike.test.ts`

Expected: FAIL because `./spike` and its exports do not exist.

- [ ] **Step 4: Implement the smallest complete spike**

Create a local `spike.ts` beside the test with these exact durable report types:

```ts
export type SpikeReport = {
	userAgent: string;
	displayMode: 'browser' | 'standalone';
	capabilities: Record<string, boolean>;
	mediaType: string | null;
	settings: MediaTrackSettings | null;
	blobBytes: number;
	durationMs: number;
	requestedMs: number[];
	decodedMs: number[];
	analysis: { frameMs: number[]; totalMs: number };
	landmarks: { framesWithPose: number; framesWithoutPose: number };
	sha256: { elapsedMs: number; digestHexLength: number };
	indexedDb: { wrote: boolean; readSameBytes: boolean; elapsedMs: number };
	cleanup: { tracksEnded: boolean; objectUrlRevoked: boolean };
	errors: Array<{ stage: string; name: string; message: string }>;
};

export function fixedSampleTargets(durationMs: number): number[] {
	return Array.from({ length: Math.ceil(durationMs / 100) }, (_, index) => index * 100);
}

export function summariseSpike(input: {
	requestedMs: number[];
	decodedMs: number[];
	analysisMs: number[];
}) {
	return {
		...input,
		analysis: {
			frameMs: input.analysisMs,
			totalMs: input.analysisMs.reduce((sum, value) => sum + value, 0)
		}
	};
}
```

In `+page.svelte`, implement sequential controls: **Request camera**, **Record 10 s**, **Record 45 s**, **Analyze**, **Hash Blob**, **Round-trip IndexedDB**, **Clean up**, and **Download report**. Request `{ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } }`; negotiate `video/mp4;codecs=avc1.42E01E`, `video/webm;codecs=vp9`, then `video/webm;codecs=vp8`; store `recorder.mimeType`; and record one-second chunks. **Hash Blob** measures `crypto.subtle.digest('SHA-256', await blob.arrayBuffer())`, including the temporary full-size allocation that production upload will require. The worker must initialize `FilesetResolver` from self-hosted package WASM assets copied under `static/mediapipe/wasm/`, load the pinned model, run `detectForVideo(bitmap, mediaTimeMs)`, close the bitmap, and return landmark presence plus elapsed time.

The report download must use:

```ts
const href = URL.createObjectURL(
	new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
);
const link = Object.assign(document.createElement('a'), {
	href,
	download: `athletos-technique-spike-${Date.now()}.json`
});
link.click();
URL.revokeObjectURL(href);
```

- [ ] **Step 5: Verify locally and commit the disposable harness**

Run:

```powershell
cd frontend
npm run test:unit -- src/routes/technique-spike/spike.test.ts
npm run check
npm run build
git add package.json package-lock.json static/models src/routes/technique-spike
git commit -m "spike: measure browser technique review"
```

Expected: focused tests, type-check, and build pass. The commit message and route name make the temporary nature explicit.

---

### Task 2: Run the physical-device matrix and decide the gate

**Files:**
- Create: `docs/spikes/2026-08-13-technique-review-device-results.md`
- Read: the two or more downloaded `athletos-technique-spike-*.json` reports

**Interfaces:**
- Consumes: Task 1 `SpikeReport` JSON from each device/mode.
- Produces: a named-device evidence table and one decision: `proceed`, `change numeric limits`, or `stop for native-capability analysis`.

- [ ] **Step 1: Serve the disposable branch over a trusted HTTPS origin**

Use the repository's ordinary production build and an explicitly approved temporary HTTPS deployment. Do not test camera access over plain LAN HTTP. Confirm on each device that `window.isSecureContext === true` and that the installed launch reports `displayMode: "standalone"`.

- [ ] **Step 2: Capture the complete matrix**

On each named iPhone/Safari and Android/Chrome device, run browser and installed-PWA modes with camera granted. Also run one denied-permission case per platform. For every successful case, record a 10-second stable side-view squat, analyze it, hash it, round-trip it through IndexedDB, clean up, and download the JSON report. In installed-PWA mode on each platform, repeat with the full 45-second cap and run capture → replay → full 10 Hz analysis → hash → IndexedDB round-trip; this is the memory and thermal ceiling test, not an extrapolation from 10 seconds.

- [ ] **Step 3: Write the results table before interpreting it**

Create the results document with one row per run and exact columns:

```markdown
| Device | OS | Browser | Mode | Clip s | MIME | Actual capture | Blob MiB | Decode samples | Pose samples | Analysis s | SHA-256 s | IDB round-trip | Cleanup | Failure |
|---|---|---|---|---:|---|---|---:|---:|---:|---:|---:|---|---|---|
```

Below the table, include permission-denial behavior, UI responsiveness, visible thermal symptoms, camera orientation, and any timestamp drift. Paste no video, frame, or landmark coordinates into the repository.

- [ ] **Step 4: Apply the explicit decision rule**

Record exactly one outcome:

```markdown
## Decision

**Proceed** if both platforms capture, replay, persist, release the camera, and analyze a 10-second clip without UI lockup, and projected 30-second analysis is at most 30 seconds.

**Change numeric limits** if both platforms work but a measured 720p, 10 Hz, or 45-second limit is unsustainable. State the replacement number and calculation.

**Stop** if either platform cannot complete 45-second capture → replay → full analysis → hash → IndexedDB under a secure installed PWA without a crash, unrecoverable page reload, or broken logger controls. Name the failed browser capability; do not recommend native merely because it is faster.
```

- [ ] **Step 5: Commit the evidence independently**

Run:

```powershell
git add docs/spikes/2026-08-13-technique-review-device-results.md
git commit -m "docs: record technique review device feasibility"
```

Expected: the commit contains only the evidence document.

---

### Task 3: Remove the spike and leave a clean implementation base

**Files:**
- Delete: `frontend/src/routes/technique-spike/**`
- Delete: `frontend/static/models/pose_landmarker_lite_v1.task`
- Delete: `frontend/static/mediapipe/**`
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`

**Interfaces:**
- Consumes: Task 2 recorded decision.
- Produces: a repository with no spike route, model, WASM assets, or temporary MediaPipe dependency; the evidence document remains.

- [ ] **Step 1: Remove the temporary dependency with the package manager**

Run: `cd frontend; npm uninstall @mediapipe/tasks-vision`

Expected: `package.json` and `package-lock.json` no longer contain the package.

- [ ] **Step 2: Delete only the named spike assets and route**

Use `apply_patch` to delete every file under `frontend/src/routes/technique-spike`, then delete the exact model and copied WASM files added by Task 1. Do not remove shared `frontend/static` content.

- [ ] **Step 3: Prove no spike artifact remains**

Run:

```powershell
rg -n "technique-spike|pose_landmarker_lite_v1|@mediapipe/tasks-vision" frontend
cd frontend
npm run check
npm run test:unit
npm run build
```

Expected: `rg` returns no matches; checks and build pass.

- [ ] **Step 4: Commit the removal**

Run:

```powershell
git add -A frontend
git commit -m "chore: remove technique review spike"
```

- [ ] **Step 5: Stop if the feasibility gate did not pass**

If Task 2 recorded `stop`, do not execute the remaining Technique review plans. If it recorded changed limits, amend the approved spec and every following plan with those measured values and obtain review before implementation. If it recorded `proceed`, begin `2026-08-13-technique-review-local-capture.md`.
