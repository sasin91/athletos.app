# Bar-path evidence

Design amendment, 2026-08-14. Approved direction: start with deterministic,
one-tap bar tracking, validate it on physical devices, then add deliberate data
retention before attempting server-side AI inference on Hetzner.

This amendment narrows Slice 2 of
`2026-08-13-side-view-squat-technique-review-design.md`. Where the earlier
design groups pose landmarks and bar tracking together, this document is the
authority for the next slice: **bar only, with no pose or ML runtime**. Body,
nose, knee, and foot guides remain possible later work.

---

## 1 · Product outcome

After recording a side-view squat, the athlete can tap the visible bar sleeve
or plate center once and see visual evidence of its image-space path during raw
playback.

The overlay contains:

- a solid, progressive path through accepted samples up to the current playback
  time;
- a visible current-bar marker;
- a dashed vertical reference through the calibration position; and
- an explicit gap and **Tracking lost — recalibrate bar** message when the
  tracker no longer has adequate confidence.

The reference is screen-space evidence, not a measurement of physical
verticality, displacement, velocity, efficiency, or technique quality. The app
does not label a path good or bad.

The clip and tracking result remain transient in this slice. Record again,
Discard, Close, teardown, and tracking failure preserve ordinary workout
logging and release all media and analysis resources.

### Explicit non-goals

- No browser ML model, pose model, automatic bar detection, or training corpus.
- No skeleton, nose line, knee trace, foot reference, measurement, rep count,
  phase detection, grade, verdict, or cue.
- No correction-by-dragging or manual multi-point path authoring.
- No keep, upload, background analysis, coach workflow, or AI result in this
  slice.
- No line through rejected samples and no extrapolation after tracking loss.

---

## 2 · Athlete flow

```text
active squat Set
       |
record -> raw transient review
                 |
           [Track bar]
                 |
      pause/seek to a clear top position
                 |
      tap sleeve or plate center once
                 |
     fixed 10 Hz local template tracking
          backward + forward in time
                 |
       +---------+----------+
       |                    |
 accepted samples      confidence lost
       |                    |
progressive path +      visible gap +
current marker +        [Recalibrate bar]
dashed reference             |
       +---------+-----------+
                 |
      play | pause | scrub | recalibrate
                 |
        Record again | Discard | Close
                 |
     revoke URLs, abort work, release memory
```

Raw review appears before tracking starts. Calibration is an explicit athlete
action: the video pauses, the athlete seeks to a clear top/start position, and
one pointer tap is transformed into normalized source coordinates. A tap too
close to the decoded image edge is rejected with instructions to choose a
clearer frame.

Recalibration replaces the previous calibration and all derived bar samples.
It does not decode or retain a second copy of the original clip.

---

## 3 · Tracking architecture

The existing `TechniqueReview` module gains one `BarTrackerPort`. Svelte owns
only the video/canvas elements and athlete gestures; it does not implement
decoding, similarity scoring, timestamp selection, confidence policy, or
resource cleanup.

```text
TechniqueReview
  |
  +-- CapturedClip
  +-- calibration { mediaTimeMs, x, y }
  |
  v
BarTrackerPort.track(clip, calibration, progress, signal)
  |
  +-- sequential video decoder (actual media timestamps)
  +-- bounded grayscale crop extraction
  +-- deterministic template tracker worker
  |
  v
BarTrackingResult -> overlay renderer -> synchronized canvas
```

The production adapter decodes at a fixed target rate of 10 Hz. This is a
sampling policy, not a stored timing assumption: every sample records the
actual decoded `mediaTimeMs`, and equal decoded timestamps are deduplicated.
Variable-rate sampling can later replace the target policy without changing
rendering or stored observation semantics.

The first implementation uses a bounded, versioned template-similarity
tracker. It extracts one calibration patch and follows it independently forward
and backward. Search remains near the preceding accepted position and is
constrained by maximum per-sample displacement. Heavy matching runs outside the
Svelte rendering loop; the decoder retains only the current bounded crop and
transfers/releases it before advancing.

Normalized cross-correlation is the first candidate, but the public interface
does not name the algorithm. The implementation plan may select an equally
deterministic bounded similarity metric after a focused benchmark. Changing the
metric, patch policy, threshold, or search policy increments the tracker
version.

Tracking stops independently in either direction at the first sample below the
versioned confidence threshold. It never searches the whole image for a
plausible circle or long object and never resumes on its own after loss.

---

## 4 · Result and rendering contract

```text
BarTrackingResult {
    schemaVersion: 1,
    sourceWidth,
    sourceHeight,
    rotationDegrees,
    samplingPolicy: { kind: "fixed", hz: 10 },
    tracker: { name, version, confidenceThreshold },
    calibration: { mediaTimeMs, x, y, patchSize },
    samples: Array<{
        mediaTimeMs,
        point: { x, y, confidence } | null
    }>
}
```

Coordinates are normalized against the decoded source, never canvas pixels. A
rejected decoded sample keeps its actual timestamp with `point: null`; samples
that were never decoded after a direction became lost are not fabricated. No
image patch, frame, grayscale crop, or interpolated point enters the result. The
transient result is versioned now so later retention can persist it without
inventing provenance.

The canvas renderer owns rotation, `object-fit: contain` letterboxing, device
pixel ratio, and preview-mirroring transforms. Pointer calibration applies the
inverse of the same tested transform. The canvas redraws from the video's
current media time using `requestVideoFrameCallback` where available and
`requestAnimationFrame` otherwise.

Interpolation is visual only between adjacent accepted samples whose actual
timestamps are no more than one sampling interval plus a small decode
tolerance apart. It never bridges `null`, rejected, or long-gap samples. Color
is not the only state carrier: the path, reference, loss state, and current
point use distinct line/marker styles and adjacent text.

---

## 5 · Failure and cleanup

- Decoder or tracker failure returns to usable raw review with a concise error.
- Cancellation aborts before decoding another frame.
- Record again, Discard, Close, and component disposal abort active tracking.
- Every private Blob URL is revoked and every temporary canvas/crop is cleared.
- Late worker results after cancellation are ignored and their transferred
  buffers released.
- Tracking loss is evidence, not a module failure; playback continues and
  recalibration remains available.
- No tracking state can mutate `LocalSession` or disable Log/Skip.

---

## 6 · Validation gate

Pure tests cover timestamp selection, forward/backward tracking, confidence
loss, no extrapolation, normalized transforms, path gaps, interpolation limits,
replacement calibration, cancellation, and cleanup. Synthetic grayscale frames
exercise policy without copyrighted or personal media.

A consented fixture is required before claiming real-world accuracy. Fixture
tests assert tolerance and invariants rather than a pixel-perfect path. A
physical Pixel 6a installed-PWA run records analysis wall time, main-thread
responsiveness, visual path stability, loss behavior, recalibration, memory
cleanup, and offline operation.

The initial acceptance target is that a 30-second clip completes 10 Hz tracking
within 30 seconds on the Pixel 6a without freezing playback controls. Missing
that target records evidence and triggers algorithm/profile work; it does not
silently reduce sampling density or introduce ML.

---

## 7 · Data and AI direction

The sequence is deliberate:

```text
transient bar evidence
        |
validate usefulness and tracking quality
        |
explicit Keep on device (IndexedDB)
        |
explicit Upload (private Hetzner Object Storage)
        |
separate experiment opt-in
        |
versioned Hetzner inference job
        |
experimental derivative result
```

Local retention comes before cloud experimentation. Upload remains a separate
athlete action and stores the unchanged original clip in private Hetzner Object
Storage with Postgres ownership/lifecycle metadata. Upload permission is not
blanket permission to train a model or expose a clip to a coach.

Server inference is a later, isolated Hetzner experiment service. It consumes
only clips with the necessary experiment consent, runs an explicitly versioned
model, and writes a derivative record containing input clip ID, model identity
and digest, timestamps, coordinates/confidence, status, and error—not a silent
mutation of the original clip or local observation. Experimental output is not
presented as advice or allowed to control workout logging.

Training, annotation, coach access, corpus reuse, and model-improvement consent
remain separate designs. Deleting a source clip must propagate to experimental
derivatives according to a documented retention policy before such experiments
begin.

This path lets AthletOS learn from deterministic visual evidence now while
building the storage, consent, provenance, and deletion foundations that future
Hetzner-hosted AI actually requires.
