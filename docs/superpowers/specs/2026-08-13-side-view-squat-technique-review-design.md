# Side-view squat technique review

> **Slice 2 amendment, 2026-08-14:** The next implementation is bar-only,
> deterministic one-tap tracking. Pose guides and browser ML are deferred. See
> `2026-08-14-bar-path-evidence-design.md`, which is authoritative where its
> narrower scope differs from this original design.

Design, 2026-08-13. AthletOS will push the installed SvelteKit PWA to its
practical limit before considering native iOS or Android applications. The
first Technique review is deliberately narrow: while an active Session is on a
squat Set, the athlete can record one side-view clip, seed the bar position with
one tap, and watch the recording with automatic visual guides. The review is
evidence only. It gives no measurement, grade, fault, cue, or advice.

The recording is transient by default. The athlete must explicitly keep it on
the device, and must separately and explicitly upload it. Coach and AI review
are later corpora with their own concepts and workflows; this design preserves
a stable Technique clip identity they can reference without importing those
concepts into the MVP.

---

## 1 · Product boundary

### What the MVP does

- Enters recording only from the current squat Set in the offline logger.
- Requests the front/user-facing camera at an ideal 1280×720 resolution, without audio.
- Shows a side-view framing guide and a three-second countdown.
- Records until the athlete stops it, with a 45-second hard limit.
- Detects body landmarks locally in the browser.
- Lets the athlete tap the bar once on a clear paused frame, then tracks that
  point through the clip.
- Replays and scrubs the clip with independently toggleable visual guides.
- Discards the recording unless the athlete explicitly chooses **Keep on this
  device**.
- Offers a separate explicit upload after the associated Workout has landed.

The initial visual evidence is:

- a restrained body skeleton from visible, confident landmarks;
- a vertical plumb line through the nose;
- the calibrated bar point, its vertical plumb line, and its traced path;
- the knee path; and
- ankle, heel, and foot landmarks plus a ground/foot reference.

These are screen-space observations from a monocular side-view recording. They
do not establish joint angles, physical distances, bar velocity, depth, balance,
or whether the squat was technically correct. No line is drawn when its source
landmark or track is below the confidence threshold.

### Required capture conditions

The interface explains the conditions under which the result is useful:

- one athlete and one squat Set;
- the phone is stable and approximately perpendicular to the athlete;
- the whole body, feet, and bar end stay in frame;
- the athlete occupies at least one third of the image height;
- lighting and contrast are adequate; and
- the visible bar sleeve or plate center can be tapped on a clear frame.

The model may work outside these conditions, but AthletOS makes no promise that
it will. Framing guidance is instruction, not a validation verdict.

### Explicit non-goals

- No automatic rep counting or squat-phase classification.
- No variable-rate, phase-weighted, or load-adaptive sampling in the MVP.
- No calibrated measurements, technique verdicts, corrective cues, or medical
  claims.
- No camera switcher or alternate rear-camera view, other exercise, multiple people,
  moving camera, or multi-camera capture.
- No automatic barbell detection. One-tap calibration is required.
- No automatic upload, background upload, sharing, coach account, comment,
  inbox, assignment, or review status.
- No AI corpus, labeling workflow, or model-training consent.
- No HealthKit or Health Connect integration.
- No native wrapper, Apple Vision, or Android ML Kit implementation.

---

## 2 · Why a web-native PWA

HealthKit and Health Connect store health and fitness records such as workouts,
duration, energy, heart rate, and routes. They do not expose camera frames,
human pose landmarks, or bar paths. Apple provides pose detection through the
native Vision framework and Google through native ML Kit, but an installed web
app cannot call those frameworks directly.

The web platform already supplies the necessary MVP primitives:

- `navigator.mediaDevices.getUserMedia()` for an authorized camera stream;
- `MediaRecorder` for browser-native compressed video;
- `<video>` and `requestVideoFrameCallback()` for timestamped review frames;
- Web Workers, WebAssembly, `ImageBitmap`, and `OffscreenCanvas` where
  available for local computer vision away from the main UI thread;
- IndexedDB for structured records and video `Blob`s;
- `navigator.storage.persist()` and `navigator.storage.estimate()` for a
  best-effort persistence request and honest capacity reporting; and
- service-worker caching for the application shell, MediaPipe runtime, and
  selected model.

MediaPipe Pose Landmarker for Web returns 33 pose landmarks with normalized
image coordinates, approximate world coordinates, presence, and visibility.
The MVP uses normalized image coordinates and confidence only. Its world
coordinates are not treated as calibrated measurements. The model runs on the
athlete's device; the original frames do not leave it during analysis.

This approach validates product value with one SvelteKit codebase and retains
the logger's offline behavior. Native applications remain an escape hatch if
measured device coverage, thermal behavior, camera control, analysis latency,
storage reliability, or tracking accuracy proves unacceptable. A native move
must answer a demonstrated failure rather than an assumed one.

---

## 3 · Athlete flow

```text
Active squat Set
       |
    [Record]
       |
camera capability + permission
       |
front-camera preview + side-view framing guide
       |
3-second countdown
       |
manual stop ------------------------- 45-second hard stop
       |                                         |
       +-------------------+---------------------+
                           |
                  transient local clip
                           |
                 pose analysis at 10 Hz
                           |
              pause on first clear frame
                           |
                   tap bar once
                           |
               automatic bar tracking
                           |
        review: play | pause | scrub | recalibrate
                           |
       overlays: skeleton | nose | bar | knee/feet
                           |
             +-------------+-------------+
             |                           |
         [Discard]              [Keep on this device]
             |                           |
   revoke and remove temp        local clip + tracking
                                         |
                          Workout has landed on server?
                              | no              | yes
                        upload unavailable   [Upload]
                                                |
                                  authenticated upload ticket
                                                |
                                    private object storage
```

Recording uses a focused, full-screen state. The app manifest remains portrait
because training is the primary workflow, but the capture state tolerates and
encourages landscape without attempting to lock orientation. Orientation lock
is inconsistent across installed mobile browsers and is not an invariant.

The athlete can leave capture without changing the Set. Recording, analysis,
review, keeping, and uploading are optional work around logging. None can mark a
Set done, skip it, edit it, or block its ordinary controls.

Review can start as soon as enough analyzed samples exist to draw it. Remaining
analysis shows determinate progress based on sampled media time. The bar tap is
made on any paused clear frame, not necessarily time zero. Recalibration at a
later timestamp discards derived bar samples and reruns the tracker from the new
seed; pose results are reused.

`Discard` is the ordinary completion path and requires no confirmation while
the recording is only transient. Deleting a kept or uploaded clip does require
explicit confirmation because it removes something the athlete previously
chose to retain.

---

## 4 · Frontend module design

### The external seam

The logger gains one deep `TechniqueReview` module. Its small interface accepts
the Set identity and exercise and exposes a state machine plus athlete intents:

```text
start({ workoutId, setPosition, exercise: "squat" })
send(intent)
subscribe(renderState)
dispose()
```

The intents are capability-shaped rather than browser-shaped: grant/retry
camera, start countdown, stop recording, select calibration frame, calibrate
bar, play, pause, seek, toggle overlay, keep, upload, retry upload, discard, and
delete. Callers do not choose codecs, manipulate tracks, send worker messages,
open IndexedDB transactions, calculate transforms, or revoke object URLs.

The render state is a discriminated union such as `checking`, `permission`,
`preview`, `countdown`, `recording`, `processing`, `calibrating`, `review`, and
`failure`. Each state carries only the actions valid in that state. This makes
impossible transitions unrepresentable in the Svelte page and provides one
interface for deterministic state-machine tests.

The current `session.ts` remains responsible for workout logging. The current
`/session` route remains prerendered and client-only. A focused Svelte view
renders `TechniqueReview`; it does not own camera, analysis, or persistence
rules.

### Internal seams with real adapters

The module has three internal seams, each justified by a production and test
adapter:

1. **Recorder** — a `MediaRecorder` adapter and deterministic fake.
2. **Analyzer** — a MediaPipe worker adapter and fixture analyzer.
3. **Technique store** — an IndexedDB adapter and in-memory adapter.

Browser capability detection is data passed into the module, not scattered
conditional behavior in Svelte markup. Network upload uses the existing
same-origin BFF pattern and is replaceable by a fake transport in module tests.

### State and cleanup invariants

- At most one capture stream and one transient recording exist.
- Every terminal exit stops every `MediaStreamTrack`.
- Every replaced or discarded `Blob` URL is revoked.
- `Keep` reports success only after the IndexedDB transaction completes.
- A failed keep leaves the transient review usable and makes no durability
  claim.
- Closing or reloading before `Keep` intentionally loses the transient clip.
- A camera or review failure never mutates the LocalSession.
- `dispose()` is safe and idempotent from every state.

---

## 5 · Capture and media encoding

### Camera request

Capture begins only from an athlete gesture and only in a secure context. The
recorder requests:

```js
{
  audio: false,
  video: {
    facingMode: { ideal: "user" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  }
}
```

Every value is ideal rather than exact: a device that can provide a useful
camera at another size or frame rate should work. After access, the app reads
`MediaStreamTrack.getSettings()` and stores the actual dimensions and frame
rate. If the selected device is rear/environment-facing, the preview may warn the
athlete; a later camera switcher can offer inputs after permission makes labels
visible. Slice 1 does not include a camera switcher.

Permission denial, no camera, camera already in use, insecure context, and an
unsupported recorder have distinct messages and a single route back to the
logger. Permission state is queried when the Permissions API supports `camera`,
but the camera request remains authoritative because Safari support differs.

### Codec negotiation

The browser, not AthletOS, owns hardware encoding. The app tests candidates with
`MediaRecorder.isTypeSupported()` and selects the first supported type from a
small ordered list appropriate to the running engine. It expects MP4/H.264 on
Safari and WebM with VP9 or VP8 on Chromium, but never branches only on user
agent or assumes a filename extension. The actual `MediaRecorder.mimeType` is
stored and returned as the HTTP `Content-Type` during upload.

Audio is absent. The recorder starts with a one-second `timeslice` so data
arrives in bounded chunks and the app can surface a recorder failure before the
end. The MVP assembles those chunks into one `Blob` after stop; it does not
persist partial chunks as a recoverable recording. A monotonic timer controls
the 45-second cap. Backgrounding, track-ended, page visibility changes, and
recorder errors stop cleanly and retain any valid data already emitted for
review when the browser permits it.

The 720p target balances visible joints and bar contrast against memory,
analysis, and upload cost. There is no client transcoding in the MVP: doing so
would add heat, latency, battery cost, and another codec compatibility surface.

---

## 6 · Pose analysis and bar tracking

### Model execution

The selected MediaPipe Pose Landmarker `.task` model, its WASM runtime, and
their license notices are pinned to explicit versions in the repository. They
are served from AthletOS rather than a runtime CDN and enter the versioned app
shell cache, so a committed Session can record and analyze without connectivity
after the assets have been installed.

Analysis runs in a dedicated worker. Where supported, the main thread decodes a
video frame, creates an `ImageBitmap`, and transfers ownership to the worker.
The worker runs `detectForVideo()` and returns structured landmarks; it closes
each bitmap after inference. `OffscreenCanvas` assists pixel extraction where
available. A compatibility adapter may perform extraction on the main thread,
but MediaPipe inference must not share the Svelte rendering loop because its web
call is synchronous.

The fixed MVP sampling policy targets 10 samples per second of media time. It
does not assume a 30 fps source and does not derive timestamps by incrementing
100 ms. Every requested and completed sample carries the actual media timestamp
used to decode it.

```text
SamplingPolicy = { kind: "fixed", hz: 10 }

TrackingSample {
    media_time_ms,
    landmarks: Map<LandmarkName, { x, y, z?, visibility, presence }>,
    bar: { x, y, confidence } | null
}
```

The sampler is a private policy interface. A later
`{ kind: "phase_weighted", ... }` or `{ kind: "device_adaptive", ... }` policy
may generate irregular timestamps. Storage, interpolation, playback, and
rendering use recorded timestamps and therefore require no schema migration.

`requestVideoFrameCallback()` is preferred for presented-frame metadata. When
it is unavailable, controlled seeking plus `seeked`/decoded-frame readiness is
the fallback. The decoder deduplicates timestamps and records the actual decoded
media time. Cancellation aborts outstanding extraction and terminates the
worker.

### Confidence and interpolation

Normalized coordinates are relative to the unrotated source image recorded in
the clip metadata. Rendering applies one tested transform for source rotation,
object-fit letterboxing, canvas device pixel ratio, and any preview mirroring.
Saved points are never display pixels.

A guide appears only when all landmarks it depends on meet the configured
presence and visibility thresholds. Thresholds are named, versioned analysis
configuration—not magic values distributed through drawing code. Between two
accepted samples, playback may linearly interpolate solely to make the overlay
move smoothly. It does not bridge a rejected/missing run longer than one sample
interval. Interpolated points are never stored as observations.

If there is no person, multiple competing poses, a landmark leaves the frame,
or confidence falls, the corresponding overlay disappears and the review says
what is unavailable. A plausible invented line is worse than a gap.

### One-tap bar calibration and tracking

The athlete pauses on a clear frame and taps the visible center of a plate or
sleeve. The app stores the normalized point, calibration timestamp, source
dimensions, and a bounded pixel patch around the point. A lightweight optical
tracker follows that patch forward and backward through the sampled frames,
constrained by maximum per-sample displacement and appearance confidence.

The exact tracker algorithm is an implementation choice to validate with
fixtures; normalized cross-correlation/template tracking is the simple first
candidate. The interface and stored result do not name the algorithm. Tracking
stops when confidence falls below its versioned threshold. It neither snaps to
the nearest long object nor extrapolates through failure. The review marks the
loss and offers recalibration on a later clear frame.

The bar path is the time-ordered polyline of accepted bar samples. Its vertical
line passes through the current accepted bar point. It is not a claim that the
tap identified the physical bar center or that image-space displacement equals
physical displacement.

---

## 7 · Overlay semantics

The review draws onto a canvas layered over the video. It redraws from stored
samples at the video's current media time; the rendered canvas is not baked
into the retained or uploaded clip.

Overlay groups are independently toggleable:

1. **Body** — connections among confident shoulder, hip, knee, ankle, heel,
   foot, elbow, and wrist points plus the nose.
2. **Nose** — a vertical screen-space plumb line through the confident nose.
3. **Bar** — calibrated point, current vertical plumb line, and accepted path.
4. **Knee and feet** — knee trace plus current ankle, heel, foot, and ground
   reference.

“Ground reference” is a line through the confident heel/foot landmarks in the
image. It is not gravity, floor-plane reconstruction, or a level measurement.
The line and copy must not imply that camera roll has been calibrated. A later
measurement feature will need explicit camera calibration and its own evidence
standard.

Color is never the only carrier of state. Low-confidence or missing results use
text and line style as well. Canvas has an adjacent accessible textual summary
of which guides are active and which are currently unavailable. Playback keeps
native or equivalent accessible controls for play, pause, and seek.

---

## 8 · Local persistence

### One database owner

The existing `athletos` IndexedDB database moves from version 1 to version 2.
One schema module owns opening and migration so the current `active` and `queue`
stores and the new media stores cannot race different version upgrades.

Version 2 adds:

```text
technique_clips      keyPath: id
technique_media      keyed by clip id
tracking_results     keyPath: id
```

Existing active Session and submission queue data survive the upgrade. Upgrade
failure leaves the logger operational and disables keeping Technique clips; it
must not delete or recreate the database automatically.

### Local records

```text
TechniqueClip {
    schema_version: 1,
    id: UUIDv7,
    workout_id: UUIDv7,
    set_position: integer,
    exercise: "squat",
    created_at: RFC3339 timestamp,
    mime_type: string,
    duration_ms: integer,
    width: integer,
    height: integer,
    source_frame_rate: number | null,
    rotation_degrees: 0 | 90 | 180 | 270,
    tracking_result_id: UUIDv7,
    upload: LocalUploadState
}

TechniqueMedia {
    clip_id: UUIDv7,
    media: Blob
}

TrackingResult {
    schema_version: 1,
    id: UUIDv7,
    clip_id: UUIDv7,
    source_width: integer,
    source_height: integer,
    pose_model: { name, version, asset_digest },
    tracker: { name, version, confidence_threshold },
    sampling_policy: { kind: "fixed", hz: 10 },
    calibration: { media_time_ms, x, y, patch_size },
    samples: TrackingSample[]
}

LocalUploadState =
    { kind: "local" }
  | { kind: "uploading", server_clip_id, attempted_at }
  | { kind: "uploaded", server_clip_id, completed_at }
  | { kind: "upload_failed", server_clip_id?, attempted_at, reason }
```

MVP allows at most one kept Technique clip for a Set. A transient
re-recording replaces only the previous transient candidate. Replacing a kept
clip requires deleting it first. The invariant is enforced in the technique
store transaction, not merely by disabled UI.

The Blob has its own store so changing upload state does not ask IndexedDB to
rewrite a large media value. Keep and delete transact across clip metadata,
media, and Tracking result stores atomically.

`Keep` asks `navigator.storage.persist()` and inspects
`navigator.storage.estimate()` before committing. Denial does not forbid a
keep; it changes the warning. Available quota is an estimate and no fixed
cross-browser retention guarantee exists. The copy therefore always says
**Kept on this device**, and distinguishes “persistent storage granted” from
“the browser may remove this if space is needed.” A kept clip is not a backup.

Deletion of a local clip removes its media and tracking record in the same transaction.
Object URLs are reconstructed only while a clip is open and revoked afterward.
The service worker never puts video blobs, signed media responses, upload
responses, or API responses into Cache Storage.

---

## 9 · Explicit cloud upload

### Storage placement

Uploaded media belongs in a private S3-compatible Hetzner Object Storage bucket
in Helsinki, matching the application's existing EU region. It does not belong
in Postgres, a jail release, the service-worker cache, or the server's 40 GB
root disk. Object Storage is designed for moderate media, provides redundant
object storage, and avoids routing video bytes through the small application
server.

The bucket denies public listing and public reads. It has CORS rules restricted
to the AthletOS production origin and the required `PUT`, request headers, and
`GET` response headers. S3 access keys exist only in server configuration.
Opaque keys contain no athlete, workout, exercise, or original filename:

```text
technique-clips/{random UUIDv7}
```

Postgres remains the authority for ownership and lifecycle. S3 metadata is not
the authorization database.

### Preconditions

Upload is offered only when:

- the athlete explicitly kept the clip, or a failed keep left the transient
  Blob reviewable and the athlete explicitly chooses **Upload instead**;
- the browser is online enough to reach the BFF;
- the associated Workout is no longer in the local submission queue;
- the authenticated API confirms that Workout and Set belong to the athlete;
- no other cloud clip belongs to that Set.

This prevents orphan media from racing the idempotent offline Workout submit.
It does not couple the upload to queue flushing: landing a Workout never starts
an upload.

### Backend record

```text
technique_clips
    id                uuid primary key
    athlete_id        uuid references athletes(id) on delete cascade
    workout_id        uuid references workouts(id) on delete cascade
    set_position      integer
    exercise          text check (exercise = 'squat')
    object_key        text unique not null
    state             text check (state in ('pending', 'ready', 'deleting'))
    mime_type         text not null
    byte_length       bigint not null
    duration_ms       integer not null
    width             integer not null
    height            integer not null
    content_sha256    text not null
    created_at        timestamptz not null
    ready_at          timestamptz null
    unique (workout_id, set_position)
```

Tracking results remain local in the MVP. Uploading derived landmark data now
would create a server-side corpus before its purpose, consent, retention, and
access model exist. A future AI or coach corpus references the stable cloud
Technique clip ID and adds its own derivative records.

### Authenticated contract

All control calls pass through SvelteKit's same-origin BFF so the browser still
holds no access token. The Rust API adds:

```text
POST   /v1/technique-clips/uploads
POST   /v1/technique-clips/{id}/complete
GET    /v1/technique-clips/{id}/playback
DELETE /v1/technique-clips/{id}
```

Create receives Workout ID, Set position, media type, bytes, duration,
dimensions, and a browser-computed SHA-256. After ownership and limits pass, it
creates or returns the idempotent pending record and supplies a short-lived
presigned single-part `PUT` URL plus the exact required headers and expiry. The
browser uploads the unchanged Blob directly to Object Storage. The declared
digest is signed into object metadata when the selected S3 implementation
supports that header; it is useful for idempotency and client-side integrity but
is not represented as a server-verified hash of the object body.

Complete is idempotent. The API performs an authenticated object metadata check
for exact object key, allowed content type, declared byte length, and, where
supported, the signed declared-digest metadata before changing `pending` to
`ready`. A missing or mismatched object is not ready. It returns the existing
ready representation on retry. The disposable-bucket compatibility test decides
which checksum headers Hetzner accepts; the design does not assume AWS-specific
checksum behavior from an S3-compatible service.

Playback returns a short-lived presigned `GET` only for a ready clip owned by
the athlete. The response itself is `Cache-Control: private, no-store`, and the
service worker ignores it. The MVP does not expose cloud clips in History; the
local review can use playback after explicit upload and later local deletion.

Delete verifies ownership, marks `deleting`, deletes the object, and removes
metadata only after successful or confirmed-missing object deletion. Repeating
delete is safe. A scheduled cleanup removes pending rows and objects older than
24 hours. S3 lifecycle rules abort incomplete multipart uploads even though the
MVP's bounded clips use single-part PUTs.

The initial hard limits are 45 seconds, 1280×720 declared dimensions, an
allowlist of negotiated browser media types, and 75 MiB per object. The server
does not trust declarations: S3 metadata is checked at completion, and a later
media-validation worker may inspect container contents if uploads become an
input to server-side processing. The MVP never serves an uploaded file inline
as executable content and never reflects an athlete-supplied filename.

### Upload behavior

An interrupted upload becomes `upload_failed`; it never retries in the
background. Athlete intent is required for each retry, which requests a fresh
ticket. Progress is shown from `XMLHttpRequest.upload` because Fetch upload
progress is not consistently available across target browsers. Abort returns
to a local state and leaves server cleanup to the expiry process.

Local deletion and cloud deletion are separate choices with explicit copy:
deleting the device copy does not claim to delete the upload, and deleting the
upload does not silently delete the device copy.

---

## 10 · Privacy, security, and failure behavior

Camera access occurs only after a direct athlete action and uses the system
permission prompt. The live preview and visible recording state make capture
obvious. Audio is never requested. Analysis is local. No frame, landmark,
thumbnail, model input, or telemetry leaves the device without a separate
future design; explicit video upload sends only the original retained Blob.

Technique clips are sensitive personal media even though this MVP is not a
medical feature. Authorization is deny-by-default and owner-only. Another
athlete's clip ID returns `404`. Signed URLs are short lived, bearer-like, and
never written to logs, analytics, database columns, referrers, or durable local
state. Application logs carry clip IDs and state transitions, not object URLs,
object bodies, landmark data, or checksums that are unnecessary to diagnose an
event.

The content security policy permits the self-hosted worker, WASM, Blob-backed
video, and only the configured object-storage endpoint. Object-store CORS is an
additional browser control, not authorization. Presigned request constraints,
backend ownership checks, private bucket policy, randomized keys, and signed
downloads provide the actual access control layers.

Failures degrade independently:

- Camera denial or unavailable recording returns to ordinary Set logging.
- Recorder failure keeps any valid final Blob reviewable when possible.
- Model load or inference failure leaves raw video review and discard available.
- Missing pose confidence hides only the dependent guide.
- Lost bar confidence hides the bar guide and offers recalibration.
- Local persistence failure retains the transient review and reports that it
  was not kept.
- Quota pressure is explained before keep; it never triggers silent deletion by
  AthletOS.
- Network failure has no effect until explicit upload.
- Upload failure keeps the local clip and offers a manual retry.
- Playback-ticket failure does not change either stored copy.
- Delete failure remains visible and retryable; it is not reported as deleted.

The Workout logger is always usable through every case.

---

## 11 · Performance expectations and capability gates

MVP performance is an acceptance gate to measure on named physical devices,
not a promise inferred from desktop development:

- recording preview and controls remain responsive;
- analysis never blocks the main UI for a perceptible run of frames;
- playback, seeking, and overlay media timestamps remain synchronized;
- memory returns near its pre-review level after discard/dispose; and
- a 30-second clip completes fixed-rate analysis within 30 seconds on the
  oldest explicitly supported iPhone and Android test devices.

If the last target fails, the product may show progressive results and a longer
wait while data is collected. Changing the target requires recorded device
timings. It must not be “fixed” by silently reducing evidence density for some
athletes while still labeling the result as 10 Hz.

At startup the module checks secure context, `mediaDevices.getUserMedia`,
`MediaRecorder`, supported media type, `Worker`, `WebAssembly`, IndexedDB, and
the actual model initialization. Optional acceleration or convenience APIs such
as `requestVideoFrameCallback`, `OffscreenCanvas`, `createImageBitmap`, the
Permissions API, orientation lock, and persistent-storage grants have explicit
fallbacks or narrower behavior.

No browser or operating-system name alone declares support. A device enters the
supported matrix only after the complete installed-PWA flow passes on physical
hardware.

---

## 12 · Verification

Implementation follows red-green-refactor and tests through module interfaces.

### Pure and module tests

- Every valid and invalid state transition, including dispose from each state.
- A camera failure never changes workout state.
- The 45-second stop uses monotonic elapsed time and fires once.
- MIME negotiation records the recorder's actual output type.
- Fixed sampling requests 10 Hz but stores actual, monotonically increasing,
  non-uniform decoded media timestamps.
- A future irregular sampling fixture renders without assuming equal spacing.
- Coordinate transforms cover rotation, letterboxing, DPR, and preview mirror.
- Confidence gating removes dependent guides and never bridges a long gap.
- Playback interpolation is visual only and does not mutate observations.
- Bar calibration runs forward and backward, stops on lost confidence, and can
  be replaced without rerunning pose inference.
- Overlay toggles do not change tracking data.
- Keep succeeds only after transaction completion and enforces one clip per Set.
- Delete atomically removes local clip and tracking result.
- Upload state changes only on explicit athlete intents.

Tests use fake clock, recorder, analyzer, technique store, and upload transport
adapters through the same module interface used by the Svelte view.

### Fixture-video tests

Repository-owned, consented short fixtures cover:

- a well-framed side-view squat;
- partial limb occlusion;
- bar occlusion and reappearance;
- camera movement;
- the athlete leaving frame;
- no person;
- a non-squat motion; and
- a second person entering frame.

Tests assert invariants and tolerances: timestamps, landmark availability,
confidence loss, bounded path continuity, and no fabricated samples. They do not
assert pixel-perfect model output. A model or tracker version change reruns the
whole fixture suite and performance matrix; saved results retain their producing
versions.

### Browser and physical-device tests

Playwright covers permission/capability states with browser fakes and the full
UI state machine. Real acceptance runs use installed PWA and ordinary browser
modes on the named oldest supported iPhone/Safari and Android/Chrome devices:

- online and offline after the shell/model has cached;
- camera granted, denied, and revoked;
- portrait-to-landscape transition;
- recording hard stop and app backgrounding;
- analysis, playback, scrub, recalibration, discard, and keep;
- persistence granted and denied;
- low quota and forced IndexedDB failure;
- interrupted upload and manual retry; and
- local-only, cloud-only, both-copy, and neither-copy deletion outcomes.

Timing, peak memory where observable, thermal symptoms, recording MIME type,
actual capture settings, analysis throughput, and failure are recorded by
device and browser version.

### Backend and object-store tests

- Workout, Set, status, exercise, and athlete ownership validation.
- Another athlete receives `404` for create, complete, playback, and delete.
- Duration, dimensions, byte size, declared-digest metadata, and MIME limits.
- One cloud clip per Set under concurrent create requests.
- Idempotent create and completion.
- Expired ticket and mismatched/missing object refusal.
- Ready playback only, with short expiry and no-store response.
- Delete success, confirmed-missing object, transient S3 failure, and retry.
- Expiry cleanup for pending rows/objects and multipart lifecycle configuration.

The object-store interface has an in-memory test adapter. A separate integration
test exercises the chosen S3-compatible implementation against a disposable
bucket before production provisioning; mocked signing alone does not establish
compatibility.

### Full verification

After focused cycles, run the Rust workspace tests and lints, OpenAPI generation
consistency check, frontend unit tests, type-check, lint, production build, and
Playwright suite. The feature is not declared complete until at least one real
iPhone and one real Android device have passed capture through discard and
capture through keep while offline.

---

## 13 · Delivery slices and decision gates

### Slice 0 — physical-device feasibility spike

Build throwaway probes for camera capture, actual output codecs, video frame
decoding, MediaPipe worker execution, IndexedDB Blob retention, and memory
cleanup on the oldest available target devices. Record results. This spike may
change numeric limits but does not become production code.

Proceed only if both platforms can capture, analyze, replay, and persist a short
clip without losing logger responsiveness. If one platform fails, report the
specific missing capability or measured threshold before considering a native
shell.

### Slice 1 — local capture and raw review

Ship the TechniqueReview state machine, camera/recorder adapter, transient raw
review, discard-default behavior, and camera-independent logger integration.

### Slice 2 — pose and calibrated bar guides

Ship pinned offline model assets, worker analysis, fixed timestamp sampler,
confidence-aware overlays, one-tap calibration, bar tracking, and fixture tests.

### Slice 3 — deliberate local retention

Ship the centralized IndexedDB v2 migration, technique store, storage/quota
copy, kept review, and explicit local deletion.

### Slice 4 — deliberate cloud upload

Ship private Helsinki Object Storage, Postgres metadata, signed create/complete/
playback/delete contracts, manual progress/retry, cleanup, and operational
verification.

Each slice preserves ordinary offline Set logging and is independently
verifiable. Upload is part of the approved MVP, but it follows proof that local
review is viable and useful.

### Native escape criteria

Native work is proposed only with evidence that a target PWA cannot meet a
product requirement, such as:

- required camera selection or encoding is unavailable or unstable;
- worker inference cannot meet the agreed latency without freezing or thermal
  failure;
- supported-browser local persistence is too unreliable for the stated copy;
- frame decoding/timestamps cannot maintain overlay synchronization; or
- physical-device coverage excludes a material share of intended athletes.

Preference for a native framework, access to Health stores, or theoretical
performance is not by itself an escape criterion.

---

## 14 · Expected future evolution

Variable-rate analysis changes the private sampling policy and records actual
timestamps under the existing TrackingResult schema. A likely progression is
device-adaptive sampling, then squat-phase-weighted sampling after phase
classification has its own validated model. Historical fixed-rate results
remain replayable because renderers follow timestamps and producing versions.

Measurements require an explicit calibration and validity design. Verdicts and
cues require an exercise-science evidence standard, uncertainty presentation,
and safety review. Neither should be inferred merely because coordinates exist.

AI review and coach review are separate corpora. They can reference the stable
cloud Technique clip ID, but need their own consent, retention, access,
annotation, versioning, and deletion propagation rules. No speculative coach or
AI columns enter the MVP Technique clip table.

HealthKit and Health Connect may later receive a summary Workout record or
contribute recovery context. They are neither a camera pipeline nor a source of
pose evidence and remain outside this design.

---

## 15 · Documentation and operational changes during implementation

Implementation must update the durable documentation alongside code:

- `docs/DESIGN.md` gains the product decision that Technique review is private,
  local-first visual evidence with discard-by-default retention.
- `docs/DEPLOYMENT.md` gains private bucket provisioning, credentials, CORS,
  lifecycle cleanup, monitoring, and restore/deletion expectations.
- `.env.example` gains non-secret object-store endpoint, region, and bucket
  settings plus secret-key placeholders.
- The privacy notice explains local processing, device-local browser storage,
  explicit video upload, retention, and deletion.
- The checked-in OpenAPI document and generated frontend schema change in the
  same slice as the backend upload contract.

Uploaded Technique clips are not covered by the current Postgres-only backup
script. Object Storage supplies redundancy, not historical backup. Before
calling uploaded clips durable, operations must make an explicit retention and
restore decision and test it. The UI must not call cloud upload a backup until
that decision exists and its restore is exercised.
