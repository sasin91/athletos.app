# AthletOS — Design

Decisions taken 2026-07-25/26. Numbered so code comments can cite them the way
the inherited codebase cites its ADRs. A decision here is binding until it is
amended here.

---

## D-01 · Thesis

AthletOS is a **governor for athletes who already train**, not a program-finder
for beginners.

The user trains regularly and does not need to be persuaded into the gym. The
two failure modes being engineered against are:

1. **Going too heavy to recover.** Left to instinct, the athlete over-reaches.
2. **Sessions creeping past an hour.** An hour is a hard constraint on the
   athlete's life, not a metric to observe afterwards.

"Stick with it long term" therefore means *don't blow yourself up and don't run
out of time*. It does not mean *don't get bored*, and it does not mean
streaks, badges, or motivational pressure.

The athlete who does not know what to do is **out of scope for v1** and is
served by a human coach in v2. No recommendation algorithm is built.

---

## D-02 · Inherited backend: salvage auth, discard the rest

`backend/` arrived as a partial copy of PixMyDay (`~/Code/pixmyday`) and does
not compile — `lib.rs` declares `images`, `mail`, `points`, `schedule` and
wires `routes::invitations`; `routes/mod.rs` declares `activities` and
`invitations`; `auth/mod.rs` declares `display`. None of them exist, and
`sqlx::migrate!("./migrations")` points at a directory that was never created.

> Amended during phase 0: `auth/display.rs` was a fifth missing module, not
> found until the compiler was actually run. `config.rs` also had to be cut
> harder than "keep" implies — `Config::from_env` refused to boot without
> `S3_*`, `SMTP_*`, `MAIL_FROM` and `APP_PUBLIC_URL`, credentials for features
> that no longer exist.

**Keep:** `crates/api/src/auth/**` (keys, token, refresh, password, throttle,
denylist, audit, extractor), `config.rs`, `error.rs`, `state.rs`,
`openapi.rs`, `main.rs`.

**Delete:** `crates/domain/**` (RFC 5545 recurrence — see D-06), `storage.rs`,
`bootstrap.rs`, the `openapi`-adjacent dead binaries (`vocabulary`,
`library-import`), and the dependencies `aws-sdk-s3`, `image`, `libwebp-sys`,
`tokio-util`, `kamadak-exif`, `lettre`.

Nothing is lost by deleting: `~/Code/pixmyday` remains the home of that work.

**Rename** `pixmyday-api` / `pixmyday-domain` → `athletos-*`.

**Registration is open.** The inherited design is invitation-only with a
`bootstrap` binary that refuses to run twice; that is the wrong shape for a
solo-athlete product.

**Known v1 gap: there is no password reset.** The only recovery path is the
offline `set-password` binary. Acceptable while the user base is the author;
not acceptable the day a second person signs up.

---

## D-03 · Program engine: two authoring traits, one consuming trait

Programs come in two genuinely different kinds, and the difference is
user-visible: a **prescriptive** block has a knowable end and a real progress
denominator ("session 7 of 12"); an **adaptive** program has neither. Papering
over that would produce a lying progress bar.

But the difference must not leak into consumers. Encoding it as an enum puts a
`match` in the next-session lookup, the session view, the preview, the progress
bar, and end-of-program handling — five branches on day one, growing with every
feature that reads a program.

```rust
/// What a fixed-percentage program author writes. Pure, and that is all.
trait Prescriptive {
    fn schemas(&self, maxes: &Maxes) -> Vec<Session>;
}

/// What every consumer sees. Object-safe, stateful.
trait Program {
    fn meta(&self) -> &ProgramMeta;
    fn start(&self, athlete: &Athlete) -> State;
    fn session(&self, state: &State) -> Session;
    fn advance(&self, state: State, logged: &LoggedSession) -> State;
    /// `Some` for a block with a knowable end; `None` for open-ended.
    fn preview(&self, state: &State) -> Option<Vec<Session>>;
}

/// Every prescriptive program is trivially a Program.
/// advance() is index++, preview() is the whole plan.
impl<P: Prescriptive> Program for P { /* ... */ }
```

`SmolovJr` implements one method. `Wendler531` implements `Program` directly,
because its training max moves. The dashboard, session view and progress bar
only ever hold `&dyn Program` and **never branch**.

`State` is an opaque, program-owned blob (JSON in Postgres). The program is the
only thing that reads or writes it.

### Programs and exercises are code

Compiled in, registered in a static registry. No DSL, no authoring UI, no
user-defined programs in v1. Adding a program means a deploy — accepted, for a
catalogue that fits on two hands.

The escape hatch is kept open at zero cost: `Session` / `Block` / `Lift` are
pure `serde` types carrying **no behaviour and no formatting**. A v2
data-driven authoring path emits the same shapes the engine already consumes.
This is deliberately *not* designed now; it is only kept possible.

> The reference implementation bakes presentation into the domain —
> `Lift` constructs `'%d x %d @ %.1fkg'` in its constructor. AthletOS does not.
> Weights are bare numbers; units and formatting live at the UI edge.

---

## D-04 · Maxes and loading

Maxes are **entered directly** per lift, as in the reference. Each program
derives its own training max from that number — 5/3/1 takes 90%, Sheiko takes
it straight — so the conservatism lives in the program rather than in a
settings form.

For adaptive programs the training max lives in `State` and moves only through
`advance()`. There is no "edit my training max" field.

### Rounding

**Every prescribed weight rounds *down* to the nearest loadable weight.**

A systematic bias toward the lighter loadable weight is the cheapest governor
in the system (D-01) and costs one function.

Rounding is **per-exercise**, driven by a loading model:

| Loading    | Rule                                             |
|------------|--------------------------------------------------|
| Barbell    | 20 kg bar + plate pairs → resolution **2.5 kg**  |
| Dumbbell   | rack increment                                   |
| Bodyweight | no load                                          |
| Machine    | stack increment                                  |

Available plates: 1.25, 2.5, 5, 10, 15, 20, 25 kg. Since plates load in pairs,
barbell resolution is 2.5 kg and loadable weights are `20 + 2.5n`.

The reference does not round at all — `$max->percentage(85)` returns a raw
float, so it can prescribe 113.4375 kg. With `prescribed_weight` now persisted
and drift measured against it (D-07), an unloadable prescription would register
as drift on every single set.

**The session screen shows the plate breakdown**: `112.5 kg — bar + 25, 15, 5,
1.25 per side`. The athlete is holding the phone in front of the rack.

### Units

kg only. Stored as bare numbers with kg semantics; no unit is written into any
domain type, so adding lb later is a UI change rather than a migration.

---

## D-05 · Program metadata

`ProgramMeta` exists to let the athlete judge fit, not to be scored by an
algorithm (D-01). It carries:

- days per week
- equipment required
- experience floor
- fixed block vs open-ended (and, if fixed, its length)
- **recovery demand**
- **estimated session duration**

The last two are the honest axes for an athlete who over-reaches and who has an
hour. Smolov Jr carries a warning, not a match score. A 75-minute program is
flagged *before* enrolment, not discovered in week three.

The reference exposes only `name`, `key`, `style`, `days`, `weeks` — a
matchable surface too thin to answer "will this fit my week".

### How an athlete arrives at a program

Browse, with a fit badge. No wizard, no quiz, no scoring engine. A profile
(days available, equipment, experience, maxes) lives in settings and drives a
"fits your week" marker; programs the athlete cannot run are greyed out. Every
card leads with recovery demand and time cost.

---

## D-06 · Time is a queue

The next session is simply the next one. Sessions carry timestamps for history
and analysis, but **nothing is ever due and nothing is ever missed**. No
streaks, no red marks, no rescheduling, no skip button — there is nothing to
skip.

Guilt is what kills logging apps, and the athlete's failure mode is intensity,
not attendance (D-01). Calendar machinery exists to solve a problem this user
does not have.

Calendar recurrence is a **later opt-in**. A queue has no `scheduled_for`
column, so adding one is an additive migration and a new module — not a
rewrite. This is why `crates/domain` can be deleted now (D-02).

---

## D-07 · The governor: prescribed vs actual

The prescription is the path of least resistance, never a wall.

- Each set is **pre-filled** with the prescribed weight and reps. One tap logs
  it as written.
- Going heavier means **editing the number** — possible, deliberate, never
  blocked and never warned about mid-session.
- Both values are persisted. `workout_sets` stores **four** numbers:
  `prescribed_weight`, `prescribed_reps`, `actual_weight`, `actual_reps`.

Drift is therefore first-class, queryable data forever.

Feedback is **retrospective and calm** — "you went over on 6 of 12 sets last
week" — never a modal at the moment of lifting.

### Why not a hard cap

A cap that refuses the load produces one of two outcomes, both worse than
permissive logging:

1. **Dishonest logs.** The athlete lifts 120 and types 100. Every trend is now
   computed off fiction.
2. **Abandonment.** The athlete lifts what they want and closes the app.

Design rule: **honesty must never cost more than dishonesty.**

---

## D-08 · Session lifecycle

### Peek and commit are different actions

`GET /v1/enrollments/{id}/next-session` is **read-only**. No timer, no record.
This is the "what am I doing today" click.

`started_at` is stamped only on commit.

> The reference conflates these: clicking *start* to see the session also
> starts the timer, so the author manually backs out to avoid inflating it.
> `started_at` there measures *when I first got curious*. That is a bug, and
> the workaround should not be necessary.

### Committing

Materialises **every prescribed set** locally with `status: pending` and stamps
`started_at`.

### Logging

Local and offline (D-09). Sets are marked `done` as they are performed, or left
`pending`.

### Ending early

Ending before the last set asks exactly one question and stores the answer:

- ran out of time
- pain / injury
- equipment unavailable
- done enough

**The program advances regardless.** Repeating a session because life
interrupted it is precisely the guilt loop D-06 exists to avoid — and a
completeness threshold would force every program author to invent one.

Drift now has two axes: **weight** (D-07) and **work not done**.

### Stale sessions

A session open longer than 3 hours auto-closes and is flagged, rather than
silently recording a fourteen-hour workout.

---

## D-09 · Offline from day one

The phone is the logging device and gyms have concrete walls.

- Committing to a session caches the full prescribed session locally.
- **Logging never touches the network.** "Logged live" means live *locally*.
- If online, the client may sync opportunistically for crash safety. This is an
  optimisation, never a requirement.
- One `POST /v1/workouts` at the end, carrying the whole set list *including*
  `pending` sets and the `cut_reason`, keyed by a **client-generated UUIDv7**.
- Server: `INSERT ... ON CONFLICT (id) DO NOTHING`.
- A failed POST stays in a local queue and retries on next launch.

### Why idempotency is a correctness requirement

Submitting a session runs `advance()` and mutates program state. A retried POST
on a flaky connection would advance twice — a 5/3/1 training max jumping 5 kg
instead of 2.5, silently, permanently.

The idempotency key must be in the contract **from the first migration**.
Retrofitting it means changing every write endpoint across two clients.

> The reference stores the in-progress workout in the *server-side session*
> (`session()->put('pending_workout', ...)`). No signal, no workout.

---

## D-10 · The hour

Duration is wall clock: `started_at` → `ended_at`.

During the session the header shows **elapsed time and sets remaining**. Once
roughly three sessions are logged, it projects a finish time from the athlete's
**own median seconds-per-set** — not a guess, and not shown before there is
data to compute it from.

### No rest timer

Tried in the reference and **removed: it was a stress factor.** This is
evidence, not preference.

If a timer is wanted in v2's native app, the answer is an **intent call to the
OS stopwatch** rather than an in-app timer. That also avoids wake locks,
notification permissions, and background-tab behaviour in the PWA.

---

## D-11 · Clients

SvelteKit runs as a **backend-for-frontend**. Token in a cookie, set and read
server-side; the browser's JS never holds it. Load functions call Rust
server-side, so pages SSR with real data. The TypeScript client is generated
from the OpenAPI document, which the existing `openapi` binary emits from a
checkout alone.

CORS stays off — SvelteKit calls server-to-server, native clients are not
browsers.

### The API is the product

**All business logic and authorization live in Rust.** Program generation,
next-session selection, `advance()`, rounding, drift — all of it.

Anything implemented in a `+page.server.ts` is something the future native
client has to reimplement in another language. This stops being a preference
and becomes load-bearing the moment a second client exists.

### v1 is an installable PWA

Service worker, offline logging, homescreen install. One codebase, one
language, no app review.

### Native mobile is v2+

**Justified by Health integration specifically** — Apple Health / Google Fit,
unreachable from a PWA — not by OTA and not by performance.

On tooling: OTA is not a discriminator. Expo has EAS Update; Flutter has
Shorebird, which works and is store-compliant. Both are bound by Apple's
interpreted-code rule (patches may fix existing logic, not introduce
capability withheld from review). The real discriminator is **language**: Expo
reuses the TypeScript OpenAPI client, the domain types, and shared logic such
as e1RM formulas and unit conversion. Flutter means a second generated client
and duplicated rules. Decide when the Health requirement is concrete.

---

## D-12 · API versioning

1. **`/v1` in the path now.** One line in the router; retrofitting later means
   touching every client.
2. **Additive-only inside `/v1`.** Never remove a field, never change a type,
   never tighten validation. New behaviour is a new optional field or a new
   endpoint. This discipline is worth more than any versioning scheme and is
   the one usually skipped.
3. **Enforce it in CI.** Commit the generated `openapi.json` and fail the build
   on a breaking diff (`oasdiff`). Machine-checked, not memory-checked.
4. **When mobile ships, version the client, not the API.** The real failure is
   "this build is too old to trust", not "the API changed". The app sends its
   version; the server returns `426 Upgrade Required` below a floor it
   controls. Reserve `/v2` for a genuine redesign, and run both when cut.

---

## D-13 · Tracking

Three things, and no dashboard:

1. **e1RM trend per main lift** — *is this program working?*
2. **Drift from prescription** — *am I running the program or freelancing?*
3. **Session duration** — *am I inside my hour?*

(1) and (2) are shown together, deliberately. Progress is a motivational chart,
and for an athlete who already goes too heavy, motivation is accelerant.
**Progress is never shown without its cost.**

The reference writes a `lift_records` table that nothing reads back.

---

## D-14 · Teams, coaching, notifications — v2

Deferred entirely. The schema should not preclude them, but v1 ships with no
teams, no invitations, no SMTP, and **no notification system**.

Notifications, when they arrive, are for **team invites and interactions with
team members** — which is why they belong with teams rather than v1. The queue
model (D-06) has no due dates, so there is nothing else to notify about.

---

## D-15 · The engine lives in its own crate

Amendment, taken during the build. D-03 fixes the trait shape but not where it
lives. The training engine is `backend/crates/training` (`athletos-training`),
depending on `serde` and `thiserror` and nothing else — no `sqlx`, no `axum`,
`#![forbid(unsafe_code)]`.

Two reasons. The rules that are genuinely hard to get right — rounding down to
a loadable weight, a training max that moves exactly once per cycle — become
testable in milliseconds with no database, which matters a great deal on a
machine that does not have one. And purity is enforced by the dependency graph
rather than by discipline: a query cannot leak into program logic if the crate
cannot see `sqlx`.

This is the same reasoning the inherited `crates/domain` was built on. The
crate slot is deliberately *not* reused — a fresh name keeps the git history
legible, since the old crate was RFC 5545 recurrence and shares nothing with
this one but a philosophy.

---

## Open

- **No Postgres on the dev machine.** No `psql`, no Docker. Migrations and
  handlers can be written and compiled — `sqlx::query(..)` is runtime-checked
  and `sqlx::migrate!` only reads the directory — but nothing that touches a
  database has been executed. The two acceptance tests that matter most
  (double-POST idempotency, offline round-trip) are blocked on this.
- **Deployment.** Untouched. Two services (Axum + Node) plus Postgres.
- **Second-user readiness.** Password reset (D-02) is the first thing that
  must exist before anyone but the author signs up.
