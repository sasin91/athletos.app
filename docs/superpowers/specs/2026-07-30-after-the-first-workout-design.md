# After the first workout

Design, 2026-07-30. Five changes asked for after the first session was logged
on the real app, in the gym, on a phone. The UI held up; these are the things
that were missing once it did.

Nothing here touches `advance()`, the program engine, or a prescribed weight.
One migration, one new pure function in the training crate, and four screens.

Three decisions in `docs/DESIGN.md` are amended by this work. They are listed
in [Amendments to DESIGN.md](#amendments-to-designmd) and must be written as
part of the change, not afterwards — a decision there is binding until it is
amended there.

---

## 1 · Solarized light, and a switch

### What exists

`frontend/src/routes/layout.css` declares one DaisyUI theme, `athletos`:
`default: true`, `prefersdark: true`, `color-scheme: dark`. The palette is
taken from the room — matte rubber surfaces, chalk for the one brand colour —
and saturation is deliberately reserved for the IWF plate tokens, which is what
makes the plate stack read instantly.

### What changes

A second theme block, `solarized`, `color-scheme: light`, mapped onto
Solarized's ramp:

| Token | Value | Solarized name |
|---|---|---|
| `--color-base-100` | `#fdf6e3` | base3 |
| `--color-base-200` | `#eee8d5` | base2 |
| `--color-base-300` | `#d9d2bf` | a darker beige, not base1 |
| `--color-base-content` | `#586e75` | base01 |
| `--color-primary` | `#586e75` | base01 |
| `--color-primary-content` | `#fdf6e3` | base3 |
| `--color-accent` | `#657b83` | base00 |
| `--color-info` | `#268bd2` | blue |
| `--color-success` | `#859900` | green |
| `--color-warning` | `#cb4b16` | orange |
| `--color-error` | `#dc322f` | red |

Radii, sizes, `--border`, `--depth` and `--noise` are copied unchanged. The
theme is a change of surface, not of chassis. `base-300` is a darker beige
rather than Solarized's base1 (`#93a1a1`), which is a cool grey and reads as a
different family against base3 when used for a border.

Drift keeps its meaning across both: over is orange and never red, because
going heavier is a choice and not an error (D-07). Solarized's orange is
`#cb4b16` against the dark theme's rust `#e2703a` — the same intent, at the
contrast the lighter surface needs.

### The plates must be re-tokenised for the light surface

This is a requirement, not polish. `--color-plate-5` is `#e8eaed` and
`--color-plate-1-25` is `#9aa5ab`; on `#fdf6e3` the first is invisible and the
second is close to it. The plate stack is the one place the product spends
colour and the one thing an athlete reads at a glance while loading a bar.

Inside the light theme only, the two pale tokens are darkened enough to hold
against base3 while staying recognisably white-plate and chrome, and
`Plates.svelte`'s `border border-black/30` becomes a token
(`--color-plate-edge`) so the outline can darken with them. The five saturated
plate colours are unchanged — they are already IWF colours chosen to be read
across a gym floor.

`Plates.svelte` itself does not change beyond the border token. It draws what
it is given (D-11).

### Persistence, and why not a cookie

`localStorage`, read by a small blocking script in `app.html` that stamps
`data-theme` on `<html>` before first paint.

A cookie read in `hooks.server.ts` via `transformPageChunk` is the usual
SvelteKit answer and is wrong here: `/session` is `prerender = true`, so that
transform runs at **build** time and would bake the default theme into the one
screen that is actually used in a gym. One mechanism that works identically on
prerendered and server-rendered pages is worth more than avoiding four lines of
inline script.

Two states, `athletos` and `solarized`. No system/auto third state — the
initial value is seeded from `prefers-color-scheme` on first run and is an
explicit choice from then on.

### Where the switch lives

A shared `ThemeToggle.svelte`, placed twice:

- the `(app)` header, beside Sign out;
- the logger's header on `/session`, icon-only.

The logger is a standalone route with no nav, and daylight at a rack is exactly
when the switch is wanted. It is not a mid-set action, so the top of the screen
is acceptable for it — unlike Log, which stays where a thumb is.

---

## 2 · Per-set stamps, visible while training

### What exists

D-10 shipped this data. `workout_sets.logged_at` is stamped on the phone when
the athlete taps Log or Skip; `backend/crates/api/src/timing.rs` aggregates the
gaps into a per-exercise breakdown; `TimeSpent.svelte` draws it on
`/history/[id]`. The vocabulary is **interval**, never *rest* — there is no rest
timer, and CONTEXT.md lists the word among those the product deliberately does
not have.

### What changes

The logger shows, on each **logged or skipped** set only:

```
Logged 102.5 kg × 5          14:32 · +3:10
```

The clock time of the tap, and the interval that ended at it — the gap from the
previous stamp, or from the commit for the first one.

**Nothing appears on the pending set and no number counts up.** That line is
what separates this from a rest timer: every figure on the screen describes work
already done and stops changing the moment it appears. A live counter on the set
being rested for is the feature that was tried in the predecessor and removed
for adding stress (D-10), and it is not being reintroduced under a different
name.

### The one duplicated constant

`timing.rs` discards intervals that are negative or exceed
`INTERVAL_CEILING: i64 = 20 * 60`, because a phone's clock can be corrected by
NTP mid-session and a genuine three-minute gap is indistinguishable from one
straddling a three-minute correction.

The logger must apply the same rule, or a session with one bad stamp shows a
figure in-session that the history page then declines to count. So
`$lib/time.ts` gains:

```ts
/**
 * Intervals longer than this are not believed (D-10).
 *
 * The authority is `backend/crates/api/src/timing.rs`, which discards rather
 * than clamps for the reasons given there. This is the same number, duplicated
 * knowingly so the logger can draw an interval with no network, and tested so
 * it cannot drift silently.
 */
export const INTERVAL_CEILING_SECONDS = 20 * 60;

export function intervalBetween(earlier: string, later: string): number | null;
```

`intervalBetween` returns `null` for a negative gap or one over the ceiling, and
the logger renders nothing rather than a figure it would not stand behind. Unit
tested alongside the existing `time.test.ts`.

This is a knowing compromise and is recorded as one. The alternative — serving
the ceiling from the API — makes an offline screen depend on a value it cannot
fetch, which is worse.

---

## 3 · The bar is a stack

### The problem

Reported from the gym: going from 85 kg to 100 kg, the canonical breakdowns are
`25, 5, 2.5` and `25, 15` per side, so the screen implies stripping two plates
to add one. The temptation is to put a convenient pair on instead and lift more
than was prescribed — which is precisely the drift the product exists to
govern (D-01, D-07).

The fix is not to change the weight. It is that **there is more than one way to
build 40 kg per side**, and the screen currently always shows the greedy one.
`25, 5, 2.5` plus three 2.5s is also 40, and it takes nothing off.

### The physical constraint the naive version misses

Plates load largest-first from the middle outward, so the stack is a **stack**:
you can only pop from the outside and push something no larger than what is now
outermost. A 15 cannot be inserted under a 5.

Therefore the plates that may be retained are exactly a **prefix** of the
current arrangement, and everything added must be `<=` the smallest plate kept.
A planner that ignores this produces instructions that cannot be followed.

### The function

In `backend/crates/training/src/loading.rs`, beside `round_down` and
`break_down`:

```rust
/// What comes off the bar and what goes on, per side, to get from the current
/// arrangement to the next weight.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PlateChange {
    /// Outermost first — the order they actually come off.
    pub remove: Vec<f64>,
    /// Largest first — the order they go on.
    pub add: Vec<f64>,
    /// The arrangement this leaves on the bar, largest first. Sums to the
    /// target, and is not necessarily the greedy breakdown.
    pub plates_per_side: Vec<f64>,
}

/// `previous` is the arrangement currently on one side, largest first.
/// An empty slice is an empty bar.
pub fn plan(previous: &[f64], target_per_side: f64) -> PlateChange;
```

`PlateChange` lives in the training crate and therefore derives `serde` only —
that crate depends on `serde`, `serde_json` and `thiserror` and nothing else
(D-15), so it cannot carry a `utoipa::ToSchema`. The API mirrors it into its own
DTO in `routes/enrollments.rs`, the way it already mirrors the engine's other
shapes.

Algorithm, one candidate per retained prefix and therefore exhaustive and
exact:

1. For each `k` in `0..=previous.len()`, let `kept = &previous[..k]`.
2. Skip if `sum(kept) > target_per_side + TOLERANCE`.
3. `ceiling = kept.last()` — or no ceiling when `k == 0`.
4. Fill `target_per_side - sum(kept)` greedily from `PLATES` filtered to
   `<= ceiling`. Skip the candidate if a remainder is left (it cannot be, since
   every plate is a multiple of 1.25 and 1.25 is available, but the guard stays
   rather than a `debug_assert` — the plate table is a constant someone will
   edit one day).
5. Cost is `(previous.len() - k) + add.len()`.
6. Choose **minimum cost, tie-broken on fewest removed**.

The tie-break is the whole point and is pointed the way the athlete asked for.
For 85 → 100 the three cheapest candidates all cost three plates handled;
fewest-removed picks the one that takes nothing off, and the screen says *add
2.5, 2.5, 2.5 per side*.

Minimising cost first, rather than removals first, is what stops the planner
from answering a 40 kg-per-side target with six small plates when a one-plate
swap exists. Both rules agree on the case that prompted this; the pair of them
also behaves on the cases that did not.

`remove` is `previous[k..]` **reversed**, because that is the order a human
takes them off.

The big drop is reported honestly. 147.5 → 87.5 (the 5/3/1 top single into
Boring But Big) plans as *take off 1.25, 2.5, 15, 20 · add 5, 2.5, 1.25*. That
drop genuinely is work, and a planner that pretended otherwise would be lying
about the bar.

### Tests

In `loading.rs`'s test module, sweeping loadable pairs rather than named cases
alone:

1. Applying `remove` then `add` to `previous` yields `plates_per_side`.
2. `plates_per_side` is non-increasing, uses only `PLATES`, and sums to
   `target_per_side`.
3. Cost never exceeds a full restack: `previous.len() + break_down(target).len()`.
4. An unchanged target from the same arrangement plans as a no-op.
5. From an empty bar, `plates_per_side == break_down(target)`.
6. The two named cases above, exactly.

### Carrying it to the screen

`PrescribedSet` (`crates/api/src/routes/enrollments.rs`) gains one field:

```rust
/// The plate change from the previous set of the same exercise (D-04).
///
/// `None` for anything not loaded with plates. Chained within an exercise and
/// reset to an empty bar when the exercise changes.
pub plate_change: Option<PlateChange>,
```

Additive under D-12: a new optional field, no existing field removed or
retyped. `plates_per_side` stays exactly as it is, canonical and greedy, so
`LiftView` and any client already reading it are untouched.

**Chained within an exercise; reset at each exercise change.** Across exercises
the previous stack is not on the bar you are walking to — possibly not even the
same bar. Within an exercise it is, which is where the 5/3/1 drop lives and
where the complaint came from.

The logger and the peek set list draw `plate_change.plates_per_side` when it is
present, so the diagram and the instructions above it agree. Non-barbell
loading has no plates and shows nothing, as now.

When the athlete has **edited** the weight, the change no longer describes the
bar they are building. The block dims and is labelled *for the prescribed
100 kg*. The client does not recompute — it has no plate arithmetic and is not
getting any (D-11).

---

## 4 · An optional note on a set

### Schema

New migration, `20260730120000_set_notes.sql`:

```sql
alter table workout_sets
    add column note text
        check (note is null or length(trim(note)) between 1 and 500);
```

Additive and backward-compatible with the previous release, which is
load-bearing: a rolling update runs two releases against one database by
design (D-17). Nullable, no default. Bounded in the schema as well as in the
handler, because the constraint is the thing that is still true after the next
client is written.

### API

`SetSubmission` gains `note: Option<String>`, absent from every required list.
The `unnest` bulk insert takes one more array. Blank and whitespace-only
strings are normalised to `None` before binding rather than rejected — a note
the athlete cleared is not an error.

Over 500 characters is a 422 naming the position, consistent with the existing
validation errors. This is not tightening validation on an existing field
(D-12) — the field is new.

The history detail response carries `note` per set.

### Client

`LocalSet` gains `note: string | null`, defaulted `null` at commit. A pure
`noteSet(session, position, note)` beside `editSet`, unit tested with the
others. `toSubmission` sends it. A note **survives** `resetSet` — undoing a log
takes back the numbers, not the sentence the athlete wrote about their
shoulder.

In the logger, under the current set: a quiet **Add note** text button that
reveals a textarea, and once a note exists it renders as text with the button
reading **Edit note**. Invisible until wanted, because logging a set as
prescribed must stay one tap — honesty must never cost more than dishonesty
(D-07).

On `/history/[id]`, a note renders under its set row, dimmed.

### Out of scope

`workouts.notes` exists in the schema and `Ending.notes` exists in
`session.ts`, and nothing writes to either. Left alone. Putting a text box in
the finish flow adds friction at the moment the athlete most wants to be done,
and it is a separate question from a note about one set.

---

## 5 · The finish screen

### What exists

`/session` phase `sent` renders three lines and a button. `/history/[id]`
renders drift rows and the full `TimeSpent` breakdown, server-side.

### What changes

The summary is **local and always shown**, built only from what the phone
already owns after `toSubmission`:

- wall-clock duration, `startedAt` → `endedAt`;
- sets done / skipped / left pending, out of the total;
- outcome, and the cut reason when there is one.

All of it is counting the local session — `setsDone` and `setsRemaining`
already exist and are already tested.

**No drift total, and no timing breakdown.** Both are tempting here and both
belong on the history page. `history/[id]/+page.svelte` already marks drift per
row and deliberately does not total it, on the grounds that a total computed in
a client is one the next client has to compute again (D-07, D-11) — and D-13
puts drift beside the e1RM trend on purpose, because progress is never shown
without its cost. A drift number invented on the finish screen would be the
first place in the product where it appears alone. The timing aggregation has
the same answer for the same reason: it is `timing.rs`'s, and it is one tap
away.

Then a readiness indicator for the permanent record, which is the piece that
makes handing off safe:

| Submit | Indicator | Link |
|---|---|---|
| accepted or duplicate | **Recorded** | `See where the hour went →` to `/history/{id}` |
| queued | **Saved on this device, not sent yet** — will send when there is a connection, and sending twice is harmless | present but disabled, with that reason as its label |
| rejected | the existing message, unchanged | absent |

`Back to training` is a full-width button under the stats.

**No auto-redirect.** A screen that leaves while it is being read is a screen
that was not shown. The athlete is standing in a gym having just finished
lifting; the dashboard is one tap away and will still be there.

The three phases already exist as `sent`, `queued` and `refused`, and
`finishSession` already distinguishes them by asking about *this* id. What is
missing is that the submission is discarded before it can be summarised — so
`finishSession` keeps the built `body` in state for the summary to read, rather
than only setting a phase.

---

## Amendments to DESIGN.md

Written in the same change as the code, in the amendment style already used
there.

**D-04** — the display rule changes. The document says *"The session screen
shows the plate breakdown, greedy largest-first"*. That stays true of a bar
being loaded from empty and of every block-level view, and is no longer what
the logger shows between sets of one exercise: it shows what comes off and what
goes on, from an arrangement chosen to handle the fewest plates and, at equal
cost, to take the fewest off. Record the physical reason (the stack discipline),
the tie-break, and that the resulting arrangement is deliberately not always the
greedy one.

**D-10** — record that the per-set stamp is now shown in the logger as well as
on the history page, that it appears only on sets already answered, and that no
figure on that screen counts up. The rest-timer paragraph is unchanged and is
the reason for that constraint. Note the duplicated ceiling in `$lib/time.ts`
and that `timing.rs` remains the authority.

**D-08** — record what the finish screen shows and that it does not redirect on
its own, alongside the existing lifecycle rules.

Theming needs no decision of its own; the design system is not a numbered
decision and the light theme does not contradict one. The plate re-tokenisation
is recorded under D-04 with the rest of the loading display.

## Additions to CONTEXT.md

One new term, in the Training section:

> **Plate change**:
> What comes off the bar and what goes on, per side, to get from the
> arrangement currently loaded to the next prescribed weight. Retains a prefix
> of what is on there, because plates load largest-first and only the outermost
> can be removed.
> _Avoid_: Delta, diff, adjustment

And **Note** in the same section, distinguished from the session-level notes
column that nothing writes to.

## Order of work

1. `loading::plan` and its tests. Pure, no database, milliseconds (D-15).
2. `plate_change` on `PrescribedSet`; regenerate `openapi.json` and the
   TypeScript client; `oasdiff` must pass clean.
3. The note migration, `SetSubmission`, the bulk insert, the history response.
4. Frontend: theme and toggle; per-set stamps; the plate change block; the note
   affordance; the finish screen.
5. DESIGN.md and CONTEXT.md.

Steps 1–3 are backend and independently testable. Step 4 is five separate
screens' worth of work that share nothing but the file they live in.
