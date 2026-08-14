# Technique Review Explicit Cloud Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an athlete explicitly upload a kept Technique clip to private Helsinki object storage, replay it through short-lived owner-only access, retry interrupted transfers manually, and delete local and cloud copies independently.

**Architecture:** Postgres owns clip identity, athlete ownership, Set attachment, and lifecycle; a private S3-compatible bucket owns bytes. The Rust interface supplies short-lived presigned requests through an injected object-store port, while the SvelteKit BFF preserves cookie-token isolation and the browser uploads the unchanged Blob directly with XHR progress. Cleanup is an explicit API maintenance subcommand invoked by cron, not hidden request-time behavior.

**Tech Stack:** Rust 1.97, Axum 0.8, SQLx/Postgres 17, aws-sdk-s3 1.141.0, aws-config 1.10.1, async-trait 0.1.92, Utoipa/OpenAPI, SvelteKit, IndexedDB, Web Crypto SHA-256, XMLHttpRequest, Hetzner Object Storage.

**Spec:** `docs/superpowers/specs/2026-08-13-side-view-squat-technique-review-design.md`

## Global Constraints

- Upload begins only from an explicit athlete action; never from queue flush, connectivity events, app launch, or background sync.
- The associated Workout must have landed before upload creation succeeds.
- Object Storage is private, Helsinki-local, and receives opaque keys `technique-clips/{UUIDv7}`.
- S3 credentials never reach the browser, database, logs, generated contract, or signed response body.
- Signed PUT and GET URLs expire after five minutes and are never stored durably.
- Initial limits: 45,000 ms, 75 MiB, source dimensions no larger than 1280×720 in either orientation, and the tested browser MIME allowlist.
- One cloud clip per `(workout_id, set_position)` under concurrency.
- Another athlete receives `404` for create, complete, playback, and delete.
- Complete verifies object key, byte length, media type, and signed declared-digest metadata where Hetzner supports it; do not claim the client digest proves object-body integrity.
- Tracking results remain local and are not uploaded.
- Local and cloud deletion are independent explicit actions.
- No coach, AI, sharing, comment, review status, or background transfer fields.
- The current Postgres backup is not represented as a backup of object media.

---

### Task 1: Add an object-store port with S3 and in-memory adapters

**Files:**
- Modify: `backend/crates/api/Cargo.toml`
- Modify: `backend/Cargo.lock`
- Modify: `backend/crates/api/src/config.rs`
- Modify: `backend/crates/api/src/state.rs`
- Modify: `backend/crates/api/src/main.rs`
- Create: `backend/crates/api/src/technique_objects.rs`
- Modify: `backend/crates/api/src/lib.rs`
- Test: inline tests in `backend/crates/api/src/technique_objects.rs` and `backend/crates/api/src/config.rs`

**Interfaces:**
- Consumes: `TechniqueStorageConfig` from environment.
- Produces: `TechniqueObjectStore` port, `S3TechniqueObjectStore`, `InMemoryTechniqueObjectStore`, `PresignedRequest`, `ObjectMetadata`, and `Arc<dyn TechniqueObjectStore>` in `AppState`.

- [ ] **Step 1: Write failing configuration and adapter-contract tests**

Add config tests proving production requires all five object-store values and
development may use a disabled adapter. Add port tests:

```rust
#[tokio::test]
async fn in_memory_store_round_trips_metadata_and_delete() {
    let store = InMemoryTechniqueObjectStore::default();
    store.seed(
        "technique-clips/object",
        ObjectMetadata {
            content_type: "video/webm".into(),
            content_length: 42,
            declared_sha256: Some("a".repeat(64)),
        },
    ).await;
    assert_eq!(store.head("technique-clips/object").await.unwrap().unwrap().content_length, 42);
    store.delete("technique-clips/object").await.unwrap();
    assert!(store.head("technique-clips/object").await.unwrap().is_none());
}
```

- [ ] **Step 2: Run focused Rust tests and verify failure**

Run: `cd backend; cargo test -p athletos-api technique_objects config --lib`

Expected: FAIL because the types do not exist.

- [ ] **Step 3: Pin dependencies and define the port**

Add exact dependencies:

```toml
aws-sdk-s3 = "=1.141.0"
aws-config = "=1.10.1"
async-trait = "=0.1.92"
```

Define:

```rust
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PresignedRequest {
    pub url: String,
    pub method: &'static str,
    pub required_headers: Vec<(String, String)>,
    pub expires_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ObjectMetadata {
    pub content_type: String,
    pub content_length: i64,
    pub declared_sha256: Option<String>,
}

#[async_trait::async_trait]
pub trait TechniqueObjectStore: std::fmt::Debug + Send + Sync {
    async fn presign_put(&self, key: &str, metadata: &ObjectMetadata) -> Result<PresignedRequest, ObjectStoreError>;
    async fn head(&self, key: &str) -> Result<Option<ObjectMetadata>, ObjectStoreError>;
    async fn presign_get(&self, key: &str) -> Result<PresignedRequest, ObjectStoreError>;
    async fn delete(&self, key: &str) -> Result<(), ObjectStoreError>;
}
```

The in-memory adapter stores metadata under a Tokio `RwLock<HashMap<...>>`,
returns deterministic `memory://` signed requests, and exposes `seed` only for
tests.

- [ ] **Step 4: Implement explicit S3-compatible configuration and signing**

`TechniqueStorageConfig` contains endpoint, region, bucket, access key, secret
key, and the default-false `declared_sha256_metadata` compatibility flag. In
production, any partial/missing required set returns a named `ConfigError`; in
development, all absent means `DisabledTechniqueObjectStore`, whose methods
return `Unavailable`.

Build the AWS client with explicit static credentials, endpoint URL, region,
`force_path_style(false)`, Rustls, and no credential-chain/metadata lookup. The
false setting is deliberate: Hetzner documents virtual-host addressing, so a
bucket named `athletos-technique-clips` signs browser URLs on
`athletos-technique-clips.hel1.your-objectstorage.com`, matching the CSP origin.
PUT
signing constrains content type and object metadata key `athletos-sha256` when
the compatibility test enables it. `required_headers` contains only headers the
browser is permitted to set; it never includes `Host` or `Content-Length`. The browser
still sends the Blob's length, and completion verifies it with HEAD. Use
`PresigningConfig::expires_in(Duration::from_secs(300))`. Presigned GET requests
set the response cache-control override to `private, no-store`; this controls the
object response itself, not merely the JSON ticket response. HEAD maps not-found
to `Ok(None)`. Error text contains operation and object key but never URL,
credentials, or response body.

Extend `AppState::new(db, auth, technique_objects)` and make
`with_ephemeral_auth` inject the in-memory adapter. Add
`AppState::with_dependencies(db, auth, technique_objects)` so integration tests
can retain and seed the same adapter handle. `main.rs` constructs the S3 or
disabled adapter before binding the listener.

- [ ] **Step 5: Verify and commit the object-store seam**

Run:

```powershell
cd backend
cargo test -p athletos-api --lib technique_objects
cargo fmt --check
cargo clippy -p athletos-api --all-targets -- -D warnings
git add Cargo.lock crates/api/Cargo.toml crates/api/src
git commit -m "feat: add private technique object store"
```

---

### Task 2: Persist owner-scoped clip lifecycle and expose authenticated endpoints

**Files:**
- Create: `backend/crates/api/migrations/20260813010000_technique_clips.sql`
- Create: `backend/crates/api/src/routes/technique_clips.rs`
- Modify: `backend/crates/api/src/routes/mod.rs`
- Modify: `backend/crates/api/src/lib.rs`
- Modify: `backend/crates/api/src/openapi.rs`
- Test: `backend/crates/api/tests/technique_clips.rs`
- Regenerate: `backend/openapi.json`
- Regenerate: `frontend/src/lib/api/schema.d.ts`

**Interfaces:**
- Consumes: `TechniqueObjectStore`, authenticated athlete, existing Workout/Set ownership rows.
- Produces: create-upload, complete, playback, and delete contracts under `/v1/technique-clips`.

- [ ] **Step 1: Write failing API tests for ownership, limits, concurrency, and lifecycle**

Use `#[sqlx::test]`, `AppState::with_dependencies` with a retained
`Arc<InMemoryTechniqueObjectStore>`, and the repository's real authentication
helpers. Create `completed_workout_fixture` by registering an athlete, posting a
Workout containing squat Set position 0, and returning its server, token, and
Workout ID. Create `valid_upload_request(workout_id, set_position)` with
`video/webm`, 1,024 bytes, 1,000 ms, 1280×720, and 64 lowercase `a` characters.

Add named tests that prove:

- `another_athlete_cannot_create_complete_play_delete` returns `404` from all
  four owner-scoped operations.
- `concurrent_create_returns_one_clip_identity` releases two identical POSTs
  from a `tokio::sync::Barrier`, receives the same clip ID twice, and counts one
  database row.
- `complete_refuses_missing_or_mismatched_object_metadata` first receives `409`
  with no object, then seeds the exact key with the wrong byte length and again
  receives `409`.
- Every exact accepted MIME succeeds; 45,001 ms, 75 MiB + 1, invalid digest,
  oversized rotated dimensions, and an unknown Set fail with the specified 4xx.
- Playback requires ready state, completion is idempotent, and delete retry
  finishes after one injected object-store failure.

- [ ] **Step 2: Run the new integration test and verify failure**

Run: `cd backend; cargo test -p athletos-api --test technique_clips`

Expected: compile/route failures because migration and handlers do not exist.

- [ ] **Step 3: Add the constrained lifecycle table**

Create a migration with:

```sql
create table technique_clips (
    id uuid primary key,
    athlete_id uuid not null references athletes(id) on delete cascade,
    workout_id uuid not null,
    set_position integer not null,
    exercise text not null check (exercise = 'squat'),
    object_key text not null unique,
    state text not null check (state in ('pending', 'ready', 'deleting')),
    mime_type text not null check (mime_type in (
        'video/mp4', 'video/mp4;codecs=avc1.42E01E',
        'video/webm', 'video/webm;codecs=vp8', 'video/webm;codecs=vp9'
    )),
    byte_length bigint not null check (byte_length between 1 and 78643200),
    duration_ms integer not null check (duration_ms between 1 and 45000),
    width integer not null check (width > 0),
    height integer not null check (height > 0),
    content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
    created_at timestamptz not null default now(),
    ready_at timestamptz,
    foreign key (workout_id, set_position)
        references sets(workout_id, "position") on delete cascade,
    unique (workout_id, set_position),
    check (greatest(width, height) <= 1280 and least(width, height) <= 720),
    check (
        (state = 'pending' and ready_at is null) or
        (state = 'ready' and ready_at is not null) or
        state = 'deleting'
    )
);

create index technique_clips_pending_created_idx
    on technique_clips (created_at) where state = 'pending';

create index technique_clips_deleting_idx
    on technique_clips (id) where state = 'deleting';
```

- [ ] **Step 4: Implement DTOs, validation, ownership, and idempotency**

Define wire types:

```rust
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateTechniqueUpload {
    pub workout_id: Uuid,
    pub set_position: i32,
    pub mime_type: String,
    pub byte_length: i64,
    pub duration_ms: i32,
    pub width: i32,
    pub height: i32,
    pub content_sha256: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SignedRequestView {
    pub url: String,
    pub method: String,
    pub required_headers: std::collections::BTreeMap<String, String>,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct TechniqueClipView {
    pub id: Uuid,
    pub workout_id: Uuid,
    pub set_position: i32,
    pub state: TechniqueClipState,
    pub mime_type: String,
    pub byte_length: i64,
    pub created_at: DateTime<Utc>,
    pub ready_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CreateUploadResponse {
    pub clip: TechniqueClipView,
    pub upload: Option<SignedRequestView>,
}
```

Create joins `sets → workouts → enrollments` to prove athlete ownership and
resolve exercise. Insert UUIDv7 plus opaque UUIDv7 object key with
`ON CONFLICT (workout_id, set_position) DO NOTHING`, then read the winner under
the same owner. Exact metadata match renews a pending PUT; mismatch is `409`;
ready returns `upload: null`; deleting is `409`.

Complete locks the owned row, HEADs the exact key, compares content type/length
and declared digest metadata when configured, then atomically marks ready.
Playback signs only ready rows. Delete marks deleting, commits, calls object
delete, then deletes the row; a retry can finish a deleting row. Do not hold a
database transaction across S3 network I/O.

Register routes and OpenAPI:

```rust
.route("/v1/technique-clips/uploads", post(routes::technique_clips::create_upload))
.route("/v1/technique-clips/{id}/complete", post(routes::technique_clips::complete))
.route("/v1/technique-clips/{id}/playback", get(routes::technique_clips::playback))
.route("/v1/technique-clips/{id}", delete(routes::technique_clips::delete))
```

- [ ] **Step 5: Pass API tests, regenerate the contract, and commit**

Run:

```powershell
cd backend
cargo test -p athletos-api --test technique_clips
cargo run -p athletos-api --bin openapi -- openapi.json
cd ../frontend
npm run generate:api
cd ../backend
cargo test --workspace
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
git add crates/api/migrations crates/api/src crates/api/tests openapi.json ../frontend/src/lib/api/schema.d.ts
git commit -m "feat: authorize technique clip uploads"
```

---

### Task 3: Add same-origin BFF controls and direct upload progress

**Files:**
- Create: `frontend/src/routes/api/technique-clips/uploads/+server.ts`
- Create: `frontend/src/routes/api/technique-clips/[id]/complete/+server.ts`
- Create: `frontend/src/routes/api/technique-clips/[id]/playback/+server.ts`
- Create: `frontend/src/routes/api/technique-clips/[id]/+server.ts`
- Create: `frontend/src/lib/technique/upload.ts`
- Test: `frontend/src/lib/technique/upload.test.ts`
- Modify: `frontend/src/lib/technique/store.ts`

**Interfaces:**
- Consumes: generated `Schemas`, same-origin authenticated `locals.api`, a local Blob, and either `TechniqueStore.updateUpload` or an in-memory state sink.
- Produces: `TechniqueUploadSource`, `TechniqueUploadTransport`, `UploadStateSink`, `uploadTechniqueClip(source, transport, sink, onProgress, now): Promise<LocalUploadState>`, `retryTechniqueUpload`, `requestPlayback`, and `deleteCloudClip`.

- [ ] **Step 1: Write failing hash, progress, retry, and state tests**

```ts
import { expect, it, vi } from 'vitest';
import { uploadTechniqueClip } from './upload';
import type { LocalUploadState } from './store';
import type { TechniqueUploadSource, TechniqueUploadTransport, UploadTicket } from './upload';

const source: TechniqueUploadSource = {
	localId: 'local-id',
	workoutId: 'workout-id',
	setPosition: 0,
	mimeType: 'video/webm',
	durationMs: 1_000,
	width: 1_280,
	height: 720,
	blob: new Blob(['clip'], { type: 'video/webm' })
};

const ticket: UploadTicket = {
	serverClipId: 'server-id',
	state: 'pending' as const,
	upload: {
		url: 'https://objects.invalid/signed',
		requiredHeaders: { 'content-type': 'video/webm' },
		expiresAt: '2026-08-13T12:05:00Z'
	}
};

it('persists uploading before PUT and uploaded only after complete', async () => {
	const events: string[] = [];
	const sink = { update: vi.fn(async (state) => events.push(state.kind)) };
	const complete = vi.fn(async () => ({ serverClipId: 'server-id', state: 'ready' as const }));
	const transport: TechniqueUploadTransport = {
		create: vi.fn(async () => ticket),
		put: vi.fn(async (_ticket, _blob, progress) => progress({ loaded: 5, total: 10 })),
		complete
	};
	await uploadTechniqueClip(source, transport, sink, vi.fn(), () => '2026-08-13T12:00:00Z');
	expect(events).toEqual(['uploading', 'uploaded']);
	expect(complete).toHaveBeenCalledWith('server-id');
});

it('keeps the local clip and records upload_failed after interrupted PUT', async () => {
	const states: LocalUploadState[] = [];
	const complete = vi.fn<TechniqueUploadTransport['complete']>();
	const transport: TechniqueUploadTransport = {
		create: vi.fn(async () => ticket),
		put: vi.fn(async () => { throw new Error('network interrupted'); }),
		complete
	};
	await expect(uploadTechniqueClip(
		source,
		transport,
		{ update: async (state) => { states.push(state); } },
		vi.fn(),
		() => '2026-08-13T12:00:00Z'
	)).rejects.toThrow('network interrupted');
	expect(states.map((state) => state.kind)).toEqual(['uploading', 'upload_failed']);
	expect(complete).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `cd frontend; npm run test:unit -- src/lib/technique/upload.test.ts`

Expected: FAIL because upload functions do not exist.

- [ ] **Step 3: Implement thin authenticated BFF handlers**

Each handler mirrors `routes/api/workouts/+server.ts`: return 401 when not
authenticated, parse the generated request type, call the exact generated Rust
path, and pass through status plus `data ?? error ?? null`. Never log or persist
the signed URL. DELETE returns an empty response with upstream status instead of
trying to JSON-parse 204.

- [ ] **Step 4: Implement hash, XHR PUT, and durable state transitions**

Define app-facing types independent of generated wire casing:

```ts
export type TechniqueUploadSource = {
	localId: string | null;
	workoutId: string;
	setPosition: number;
	mimeType: string;
	durationMs: number;
	width: number;
	height: number;
	blob: Blob;
};

export type UploadTicket = {
	serverClipId: string;
	state: 'pending' | 'ready';
	upload: null | {
		url: string;
		requiredHeaders: Record<string, string>;
		expiresAt: string;
	};
};

export type UploadStateSink = { update(state: LocalUploadState): Promise<void> };

export type TechniqueUploadTransport = {
	create(source: TechniqueUploadSource, sha256: string): Promise<UploadTicket>;
	put(ticket: NonNullable<UploadTicket['upload']>, blob: Blob, onProgress: (value: UploadProgress) => void): Promise<void>;
	complete(serverClipId: string): Promise<{ serverClipId: string; state: 'ready' }>;
};
```

The kept-clip adapter implements `UploadStateSink` by calling
`TechniqueStore.updateUpload(localId, state)`. The exceptional transient path
uses component memory and passes `localId: null`; it never writes a partial
IndexedDB record.

Compute lowercase SHA-256:

```ts
export async function sha256(blob: Blob): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
```

Create calls `/api/technique-clips/uploads`. Direct PUT uses `XMLHttpRequest`,
sets only ticket `required_headers`, reports `xhr.upload.onprogress`, rejects on
abort/network/non-2xx, never attempts to set forbidden `Content-Length`, and
never sends cookies to the object host. Then call
same-origin complete. Persist `uploading` before PUT, `uploaded` only after
complete, and `upload_failed` on any later failure. Retry always requests a fresh
ticket; it never reuses a signed URL. If create returns ready, persist uploaded
without PUT.

- [ ] **Step 5: Verify and commit BFF/client transport**

Run:

```powershell
cd frontend
npm run test:unit -- src/lib/technique/upload.test.ts
npm run check
npm run build
git add src/routes/api/technique-clips src/lib/technique
git commit -m "feat: upload kept clips by explicit request"
```

---

### Task 4: Expose local and cloud review after the Workout lands

**Files:**
- Modify: `frontend/src/lib/LocalTechniqueClips.svelte`
- Create: `frontend/src/lib/TransientTechniqueUpload.svelte`
- Modify: `frontend/src/routes/session/+page.svelte`
- Modify: `frontend/src/routes/(app)/history/[id]/+page.svelte`
- Modify: `frontend/src/lib/TechniqueReview.svelte`
- Test: `frontend/src/routes/session/technique-upload.e2e.ts`
- Test: `frontend/src/routes/(app)/history/[id]/page.e2e.ts`

**Interfaces:**
- Consumes: local `TechniqueStore.listForWorkout`, upload functions, generated playback response, Workout ID from completion/history, and an explicitly staged `TechniqueUploadSource` after a failed local Keep.
- Produces: client-only local clip list with review, explicit Upload/Retry, playback, Delete cloud, Delete device, and the non-persistent failed-Keep escape hatch.

- [ ] **Step 1: Write failing completion and history flow tests**

Seed a kept local clip for a Workout. On the completion screen, mock create,
XHR PUT, and complete; assert no request happens until **Upload** is clicked,
progress appears, and state becomes **Uploaded privately**. Force PUT failure,
assert **Upload failed** plus **Retry**, click retry, and assert a new create call.

On history detail, seed the same device-local clip and assert the client-only
section can review it even though server page data contains no media. Mock a
playback ticket after local deletion and assert cloud playback uses the signed
URL without persisting it. Assert **Delete from cloud** leaves local media and
**Delete from this device** leaves cloud state.

Add a failed-Keep scenario: reject the IndexedDB write, assert the review keeps
the Blob alive and offers **Upload instead after finish**, click it, finish the
Workout, and assert no network request has occurred. Once completion reaches
`sent`, click **Upload private copy** and assert create → PUT → complete uses the
staged Blob. For queued/refused completion, assert no upload control is enabled.
Discarding, navigating away, or reloading drops this staged memory-only source.

- [ ] **Step 2: Run focused browser tests and verify failure**

Run:

```powershell
cd frontend
npx playwright test src/routes/session/technique-upload.e2e.ts 'src/routes/(app)/history/[id]/page.e2e.ts'
```

Expected: FAIL because local clip listing and upload UI do not exist.

- [ ] **Step 3: Implement the client-only local clip list**

`LocalTechniqueClips.svelte` takes `{ workoutId: string }`, loads IndexedDB in
`$effect`, and renders per-Set labels without requiring server media fields. It
opens `TechniqueReview` in read-only mode with stored Blob/Tracking result. It
shows Upload only when local upload state is `local` or `upload_failed`, progress
only during the direct PUT, and cloud playback/delete only after `uploaded`.
Every action names its copy: **Upload private copy**, **Delete from cloud**, and
**Delete from this device**.

- [ ] **Step 4: Preserve the failed-Keep escape hatch only in page memory**

After a rejected Keep, `TechniqueReview` continues to own the original Blob and
offers **Upload instead after finish**. That explicit action emits a
`TechniqueUploadSource` to `/session`; the page retains one source per Set in a
Svelte rune without IndexedDB, localStorage, sessionStorage, or service-worker
messages. Closing without staging means discard. Staging releases analysis and
object-URL resources but retains the Blob reference until upload, explicit
discard, page navigation, or reload.

`TransientTechniqueUpload.svelte` receives `{ source, workoutId, onDone,
onDiscard }`. It appears only after `phase === 'sent'`, verifies that the landed
Workout ID matches `source.workoutId`, and starts no request on mount. Its
**Upload private copy** button uses an in-memory `UploadStateSink`; **Discard**
releases the reference. A queued/refused Workout explains that upload requires a
landed Workout and never transfers on reconnect or queue flush.

- [ ] **Step 5: Mount review controls at the two landed-Workout entry points**

On `/session` completion, render `<LocalTechniqueClips workoutId={recordId} />`
only when `phase === 'sent'`; queued/refused states explain that upload becomes
available after the Workout lands. On history detail, render the same component
with `workout.id`. Do not add cloud clip fields to Workout history responses.

Playback ticket responses and object URLs are held only in component memory and
revoked/cleared on close. A signed GET response uses `Cache-Control: private,
no-store` and is not intercepted by the service worker because it is cross-origin.

- [ ] **Step 6: Verify and commit the end-to-end athlete flow**

Run:

```powershell
cd frontend
npm run test:unit
npx playwright test src/routes/session/technique-upload.e2e.ts 'src/routes/(app)/history/[id]/page.e2e.ts' src/routes/session/page.e2e.ts
npm run check
npm run lint
npm run build
git add src/lib src/routes/session 'src/routes/(app)/history/[id]'
git commit -m "feat: manage private technique clip copies"
```

---

### Task 5: Expire incomplete uploads with an explicit scheduled job

**Files:**
- Create: `backend/crates/api/src/technique_cleanup.rs`
- Modify: `backend/crates/api/src/lib.rs`
- Modify: `backend/crates/api/src/main.rs`
- Modify: `backend/crates/api/src/config.rs`
- Test: `backend/crates/api/tests/technique_cleanup.rs`
- Create: `deploy/cleanup-technique-clips.sh`
- Modify: `deploy/cron/athletos`
- Modify: `infra/bootstrap.sh`

**Interfaces:**
- Consumes: pending rows older than 24 hours, every retryable `deleting` row, and `TechniqueObjectStore.delete`.
- Produces: idempotent `cleanup_technique_objects(db, store, cutoff): CleanupReport`, the `api cleanup-technique-clips` maintenance subcommand, and installed host wrapper `/usr/local/sbin/athletos-cleanup-technique-clips`.

- [ ] **Step 1: Write failing cleanup tests**

Create rows just older/newer than the cutoff plus a `deleting` row. Assert old
pending object/row and the deleting object/row are removed, new pending and
ready rows remain, a missing object still removes its row, transient
object-store failure keeps the row for retry, the advisory lock skips a
concurrent run, and two sequential runs are idempotent.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `cd backend; cargo test -p athletos-api --test technique_cleanup`

Expected: FAIL because cleanup module/binary do not exist.

- [ ] **Step 3: Implement bounded cleanup without holding transactions over S3**

Select at most 100 rows where `(state = 'pending' AND created_at < cutoff) OR
state = 'deleting'`, ordering deleting first and then by creation. For each,
delete the object, then delete the row with the same state predicate in the
`WHERE` clause. Count deleted, missing-object, and failed cases. Log IDs and
counts only. Acquire a fixed Postgres advisory lock with `pg_try_advisory_lock`
before selecting; a concurrent invocation reports `already_running` and exits
successfully. Exit nonzero when any object delete fails so cron mail surfaces it.

- [ ] **Step 4: Add the maintenance subcommand without another release artifact**

Before normal server configuration in `main.rs`, recognize the exact argument
`cleanup-technique-clips`. Load a maintenance config containing only database
and Technique Storage settings, construct the same S3 adapter, run batches until
fewer than 100 rows are returned, and exit. Reject unknown arguments. Do not load
auth keys, bind a listener, or run the normal server path. This keeps the current
single `api` release artifact unchanged.

- [ ] **Step 5: Install and schedule one host wrapper**

Create `deploy/cleanup-technique-clips.sh` as a POSIX shell script that selects
the first running jail (blue, then green), sources the shared env as root inside
that jail, and runs the current release as the application user:

```sh
#!/bin/sh
set -eu

for jail in athletos-blue athletos-green; do
    if jls -j "${jail}" >/dev/null 2>&1; then
        exec jexec "${jail}" /bin/sh -c '
            set -a
            . /usr/local/etc/athletos/env
            set +a
            exec su -m athletos -c "/srv/athletos/current/api cleanup-technique-clips"
        '
    fi
done

echo "no AthletOS jail is running" >&2
exit 1
```

In `bootstrap.sh`, install it mode `0555` beside the other stable host wrappers.
Add to `deploy/cron/athletos`:

```cron
37      *       *       *       *       root    /usr/local/sbin/athletos-cleanup-technique-clips
```

The wrapper executes in one jail only; the advisory lock also prevents overlap
with a slow prior run or a manual invocation. Request serving remains active-active.

- [ ] **Step 6: Verify and commit cleanup**

Run:

```powershell
cd backend
cargo test -p athletos-api --test technique_cleanup
cargo fmt --check
cargo clippy -p athletos-api --all-targets -- -D warnings
cd ..
shellcheck -s sh infra/bootstrap.sh deploy/cleanup-technique-clips.sh
git add backend/crates/api/src backend/crates/api/tests deploy/cleanup-technique-clips.sh deploy/cron/athletos infra/bootstrap.sh
git commit -m "ops: expire incomplete technique uploads"
```

---

### Task 6: Provision privacy controls, CSP, CORS, and operational documentation

**Files:**
- Modify: `.env.example`
- Modify: `deploy/Caddyfile`
- Modify: `infra/bootstrap.sh`
- Create: `frontend/static/theme-init.js`
- Modify: `frontend/src/app.html`
- Modify: `docs/DEPLOYMENT.md`
- Modify: `docs/DESIGN.md`
- Create: `docs/PRIVACY.md`

**Interfaces:**
- Consumes: private Helsinki bucket hostname and production origin.
- Produces: documented manual bucket setup, least-privilege credentials, exact CORS/CSP, lifecycle policy, monitoring, and truthful backup/retention copy.

- [ ] **Step 1: Externalize the existing inline theme initializer**

Move the current `app.html` theme script byte-for-byte into
`static/theme-init.js` as an IIFE and replace it with:

```html
<script src="%sveltekit.assets%/theme-init.js"></script>
```

This preserves pre-render theme behavior while allowing `script-src 'self'`
without `unsafe-inline`.

- [ ] **Step 2: Add configuration and strict response policy**

Document non-secret and secret placeholders:

```text
TECHNIQUE_S3_ENDPOINT=https://hel1.your-objectstorage.com
TECHNIQUE_S3_REGION=hel1
TECHNIQUE_S3_BUCKET=athletos-technique-clips
TECHNIQUE_S3_ACCESS_KEY_ID=
TECHNIQUE_S3_SECRET_ACCESS_KEY=
TECHNIQUE_S3_BUCKET_HOST=athletos-technique-clips.hel1.your-objectstorage.com
TECHNIQUE_S3_DECLARED_SHA256_METADATA=false
```

Extend the generated `caddy_env` in `infra/bootstrap.sh` to export
`TECHNIQUE_S3_BUCKET_HOST` beside `APP_DOMAIN` and `ACME_EMAIL`; otherwise the
placeholder expands empty even when the shared env file is correct. In the
application Caddy site, add CSP equivalent to:

```text
default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: https://{$TECHNIQUE_S3_BUCKET_HOST}; connect-src 'self' https://{$TECHNIQUE_S3_BUCKET_HOST}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'
```

Also add `Referrer-Policy: no-referrer`, so signed playback URLs cannot leak via
referrers. `wasm-unsafe-eval` is narrowly required for MediaPipe's WebAssembly
module; do not replace it with broad `unsafe-eval`. Validate the literal
expanded Caddy config before deploy.

- [ ] **Step 3: Document exact bucket and CORS setup**

`docs/DEPLOYMENT.md` requires a private Helsinki bucket, public access disabled,
and an application key isolated in a separate Hetzner project. Apply a bucket
policy granting that exact key only `s3:PutObject`, `s3:GetObject`, and
`s3:DeleteObject` on `arn:aws:s3:::athletos-technique-clips/technique-clips/*`;
the application does not receive bucket-listing or policy-administration rights.
This is necessary because Hetzner keys otherwise apply to every bucket in their
project. Also configure a 24-hour abort-incomplete-multipart lifecycle rule and
CORS:

```json
[
  {
    "AllowedOrigins": ["https://athletos.example"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type", "x-amz-meta-athletos-sha256", "range"],
    "ExposeHeaders": ["etag", "accept-ranges", "content-length", "content-range"],
    "MaxAgeSeconds": 300
  }
]
```

Replace the example origin with `https://{$APP_DOMAIN}` during provisioning.
Link Hetzner's official virtual-host SDK guidance and CORS guide:
`https://docs.hetzner.com/storage/object-storage/getting-started/using-libraries/`
and
`https://docs.hetzner.com/storage/object-storage/howto-protect-objects/cors/`.
Link the exact per-key bucket-policy guidance:
`https://docs.hetzner.com/storage/object-storage/faq/s3-credentials/`.
Record a disposable-bucket compatibility command that creates a ticket, PUTs a
small object with exact headers, HEADs it through the adapter, signs GET, and
deletes it. Record whether Hetzner preserves the declared-digest metadata; set
the adapter flag from that measured result.

- [ ] **Step 4: Document privacy, retention, restore, and deletion truthfully**

`docs/DESIGN.md` records explicit local processing, discard-by-default, owner-
only upload, and separate copy deletion. The privacy notice states that video
is sensitive personal media, pose/Tracking result stays local, original video
uploads only by explicit action, and signed links are temporary.

`docs/DEPLOYMENT.md` states Object Storage redundancy is not historical backup,
the current `pg_dump` does not contain objects, database restore can name objects
that no longer exist, and no UI may call upload a backup until a restore process
is designed and drilled. Add monitoring for cleanup nonzero exit, pending rows
older than 26 hours, and object-store request errors.

- [ ] **Step 5: Validate and commit operations/privacy changes**

Run:

```powershell
cd frontend
npm run check
npm run lint
npm run build
cd ..
git diff --check
git add .env.example deploy/Caddyfile infra/bootstrap.sh frontend/static/theme-init.js frontend/src/app.html docs frontend
git commit -m "docs: operate private technique clip storage"
```

Before production, also run `caddy fmt --diff deploy/Caddyfile` and
`caddy validate --config deploy/Caddyfile --adapter caddyfile` with all required
environment values.

---

### Task 7: Full integration, physical-device, and object-store verification

**Files:**
- Modify: `docs/spikes/2026-08-13-technique-review-device-results.md`

**Interfaces:**
- Consumes: complete local review and private upload stack plus a disposable real Hetzner bucket.
- Produces: verified MVP and recorded operational evidence.

- [ ] **Step 1: Run backend and contract verification**

Run:

```powershell
cd backend
cargo test --workspace
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo run -p athletos-api --bin openapi -- openapi.generated.json
$openapiDiff = Compare-Object (Get-Content openapi.json) (Get-Content openapi.generated.json)
if ($openapiDiff) { $openapiDiff; throw 'backend/openapi.json is stale' }
Remove-Item openapi.generated.json
cd ../frontend
npm run generate:api
git diff --exit-code -- src/lib/api/schema.d.ts ../backend/openapi.json
```

Expected: all tests/lints pass and generated contracts have no diff.

- [ ] **Step 2: Run frontend and browser verification**

Run:

```powershell
cd frontend
npm run test:unit
npm run check
npm run lint
npm run build
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 3: Run disposable real-bucket compatibility**

Against a non-production private Helsinki bucket, exercise create → presigned
PUT with exact required headers → HEAD verification → complete → signed GET →
delete → confirmed missing. Then create an incomplete upload older than the
cutoff and run cleanup twice. Capture statuses and metadata names, never signed
URLs or credentials.

- [ ] **Step 4: Run the physical athlete flow on both platforms**

On installed iPhone and Android PWAs: record offline, analyze, calibrate, keep,
finish Workout while offline, reconnect, submit Workout, explicitly upload,
interrupt once, manually retry, play cloud copy, delete local only, replay cloud,
delete cloud, and confirm another authenticated athlete cannot access the clip.
Record MIME, bytes, duration, upload time, retry result, signed playback result,
and copy-deletion outcomes.

- [ ] **Step 5: Commit verification evidence and stop before publishing**

```powershell
git add docs/spikes/2026-08-13-technique-review-device-results.md
git commit -m "docs: verify private technique clip upload"
git status --short
```

Expected: clean worktree. Publishing/deploying remains a separate explicitly
authorized action.
