# Technique review local capture — final fix report

Date: 2026-08-14

## Outcome

All final-review findings were addressed in one scoped fix wave.

- `RecorderPort.recordingResult()` is the asynchronous terminal-completion seam. `TechniqueReview` observes it immediately after `start()`, so a 45-second hard stop or ended track enters raw review without a later Stop intent, and recorder errors enter a stable recording failure.
- Manual stop and asynchronous completion share one per-recording settlement guard. The clip URL is created once, and a manual-stop rejection retains the established `Recording could not be stopped.` outcome.
- Camera streams are stopped immediately when no video track is present, preview playback or settings fail, or `MediaRecorder` construction/start fails. Stop exceptions also clean the stream.
- Screen Wake Lock acquisition and release are detached from `start()`, `stop()`, and `dispose()`. A request that settles after termination releases its sentinel, while UI state progression and teardown do not wait for it.
- `NotAllowedError`, `NotFoundError`, `NotReadableError`, and `SecurityError` now have distinct denied, unavailable, read/in-use, and browser-security outcomes. Existing unsupported capability messages remain unchanged. No Permissions API dependency was added because `getUserMedia()` remains the authoritative cross-browser result.
- Review Blob URL creation/revocation, record-again/discard, adapter start/stop failure, and metadata-decode URL revocation have focused regression coverage.
- The physical-device spike now states that production covers the capture Wake Lock lifecycle only; analysis Wake Lock is a proven requirement for the next analysis slice.

## Red/green evidence

Baseline before new regressions:

```text
Command: cd frontend; npm run test:unit -- src/lib/technique/review.test.ts src/lib/technique/recorder.test.ts
Result: PASS — 2 files, 25 tests.
```

Initial RED run after adding regressions:

```text
Command: cd frontend; npm run test:unit -- src/lib/technique/review.test.ts src/lib/technique/recorder.test.ts
Result: expected FAIL — 18 failed, 28 passed. Failures directly reproduced missing asynchronous completion, immediate stream cleanup, non-blocking Wake Lock teardown, and distinct camera-error mapping.
```

Two additional race regressions were each observed RED before implementation:

```text
Command: cd frontend; npm run test:unit -- src/lib/technique/recorder.test.ts -t "releases a new recording wake lock"
Result: expected FAIL — the second sentinel was not released while the first release was pending.

Command: cd frontend; npm run test:unit -- src/lib/technique/review.test.ts -t "preserves the manual stop failure"
Result: expected FAIL — asynchronous rejection published `Recording could not be completed.` before the Stop intent could publish its established failure.
```

Final focused GREEN run:

```text
Command: cd frontend; npm run test:unit -- src/lib/technique/review.test.ts src/lib/technique/recorder.test.ts
Result: PASS — 2 files, 48 tests.
```

## Full verification

```text
Command: cd frontend; npm run test:unit
Result: PASS — 14 files, 191 tests.

Command: cd frontend; npm run check
Result: PASS — svelte-check found 0 errors and 0 warnings.

Command: cd frontend; npm run lint
Result: PASS — Prettier reported all matched files formatted; ESLint exited 0.

Command: cd frontend; npm run build
Result: PASS — Vite production client, service worker, server, and adapter-node builds exited 0.

Command: Get-Item frontend/.svelte-kit/output/prerendered/pages/session.html
Result: PASS — `/session` emitted as prerendered HTML (3,194 bytes).

Command: cd frontend; npx playwright test --config playwright.isolated.config.ts src/routes/session/page.e2e.ts -g "technique recording"
Result: PASS — 3 focused browser tests.

Command: cd frontend; npx playwright test --config playwright.isolated.config.ts
Result: PASS — 21 browser tests.

Command: git diff --check
Result: PASS — no whitespace errors.

Command: git ls-files frontend/.svelte-kit frontend/build frontend/test-results frontend/playwright-report
Result: PASS — empty output; no generated build or Playwright artifacts are tracked.
```

Playwright's repository config uses fixed port 4173, which was already occupied by an unrelated long-running Node process. The first default-port attempt therefore exited before running tests. Verification used a temporary equivalent config on port 4273; that file was removed after both successful runs.

## Remaining concerns

- The documented physical-device compatibility gaps remain unchanged: iPhone/Safari, permission denial, offline raw flow, and a full production capture-cleanup run are still unobserved on hardware.
- The analysis slice does not exist yet. Its independently scoped Wake Lock lifecycle remains a requirement rather than current production behavior.
