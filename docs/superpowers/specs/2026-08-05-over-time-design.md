# Over time

Design, 2026-08-05. The fourth thing asked for after a week of training on the
app, deferred out of [when the prescription is
wrong](2026-08-05-when-the-prescription-is-wrong-design.md) so that it could be
designed against a database that already knew why an athlete drifted.

Two new measurements, one new table, one endpoint, one screen.

`docs/DESIGN.md` **D-13** is amended, and an aside in **D-11** is corrected.
They are listed in [Amendments to DESIGN.md](#amendments-to-designmd) and must
be written as part of the change, not afterwards — a decision there is binding
until it is amended there.

---

## 1 · What the chart is of

Three words were asked for — *weight*, *load*, *progress* — and they do not map
onto D-13's three things one for one. What they resolved to:

**Weight is two lines, not one.** An **estimate** computed from what the athlete
actually lifted, and the **training max** the program is prescribing from. Both
are kilograms in the same range, so they share one axis honestly, and the gap
between them is itself the reading: D-04 already argues the athlete should be
able to watch the training max climb, and now they can watch it against evidence.

**Load is kilograms moved per session** — the number `report.rs` already computes
for one session, aggregated over time. It gets its own panel. Roughly 5000
against roughly 150 cannot share an axis, and a second y-axis to force it would
be a chart that lies about a relationship it has drawn.

**Progress is not a third series.** It is what the estimate line does. D-13 says
the e1RM trend *is* the answer to "is this program working?", and inventing a
separate progress number beside it would be a second answer to a question that
already has one. This is the YAGNI cut in this design and it is the largest one.

---

## 2 · The estimate

### Where it lives

`athletos-training`. It is a pure formula about lifting — no database, no
program state, no `sqlx` — which is exactly what D-15 built that crate for, and
it makes the arithmetic testable in milliseconds.

> **D-11's aside is stale, and this is where it becomes visible.** That decision
> lists "e1RM formulas" among the TypeScript logic a future Expo client would
> reuse, while the same decision's own heading says *the API is the product* and
> *all business logic and authorization live in Rust*. The example was written
> before the formula existed and before there was a second client to reason
> about. The rule wins.

### The formula

**Epley**: `weight × (1 + reps / 30)`. A single returns the weight itself, which
is the property that matters most — the heaviest thing the athlete has actually
done should never be understated by the estimate of it.

Brzycki (`weight × 36 / (37 − reps)`) is the usual alternative and is slightly
kinder at low reps. It was not chosen because it has a pole at 37 reps and turns
negative past it, which is a formula that has to be guarded rather than one that
degrades. Epley grows without a discontinuity; it merely grows optimistic.

**A rep ceiling, and it is a real rule rather than input validation.** An
estimate off a set of twenty is not evidence about a single, and Epley's error
grows monotonically with reps. Sets above the ceiling contribute **no estimate at
all** rather than a clamped one — the same instinct as `timing.rs` discarding an
interval it cannot believe instead of folding it in at an invented value. The
ceiling is a constant in the training crate with the reasoning beside it.

### Which set

Per session, per exercise: **the highest estimate across that session's `done`
sets**, not the heaviest weight. A crisp triple can imply more than a grinding
single, and the estimate exists to say what the athlete is capable of rather
than what number was on the bar.

Only `done` sets, and only those carrying actual numbers. A skipped or unreached
set is work that did not happen and says nothing about capability.

---

## 3 · The training max has no past

`readout()` reports what a program is prescribing from *today*. That number lives
in the program's opaque `State` (D-03), which holds one value and no history. So
the second line on the chart cannot be drawn from anything currently stored.

Re-deriving it was considered and refused. A past training max can be recovered
only by dividing a stored prescription by the percentage its week used — 5/3/1's
private arithmetic, living in a SQL query or a migration, in a codebase whose
D-03 exists precisely so that no consumer knows which program it is holding. It
would be correct until the day a second adaptive program shipped, and wrong
silently after it.

### `workout_readouts`

A new table, written at submit from whatever `readout()` returns:

```sql
create table workout_readouts (
    workout_id  uuid    not null references workouts (id) on delete cascade,
    exercise    text    not null,
    label       text    not null,
    weight      numeric(6,2) not null,

    primary key (workout_id, exercise)
);
```

**A table rather than `jsonb` on `workouts`, deliberately.** The obvious
precedent is `enrollments.state`, and it is the wrong one: that column is JSON
because it is opaque and only the program may read it. A readout is the opposite
— `Readout` exists *to be displayed*, it carries a label naming what kind of
number it is precisely so a consumer can show it, and storing display data
opaquely would be copying a decision from the case that argues against it.

`label` is stored beside the weight rather than resolved at read time, because
it is program knowledge with nowhere else to live (D-03): only the program knows
whether it took 90%, took the number straight, or has been moving it every cycle.
A label recomputed later from today's registry would relabel history.

**Nothing here knows which program it holds.** The program reports; this stores.

**Sessions already logged get no row, ever.** The line starts the day this
ships and fills forward. That is the same shape as `logged_at` in D-10 and it is
honest for the same reason: a backfilled value would be a number nobody measured.

---

## 4 · One endpoint

`GET /v1/progress`, returning what the screen needs in one round trip. Every
figure computed in Rust (D-11).

| Field | What it carries |
|---|---|
| `lifts[]` | per exercise: `exercise`, `label`, and `points[]` of `{ workout_id, at, estimate, training_max, drift_kg, sets_over, sets_under, reasons[] }` |
| `sessions[]` | per workout: `at`, `enrollment_id`, `load_moved_kg`, `load_prescribed_kg`, `sets_over`, `sets_under`, `duration_seconds` |
| `programs[]` | per enrollment: `program_key`, `program_name`, `status`, `sessions`, `load_moved_kg`, `sets_over`, `sets_under`, `median_duration_seconds`, `median_interval_seconds` |
| `overall` | the same shape as one `programs[]` entry, across everything |

`training_max` is nullable per point — every session logged before
`workout_readouts` existed has none, and the chart must draw a gap rather than a
zero. `estimate` is nullable for the same reason from the other direction: a
session where every set of that lift was skipped, or where the only sets
performed were above the rep ceiling, contributes no estimate.

`drift_kg` is signed: **positive means heavier than prescribed**, negative
lighter, zero run as written. Summed over that session's done sets for that
lift, against the same sets' prescriptions, so the figure is weight drift
uncontaminated by work not done — the two axes stay apart exactly as they do on
the finish screen.

`reasons[]` travels on **every** point that has any. The API does not decide
which points are worth annotating; the screen renders them only on downward
moves, and that test — comparing a point to the one before it — is presentation
rather than a fact about training. A future client that wanted them everywhere
would not need a new endpoint to get them.

**Windowed, twelve months by default**, overridable. An unbounded response is
one that gets slower every week the athlete trains, and nobody notices until
year three.

`median_interval_seconds` reuses `timing.rs` — its discard-rather-than-clamp
rule and its ceiling apply unchanged, and the count of what was discarded
travels with any figure short because of it.

---

## 5 · The screen

`/progress`, in the `(app)` route group: authenticated, server-rendered through
the BFF, linked from Train.

### Not on the Train screen, and that is a decision

D-01 calls this product a governor for an athlete whose failure mode is
over-reaching. D-13 says progress is a motivational chart and that *for an
athlete who already goes too heavy, motivation is accelerant*. Putting a rising
line on the screen the athlete opens to decide how heavy to go today is the one
placement those two decisions jointly argue against. It is one tap away instead.

### One lift at a time, selected by URL

`/progress?lift=squat`, defaulting to the lift trained in the most recent
session that carries an estimate — not merely the most recent session, since a
day of accessory work would otherwise open the page on a chart with two points
on it. An unknown or absent `lift` falls back to that default rather than
erroring; a bookmark that outlives an exercise is not the athlete's problem.
Small multiples
— one chart per lift, stacked — would remove the selector and allow comparison,
and were declined because four charts is a lot of phone. A URL parameter keeps
the page server-rendered with no client state and makes a view linkable.

### Top to bottom

**The trend.** Estimate and training max, one kilogram axis, time along the
bottom. Points are marked where that session drifted from its prescription.

**Reasons, on downward moves only.** Where a point falls below the one before it
and that session carries drift reasons, they are shown on the point.

> This is narrower than the first draft of this design, which proposed a general
> breakdown of why the athlete drifted, and the argument that cut it is worth
> keeping. For a **stale-low** Entered 1RM the estimate is strictly the better
> evidence: it is quantitative, derived from performance, and needs no
> self-report — *too easy* is a subjective restatement of what the chart already
> shows by putting the estimate above the entered number.
>
> Downward drift is where the reasons carry what the estimate cannot. A dip is
> unexplained by construction: going lighter on purpose, sleeping badly, a
> tweaked shoulder and a genuinely over-heavy prescription all draw the same
> falling line. *felt off* marks a dip that is not a capability change. *too
> heavy* is evidence the Entered 1RM is stale **high**, which the line shows
> only as a dip identical to the other two. And *bar was loaded* is the one that
> should make a reader trust a point **less** — it marks a rise that came from
> the room rather than from intent.

**The drift band**, directly beneath and sharing the x-axis: kilograms over or
under per session. This is D-13's *progress is never shown without its cost*
made structural rather than promised. The band sits between the trend and
everything below it, so the eye crosses it on the way down the page.

**The figure.** "Over on 23 of 180 sets in this block."

**Load**, its own panel and its own scale.

**Per program**, one block per enrollment: sessions logged, load moved, sets over
and under, median session duration, median interval. **Overall**, the same shape
across everything.

### Drawing it

**LayerChart** — Svelte-native, composable, and emits SVG, so the chart is in
the server-rendered HTML and needs no client JavaScript to appear. That is the
property that decided it: the alternatives worth considering (Chart.js, uPlot,
Observable Plot) are all canvas or DOM-bound and would turn a server-rendered
page into a client-only island that pops in after hydration.

It is the first production dependency this tree has taken beyond
`openapi-fetch` and `openapi-typescript-helpers`, and that is a real cost
recorded rather than waved past. Hand-rolled inline SVG was the alternative,
with `Plates.svelte` as precedent for this repo drawing its own diagrams.

**Its Svelte 5 support is verified during planning, not taken on trust.** If it
does not hold, the fallback is hand-rolled SVG — a plan-time discovery, not a
change to this design. Nothing above depends on which of the two draws the
lines.

> The `dataviz` skill is loaded before any chart code is written. Colour,
> axis and legend choices are made there rather than invented here.

---

## 6 · Vocabulary

`CONTEXT.md` gains, in the athlete's-numbers section:

**Estimate** — the one-rep max implied by a set that was actually performed.
Evidence of capability, computed rather than entered. Distinct from the
**Entered 1RM**, which the athlete owns and types, and which never appears on
this screen.

The two must not both be called a 1RM in prose. `CONTEXT.md` already warns that
"Max" is ambiguous, and putting *Entered 1RM* and *Estimated 1RM* on one screen
would manufacture exactly the confusion that section exists to prevent. The
chart's two series are labelled **Estimate** and **Training max**.

**Load** — kilograms moved: sets times reps times weight, over work actually
done. In use informally since `report.rs`; named here.

---

## Amendments to DESIGN.md

**D-13 loses its last three words.** It reads *"Three things, and no dashboard"*.
The amendment must name that reversal and argue the distinction rather than
wave at it: what D-13 refused was a grid of whatever happens to be countable,
sitting on the screen the athlete opens. This is a screen navigated to on
purpose, carrying exactly D-13's three things — e1RM trend, drift, session
duration — and nothing it did not already ask for. It must also record that
D-13's own rule survived contact: the drift band shares the trend's axis rather
than sitting a tap away, because a rule about not showing progress without its
cost is kept by layout or not at all.

**D-11's e1RM aside is corrected**, per section 2.

**D-04 is not amended.** The training max is displayed here and still not
editable; watching it move is what that decision already asked for.

**D-01 is not amended.** The placement argument in section 5 is D-01 applied,
not D-01 changed.

---

## What this spec is not

**No recommendation, no coaching, no "you should add 5 kg".** The screen reports
and does not advise. An athlete whose estimate has sat above their Entered 1RM
for a block can draw their own conclusion, and D-01 puts the athlete who does
not know what to do out of scope for v1.

**No per-set charting.** The unit here is a session.

**No export.** Not asked for.
