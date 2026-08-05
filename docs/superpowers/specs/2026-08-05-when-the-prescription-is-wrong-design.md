# When the prescription is wrong

Design, 2026-08-05. Four things asked for after training on the app for a
week. Three of them are one subject — what the logger does when the athlete
does not lift what was asked — and they are this spec. The fourth is charts
over time and is deferred to its own, for reasons under
[What this spec is not](#what-this-spec-is-not).

One migration, one additive response field, two screens. Nothing here touches
`advance()`, the program engine, or a prescribed weight.

Two decisions in `docs/DESIGN.md` are amended. They are listed in
[Amendments to DESIGN.md](#amendments-to-designmd) and must be written as part
of the change, not afterwards — a decision there is binding until it is amended
there.

---

## 1 · The weight you chose carries

### What exists

`editSet` writes `actualWeight` to exactly one set. Every set is pre-filled
from its own prescription at commit, so an athlete who decides that 95 kg is
too light and lifts 100 types `100` again on set two, and on set three, and on
set four. The prescription is meant to be the path of least resistance (D-07);
retyping the same correction five times is the app making the athlete's honest
answer cost more than the dishonest one.

### What changes

A **weight** edit carries the **difference** to every later **pending** set
sharing the same `exercise` key, and stops at the first set of a different
exercise. Edit set one from 90 to 95 and every later pending squat set is
pre-filled at its own prescription plus 5.

> **Corrected during implementation, and the first draft would have been
> dangerous.** This said "writes that weight to every later pending set", which
> is right for a block of straight sets and wrong on the program this app was
> built around. 5/3/1 BBB prescribes its main lift and its Boring But Big
> backoff as two `Block`s sharing one `exercise` key (D-04) — a squat day is
> 65/75/85% and then five sets of ten at 50%. Copying the weight would have
> pre-filled those five backoff sets at the main lift's number, 117.5 kg where
> 70 was prescribed, on a screen whose entire design is that one tap logs what
> it shows. Carrying the difference keeps each set's own prescription as its
> base.
>
> Jonas chose the difference over the alternative — stopping the carry at any
> change of prescribed weight — with the objection stated: it is the same shape
> as the cross-session carry rejected earlier in this design, a bump taken on a
> light set pushing a heavy one further than intended. Inside one session, on
> one bar, against one exercise, that was judged acceptable.
>
> **One consequence is recorded rather than fixed.** A difference need not be a
> multiple of the loading resolution: correct 97.5 to 96 and a 70 kg backoff
> pre-fills at 68.5, which no bar can hold. The client cannot round it — it has
> no plate arithmetic and is not getting any (D-11) — so the athlete sees a
> number they must edit. The prescription itself is always loadable; only a
> carried difference can produce this, and only when the athlete types a
> difference that is not loadable in the first place.

- **Weight only, never reps.** A rep edit is about that set — an AMRAP that
  went well, a set cut short at eight. A weight edit is about the bar, and the
  bar is still loaded when the next set starts. That asymmetry is the whole
  reason this is safe to propagate.
- **Pending sets only.** A set already logged or skipped is a record of what
  happened. Rewriting it would falsify the log, which is the one thing this
  product cannot do and stay useful (D-07).
- **Forward only, last edit wins.** Editing set one again re-propagates and
  overwrites an individual tweak made to set three. A rule that tried to
  preserve the tweak would need to remember which sets were touched
  individually, and the athlete cannot see that memory. Predictable beats
  clever at a rack.
- **It resets at the next exercise.** A different exercise is a different bar,
  and possibly not even the same bar. This is the same boundary D-04 already
  draws for the plate chain, and drawing it in a second place with different
  semantics would be a bug waiting for a program that supersets.
- **`prescribedWeight` is never touched.** Drift is still measured against the
  number the athlete was actually shown, which is the property the whole of
  D-07 rests on.
- **Undo restores one set.** `resetSet` keeps its current scope. Un-carrying
  would rewrite sets the athlete had already answered, which is the same
  falsification as the second rule above.

### What was considered and rejected

Carrying the number **into future sessions** was asked for and dropped during
design, on the athlete's own objection: a bump taken on a light day would push
a heavy day too far. The objection is the correct one and it is worth
recording, because the mechanisms behind it are all worse than they look.

A prescriptive program snapshots the maxes into `State` at enrolment (D-03) and
5/3/1's training max lives in `State` and moves only at a cycle boundary inside
`advance()`. So editing an Entered 1RM changes nothing about any enrollment
already running, and "it carries to next week" would have had to be one of:
`advance()` learning from drift, which makes the governor follow the athlete
upward and is expressible only for adaptive programs; an athlete-owned
per-exercise offset, which is exactly the "edit my training max" field D-04
refuses; or mid-block re-derivation, which D-03 forbids by name because drift
must be measured against the number that was displayed.

If a prescription is reliably light, the fault is upstream — an Entered 1RM
typed conservatively — and the fix is to correct the number the athlete owns,
deliberately, between blocks. That is a decision for another day and it is not
this one.

---

## 2 · The bar stops lying

### What exists

`plateChangeFor` returns `null` the moment `actualWeight !== prescribedWeight`,
for that set and every later set of the same exercise. The component then falls
back to the absolute breakdown of the **prescribed** weight, dimmed and
labelled *for the prescribed 100 kg*.

That fallback is defensible today, when an edit affects one set. After section
1 it is not: every carried set is deviated by construction, so the whole
remainder of the exercise draws plates for a bar nobody is building. Section 1
would silently switch off the feature the previous spec existed to deliver, and
replace it with a false statement.

### What changes

Two rules. Both are equality between numbers the client already holds. **No
plate arithmetic reaches the client** (D-11) and none is precomputed
server-side.

**The same-weight rule.** When this set's `actualWeight` equals the
`actualWeight` of the previous *done* set of the same exercise, the screen
says **bar is already loaded**. It is exactly true and it is exactly the
instruction. It draws no plate stack, because on an edited weight nobody
computed one — the words were always the instruction and the picture was the
nicety. Guarded on `set.plateChange !== null`, which is how the client knows
this exercise is loaded with plates at all; a pair of dumbbells at the same
weight must not be told the bar is loaded.

*Done*, not merely answered: a skipped set answers the question of whether it
happened without answering what the bar held, since `actualWeight` on a skip
is only ever the pre-filled or carried number nobody touched. Counting a skip
here would let a skipped backoff set — sitting at a weight the previous, real
set never carried — tell the athlete the bar is already at it.

**The dimmed fallback is dropped when, and only when, this set's
`actualWeight !== prescribedWeight`.** That is precisely the case where the
label describes a bar nobody is building. When a set is stale for either of the
*other* two reasons — an earlier set of the same exercise skipped, or logged at
a weight other than its own prescription — but this set still sits at its own
prescription, the dimmed breakdown is true about the weight it names and stays
exactly as it is.

The resulting order in the component, replacing the current `if change / else`:

1. a live plan — render as today;
2. otherwise, plate-loaded and the same weight as the previous answered set —
   *bar is already loaded*, no stack;
3. otherwise, this set is at its own prescription and has plates — the dimmed
   absolute breakdown, as today;
4. otherwise, nothing.

### What was considered and rejected

**A precomputed band of breakdowns** shipped at commit — greedy stacks for
prescribed ±N kg, looked up rather than computed — works offline and keeps the
arithmetic in Rust. It was rejected because those are *absolute greedy* stacks,
which is precisely the "strip two plates to add one" display that D-04's
amendment exists to remove. It would have answered the letter of the problem
and reintroduced the original complaint.

**Compiling `athletos-training`'s loading module to WASM** and shipping it in
the PWA is the only option that actually restores chained plans through an
edit, with one implementation and no D-11 breach. It was rejected as
disproportionate to a four-line problem: a build pipeline, `wasm-bindgen`, a
service-worker cache entry and a bundle-size commitment, to recover a picture
whose accompanying sentence is already correct without it. It stays available
if the words turn out not to be enough.

---

## 3 · Why you changed it

### What exists

Nothing. The weight changes, and the reason lives in the athlete's head until
it does not.

### What changes

Under the weight input, on the **current set only**, appearing the moment
`actualWeight !== prescribedWeight` and vanishing if it returns:

> **too easy · too heavy · bar was loaded · felt off**

One tap sets, a second tap on the same chip clears, and **no tap is a valid
answer**. Log stays one tap whatever happens, and nothing blocks, warns or
interrupts (D-07). This is the one question of D-08's cut-short pattern applied
to the other axis of drift.

**Nothing is pre-selected.** A default answers the question on the athlete's
behalf, and every unanswered edit would then land in the database as *too
easy* — a claim nobody made, on the one signal the product exists to read. The
same one-tap cost buys true data instead, so *too easy* is the **first** chip
rather than the selected one.

**The reason carries with the weight.** If *too easy* is tapped on set one and
100 kg carries to sets two through five, those sets carry the reason. It is one
decision continuing, and recording four of the five as unanswered would
misreport it.

**Clearing the drift clears the reason.** Editing the weight back to the
prescription, or skipping the set, or Undo — all of them leave the set with no
reason, because there is no longer a deviation for it to be about. This is
enforced in the schema as well as in the client; see below.

### The fifth chip that is not there

D-04 records that the plate planner assumes an unlimited supply of every plate
size and that a gym owning four 15s cannot always follow it. That is drift
caused by the room rather than by the athlete, and it is the only one of the
candidate reasons the *product* could act on rather than merely record — which
is a real argument for a *couldn't load it* chip.

It is left out to keep the row to four one-handed taps in a gym. Recorded here
so that the next person to want it knows it was weighed rather than missed, and
so the argument does not have to be reconstructed.

---

## 4 · The ending

### What exists

The finish screen shows wall-clock duration, sets done out of total, skipped
and not-reached counts, the outcome, and a readiness indicator for the
permanent record. D-08 refuses a drift total and a timing breakdown here, by
name, on two grounds: drift would appear alone for the first time in the
product, at the moment the athlete is least able to read it against anything;
and a total computed in a client is one the next client has to compute again.

### What changes

Both numbers arrive, and **both objections are answered rather than
overridden**.

**Drift does not appear alone.** It arrives beside the load actually moved and
beside the athlete's own average for this enrollment, which is the counterweight
D-13 requires — progress is never shown without its cost, and here the cost is
on the same line as the progress.

**Nothing is computed in a client.** Everything is computed in Rust and
arrives in the submit response. `WorkoutReceipt` already carries `duplicate`
and `progress`; it gains a `summary`.

| Field | What it is, and why |
|---|---|
| `load_moved_kg` · `load_prescribed_kg` | Summed over **done sets only**, so the gap between them is pure weight drift and is not contaminated by work not done. D-08's two axes of drift stay apart. |
| `sets_over` · `sets_under` | "You went over on 5 of 12." The count is the part that can be acted on; the kilogram total on its own does not distinguish one wild set from twelve small ones. |
| `duration_seconds` · `average_duration_seconds` | The average is across this **enrollment's** completed sessions — same block, same training max, so it compares like with like. `null` below three sessions, the same rule and the same reason as pace (D-10): not shown before there is data to compute it from. |
| `intervals`: `min` · `median` · `max`, and `discarded` | From `timing.rs`, so the discard-rather-than-clamp rule applies unchanged and the count of what was thrown away travels with the figures that are short because of it. |

**A median rather than a mean**, against the request's "Avg". D-10 takes a
median for pace on the explicit grounds that the tail of this distribution is
not signal, and one interval spent talking to somebody moves a mean of twelve
by a minute. The same instinct, in the same units, on the same screen.

**Offline is unchanged and that is the point.** The summary renders in the
`sent` phase. `queued` keeps exactly today's wording — *saved on this device
and not sent yet*, and the disabled *the full breakdown needs a connection* —
which becomes more true rather than less. There is no baseline cached at commit
and no aggregation on the phone, which is what stops this becoming a second
implementation the native client has to reproduce.

**A retry still gets a full ending.** The duplicate branch recomputes the
summary from the stored rows rather than returning a blank screen; a session
that finally lands three days later is exactly the one whose numbers the
athlete has not seen. This costs one extra read on the duplicate path, which is
the rare path.

**The history link stays.** The per-exercise breakdown of where the hour went
is not duplicated here — it is still one tap away, on a page built to hold it.

---

## Data and contract changes

### Migration — `drift_reason`

Additive, nullable, no default (D-12, D-17): a rolling update runs two releases
against one database by design, so the previous release must keep submitting
valid workouts through this column's arrival, and it does.

```sql
alter table workout_sets
    add column drift_reason text
        check (drift_reason in ('too_easy', 'too_heavy', 'already_loaded', 'felt_off')),

    add constraint workout_sets_drift_reason_needs_drift
        check (drift_reason is null
               or (actual_weight is not null
                   and actual_weight is distinct from prescribed_weight));
```

`text` with a `check` rather than a Postgres enum, for the reasons the training
migration already argues: D-12 makes these vocabularies grow, and widening a
check is an ordinary migration while `alter type ... add value` is not.

The second constraint is what makes "clearing the drift clears the reason" a
fact rather than a client convention. `is distinct from` is deliberate —
`actual_weight <> prescribed_weight` is `null` when either side is null, and a
check *passes* on null, which is the same trap `workouts_cut_reason_iff_cut_short`
was written to avoid. A pending or skipped set has no `actual_weight` and
therefore cannot carry a reason, which is correct: there is no deviation to
explain.

### API

All additive (D-12), all machine-checked by the `oasdiff` gate.

- `WorkoutSetSubmission` gains `drift_reason`, optional. **Only a `done` set
  sends one**, exactly as it is already only a done set that sends
  `actual_weight` and `actual_reps`. This is not tidiness: a reason carried
  onto a set that was never reached would arrive with a null `actual_weight`
  and be refused by the constraint below, taking the whole submission down
  with it — a session lost to a chip tapped forty minutes earlier.
- `LoggedSetView` gains `drift_reason`, so the history page can show it beside
  the drift it explains.
- `WorkoutReceipt` gains `summary`, always present; its inner fields are
  nullable where the data may not exist.

`backend/openapi.json` and `frontend/src/lib/api/schema.d.ts` are regenerated
in the same change as the DTO edits.

### Client

- `$lib/session.ts` — `editSet` propagates a weight change forward within the
  exercise; new `setDriftReason`; new `barUnchangedFrom(session, position)`;
  `resetSet` and `skipSet` clear the reason. All pure, all unit-tested.
- `$lib/queue.ts` and `$lib/submit.ts` — `SendOutcome` and `FlushReport` carry
  the receipt per accepted id. `send()` currently reads `detail` off the body
  on errors and discards everything else. This is the smallest change in the
  spec and the one with the worst failure mode, because the queue is where a
  lost session would be lost.
- `routes/session/+page.svelte` — the chips, the four-way plate branch, and
  the summary block on the finish screen.

---

## Testing

**Rust.** The summary is a pure function over sets, taking only what it uses,
in the same shape as `timing.rs` — so its arithmetic is testable with no
database. Cases: drift counted over done sets only; a session with no done sets
summing to zero rather than panicking; the enrollment average `null` below
three sessions; intervals inheriting `timing.rs`'s discard rule. One
integration test asserts a duplicate submit returns the **same** summary as the
first, which is the retry path's whole contract.

**Frontend.** `session.test.ts` covers the carry: forward only, pending only,
stopping at the exercise boundary, reps untouched, `prescribedWeight`
untouched, re-editing re-propagating, the reason carrying and clearing.
`barUnchangedFrom` gets its own cases including the dumbbell guard. One test
covers a carried reason on a set left `pending`, asserting the submission omits
it — the failure that would otherwise cost a whole session.
`queue.test.ts` covers the receipt travelling through a flush of more than one
submission without being attributed to the wrong id.

**The four-way plate branch** is the one worth an explicit test per arm, since
three of the four render something and rendering the wrong one is a false
instruction at a rack.

---

## Amendments to DESIGN.md

Written as part of this change.

**D-07** gains the chips. The decision says feedback is retrospective and calm
and never a modal at the moment of lifting; that stands, and the amendment
records why an optional, unselected, dismissible row of chips is not a
violation of it — nothing blocks, nothing warns, no tap is a valid answer, and
Log stays one tap. Honesty still costs no more than dishonesty. It also records
that drift now has a stated reason, which is a third column of first-class
drift data beside weight and work not done.

**D-08** gains the ending, against its own explicit refusal. The amendment must
name the refusal it reverses and say what changed: drift no longer appears
alone, because load moved and the enrollment average sit beside it (D-13); and
no number is invented in a client, because all of them arrive from Rust in the
submit response. The offline behaviour the section describes is unchanged.

**D-04** is not amended. The same-weight rule adds no plate arithmetic and no
new stack semantics; it says a true sentence about a bar that did not move.

---

## What this spec is not

The fourth request — per-program and overall statistics on the dashboard, with
a chart of weight, load and progress — is a separate spec. It is a different
subsystem: new aggregation endpoints, an e1RM trend that does not exist yet, a
charting decision, and an amendment to D-13, which currently reads *"Three
things, and no dashboard"* and requires that progress never be shown without
its cost.

It is deferred rather than merely split. What is worth charting is much easier
to answer once drift reasons are in the database — a load line whose deviations
are annotated *too easy* is a different chart from one whose deviations are
annotated *bar was loaded*, and building the chart first would mean guessing
which one it is.
