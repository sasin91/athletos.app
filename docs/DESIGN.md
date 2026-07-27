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

**Known v1 gap: registration discloses whether an address is registered.** It
answers 409 on a taken address. The usual fix — accept the request and send
mail that differs — needs the outbound mail v1 deleted, so the disclosure is
deliberate rather than overlooked, and is asserted in a test so it stays that
way. It closes when mail arrives with teams (D-14).

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
/// Everything in the catalogue can describe itself. A third trait, because a
/// method declared on both authoring traits is ambiguous (E0034) on any
/// concrete prescriptive type — `SmolovJr.meta()` would not compile.
trait Catalogued: Debug + Send + Sync {
    fn meta(&self) -> &ProgramMeta;
}

/// What a fixed-percentage program author writes. Pure, and that is all.
trait Prescriptive: Catalogued {
    fn schemas(&self, maxes: &Maxes) -> Result<Vec<Session>>;
}

/// What every consumer sees. Object-safe, stateful.
trait Program: Catalogued {
    fn start(&self, maxes: &Maxes) -> Result<State>;
    fn session(&self, state: &State) -> Result<Session>;
    fn advance(&self, state: State, logged: &LoggedSession) -> Result<State>;
    /// `Some` for a block with a knowable end; `None` for open-ended.
    fn preview(&self, state: &State) -> Result<Option<Vec<Session>>>;
    /// Where we are. Without this a consumer wanting "session 7 of 12" has to
    /// read `State` — which only the program may interpret — and therefore has
    /// to know which program it holds. That is the branch this design exists
    /// to remove, so the method is load-bearing, not convenience.
    fn progress(&self, state: &State) -> Result<Progress>;
}

/// Every prescriptive program is trivially a Program.
/// advance() is index++, preview() is the whole plan.
impl<P: Prescriptive> Program for P { /* ... */ }
```

`SmolovJr` implements one method. `Wendler531Bbb` implements `Program`
directly, because its training max moves. The dashboard, session view and
progress bar only ever hold `&dyn Program` and **never branch**.

`State` is an opaque, program-owned blob (JSON in Postgres). The program is the
only thing that reads or writes it.

> **Amended after building it.** The blanket impl works, and coexists with a
> hand-written `impl Program for Wendler531Bbb` with no coherence error — the
> orphan rule proves non-overlap, since only the defining crate can add a
> `Prescriptive` impl. It also buys something the design did not ask for: give
> one type *both* traits and rustc reports E0119. "A program is prescriptive or
> adaptive, never both" is a compile-time invariant rather than a comment.
>
> Three costs, all real. `meta()` had to move to `Catalogued` (above).
> `progress()` had to be added, or the never-branch property is not actually
> achievable. And a prescriptive program's `State` must **snapshot the maxes at
> enrolment**, because `schemas()` needs them and `session()` is not given
> them. That last one turned out to be correct behaviour rather than a
> workaround: editing a max mid-block must not retroactively rewrite sessions
> the athlete was already shown, since drift is measured against the
> `prescribed_weight` that was actually displayed (D-07).
>
> ~~Still open: there is no way to *show* an athlete their training max.~~
> **Closed.** `readout()` is on `Program`, object-safe and branch-free as
> predicted, and it returns a named struct rather than the `(String, f64)` the
> sketch above proposed. The tuple was one field short: a consumer holding
> `("squat", 126.0)` next to an entered max of 140 can display both numbers and
> cannot explain either, which is the confusion the method exists to end. So a
> `Readout` carries the exercise key, the **weight**, and a **label naming what
> kind of number it is** — and the label is program knowledge with nowhere else
> to live, because only the program knows whether it took 90%, took the number
> straight, or has been moving it every cycle since.
>
> What each kind returns:
>
> - **`Wendler531Bbb`** — its four training maxes out of `State`, in Wendler's
>   day order, labelled *Training max*. These move, and watching them move is
>   the point.
> - **The blanket impl** — the maxes snapshotted into `State` at enrolment,
>   labelled *Entered 1RM*. Smolov Jr takes the entered number straight, so
>   those *are* what it prescribes from. Inventing a training max for a program
>   that does not have one would be the same lie as an invented progress
>   denominator. They do not move, and they are still worth showing: a max
>   edited mid-block deliberately does not rewrite a block in progress (D-07),
>   so this is the only place the athlete can see what their current sessions
>   were actually built from.
>
> The method was overdue in a way the test suite had already recorded. The
> engine's own assertion that the training max moves once per cycle could only
> be written by indexing into raw `State` JSON, under a comment explaining that
> a white-box assertion was the only way to reach a number the design gave no
> accessor for. The comment was right about the constraint and wrong about the
> conclusion: a test that has to take a program's private memory apart to check
> the product's central rule is a report that the consuming trait is missing a
> method. It now reads that number the way the athlete's screen does.

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

### The maxes are the athlete's; the training max is the program's

Two sets of numbers, and the asymmetry between them is the whole decision.

**The entered maxes are a set the athlete owns.** Any lift in the exercise
registry may be added, any may be removed, values may be edited at any time.
`PUT /v1/athlete/maxes` replaces the whole document, which already expresses all
three operations; what was missing was `GET /v1/exercises`, so that a client
could offer the lifts to choose from. Until it existed the maxes form was built
from the union of the programs' `required_maxes`, and an athlete could hold a
number only for a lift some compiled program happened to want — a program-shaped
answer to an athlete-shaped question, and the same mistake a
`{ squat, bench, deadlift }` struct would have been. A program may refuse to
*start* without a max, and does; it has no vote on what else is in there.

**Each active program's derived numbers are visible and read-only**, through
`readout()` (D-03), served as `readout` on `GET /v1/enrollments`.

The asymmetry is not squeamishness about writes. A training max is the
program's governor over an athlete whose failure mode is over-reaching (D-01),
and an athlete who can nudge it upward after a session that felt easy has
removed the only restraint the program has — that is the "no edit my training
max field" rule above, and it stands.

But *hiding* it was never what that rule asked for, and hiding it was doing
real damage. Enter a 160 kg squat; 5/3/1 opens its training max at 144 and adds
5 kg a cycle. Four cycles later the program prescribes off 164 while the maxes
screen still says 160, and nothing on any screen explains the gap. The athlete's
two available conclusions are both wrong: that the app is broken, or that their
1RM field is what needs correcting. Meanwhile the number that *is* climbing is
the cleanest answer the product has to D-13's "is this program working?" — and
it was the one number they could not see.

So: **watch it, do not touch it.** The readout is labelled with what kind of
number it is precisely so the two can sit on one screen without either being
mistaken for the other, and there is no endpoint to write one. Not a guarded
one, not a confirmed one — none. The numbers move through `advance()` or they do
not move.

### Rounding

**Every prescribed weight rounds *down* to the nearest loadable weight.**

A systematic bias toward the lighter loadable weight is the cheapest governor
in the system (D-01) and costs one function.

> **Amended in phase 4.** "Maxes are not a fixed three lifts" needed somewhere
> for a client to *find out* which lifts a program wants, and there was nowhere:
> a new athlete's maxes are `{}`, the catalogue said nothing, and the only
> signal was the 422 `start()` raises — one lift at a time, after enrolment is
> attempted. `ProgramMeta` now carries `required_maxes`, mirrored onto
> `ProgramSummary` with labels resolved from the exercise registry. Declared
> rather than derived, because nothing can ask a Rust function what it will ask
> for; a test asserts the declaration is exactly what `start()` needs, in both
> directions.

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

**The session screen shows the plate breakdown**, greedy largest-first:
`112.5 kg — bar + 25, 20, 1.25 per side`. The athlete is holding the phone in
front of the rack.

> Corrected after building it. This example originally read `25, 15, 5, 1.25`.
> That sums to the same 46.25 kg per side and is arithmetically fine, but it is
> not what largest-first produces — the specified algorithm gets there in three
> plates, not four. A worked example that the implementation contradicts is
> worse than no example.

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

### Idempotency versus a finished block

Found while building this; neither D-08 nor D-09 anticipated it.

The retry of the submit that **finished a fixed block** arrives when the
enrolment is already `finished`. Two rules that both sound obvious now
contradict each other:

- *Refuse writes to a closed enrolment.* Then the retry fails, and the client
  believes a session it completed was lost.
- *A retry always succeeds.* Then a closed enrolment accepts writes.

**Ordering resolves it: attempt the insert first, check status second.** The
`on conflict (id) do nothing returning id` tells you whether this call created
the row. If it did not, the work already landed and the correct answer is
success with the already-advanced progress — regardless of enrolment status. A
status check placed *before* the insert cannot distinguish the two cases.

The write is one transaction: `select ... for update` on the enrolment (the
lock matters because `advance()` is a read-modify-write of `state`, so two
different workouts arriving together would otherwise lose one advance), then
the conditional insert, then sets + `advance()` + state write only in the
branch that actually inserted.

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

### Where the hour went

> **Added after the app was live.** Duration answers "did this fit in an hour".
> It does not answer "what made it not fit", and that is the question worth
> acting on.

Each set carries a **`logged_at`**, stamped on the phone when the athlete taps
Log or Skip. The gaps between consecutive stamps aggregate into a per-exercise
breakdown on the session's history page.

**One tap per set, and therefore one blended number.** The gap between two taps
contains the pause after the previous set, the loading, and the performance of
this one. Separating them needs a second tap at the start of each set — which
is a rest timer with a different name, and the section directly above this one
says why there is not going to be one. So the vocabulary is **interval**, never
*rest*, and the screen says so in plain words before showing any figure. The
number is honest at the granularity it is reported: "Back Squat cost 24
minutes" is true, and it is the question actually being asked.

**The lead-in is not a lift.** The first interval runs from the commit, so it
is walking in, changing and warming up. Folded into whatever was performed
first it would make the main lift look enormous, so it is reported separately,
as is the **tail** after the last set. Both are dimmed and bracket the
exercises rather than sorting among them by size: an athlete cannot train away
"getting started", and ranking it above their squat would read as an accusation
about the wrong thing.

**The phone's clock is not trusted.** It can be corrected by NTP or changed by
hand mid-session, and a genuine three-minute gap is indistinguishable from one
straddling a three-minute correction. Intervals that are negative or over
twenty minutes are **discarded rather than clamped**, and the count of what was
dropped is returned and shown. Clamping would fold a bad measurement in at an
invented value with no way to see it had happened; dropping it makes the totals
smaller than the wall clock, which the athlete *will* notice — so the screen
says why. Same instinct as taking a median rather than a mean above.

`logged_at` is nullable and stays nullable. Every session recorded before the
column existed has no timing and never will; a `not null default now()` would
have stamped the migration's own clock onto sessions logged weeks earlier. The
response omits `timing` entirely rather than sending an empty one, so a client
cannot render a breakdown of nothing.

> **This makes the pace projection above look crude, and deliberately has not
> changed it.** Pace is still whole-session duration over sets performed,
> medianed across five sessions. Per-set intervals could give it a real
> distribution and per-exercise medians — a day of heavy triples and a day of
> accessory volume stop being averaged into one number that describes neither.
> That is a change to a settled rule and belongs in its own decision, once
> there is enough stamped history to check it against.

---

## D-11 · Clients

SvelteKit runs as a **backend-for-frontend**. Token in a cookie, set and read
server-side; the browser's JS never holds it. Load functions call Rust
server-side, so pages SSR with real data. The TypeScript client is generated
from the OpenAPI document, which the existing `openapi` binary emits from a
checkout alone.

CORS stays off — SvelteKit calls server-to-server, native clients are not
browsers.

> **Amended after building it. "Token in a cookie" is two cookies.**
>
> The refresh token is single-use and rotating, and presenting a spent one
> revokes its whole family — right for a native client holding exactly one
> token, and wrong for a BFF, which serves several overlapping requests per
> navigation. Exchanging the cookie on every request logs the athlete out the
> moment a load and a form action run together.
>
> So the access token is cached in a second httpOnly cookie for its own
> lifetime, and a refresh happens roughly once every fifteen minutes instead of
> once per request. The browser's JavaScript still holds nothing: `httpOnly` is
> what that sentence always meant. The residual race — two requests arriving
> with no cached access token — is closed by collapsing concurrent exchanges of
> the same refresh token into one, which is a per-process map and therefore
> exact for one instance and best-effort behind a load balancer. Good enough for
> a product whose unit is one athlete; the real fix is a shared lock or a
> non-rotating refresh token, and it is a deployment decision.
>
> Two smaller things the build settled. **The API being unreachable is not the
> session being over**: only a 401 from `/v1/auth/refresh` clears the cookies,
> or a deploy logs everybody out and throws away refresh tokens that still work.
> And **the offline logger is a prerendered page with `ssr = false`** — it reads
> the committed session out of IndexedDB, which the server has never heard of,
> and prerendering is what puts it in the service worker's cache list. That
> forbids a server load on the root layout, so the authenticated routes live in
> a route group that owns the gate.

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
depending on `serde`, `serde_json` and `thiserror` and nothing else — no
`sqlx`, no `axum`, `#![forbid(unsafe_code)]`.

> `serde_json` was missing from the first draft of this decision, which
> contradicted D-03's requirement that `State` be an opaque JSON blob. D-03
> wins; the dependency is deliberate and its scope is exactly `State`.

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

## D-16 · One box, and why not high availability

A single Hetzner CX22 in `hel1` runs everything: Caddy, the API, the SvelteKit
BFF, and Postgres. No load balancer, no second machine, no failover.

High availability was the opening requirement and it was the wrong target. The
failure actually being defended against was a pipeline that rsynced over a
running application — an **atomicity** failure, which would have hurt exactly
as much across three nodes. The effort belongs in making releases immutable and
switchover safe (D-17), not in redundancy.

Two things make skipping HA unusually cheap here:

- **The app is offline-first (D-09).** The session is cached before training
  starts and the submit is queued. A dead box during a workout costs the
  athlete nothing — the one moment the product is in use is the one moment it
  does not need the server.
- **The expensive half of HA is Postgres, not the app tier.** Two app nodes
  behind a balancer is an afternoon. Automatic database failover is Patroni or
  repmgr, and a failover path is itself a thing that breaks.

### Both services on the same box

The BFF calls the API over loopback. Hosting the frontend on Cloudflare would
add ~50–80 ms per page load from an edge in Copenhagen; Netlify's free tier
pins functions to `us-east-1`, crossing the Atlantic twice to reach a database
in Helsinki.

Latency was not the deciding argument. **Co-location means one release**, so
the generated TypeScript client and the API serving it cannot drift apart.
And it costs nothing where it matters: `/session`, the screen open in the gym,
is `ssr = false, prerender = true` and served by the service worker. It never
touches the server at all.

### Sized by measurement

Taken from release builds under load rather than estimated:

| | RSS |
|---|---|
| Rust API | 29.8 MB — flat across 200 full session generations |
| Node SSR | ~40–60 MB |
| Caddy | ~20 MB |
| Postgres | ~200–300 MB |
| FreeBSD base + jails | ~150 MB |
| **Total** | **~1.1 GB against 4 GB** |

**`vfs.zfs.arc_max=512M` in `/boot/loader.conf` from the first boot.** ZFS ARC
defaults to half of RAM, which on this box would claim 2 GB and present as a
mysterious Postgres problem under memory pressure.

The box compiles nothing — CI produces every artifact — which is what makes
4 GB generous rather than tight. A Rust release build wants 2–4 GB on its own
and never happens there.

---

## D-17 · FreeBSD, two warm jails, rolling updates

> **This decision replaced a Debian/systemd/musl design**, which is worth
> recording because the reasoning above survived the change and only the
> mechanism moved. The pivot came from one fact: FreeBSD is a system the author
> already enjoys maintaining. That deleted the objection the Linux design
> rested on — that a third unfamiliar technology alongside Rust and SvelteKit
> deployment is how a canary fails to ship — and once it was gone, FreeBSD won
> on merit.

### The glibc problem stops existing

The Linux design's most fragile element was a fully static
`x86_64-unknown-linux-musl` binary, needed because a binary built on GitHub's
glibc 2.39 will not start against Debian's 2.36, and `ring` compiles C so the
musl link was the one load-bearing unproven step in the whole plan.

Build on FreeBSD, run on FreeBSD, and none of that exists. No musl, no static
linking trick, no cross-compilation, no sysroot, no glibc.

The cost is that **Rust is Tier 2 on FreeBSD** — the project ships official
binaries and verifies that it *builds* on every change, but does not run the
test suite against it. That is the same tier Intel macOS was demoted to in
2025, so it is unremarkable rather than exotic; the mitigation is that our own
suite runs on FreeBSD at release time, which matters more here than it would
on a Tier 1 platform.

### Two static jails, and only ever two

```
zroot/jails/base           read-only, nullfs-mounted into both
zroot/jails/blue           small writable layer   10.0.0.2
zroot/jails/green          small writable layer   10.0.0.3
zroot/data/pgdata          persistent, never cloned
```

Two hand-written `jail.conf.d` snippets, written once and never generated.

The insight that makes this small: **a rolling update needs exactly two slots,
not one per release.** With `blue` and `green` alternating and their *contents*
replaced, there is no dynamic jail creation, no IP allocation scheme, no
lifecycle tracking and no orphan cleanup — which is most of what jail
management tooling exists to provide. Bastille, pot and iocage were all
considered and declined on that basis: they earn their keep across a dozen
varied jails, and there are two identical ones here. The deploy script is
about forty lines of shell with nothing between it and `jail(8)`.

Postgres deliberately sits outside the release cycle, on a persistent dataset,
listening on a **unix socket only** so it is unreachable from the network
regardless of firewall state.

### Caddy, with both jails as upstreams

One daemon on the host, one hop, automatic TLS.

The deciding fact was that the CA/Browser Forum is cutting maximum certificate
lifetime from 398 days to **47**. Any design where renewal is a separate moving
part — certbot plus a reload hook, or `acme.sh` concatenating a PEM for
haproxy — now gets roughly eight chances a year to fail silently instead of
one. Certificate expiry is the highest-probability outage in a self-hosted
edge, and Caddy is the only option where it cannot rot.

`nginx → haproxy`, the author's proven stack, was declined for this box.
haproxy's runtime API is genuinely the better switchover mechanism — flip a
server through the socket with no reload at all — and its continuous health
checking is excellent. But it optimises hardest for the risk already handled by
rolling updates while leaving the biggest risk manual, and the extra hop adds
a layer where timeout mismatches manufacture 504s and every 503 needs a
"which layer?" question first. Caddy also does active health checks across
multiple upstreams, so that capability was never the trade.

### Rolling, not blue-green-then-destroy

Both jails run at all times, both are health-checked upstreams. A deploy
updates one at a time:

1. Stop `green`, replace its contents, start it, wait for its health check.
   **`blue` serves throughout.**
2. Do the same to `blue`. **`green` serves throughout.**

At no instant are zero backends healthy. Failure at any step aborts with the
other jail still serving, and rollback means restoring the retained previous
release into one jail rather than a race to fix the live one.

Crash failover falls out of the same structure for free: if a process dies at
3am, Caddy marks that jail down and the other one serves until somebody looks.

### Migrations must be backward-compatible with the previous release

`migrate()` runs at API startup, so a rollback does not revert the schema. The
rolling update sharpens this from prudent to load-bearing: for a few seconds
**two releases are live against one database by design**.

> Add columns; never drop them in the same deploy that stops using them. Drop
> them one release later, once the previous version is no longer a rollback
> target.

There is no tooling fix. It costs a two-step dance a few times a year and it is
what makes rollback honest rather than merely comforting.

### Build and delivery

GitHub Actions throughout, and no second billing relationship. Linux-native
jobs on every pull request for fast feedback; a `vmactions/freebsd-vm` job on
release tags that runs the full suite **on FreeBSD** and then builds the
artifact, which is what closes the Tier 2 gap.

Cirrus CI would have been the natural home for native FreeBSD builds and was
the original plan; it announced shutdown in April 2026 and stops running jobs
on 1 June. The whole FreeBSD ecosystem is migrating to `vmactions`.

Artifacts attach to a GitHub Release, so any past version is redeployable
without rebuilding it.

> **Amended after measuring it, then amended again after measuring the fix.**
> The FreeBSD job took 13m06s. The theory was that Rust compiled the whole
> dependency graph twice — opt-level 0 for clippy and the tests, opt-level 3
> for the binary — so v0.1.6 put the tests on `--release` to share one profile.
>
> **That theory was wrong and the numbers say so.** Release compilation costs
> roughly twice as much per crate: the suite went from 2m56s to 5m53s, and
> `cargo build --release` still took 2m03s instead of becoming the link it was
> supposed to become. Eliminating the debug pass bought less than the release
> pass cost. Net gain, once clippy was gone, was about **twenty seconds** — in
> exchange for losing `debug_assertions` and integer overflow checks on the one
> platform that serves traffic, in a codebase that does arithmetic on weights.
> The tests are back on debug. The lesson is the ordinary one: the expensive
> thing was not the one that looked expensive.
>
> **`cargo fmt` and `cargo clippy` left this job entirely**, and that was the
> change that actually paid. They are
> platform-independent, ci.yml already runs them on Linux, and the backend has
> no `cfg(target_os)` anywhere — so clippy here was analysing byte-identical
> code to clippy there. Keeping them meant a seven-minute VM run could be
> thrown away over a style rule, which is not hypothetical: v0.1.4 spent 11
> minutes in this job and failed on a Prettier complaint. They were also a
> slow-acting liability, because the guest gets rust from `pkg` and ci.yml
> gets it from rustup; the moment those versions drift, the newer clippy's
> fresh lints start failing releases. **This job now does only what needs this
> platform: run the suite, produce the binary.**
>
> Two smaller cuts in the same pass. The web tree builds on Linux in parallel:
> its production closure is `openapi-fetch` and `openapi-typescript-helpers`,
> both pure JavaScript, so nothing platform-specific reaches the tarball — the
> per-platform native binaries in that tree (`@tailwindcss/oxide`,
> `lightningcss`, rolldown, rollup) are all build-time and do not survive
> `--omit=dev`. And `target/` is deleted before `copyback`, because rsyncing
> gigabytes of intermediate object files out of a QEMU guest to be thrown away
> cost 1m16s of every release.

### Provisioning

Terraform with **HCP's free remote backend** — versioned, locked state rather
than a file on a laptop, which is the scar that shaped the choice. Terraform is
deliberately thin: Hetzner has no FreeBSD image, so it declares a server and a
firewall while the OS arrives via a mounted ISO and one `bsdinstall` run. That
manual step is acceptable precisely because it is not where the rebuild value
lives — packages, datasets, the base jail, users, PF rules and Caddy config all
live in an idempotent `bootstrap.sh`.

`bectl` boot environments give atomic OS-level rollback, which is the property
that made NixOS attractive earlier in this design without any of its packaging
cost.

---

## D-18 · Backups, and the two ways they lie

The training history is the only thing here that cannot be regenerated.
Binaries, configuration and the box itself can be rebuilt within the hour.

Two layers, protecting against different things:

**`sanoid` ZFS snapshots, locally.** Copy-on-write, so frequent snapshots are
nearly free, with instant `zfs rollback`. One caveat decides the layout: a
snapshot of a running Postgres is **crash-consistent, not logically
consistent** — equivalent to pulling the power cord. Postgres recovers by
replaying WAL, which is safe *only if the entire data directory including
`pg_wal` sits on one dataset snapshotted atomically*. Split across datasets,
a restore can be silently corrupt.

**Hourly `pg_dump`, compressed and encrypted, offsite to a Hetzner Storage
Box.** 24 hourly, 30 daily, 12 monthly. Hourly because a year of one athlete's
training is a few megabytes, so frequency is nearly free and the worst case
moves from "lose a session" to "lose nothing".

`syncoid` was considered and left optional. Its value is replicating large
datasets incrementally, and it needs a target that speaks `zfs receive` —
rsync.net offers that but with a 10 TB minimum, and a Hetzner Storage Box
speaks only SFTP and rsync. For megabytes, `pg_dump | age | scp` is simpler and
portable.

Two failure modes are worth naming, because both look exactly like working
backups:

- **A dump on the same box is not a backup.** It shares a failure domain with
  what it protects, which is why the destination is offsite and the local copy
  is staging rather than the artifact.
- **An untested backup is not a backup.** A `pg_dump` writing a zero-byte file
  for eight months is indistinguishable from a healthy one until the day it
  matters. The restore procedure is therefore a script, run once before it is
  needed.

Note what the dump gives that a snapshot cannot: it is portable across Postgres
versions, it is readable, and **completing at all is evidence the database is
healthy**. A snapshot succeeds whether or not the data inside it is fine.

---

## Open

- ~~**No Postgres on the dev machine.**~~ **Closed.** Postgres 17.10 runs as a
  container under WSLC (see `DEVELOPMENT.md`). The whole suite — 111 tests —
  now runs locally and passes, including both acceptance tests: posting the
  same workout twice advances the program exactly once, and the training max
  moves once per cycle even when every submit is retried.

  Worth recording what the first real run cost, because the estimate was
  pessimistic: **one bug in 111 tests.** `?status=activ` answered 500 instead
  of 422, because a single parser served both "read this vocabulary out of the
  `text` column" — where an unknown value means our check constraint and our
  enum have drifted, and 500 is honest — and "read it off the query string",
  where an unknown value is the client's typo. Split in two. Everything else,
  including every reconstructed auth table, every check constraint, the
  `unnest` bulk insert, the `::float8` casts and the quoted `"position"`
  column, passed first time.

  The suite has since grown to **131 backend and 48 frontend tests**, still
  green.

  The **offline round-trip** is still unverified: it needs a browser, a phone
  in airplane mode, and a human. No database fixes that.

- **Nothing FreeBSD-specific has ever run.** The design in D-16 to D-18 was
  written and reviewed on a Windows machine with a Linux container for
  Postgres. `jail.conf` syntax, thin jails over nullfs, the `rc.d` scripts, PF
  redirects, `bectl`, `sanoid`, and Caddy's active health checks against a
  restarting jail are all reasoned rather than executed. The first `bsdinstall`
  is where that changes, and the ZFS layout is the part no amount of local
  rehearsal can cover.

- **CI has still never run.** There is no git remote, so the `postgres:17`
  service job, the `oasdiff` gate and the `vmactions` FreeBSD build are all
  theoretical. Creating the repository is the cheapest unblocking act available.

- **Second-user readiness.** Password reset (D-02) is the first thing that
  must exist before anyone but the author signs up.

- **`enrolment` vs `enrollment`.** `CONTEXT.md` settles the spelling as
  `enrollment`, matching the 148 identifiers and the published `/v1/enrollments`
  path. About 70 prose comments still disagree. Cosmetic, and cheap to fix in
  one pass.
