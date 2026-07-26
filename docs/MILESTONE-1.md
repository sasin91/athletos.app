# Milestone 1 — Walking Skeleton

**Goal:** break every architectural assumption in [DESIGN.md](./DESIGN.md)
before any of them is expensive to change.

**Scope:** two programs, one athlete, the full loop.

```
register → maxes → browse → enroll → peek → commit
        → log offline → cut short with reason
        → idempotent submit → advance → see it advanced
```

**Two programs, deliberately one of each kind:**

| Program        | Kind         | Proves                                    |
|----------------|--------------|-------------------------------------------|
| Smolov Jr      | Prescriptive | the blanket impl; port fidelity vs the reference |
| 5/3/1 BBB      | Adaptive     | `State`, `advance()`, TM progression, `preview() -> None` |

One of each is the minimum that proves consumers never branch (D-03). One
program alone would not.

**Explicitly out of scope.** Charts, fit badge, program filtering, plate-math
UI polish, teams, invitations, notifications, password reset, styling. The UI
is ugly on purpose.

---

## Phase 0 · Make it compile

The backend does not currently build.

- [x] `git init` — the project is not a repository yet.
- [x] Delete `crates/domain/` entirely, and its workspace member entry.
- [x] Delete `storage.rs`, `bootstrap.rs`, `src/bin/bootstrap.rs`,
      `src/bin/set_password.rs`\*, and the `vocabulary` / `library-import`
      `[[bin]]` blocks (their sources are already gone).
- [x] Strip from `Cargo.toml`: `aws-sdk-s3`, `image`, `libwebp-sys`,
      `tokio-util`, `kamadak-exif`, `lettre`. Removing `libwebp-sys` removes
      the C toolchain from the build.†
- [x] Rename `pixmyday-api` → `athletos-api`. Drop `pixmyday-domain`.
- [x] `lib.rs`: remove `pub mod images/mail/points/schedule`, remove
      `routes::invitations` wiring; `routes/mod.rs`: remove `activities`,
      `invitations`.
- [x] `state.rs`: drop `objects` and `mailer` from `AppState` and their
      builders.
- [x] Fix the rename artifact: `Authenticatedathlete` → `AuthenticatedAthlete`
      (12 sites).
- [x] Mount everything under `/v1` (D-12).

\* `set-password` was **kept** — it is the only password recovery path there
is (D-02). `src/bin/bootstrap.rs` and `src/bootstrap.rs` went.

† Not quite: `libwebp-sys` is gone, but `ring` — the rustls crypto provider
behind both `sqlx`'s `tls-rustls` and `reqwest`'s `rustls-tls` — still builds C
and assembly through `cc`. The build no longer needs `cmake`, and nothing
vendors libwebp, but a C compiler is still a build requirement.

### Decision taken: the team join is stripped

`auth/extractor.rs` used to run a `left join` over `team_memberships` and
`teams` on **every authenticated request**. Teams are v2 (D-14), so the join is
gone: the extractor is now athlete + denylist only, and `AuthenticatedAthlete`
carries nothing but `athlete_id`. `TeamMembership` and `TeamRole` are deleted.

Two fewer tables for phase 1 to reverse-engineer, one less join per request,
and v2 will want a coach↔athlete shape rather than generic team roles anyway.

**Done when:** `cargo check` passes and `cargo test` runs.

---

## Phase 1 · Schema

**There are no migrations at all.** The auth tables must be reverse-engineered
from the SQL embedded in the kept modules — start by extracting every query in
`auth/**` and `routes/auth.rs`.

Tables the kept code requires:

```
athletes                 refresh_tokens
access_token_denylist    login_throttle
access_audit_log
```

No `teams` or `team_memberships` — phase 0 stripped the join.

New tables:

```sql
athlete_maxes (
  athlete_id  uuid    references athletes(id) on delete cascade,
  exercise    text,
  weight      numeric(6,2)  not null,
  updated_at  timestamptz   not null default now(),
  primary key (athlete_id, exercise)
);

enrollments (
  id          uuid primary key,
  athlete_id  uuid not null references athletes(id) on delete cascade,
  program_key text not null,
  state       jsonb not null,          -- opaque, program-owned (D-03)
  status      text  not null,          -- active | finished | abandoned
  started_at  timestamptz not null default now(),
  ended_at    timestamptz
);

workouts (
  id            uuid primary key,      -- CLIENT-generated v7 (D-09)
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  week          smallint not null,
  day           smallint not null,
  started_at    timestamptz not null,
  ended_at      timestamptz,
  outcome       text,                  -- completed | cut_short
  cut_reason    text,                  -- out_of_time | pain | equipment | enough
  notes         text,
  created_at    timestamptz not null default now()
);

workout_sets (
  id                 bigserial primary key,
  workout_id         uuid not null references workouts(id) on delete cascade,
  exercise           text not null,
  position           smallint not null,
  prescribed_weight  numeric(6,2) not null,
  prescribed_reps    smallint     not null,
  actual_weight      numeric(6,2),
  actual_reps        smallint,
  status             text not null    -- done | skipped | pending
);
```

Note `workouts.id` is supplied by the client and is the idempotency key — it is
never `default gen_random_uuid()`.

**Done when:** `sqlx::migrate!` runs clean against a fresh database and the
existing `tests/auth.rs` passes against the real schema.

---

## Phase 2 · Engine

- [x] `Maxes`, `Session`, `Block`, `Lift`, `ProgramMeta`, `State` —
      pure `serde` types, **no formatting, no unit strings** (D-03).
- [x] `trait Prescriptive`, `trait Program`, `impl<P: Prescriptive> Program for P`.
      **Verify `Program` is object-safe** — this is the assumption the whole
      milestone exists to test.
- [x] Loading + rounding: `Loading::{Barbell, Dumbbell, Bodyweight, Machine}`,
      **round down** to the nearest loadable weight (D-04). Barbell = 20 kg +
      2.5 kg resolution. Return the plate breakdown alongside the weight.
- [x] Exercise trait + registry: the ~8 exercises the two programs need
      (squat, bench, deadlift, OHP, barbell row, RDL, curl, hanging leg raise).
      Port `cues()` from the reference.\*
- [x] `impl Prescriptive for SmolovJr` — port from
      `~/Herd/sasin91.xyz/app/Training/Programs/SmolovJr.php`.
- [x] `impl Program for Wendler531Bbb` — `State` holds per-lift training max
      and cycle position; `advance()` bumps the TM at cycle end;
      `preview()` returns `None`.
- [x] Static program registry.

\* Twelve, not eight: a faithful Smolov Jr also prescribes lateral raises,
hammer curls, dumbbell tricep extensions and incline dumbbell press. `Exercise`
is a `const` struct rather than a trait — its five members are all constants, so
a trait would have been twelve unit structs implementing nothing, and a struct
is what leaves a v2 data-driven path able to *construct* an exercise rather than
compile a new type.

**Done when:** a unit test drives 5/3/1 through two full cycles and asserts the
training max moved exactly once per cycle; and a test asserts no consumer code
path matches on program kind.

### The assumption held, and the compiler enforces more than was asked

`impl<P: Prescriptive> Program for P` coexists with a hand-written `impl Program
for Wendler531Bbb` without a coherence error. The orphan rule is why: only the
crate defining a type can give it a `Prescriptive` impl, so until one does, the
two impls provably do not overlap. Give a type *both* traits and rustc reports
E0119 — which is the invariant "a program is prescriptive or adaptive, never
both", enforced at compile time rather than asserted in a comment.

Two adjustments the shape forced, neither of which changes it:

- `meta()` moved to a third trait, `Catalogued`, which both authoring traits
  inherit. A method on both `Prescriptive` and `Program` is ambiguous (E0034) on
  any concrete prescriptive type — `SmolovJr.meta()` would not compile.
- `Program` gained `progress()`. Without it a progress bar cannot get "session 7
  of 12" without reading `State`, which only the program may interpret — so the
  consumer would have had to know which program it held, which is the branch
  D-03 exists to remove.

---

## Phase 3 · API

All under `/v1`. All logic server-side (D-11).

```
POST   /v1/auth/register              ← new, open (D-02)
POST   /v1/auth/login | refresh | logout      ← exist
GET    /v1/auth/me                            ← exists

GET    /v1/programs                   list + meta
GET    /v1/programs/{key}

GET    /v1/athlete/maxes
PUT    /v1/athlete/maxes

POST   /v1/enrollments                { program_key }
GET    /v1/enrollments/{id}/next-session      READ-ONLY. no timer. (D-08)

POST   /v1/workouts                   idempotent, client UUIDv7 (D-09)
```

- [x] `POST /v1/workouts` → `ON CONFLICT (id) DO NOTHING`, and `advance()` runs
      **only** when the insert actually inserted.
- [x] Accept `pending` and `skipped` sets in the payload — the client sends what
      was prescribed-but-not-done (D-08).
- [x] Accept `cut_reason`; advance regardless.
- [x] Commit the generated `openapi.json` (`backend/openapi.json`).
- [ ] Add the `oasdiff` CI gate (D-12). **Not done** — there is no CI yet.

**Done when:** an `axum-test` case POSTs the same workout body **twice** and
asserts the training max advanced exactly once. This is the correctness test
the whole idempotency decision exists for.

> The tests are written and compile; **none of them have been run**, because the
> machine still has no Postgres (see DEVELOPMENT.md). Running them is the first
> task of the next session.

### What building it taught

**`numeric` and `f64` do not meet.** sqlx will not decode a Postgres `numeric`
into an `f64` — it wants `bigdecimal` or `rust_decimal`, a dependency bought for
two decimal places of kilograms. `numeric(6,2)` is still the right column type
(phase 1's reasoning holds: 0.1 kg of binary rounding error in a prescribed
weight is a support ticket), so every query that touches a weight carries an
explicit cast instead: `::float8` reading, `::numeric` writing. Recorded because
it is invisible from the schema and will bite the next query written.

**Idempotency and "the block is over" collide, and the order resolves it.** A
fixed block closes its enrolment on the last submit. The queued *retry* of that
same submit then arrives against an enrolment that is already `finished` — so
"refuse writes to a closed enrolment" and "a retry must always succeed" cannot
both be checked first. The status check therefore happens **after** the insert
has been attempted (or, when the program has nothing left to prescribe, in place
of it), which is not a case D-08 or D-09 anticipated and is the sort of thing
only writing the handler surfaces.

**A PWA cannot resolve an exercise key.** The engine deliberately puts only the
key in a `Block`, on the grounds that consumers resolve it through the static
registry. The API is such a consumer; the browser is not, and giving it its own
`/v1/exercises` to cache would be a second round trip before the first session
renders. So labels and cues are resolved server-side and travel inside the
session payload. Nothing is stored that way — the objection the engine records is
to *persisting* a copy of the registry, and that still holds.

**There is no `GET /v1/enrollments`.** Phase 4 has no way to find the athlete's
active enrolment after a reload except by remembering the id the `POST`
returned. Additive, so it can be added without breaking anything (D-12), but it
is a hole phase 4 will walk into on its first page refresh.

---

## Phase 4 · PWA

- [ ] Generate the TS client from `openapi.json`.
- [ ] Cookie session in `hooks.server.ts`; BFF proxy (D-11).
- [ ] Screens: register/login · maxes form · program list · program detail ·
      **peek** (read-only, no timer) · session logger · history list.
- [ ] Session logger: prescribed pre-filled, one tap to log as written, editable
      to go heavier, plate breakdown shown, elapsed + sets remaining in the
      header. **No rest timer** (D-10).
- [ ] "End session early" → four reasons → stored.
- [ ] Service worker + IndexedDB: cache the committed session, log fully
      offline, queue the submit, retry on launch.

**Done when:** you can put the phone in airplane mode, log a full session, cut
it short, land, and watch the queued submit land exactly once.

---

## The real acceptance test

Run your next actual training session on it instead of the PHP app.

If you go back to the PHP app afterwards, the milestone failed regardless of
what the checkboxes say — and the reason you went back is the most valuable
piece of information this project will produce.
