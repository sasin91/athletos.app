# Technique review physical-device results

Status: feasibility decision recorded. Android physical-device evidence is complete enough for the product owner to proceed; the uncollected iPhone/Safari and permission-denial rows remain explicit implementation-validation gaps.

Production learning: the final successful physical-device probe run used
`facingMode: "user"`; the front camera is now the initial production request.

| Device          | OS                    | Browser          | Mode           |      Clip s | MIME                           | Actual capture                 | Blob MiB |         Decode samples |       Pose samples |                    Analysis s |   SHA-256 s | IDB round-trip          | Cleanup                   | Failure                                                             |
| --------------- | --------------------- | ---------------- | -------------- | ----------: | ------------------------------ | ------------------------------ | -------: | ---------------------: | -----------------: | ----------------------------: | ----------: | ----------------------- | ------------------------- | ------------------------------------------------------------------- |
| Google Pixel 6a | Android 17, stock ROM | Chrome 151.0.0.0 | browser        |      10.007 | `video/mp4;codecs=avc1.42001f` | 720×1280 @ 30 fps, user-facing |    2.904 |                100/100 |             81/100 |         6.250 inference total |       0.023 | 0.198 s; byte-identical | tracks ended; URL revoked | none                                                                |
| Google Pixel 6a | Android 17, stock ROM | Chrome 151.0.0.0 | standalone PWA |      45.007 | `video/mp4;codecs=avc1.42001f` | 720×1280 @ 30 fps, user-facing |   12.756 |    92/450 before stall | 69/92 before stall |       6.832 partial inference | not reached | not reached             | not reached               | analysis stopped after decoded media time 9.096 s; no error emitted |
| Google Pixel 6a | Android 17, stock ROM | Chrome 151.0.0.0 | standalone PWA | 45.165 wall | `video/mp4;codecs=avc1.42001f` | 720×1280 @ 30 fps, user-facing |   11.437 | 289/393 before timeout |  289/289 completed | 20.350 inference; 67.914 wall |       0.037 | 0.395 s; byte-identical | tracks ended; URL revoked | `decode-frame` timed out at target 28.9 s after decoded 28.8 s      |
| Google Pixel 6a | Android 17, stock ROM | Chrome 151.0.0.0 | standalone PWA |      45.007 | `video/mp4;codecs=avc1.42001f` | 720×1280 @ 30 fps, user-facing |   13.145 |                450/450 |            450/450 | 31.000 inference; 97.872 wall |       0.057 | 0.380 s; byte-identical | tracks ended; URL revoked | none; screen timeout temporarily set to 10 minutes                  |

## Run notes

### Android / Chrome / browser / 10 seconds

- Capture completed at 10,006.6 ms after the configured countdown; the countdown is excluded from duration.
- Chrome honored the front-camera preference: `facingMode: "user"`.
- Every requested 10 Hz sample produced a decoded timestamp. The final requested timestamp was 9,900 ms and the final decoded timestamp was 9,883.5 ms.
- Pose Landmarker returned a pose on 81 of 100 samples and 2,673 landmarks total. Mean visibility was 0.589; presence confidence is unavailable in this MediaPipe result type.
- Measured inference time was 6,250.4 ms total. The first frame, including model initialization, took 825.4 ms. The other 99 frames averaged approximately 54.8 ms; a 300-frame/30-second inference projection is approximately 17.2 seconds including one initialization.
- SHA-256 completed in 23.2 ms and produced a 64-character digest. IndexedDB wrote and read back byte-identical Blob data in 198.4 ms.
- Camera tracks ended and the recording object URL was revoked. The report contains no errors.
- The tester reported smooth operation on a Google Pixel 6a running a stock Android 17 ROM, with no visible responsiveness issue.
- `performance.memory` returned the same rounded 10,000,000-byte values at every stage; treat these observations as unavailable for detecting memory growth on this browser.
- Thermal behavior, orientation behavior, and permission-denial behavior were not supplied with this report. The reduced user-agent string reports Android 10 even though the device runs Android 17; use the tester-supplied OS version.

### Android / Chrome / installed PWA / 45 seconds

- Capture completed at 45,006.9 ms and produced a 13,375,610-byte MP4/H.264 Blob from the same user-facing 720×1280/30 fps camera.
- Analysis completed 92 of 450 requested samples through decoded media time 9,096.333 ms, then remained unchanged for at least 30 seconds with the PWA foregrounded. The report contains no explicit error because the analysis call remained pending.
- All 92 completed worker replies had matching decoded timestamps and inference measurements. Pose was present on 69 completed samples. This rules out the earlier MediaPipe module-loader failure.
- Partial summed inference was 6,831.9 ms. The first frame took 738.7 ms and the other 91 averaged approximately 67.0 ms. A 300-frame inference-only projection is approximately 20.8 seconds; compute throughput alone remains below the 30-second threshold.
- SHA-256, IndexedDB, and cleanup were never reached. This run therefore fails the required installed-PWA ceiling flow as currently implemented.
- The strongest current hypothesis is the paused-video seek loop: after each `currentTime` assignment it waits indefinitely for `requestVideoFrameCallback`, which Chrome is not required to deliver indefinitely for a paused repeatedly-seeked video. There is no timeout or progress boundary to turn that pending callback into a reportable error.
- This result is evidence against the spike's decode/seek strategy, not yet evidence that the PWA cannot sustain MediaPipe inference. The worker completed frames at sufficient measured throughput before the stall.

### Bounded diagnostic revision for the Android PWA rerun

- The decoder loop now waits for the media element's `seeked` event after each `HTMLMediaElement.currentTime` assignment instead of waiting indefinitely for `HTMLVideoElement.requestVideoFrameCallback()` on a paused video.
- Decode/seek and bitmap-plus-worker inference are independent bounded stages. Each has a 5-second timeout, and `AbortController` backs an explicit **Cancel analysis** control.
- The live status exposes the exact boundary, for example `Analyzing 93/450 — decoding 9.2 s.` or `Analyzing 93/450 — pose inference at 9.2 s.` This distinguishes an `HTMLMediaElement` seek/decode stall from `createImageBitmap()` or MediaPipe worker latency.
- The downloaded JSON now persists end-to-end analysis wall time, completed and total samples, last requested and decoded timestamps, terminal state, and failure stage. A timeout or cancellation advances to SHA-256, IndexedDB, cleanup, and partial-report download rather than trapping the probe in analysis.
- Expected 45-second rerun outcomes: completion supports the paused-frame-callback hypothesis; a `decode-frame` timeout localizes the remaining fault to browser media seeking/decoding; a `worker-frame` timeout localizes it to bitmap conversion or pose inference. None of those outcomes alone is a squat-technique verdict.
- Automated verification before redeployment: 153 unit tests, 24 Playwright tests, Svelte check with 0 errors/0 warnings, scoped ESLint, scoped Prettier, and public route/chunk HTTP 200 checks all passed.

### Android follow-up: MediaPipe timestamp-order failure

- The bounded rerun exited instead of hanging and surfaced `INVALID_ARGUMENT: Packet timestamp mismatch` on MediaPipe's `norm_rect` stream. The graph expected timestamp 98,534 µs but received 98,533 µs.
- A minimized browser test reproduced the exact error by sending two frames with the same raw decoded time, `98.533 ms`, through one real Pose Landmarker module worker. The first frame succeeded; the second produced the same `CalculatorGraph::Run()` failure seen on the Pixel.
- Browser seeking may legally expose repeated decoded frame times, while MediaPipe `VIDEO` mode requires strictly increasing packet timestamps. Passing the raw decoded time into `detectForVideo()` therefore coupled two incompatible timestamp contracts.
- The worker now preserves the raw decoded millisecond value for report correlation but gives MediaPipe a whole-millisecond inference timestamp clamped to at least one millisecond after the previous inference timestamp. For the minimized sequence, raw `[98.533, 98.533]` becomes inference `[99, 100]`.
- This normalization changes MediaPipe's internal tracking clock by at most the small clamp required for ordering; it does not change the sampled bitmap, requested sample target, decoded timestamp evidence, or measured inference duration.

### Android follow-up: bounded 45-second rerun after timestamp normalization

- The timestamp normalization succeeded: 289 consecutive Pose Landmarker calls completed without a graph-order error. Every completed frame contained a pose, producing 9,537 landmarks.
- The next failure was isolated to the media decoder boundary. Seeking from target 28.8 seconds to 28.9 seconds did not emit `seeked` within the 5-second bound, so the report ended with `state: "failed"` and `failureStage: "decode-frame"`.
- The report completed all recovery stages: SHA-256 took 36.7 ms, IndexedDB wrote and read back an identical 11.437 MiB Blob in 395.2 ms, and both camera-track and object-URL cleanup checks passed.
- Pose compute remains within the original throughput target. Summed inference was 20,350.2 ms for 289 frames. Excluding the 1,200.7 ms first-frame warm-up, the remaining frames averaged 66.5 ms; projected 300-frame inference is approximately 21.1 seconds.
- End-to-end analysis is not within the target under this decoder strategy. Wall time was 67.9 seconds through 289 completed frames plus the terminal timeout. Removing the 5-second timeout and extrapolating the observed seek-plus-inference cost projects approximately 65.3 seconds for 300 frames.
- The 45.165-second recording produced only 393 requested targets, which means `HTMLMediaElement.duration` exposed at most 39.3 seconds when analysis began. This is at least 5.9 seconds shorter than the recorder wall duration and is a separate media-timeline discrepancy to preserve in the evidence.
- The tester subsequently reported that the screen may have timed out. This materially confounds the decoder conclusion: the failure occurred after approximately 62.9 seconds of active analysis plus the 5-second diagnostic timeout, consistent with a one-minute inactivity timeout after tapping **Analyze**. A hidden or frozen Android page may suspend event callbacks, which would present exactly as a missing `seeked` event.
- The next controlled run must use this exact build with Android's screen timeout temporarily set to 10 minutes and the PWA kept visible. If it passes target 28.9 seconds, screen suspension becomes the leading cause; if it fails near the same media target while continuously visible, repeated random seeking remains the leading cause.
- Do not change the decoder before that run. If the screen-suspension hypothesis is confirmed, production capture/analysis should request a scoped Screen Wake Lock and record visibility/wake-lock release events. If it is falsified, the next bounded PWA experiment should decode sequentially using `requestVideoFrameCallback()`.

### Android accepted ceiling result: screen kept awake

- The unchanged build completed the entire 45.007-second installed-PWA flow when Android's screen timeout was temporarily increased to 10 minutes. All 450 requested targets completed through 44.9 seconds with no errors.
- This controlled result confirms page/display suspension as the cause of the prior 28.9-second decode timeout. Repeated random seeking is slow but did not fail while the document remained visible.
- Pose Landmarker returned a pose on all 450 samples, totaling 14,850 landmarks. Mean visibility was 0.614.
- Inference totaled 31,000.5 ms. The first frame took 808.7 ms; the other 449 averaged 67.2 ms. Inference-only throughput is approximately 14.9 samples/second, projecting 300 frames to 20.9 seconds.
- End-to-end analysis wall time was 97,872.3 ms. Overall throughput is approximately 4.60 samples/second, projecting the current 300-frame random-seek pipeline to 65.2 seconds. Approximately 66.9 seconds of this ceiling run was decoding, bitmap transfer, and orchestration outside measured inference.
- SHA-256 completed in 57.4 ms. IndexedDB wrote and read back the byte-identical 13.145 MiB Blob in 380.4 ms. Camera tracks ended and the object URL was revoked.
- `performance.memory` again returned identical rounded 10,000,000-byte values at every stage and cannot establish memory stability on this browser.
- Product requirement: hold a scoped Screen Wake Lock during recording and analysis, observe unexpected release and `visibilitychange`, reacquire only after returning visible, and release immediately after analysis/cancellation/teardown.
- Performance requirement remains open: the Android PWA completes the functional 45-second ceiling, but the current end-to-end pipeline misses the 30-second latency target despite adequate inference throughput. Sequential decoding remains the leading optimization before reducing the fixed sample rate.

## Raw capture slice

The following separates the disposable capability probe from the smaller final
production smoke. A value marked unobserved was not inferred from a different
run or from automated browser tests.

| Device / browser | Installed-PWA production observation | MIME and actual capture | Manual stop / replay / record again | 45-second hard stop | Offline | Cleanup | Logger isolation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Google Pixel 6a / stock Android 17 / Chrome 151 | Final refreshed-PWA smoke: front/user-facing camera selected first; permission led to an immediate live preview; tester reported it worked. | Capability probe: `video/mp4;codecs=avc1.42001f`, user-facing 720×1280 at 30 fps. | Not observed in the production smoke. | Capability probe: a 45.007-second capture completed with all 450 100 ms samples; production hard-stop control not separately observed. | Not rerun for this slice. | Capability probe: tracks ended and object URL revoked; production smoke did not expose cleanup instrumentation. | Not directly observed on the physical production smoke; automated logger coverage verifies the discard seam does not mutate the Set. |
| iPhone / Safari | Not tested. | Not tested. | Not tested. | Not tested. | Not tested. | Not tested. | Not tested. |

Android is the accepted current support floor for this slice: a Pixel 6a on
stock Android 17 with Chrome 151 as an installed PWA. It is not an assertion of
Safari or iPhone support. The screen-timeout diagnostic stall remains part of
the evidence; production now makes a best-effort scoped Screen Wake Lock during
recording and analysis, observes unexpected release and `visibilitychange`,
reacquires only after returning visible, and releases on analysis,
cancellation, or teardown. A device run of that full production behavior has
not yet been collected.

## Remaining matrix

- Android / Chrome / installed PWA / 10 seconds
- Android camera-permission denial
- iPhone / Safari / browser / 10 seconds
- iPhone / Safari / installed PWA / 10 seconds
- iPhone / Safari / installed PWA / 45 seconds
- iPhone camera-permission denial

## Decision

**Proceed.** The product owner accepts the named Android physical-device evidence as sufficient to establish that an installed PWA can capture, replay, analyze, hash, persist, and clean up a full 45-second clip without a native-only capability gap. The earlier timeout is attributed to page/display suspension, and production must hold a scoped Screen Wake Lock during capture and analysis.

This decision deliberately relaxes the plan's original requirement for completed iPhone/Safari and permission-denial rows before the gate. Those cases remain mandatory compatibility and error-path validation during implementation; they are no longer feasibility blockers. The final refreshed-PWA production smoke also confirms the accepted Android front-camera-first behavior, but it does not fill the unobserved raw-flow, offline, denial, or iPhone rows above.

The current random-seek harness is not a production latency design: it projects approximately 65.2 seconds end-to-end for a 30-second clip even though inference alone projects to 20.9 seconds. Production should optimize sequential decoding before reducing the fixed 10 Hz evidence rate. This constraint does not change the feasibility outcome because it is an implementation-performance issue rather than a missing PWA capability.
