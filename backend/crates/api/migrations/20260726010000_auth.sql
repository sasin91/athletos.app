-- Identity and access: athletes, and the credentials that authenticate them.
--
-- This schema is not new work — it is the shape the kept `auth/**` modules have
-- always been written against (ADR-0003, ADR-0011, ADR-0017), reconstructed
-- here because the migrations were left behind in the project this code came
-- from (D-02). Every column below exists because a query in `auth/**`,
-- `routes/auth.rs`, `bin/set_password.rs` or `tests/auth.rs` names it; nothing
-- is speculative.
--
-- What is *not* here is as deliberate as what is: there are no organizations,
-- teams or team memberships. Phase 0 stripped the `left join` the extractor ran
-- over them on every authenticated request, because coaching is v2 and will
-- want a coach<->athlete relation rather than generic team roles (D-14).
--
-- Ids are UUIDv7 minted in Rust, never in Postgres. Time-ordered, so they
-- cluster well in a btree without the random-insert write amplification of v4,
-- and generating them application-side keeps the id available before the insert
-- and keeps the schema installable without pgcrypto on any Postgres.

-- The athlete is the only actor in v1, and the only thing that holds a login.
create table athletes (
    id             uuid        primary key,

    -- Shape-checked only. `routes::auth::validate_email` documents at length why
    -- a thorough RFC 5322 validator rejects more real addresses than it catches
    -- typos; this is the floor, not the policy.
    email          text        not null check (position('@' in email) > 1),

    -- `validate_display_name` refuses an all-whitespace name in Rust precisely
    -- so this constraint is never the thing that reports it to a caller.
    display_name   text        not null check (length(trim(display_name)) > 0),

    password_hash  text        not null,

    created_at     timestamptz not null default now(),

    -- Stamped on every successful login. Captured now so a dormancy or
    -- retention job can be written later without a backfill (ADR-0011).
    last_active_at timestamptz,

    -- Soft delete. The extractor's `deleted_at is null` is what stops an access
    -- token that is still inside its lifetime from working after the account
    -- goes away — deleting the row would leave the token to expire on its own.
    deleted_at     timestamptz
);

-- Case-insensitive uniqueness without the citext extension, which keeps the
-- schema installable on a bare Postgres. Partial, so a soft-deleted account
-- does not permanently block that address from registering again — registration
-- is open in AthletOS (D-02), which makes that case reachable rather than
-- theoretical.
--
-- This index is also exactly what login and `set-password` probe with
-- `where lower(email) = lower($1) and deleted_at is null`, so the uniqueness
-- guarantee and the hot lookup are one structure rather than two.
create unique index athletes_email_key on athletes (lower(email))
    where deleted_at is null;

-- Opaque, revocable refresh tokens (ADR-0003).
--
-- Access tokens are short-lived Ed25519 JWTs and are deliberately NOT stored:
-- they are verified by signature alone, which is the whole point of choosing an
-- asymmetric algorithm. Only the refresh token needs a row, because it is the
-- one credential that has to die on demand — on logout, or on a lost device.
create table refresh_tokens (
    id             uuid        primary key,

    -- Every token descended from one login shares a family. Rotation writes a
    -- new row in the same family; presenting an already-consumed token means
    -- two parties hold the same secret, and since we cannot tell which is the
    -- thief, the whole family dies at once.
    family_id      uuid        not null,

    athlete_id     uuid        not null references athletes (id) on delete cascade,

    -- SHA-256 of the secret, never the secret. A leaked dump must not yield
    -- usable credentials — `tests/auth.rs` asserts both that the plaintext is
    -- absent and that what is here is 32 bytes. SHA-256 rather than Argon2 is
    -- correct here: the secret is 256 bits of CSPRNG output, so there is no
    -- low-entropy guess space for a slow hash to defend, and this lookup is on
    -- the refresh path.
    token_hash     bytea       not null,

    issued_at      timestamptz not null default now(),
    expires_at     timestamptz not null,

    -- Set when this token is exchanged for its successor. A consumed token is
    -- no longer valid, and seeing one again is what triggers family revocation.
    consumed_at    timestamptz,

    -- Set on logout or family-wide revocation. Kept separate from `consumed_at`
    -- so the trail distinguishes "spent normally" from "killed", and
    -- `revoked_reason` records which — `tests/auth.rs` reads back
    -- 'reuse_detected' to prove the distinction survives.
    revoked_at     timestamptz,
    revoked_reason text,

    -- Captured at issue time so a future "sign out this device" screen can
    -- label sessions without a second table. Free text: it is attacker-
    -- controlled and used for display only, never for an access decision.
    user_agent     text,
    ip_address     inet
);

-- Refresh is a single index probe by hash. Unique because two live tokens
-- hashing alike would mean a CSPRNG collision or a bug, and either should fail
-- loudly rather than quietly authenticate the wrong athlete.
create unique index refresh_tokens_token_hash_key on refresh_tokens (token_hash);

-- Family-wide revocation walks this on every reuse detection and every logout.
create index refresh_tokens_family_id_idx on refresh_tokens (family_id);

-- `set-password` deletes every token for one athlete, and the same index serves
-- the cascade when an athlete is hard-deleted and a future session list.
create index refresh_tokens_athlete_id_idx on refresh_tokens (athlete_id, issued_at desc);

-- Supports a periodic sweep of tokens too old to be part of any useful reuse
-- investigation. The sweep is not written yet; only table size depends on it.
create index refresh_tokens_expires_at_idx on refresh_tokens (expires_at);

-- Access-token revocation: a denylist of `jti` claims (ADR-0003).
--
-- Refresh tokens alone are not enough for logout. Revoking only the refresh
-- token leaves the caller holding a bearer token that keeps working for up to
-- its full lifetime after they pressed "sign out", and "it stops working in
-- about fifteen minutes" is not what signing out means.
--
-- What has not changed: the happy path is still signature-only. This table is
-- consulted as a `not exists` folded into the athlete lookup the extractor
-- already runs, so revocation costs no extra round-trip.
create table access_token_denylist (
    -- The revoked token's `jti`, a UUIDv7 minted per access token. Primary key,
    -- so the extractor's check is one index probe and a repeated logout with the
    -- same token is a no-op rather than a unique violation.
    jti           uuid        primary key,

    athlete_id    uuid        not null references athletes (id) on delete cascade,

    -- The revoked token's own `exp`. The row is useless once this has passed —
    -- from then on the signature check refuses the token unaided — so rows are
    -- self-pruning in principle and a sweep is housekeeping, not correctness.
    expires_at    timestamptz not null,

    denylisted_at timestamptz not null default now(),

    -- Mirrors `refresh_tokens.revoked_reason` so the two revocation trails read
    -- the same way.
    reason        text        not null
);

-- The index that sweep would need: `delete ... where expires_at < now()`.
create index access_token_denylist_expires_at_idx on access_token_denylist (expires_at);

-- Per-account throttling of failed sign-ins (ADR-0017; NIST SP 800-63B-4
-- §3.2.2 requires the verifier to limit consecutive failed attempts on a single
-- account, which is why this cannot live at the edge proxy: a botnet guessing
-- one account never trips a per-IP bucket, and the proxy does not know
-- accounts).
--
-- Keyed by a SHA-256 of the *submitted* address rather than by athlete id, for
-- two reasons that are really one reason:
--
--  * The throttle must behave identically for an address with no account.
--    Keying on athlete id would leave unknown addresses un-throttleable, and
--    "this address throttles, that one does not" is an enumeration oracle —
--    exactly what login's throwaway-hash timing defence exists to deny.
--  * That means holding state for addresses people merely typed, mistyped, or
--    probed. A digest keeps this table from becoming a list of plaintext
--    addresses nobody consented to storing.
create table login_throttle (
    email_digest         bytea       primary key,

    -- Consecutive failures since the last success, or since the row went stale.
    -- Reset by deleting the row on success rather than zeroing it, so the table
    -- holds rows only for addresses currently failing.
    consecutive_failures integer     not null check (consecutive_failures > 0),

    -- When the run last grew. A run older than the forgiveness horizon restarts
    -- at one and the row becomes prunable.
    last_failure_at      timestamptz not null default now(),

    -- The moment before which further attempts are refused outright with a 429,
    -- ahead of any password verification. Compared against `now()` in SQL and
    -- never in Rust: two clock authorities disagreeing by a second is enough to
    -- refuse a freshly written zero-delay window.
    retry_after          timestamptz not null default now()
);

-- The pruning scan. The primary key covers every other access to this table.
create index login_throttle_last_failure_at_idx on login_throttle (last_failure_at);

-- Access-audit log, present from v1 (ADR-0011).
--
-- Deliberately carries no foreign keys: an erasure request must never be
-- blocked by audit rows, and the audit rows for an erased athlete are purged in
-- the same operation rather than cascaded by the database.
create table access_audit_log (
    id          bigint      generated always as identity primary key,
    occurred_at timestamptz not null default now(),

    -- Null for a failed login against an address with no account. Note that the
    -- attempted address is deliberately not recorded anywhere: it is
    -- unauthenticated input and is often a real person's email.
    athlete_id  uuid,

    action      text        not null,
    resource    text        not null,
    resource_id uuid,
    ip_address  inet,
    user_agent  text
);

-- "What happened to this account", the only way this table is read today, and
-- the shape a retention sweep would want. Partial because rows with no athlete
-- are failed logins against unknown addresses, which this query can never
-- match.
create index access_audit_log_athlete_id_idx on access_audit_log (athlete_id, occurred_at desc)
    where athlete_id is not null;
