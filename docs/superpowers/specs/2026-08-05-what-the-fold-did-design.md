# What the fold did

Design, 2026-08-05. One table, one binary, one new decision in `docs/DESIGN.md`.

Written before [Over time](2026-08-05-over-time-design.md) rather than after,
because the table only records advances that happen once it exists. Every
session logged in the meantime is one that can never be audited.

This came out of evaluating **event sourcing** for this codebase. That
evaluation is part of the deliverable — the reasoning belongs in `DESIGN.md` so
it is not re-litigated in six months — and its conclusion is that the pattern
should be declined and one capability taken from it.

---

## 1 · The hole

`advance(state, logged) -> state` is a pure fold, and `enrollments.state` keeps
only its latest result. There is no version on it and no history behind it.

So **a wrong fold is unfixable.** D-09 already names the fear in as many words —
*"a 5/3/1 training max jumping 5 kg instead of 2.5, silently, permanently"* —
and its answer is to make a double-advance impossible, not to make a wrong
advance recoverable. If `advance()` is ever wrong, for any reason other than
being run twice, the wrong number becomes the only number and the repair is
hand-editing JSON in production.

Nothing else in the system has this property. Every other fact is either
immutable and stored (`workout_sets` is never updated or deleted — the grep is
empty) or derivable from what is stored. The program's state is the one place
where a computation is kept and its inputs are thrown away.

---

## 2 · Why not event sourcing

The pattern fits this domain unusually well, and most of it is already here:

- **`advance()` is `apply(state, event)`** — same signature, same purity.
- **`workout_sets` is already an append-only fact table**, and `show`'s own
  comment says a submitted workout is immutable and cacheable.
- **The client is already an event producer**: a client-minted UUIDv7, a local
  queue, one idempotent POST, `on conflict do nothing`. That is the dedup
  machinery event-sourced systems build deliberately; here it fell out of being
  offline-first (D-09).
- **The read model is already CQRS-shaped.** [Over time](2026-08-05-over-time-design.md)
  chose to derive indicators on read rather than materialise them.

It is declined anyway, on one collision that is not negotiable.

**Replay means re-running today's engine over yesterday's sessions**, producing
the state today's code would have made rather than the state the athlete trained
under. D-03 already ruled on precisely this question in the opposite direction:
a prescriptive program snapshots its maxes at enrolment so that *"editing a max
mid-block must not retroactively rewrite sessions the athlete was already
shown"*, because drift is measured against the `prescribed_weight` that was
actually displayed (D-07).

Full event sourcing makes current state a function of current code by
construction. This product's central measurement is defined against what was on
the screen at the time. The two can be reconciled — version the engine, pin each
replay to the code that produced it — but that is the expensive half of the
pattern, built to defend a property that costs nothing today precisely because
nothing replays.

Three further objections, none decisive alone and all real:

- A `jsonb` event payload carries none of the check constraints this schema
  leans on. Two of them caught genuine bugs during the previous change:
  `workout_sets_drift_reason_needs_drift` and
  `workouts_cut_reason_iff_cut_short`.
- Event schema versioning is D-12's additive-only discipline again, on a second
  surface, permanently — and unlike an API version, an old event can never be
  retired. It is in the log for the life of the system.
- A projection rebuild nobody runs is D-18's untested-backup argument wearing a
  different hat.

And the operational wins — independently scaled reads and writes, projections
rebuilt on separate infrastructure — need scale D-16 explicitly refuses.

**What is taken instead is the one capability the system actually lacks: the
ability to tell that a fold went wrong, and to recompute from a point where it
had not.**

---

## 3 · `enrollment_advances`

```sql
create table enrollment_advances (
    workout_id     uuid primary key references workouts (id) on delete cascade,
    enrollment_id  uuid not null references enrollments (id),
    state_before   jsonb not null,
    state_after    jsonb not null,
    engine_version text  not null,
    advanced_at    timestamptz not null default now()
);

create index enrollment_advances_enrollment_idx
    on enrollment_advances (enrollment_id, advanced_at);
```

**One row per advance, keyed by the workout that caused it.** The primary key is
`workout_id` rather than a surrogate, which makes "one advance per workout" a
schema fact rather than a convention — and means a retry that somehow reached
this code would be refused by the database rather than quietly appending a second
row.

**Written in the branch that actually inserted**, inside the transaction that
already holds the enrolment's `for update` lock, beside the state write it
records. The retry branches do not advance and therefore write nothing.

### What is deliberately not stored

**The `LoggedSession` that drove the fold.** It is fully recoverable — `week`,
`day` and `cut_reason` from `workouts`, the sets from `workout_sets` — and
storing it again would be a copy that can drift from the rows it duplicates.
The verifier reconstructs it the same way every other reader does.

### `engine_version`

The API crate's version, from `CARGO_PKG_VERSION`. Automatic, always populated,
and coarse: two builds of the same version can differ, so this does not identify
code exactly.

That is accepted rather than solved, because of what the field is *for*. It is a
hint for a human investigating a divergence the verifier has already found — not
the mechanism that finds it. A git SHA embedded at build time would be exact and
would need a build script, and the exactness would be spent on a field that is
read by a person, once, after something has already gone wrong.

A hand-maintained per-program version was considered and rejected: it is more
precise in principle and rots in practice, and a version that is silently stale
is worse than one that is honestly coarse.

### The migration is additive and starts mid-history

No default, no backfill. The enrolments already running have advanced many times
with no record, and no row will ever exist for those. The verifier must read
"this enrolment has no recorded advances" as *nothing to check*, never as
*everything diverged* — and must say which of the two it means, because a clean
report over an empty table is the most dangerous output this tool can produce.

---

## 4 · `verify-advances`

A binary beside the existing `set-password`, following its shape: reads
`DATABASE_URL`, runs offline, no API surface, not part of the deployed service.

For each enrolment holding advances, walked in `advanced_at` order:

**Check one — the chain.** Each advance's `state_before` must equal the previous
advance's `state_after`. Pure data consistency: it runs no program code and
catches a *missing* row — a workout that advanced without being recorded — even
when the engine itself is perfect. The first recorded advance has no predecessor
and is exempt, which is the same fact as the table starting mid-history.

All three comparisons are **structural**, over parsed JSON rather than over
text. `jsonb` normalises key order and whitespace on the way in, and
`serde_json::Value` compares by structure on the way out, so neither side can
report a difference that is only formatting — but the two must not be compared
as strings anywhere, and that is the one way this tool could cry wolf on every
row it reads.

**Check two — the fold.** Reconstruct the `LoggedSession` from the stored
workout and its sets, run today's `advance()` from the stored `state_before`,
and compare against the stored `state_after`.

**Check three — the head.** The last advance's `state_after` must equal the
enrolment's current `state`. This is what catches a state edited by something
other than a fold.

It reports `workout_id`, `engine_version`, and the differing keys.

### It reports; it does not repair

No `--fix`. The data needed to recompute forward from a known-good
`state_before` now exists, and using it is a deliberate human act — the same
instinct as D-04's *watch it, do not touch it*: a training max moves through
`advance()` or it does not move.

A divergence also does not mean a bug. Deliberately fixing `advance()` makes
every prior fold diverge, correctly, and that is exactly the case
`engine_version` exists to make legible. The binary states what differs and
under which version; a person decides what it means.

---

## 5 · Testing

**Integration.** Submitting a workout writes exactly one advance row whose
`state_before` is the enrolment's state before the submit and whose `state_after`
is the state persisted by it. A retried submit writes no second row and leaves
the first untouched — the acceptance test that already posts the same workout
twice is the natural place to assert it.

**The verifier, against fabricated damage.** A clean history reports clean; a
hand-corrupted `state_after` is reported with its `workout_id`; a deleted middle
row is caught by the chain check rather than the fold check, which is what
distinguishes the two; and an enrolment with no advances reports *nothing
recorded* rather than *clean*.

**Not tested: that a real divergence is a real bug.** That is a judgement, and
the tool exists to put it in front of a person.

---

## 6 · The new decision

`docs/DESIGN.md` gains **D-19**, in the house style, recording:

- the hole in section 1, in the words D-09 already used for it;
- event sourcing evaluated and declined, with the D-03/D-07 collision as the
  reason it cannot be adopted rather than merely as a cost;
- what was taken instead, and that the log is deliberately not an event log —
  it records the fold's inputs and outputs, not a stream to be replayed into
  existence;
- that it starts mid-history and always will, and that the verifier says so;
- that `engine_version` is coarse on purpose, and what it is for.

`CONTEXT.md` gains nothing. This introduces no vocabulary the athlete ever sees.

---

## What this spec is not

**Not an event log.** Nothing subscribes, nothing projects, nothing is rebuilt
from it. It is an audit of one function.

**Not a repair tool.** Section 4.

**Not a versioned engine.** Pinning a replay to the code that produced it is the
expensive half of event sourcing, and section 2 declines it. `engine_version` is
a note to a human, not a dispatch key.

**Not only an audit tool, as it turned out.** [Over time](2026-08-05-over-time-design.md)
originally specified a second table to record the training max per session. It
does not need one: `readout()` is a pure function of state, so
`program.readout(&state_before)` recovers what the program was prescribing from
during any recorded session. That spec now derives its training-max line from
this table.

This is worth noting as a caution rather than a triumph. A table justified by
one purpose acquiring a second is how tables end up serving neither well. The
guard is that nothing in this spec bends toward the chart: `state_before` and
`state_after` are here because the fold needs auditing, the verifier reads them
structurally and cares nothing for labels, and if the chart's needs ever pull
the schema away from that, the chart gets its own table back.
