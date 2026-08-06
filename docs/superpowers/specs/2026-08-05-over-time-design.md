# Over time

Design, 2026-08-05. The fourth thing asked for after a week of training on the
app, deferred out of [when the prescription is
wrong](2026-08-05-when-the-prescription-is-wrong-design.md) so that it could be
designed against a database that already knew why an athlete drifted.

Two new measurements, one endpoint, one screen — and **no new table**. Every
figure here is derived from rows that already exist or will exist for another
reason, which is the decision this spec makes most often and defends in
[section 4](#indicators-and-why-they-are-a-response-shape-rather-than-a-table).

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

**Brzycki**: `weight × 36 / (37 − reps)`. A single returns the weight itself —
`36 / 36` — and that is the property that decided it. An estimate is evidence
about what the athlete can do, and a formula reporting a 140 kg single as 144.7
invents 4.7 kg of evidence that does not exist. On a screen built for an athlete
whose failure mode is over-reaching (D-01), a systematic overstatement is the
wrong direction to be wrong in.

> **Corrected during implementation, and this section had it backwards.** It
> first specified **Epley** — `weight × (1 + reps / 30)` — and justified it on
> exactly the property quoted above. Epley does not have that property: at one
> rep it returns 31/30 of the weight. "A single returns the weight itself" is
> Brzycki's, and the whole argument was resting on the wrong formula.
>
> It also rejected Brzycki for having a pole at 37 reps where the estimate goes
> negative — true, and unreachable here, because the rep ceiling in the very
> next paragraph puts it more than three times out of range. The objection was
> written into the same section that made it moot.
>
> The two agree exactly at the ceiling — `36/27` and `1 + 10/30` are both 4/3 —
> so the choice costs nothing where they meet and only matters in between,
> where Brzycki is the more conservative. A test pins both properties so the
> argument cannot silently drift back.

**A rep ceiling, and it is a real rule rather than input validation.** An
estimate off a set of twenty is not evidence about a single, and the formula's
error grows monotonically with reps. Sets above the ceiling are capped at it
rather than reporting no estimate at all — see the correction below for why
this reverses what this section originally specified. The ceiling is a
constant in the training crate with the reasoning beside it.

> **Reversed after the screen this feeds was built, and the sentence above used
> to end the opposite way.** It read *"Sets above the ceiling contribute no
> estimate at all rather than a clamped one — the same instinct as `timing.rs`
> discarding an interval it cannot believe instead of folding it in at an
> invented value."* That refusal broke the property the trend needed: eleven
> reps at a weight is at least as good a single as ten at it, so a set that
> crossed the ceiling should never estimate less than one that stopped short of
> it, and refusal did exactly that. 5/3/1 week one's AMRAP set landing at
> eleven reps instead of ten dropped the headline estimate by about a quarter —
> to the session's second-best set — for doing one rep *more*, and the screen
> renders drift reasons on downward moves, inviting the athlete to explain a
> number that was an artifact of the estimator rather than a fact about their
> training. `docs/DESIGN.md`'s `## Open` list carried this as an unsettled
> question; it is now answered in **D-13**'s amendment block.
>
> The `timing.rs` comparison does not survive the reversal, and it is worth
> saying why: an interval `timing.rs` cannot believe is discarded because there
> is no honest number to report for it, but a set past the rep ceiling has an
> honest number sitting inside it — what its first ten reps already proved.
> Capping reads that number instead of throwing it away. It is a lower bound
> rather than a guess, which is a different thing from the invented value the
> original sentence was refusing to fold in, and understating a long set is the
> direction this product wants its arithmetic to be wrong in (D-01).

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

### It comes from `enrollment_advances`, and needs no table of its own

> **Simplified during design, after a question that was sharper than the answer
> it got.** This section originally specified a `workout_readouts` table written
> at submit. It was redundant before it was written.

`readout(&self, state: &State) -> Result<Vec<Readout>>` is a **pure function of
state**. [What the fold did](2026-08-05-what-the-fold-did-design.md) already
records `state_before` for every advance, keyed by the workout that caused it.
So every historical training max is `program.readout(&state_before)` — derived,
not stored, from a table that exists for another reason entirely.

Storing it as well would have materialised a fact the other table implies, which
is the thing [section 4](#indicators-and-why-they-are-a-response-shape-rather-than-a-table)
declines for every other figure on this screen.

**`state_before`, and the name is the point.** The first draft said "written at
submit from whatever `readout()` returns" and never said whether that was before
or after `advance()`. It must be before: the number the session was actually
performed under, not the one the next session will use. Reading it off
`state_before` makes that a property of the column rather than a sentence
somebody has to remember.

**Two costs, both accepted.** The labels and weights come from today's
`readout()` applied to old state, so a program that changed what it reports
would re-label history — a display reinterpretation rather than a re-fold, and
consistent history is what a chart wants anyway, by the same argument as the
estimate. And `readout()` returns a `Result`: a program dropped from the
registry yields no points at all, where a stored row would have survived it.
That is the same trade `routes::workouts` already takes when it falls back to
the program key for a name.

**The line starts where the advances start.** Sessions logged before that table
existed have no `state_before` and therefore no training max, ever — the same
shape as `logged_at` in D-10, and honest for the same reason.

---

## 4 · One endpoint

`GET /v1/progress`, returning what the screen needs in one round trip. Every
figure computed in Rust (D-11).

| Field | What it carries |
|---|---|
| `lifts[]` | per exercise: `exercise`, `label`, `points[]` of `{ workout_id, at, estimate, training_max, drift_kg, sets_over, sets_under, reasons[] }`, and `bests[]` of `{ reps, weight, actual_reps, at, workout_id }` — see [section 6](#6--bests) |
| `sessions[]` | per workout: `at`, `enrollment_id`, `load_moved_kg`, `load_prescribed_kg`, `sets_over`, `sets_under`, `duration_seconds` |
| `programs[]` | per enrollment: `program_key`, `program_name`, `status`, and `indicators[]` |
| `overall` | `indicators[]`, across everything |

### Indicators, and why they are a response shape rather than a table

Every figure that renders as a card on this screen travels as the same thing:

```
Indicator { key, label, value, unit }
```

`unit` is one of `kg`, `count`, `seconds` — a semantic tag, not a display
string. Formatting lives at the UI edge, as D-04 already requires of every
weight in this system. One shape means one card component and a new metric that
does not touch the client.

**An indicator with nothing to say is omitted, never sent as zero.** A median
session duration across no sessions is not zero minutes, and the card should be
absent rather than wrong — the same rule `timing` follows in omitting itself
rather than serving an empty breakdown, and the same one pace follows in not
projecting before there is data to project from.

The values are **computed by query, not stored**. That was considered carefully
and the reasoning is worth keeping, because a `performance_indicators` table
written at submit is a good pattern that does not fit here.

It earns its keep when aggregation is expensive, when the inputs will not be
available later, when the number is contractual, when metric definitions vary by
tenant or version, or when the metric set is open-ended. This codebase scores
one out of five, and the one is already handled: everything else derives from
`workout_sets`, which is permanent, and a year of training is roughly two
hundred workouts and six thousand set rows — an indexed aggregate, not a scan.
D-16 sized this box by measurement rather than estimate; caching before
measuring is the same instinct in reverse.

**The estimate is the specific reason not to freeze these.** It is a formula,
the rep ceiling is a judgement call, and Brzycki is a live alternative. Values
materialised at submit would leave a year's chart silently mixing points
computed under different rules, with nothing marking where the deploy happened —
a trend whose slope is partly an artifact. Derived on read, a revision re-draws
all of history consistently, which is the only behaviour a trend line can
honestly have.

Two smaller costs avoided: a generic `value numeric` gives up the per-metric
constraints this schema uses everywhere, and an unconstrained `key` turns a typo
into a new metric rather than an error. And a materialised table has a writer,
which means a backfill bug invisible until somebody recomputes by hand — D-13
carries that scar already, in a reference implementation that "writes a
`lift_records` table that nothing reads back".

**What is given up**, recorded rather than glossed: there is no record of what
the number was once believed to be, adding a metric is a deploy rather than a
row, and every load does real work that the right indexes have to cover.

**The asymmetry is what settles it.** Deriving first costs nothing later — the
derivation becomes the definition a cache is built from, the day a measured load
says one is needed. Materialising first and then revising a formula means
reconciling a table against a rule that has moved, with no marker for where.

`training_max` is nullable per point — every session logged before
`enrollment_advances` existed has no `state_before` to read a training max from,
and the chart must draw a gap rather than a zero. `estimate` is nullable for
a narrower reason, now that [section 2](#2--the-estimate) caps rather than
refuses a set above the rep ceiling: a session where every set of that lift
was skipped, or where the sets performed carried no weight or no reps,
contributes no estimate. A high rep count alone no longer does — it is capped,
not discarded.

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

**Bests** — the rep-max grid for the lift being charted, directly under it. See
[section 6](#6--bests).

**Load**, its own panel and its own scale.

**Per program**, one block per enrollment, and **overall** below it. Both are
rendered from `indicators[]` by one card component — key, label, value and unit,
laid out identically whatever the metric is. Adding an indicator server-side
makes a card appear; removing one makes it vanish. The client never learns what
any particular metric means, which is what keeps a KPI grid from becoming
thirty-one special cases (D-11).

The set shipping first: sessions logged, load moved, sets over, sets under,
median session duration, median interval. That list is a server-side constant,
not a contract the screen depends on.

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

## 6 · Bests

The trend says whether the number is moving. It does not answer the question a
set of five actually poses — *what can I do for five?* That is a different
artifact and it is a table.

**Per lift, six cells: 1, 2, 3, 5, 8 and 10 reps.** Each holds the heaviest
weight lifted for **at least** that many reps, over all history and all
programs. A display constant, changed by editing a list.

### At least, not exactly

A cell is the best weight over sets whose `actual_reps >= n`. Every cell is
still a set that actually happened: lifting 145 for two means 145 has certainly
been lifted once, and 140 for five means 140 has been lifted for three.

The alternative — only sets performed at exactly that rep count — was declined.
It is more literal and it produces a grid full of holes that can show a 3-rep
best below a 5-rep best. Not wrong, but it reads as broken, and it invites the
athlete to go and perform a pointless triple to fill a cell, which is the
product suggesting work for the table's benefit rather than the athlete's.

Filling gaps with the **estimate** was also declined, and more firmly. It would
put a formula's output in a table where every other number is something that was
done, and a records table that mixes the two stops meaning anything.

Being monotonic in reps is therefore a property of the definition rather than
something to enforce or check.

### What counts

Every `done` set carrying actual numbers, whatever the program, whatever the
prescription. **Drifted sets count**: a set logged at 105 kg against a 100 kg
prescription is a 105 that was lifted, and `bar was loaded` does not make the
bar lighter. AMRAP sets need no special handling and are where most of these
will come from — a twelve-rep top set fills the 10 and the 8.

**Derived by query**, like everything else on this screen:
`max(actual_weight) where exercise = ? and actual_reps >= ? and status = 'done'`.
No table, no writer, nothing to backfill.

### Each cell carries when

The weight, the reps actually performed, the date, and the workout id. That is
what keeps this a reference rather than a scoreboard: the athlete can always ask
*when was that*, and go and read what else happened that day.

### Bodyweight lifts get no grid

Recorded as a gap rather than solved. Their record is reps, not weight, and
every set of hanging leg raises ties at zero kilograms. A reps-based grid is a
different feature; this one should not pretend to cover it by drawing six cells
that all say nothing.

### No celebration

No detection at submit, no notification, no badge, no marker on a cell that was
set recently. D-01 and D-13 argue against motivation for an athlete whose
failure mode is over-reaching — and the argument lands on the *moment*, not on
the data. A table consulted deliberately is a reference; a congratulation
arriving while the athlete decides how heavy to go is accelerant. This is the
first, and it must not drift into the second.

> This is not an inference from the decisions. Asked directly, the athlete this
> product is built for said: *no celebratory stuff, just the facts and data.*
> Recorded here because a rule with a person behind it survives a redesign, and
> one derived from principles gets re-derived the other way by the next reader
> who wants a badge.

---

## 7 · Vocabulary

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

**Best** — the heaviest weight lifted for at least a given number of reps. An
observed fact, never an estimate.
_Avoid_: PR, personal best, rep max

> The avoidances are not arbitrary. `CONTEXT.md` already rules out *PR* and
> *personal best* under **Entered 1RM**, and flags *Max* as ambiguous in the
> same entry — so the three obvious names for this were all spoken for before
> the feature existed. *Best* collides with nothing.

---

## Amendments to DESIGN.md

**D-13 loses its last three words.** It reads *"Three things, and no dashboard"*.
The amendment must name that reversal and argue the distinction rather than
wave at it: what D-13 refused was a grid of whatever happens to be countable,
sitting on the screen the athlete opens. This is a screen navigated to on
purpose, carrying exactly D-13's three things — e1RM trend, drift, session
duration — plus a table of bests, which it did not ask for and which is
addressed below.

It must also address D-13's other sentence, because this spec walks straight
into it: *"The reference writes a `lift_records` table that nothing reads back."*
The bests grid is the same idea and the opposite construction — nothing is
written, the numbers are a query over sets already stored, and the table exists
because a screen renders it. The scar D-13 records is about a write with no
reader, not about the concept of a record. It must also record that
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
