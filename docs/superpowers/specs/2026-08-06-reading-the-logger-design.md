# Reading the logger

Design, 2026-08-06. Six things Jonas said after training with the logger on a
phone. Five are about how much of the screen the current set consumes and how it
is set; the sixth is a question — "what happens if I input more decimals, like
142,555556?" — whose answer turned out to be a defect rather than a curiosity.

Everything here is the session screen and the one component it draws the bar
with. Nothing touches the engine, `advance()`, a prescribed weight, or the
plate arithmetic in `loading.rs`.

One decision in `docs/DESIGN.md` is amended and one is extended. They are listed
in [Amendments to DESIGN.md](#amendments-to-designmd) and must be written as
part of the change, not afterwards — a decision there is binding until it is
amended there.

---

## The feedback, verbatim

1. weight number on active program is too big
2. dont like the font
3. Takes a lot of space. Can you like minimize it so the instructions go away?
   Don't need em every time.
4. Seeing the plates is kind of a cool idea, Maybe add small numbers on the
   plates
5. You also don't need to show the entire bb it's using a ton of space with the
   free space around it
6. What happens if u input more decimals, Like 142,555556?

---

## 1 · The hero readout

### What exists

`weight-hero` (`frontend/src/routes/layout.css:206`) is Archivo 800 at
`clamp(4.5rem, 22vw, 7rem)`, tracked at `-0.04em`, leading `0.85`. On a 390 pt
phone the middle term wins: the number renders at about 86 px. It is used in
exactly one place, `frontend/src/routes/session/+page.svelte:299`.

The size was chosen to be read at arm's length while holding a bar, and the
tight tracking was chosen so that three digits and a decimal still fit across a
phone. Both are true and both overshot: at 86 px the current set is one number
with some furniture around it, and there is no room left for the plate stack or
the input without scrolling.

### What changes

`weight-hero` becomes Barlow:

```css
@utility weight-hero {
	font-family: var(--font-sans);
	font-weight: 600;
	font-variant-numeric: tabular-nums;
	font-size: clamp(2.5rem, 12vw, 3rem);
	line-height: 1;
	letter-spacing: -0.01em;
	color: var(--color-base-content);
}
```

About 48 px on a phone — roughly 44% of the current height, and still around
three times the body text. The tracking relaxes because `-0.04em` was
compensating for Archivo's width at poster size; at 48 px in Barlow it would
just look cramped. The leading goes to `1` for the same reason: `0.85` is a
display-type value that only reads as deliberate above about 64 px.

`weight-unit` drops from `1.125rem` to `1rem`. It was a footnote beside 86 px
and would be nearly a third of the number at 48 px.

### Why Barlow rather than a new face

Jonas's objection was to the face on the number specifically, not to Archivo
everywhere — the `eyebrow` labels, the `KG`, and the log button keep it.

Barlow was preferred over adding a fourth family because every font on this app
arrives through a Google Fonts `@import` at `layout.css:1`, and `/session` is
the prerendered, service-worker-backed screen that has to work in a basement
with no signal. A face that is not there when the network is not there is a
worse readout than a face nobody loves. Barlow 600 is already in that request,
so this change removes a rendering dependency from the most important number in
the product rather than adding one.

A monospaced or number-forward face was considered and rejected on the same
ground plus one more: mono reads as terminal, and this is an instrument for a
gym.

---

## 2 · The plate stack

### What exists

`frontend/src/lib/Plates.svelte` draws the right-hand sleeve of a loaded bar as
CSS rectangles — no SVG. Three properties matter here:

- The shaft is `h-[5px] flex-1`, so it expands into every horizontal pixel the
  card has left over. With four plates (about 80 px of stack) on a phone card,
  roughly 260 px of the row is empty shaft.
- The row is `h-[104px]`, fixed, whatever is on it. A 2.5 + 1.25 set gets the
  same vertical box as 25 + 25 + 20.
- The plates carry no text. Colour and height are the whole signal, which works
  for anyone who has memorised IWF colours and not for anyone who has not.

### What changes

**Numbers on the plates.** Each plate gets its own value drawn on its face,
rotated to read bottom-to-top:

```css
writing-mode: vertical-rl;
transform: rotate(180deg);
```

Barlow 600, `0.5625rem` (9 px), tabular, centred. `1.25` is the constraining
case: about 22 px of text on the 38 px-tall 1.25 kg plate, inside an 18 px-wide
plate whose rotated line-box needs about 11 px. It fits with room to spare, so
no plate is exempt and there is no size below which the rule changes.

**Ink is tokenised, not hardcoded.** Five of the seven plates are saturated and
want white digits; the 5 kg (`#e8eaed`) and the 1.25 kg (`#9aa5ab`) are pale and
want dark ones. Since the light theme already re-tokenises exactly those two
plates (`layout.css:150-153`), the ink has to be a token or the light theme will
silently get it wrong:

```css
--color-plate-25-ink: #fff;
--color-plate-20-ink: #fff;
--color-plate-15-ink: rgb(0 0 0 / 0.8);
--color-plate-10-ink: #fff;
--color-plate-5-ink: rgb(0 0 0 / 0.8);
--color-plate-2-5-ink: #fff;
--color-plate-1-25-ink: rgb(0 0 0 / 0.8);
```

The 15 kg (`#f2a413`) takes dark ink despite being one of the saturated five —
its luminance is closer to the white plate's than to the red's. The light theme
needs no ink override: its `--color-plate-5` (`#b9b4a3`) and
`--color-plate-1-25` (`#7d8a90`) both still hold dark digits, at about 10:1 and
5.9:1 respectively.

**Contrast is recorded, not claimed.** White on the 10 kg green (`#2e7d32`)
computes to about 4.35:1 — below the 4.5:1 that 9 px text nominally wants. The
25/2.5 red and the 20 blue land at about 4.6:1 and 4.7:1, only just above. This
is accepted rather than fixed, and it is accepted on a specific ground: the
digits duplicate information that is already stated twice in text — in the
`add` / `take off` lines above the drawing, and in the `sr-only` sentence
beneath it. They are a convenience on a picture, not the only place the number
appears. `DESIGN.md` already records the light theme's 1.92:1 plate edge the
same way; this joins it.

**The bar stops expanding.** The shaft becomes a fixed 24 px stub and the row
shrink-wraps and left-aligns instead of stretching. The collar is unchanged. The
existing comment — the shaft stops at the collar because drawing it past leaves
the plates "stranded at the end of an endless sleeve" — was right about the
outboard end and silent about the inboard one, which is where the space was
actually going.

**The row shrinks to what is on it.** `h-[104px]` becomes the tallest plate
present plus 4 px, computed inline. 25 + 25 + 20 still gets 104 px; 2.5 + 1.25
gets 52 px.

### What does not change

The `sr-only` sentence, the `aria-hidden` on the drawing, the `empty bar · N kg`
fallback, the heights, the colours, and the rule that this component performs no
arithmetic. The digits live inside the `aria-hidden` block, so they add nothing
for a screen reader to repeat.

---

## 3 · The cues

### What exists

`session/+page.svelte:390` renders the cues for the current set as a bulleted
list, one per line, always open. Squat carries six of them
(`backend/crates/training/src/exercise.rs:32-45`), and six lines of body text is
a large fraction of a phone card that also has to hold the weight, the plate
drawing, and two inputs.

The one-per-line decision was deliberate and stands: joined with separators they
read as a sentence, and an athlete glancing down mid-set has to parse the whole
run to find the one thing they are about to get wrong. The problem is not the
layout of the cues, it is that they are shown to someone who has read them
forty times.

### What changes

The `<ul>` is wrapped in a `<details>` with an `eyebrow`-styled `<summary>`
reading **form cues**, closed by default.

No state is stored and none is cleared. The cues render only for the current
set, so advancing the session mounts a new `<details>` and it is closed again —
which is the intent, not an accident of the implementation. Someone who wants
them on every set taps once per set; someone who wants them on the one lift they
are unsure about pays nothing on the others.

---

## 4 · Six decimals

### What exists, and why it is a defect

Answering the question end to end:

- The field is `type="number" inputmode="decimal" step="0.5" min="0"`
  (`session/+page.svelte:415`). Nothing enforces the step — `step` constrains
  the spinner arrows and `checkValidity()`, neither of which this screen uses.
- With a period, `142.555556` parses and is written straight to `actualWeight`.
- The *difference* against the prescription then carries to every later pending
  set of the same exercise (`session.ts:223`), so one typo puts six decimals on
  the rest of the exercise.
- Nothing on screen rounds it back. The field shows `142.555556`.
- On submit, `weight()` (`backend/crates/api/src/routes/workouts.rs:1336`)
  checks only `is_finite` and `0..=MAX_WEIGHT_KG`. Postgres then casts to
  `numeric(6,2)` and stores **142.56**.
- With a comma, `Number("142,555556")` is `NaN`, `numberFrom`
  (`session/+page.svelte:123`) returns `undefined`, and the edit is **silently
  dropped**. The field shows what was typed, the state keeps the previous
  weight, and the previous weight is what gets logged. Whether this fires
  depends on whether the browser normalises the separator for the locale; on a
  Danish keyboard it is a live risk, not a theoretical one.

The comma path is the serious one. It produces a set logged at a weight that was
never lifted, with no error and no visible sign, on the screen whose entire
premise is that one tap logs what it shows (D-07).

### What changes

Two things.

**The separator parses.** `numberFrom` normalises a comma to a period before
`Number()`. Nothing typed into the field can be discarded in silence any more.

**The value snaps to 0.5 kg.** A pure helper in `session.ts` — the same file
that holds the rest of the logger's testable logic — rounds to the nearest half
kilo:

```ts
export const snap = (kg: number) => Math.round(kg * 2) / 2;
```

Applied on `change`, not on `input`. Snapping every keystroke would rewrite the
field mid-typing: `142.5` passes through `142.` on its way, which parses as
`142`, which snaps to `142`, which would put the caret back before the athlete
had finished the number. Applied again at the moment a set is logged, so a value
typed and never blurred cannot slip past.

`step="0.5"` stops being decorative — the arrows and the typing finally agree.

> **Corrected during implementation, and the first draft did not close the
> defect it was written for.** This specified the field as it stood,
> `type="number" step="0.5" min="0"`, and assumed the athlete's string reaches
> `numberFrom`. Whether it does is the engine's business. Measured on three
> locales, Chromium on Windows normalises `99,5` to `"99.5"`; Chromium on Linux
> reports `""` with `validity.badInput`. On the second, the comma never arrives
> at the parser at all, so teaching the parser about commas fixes nothing —
> the field shows `99,5`, the state keeps the old weight, and the set logs at
> the prescription. That is the defect this section exists to close, still
> open, on an engine nobody had run.
>
> **CI on Linux is what caught it.** The end-to-end test written for this
> section passed on the machine it was written on and failed on the runner.
> The failure was the product, not the test.
>
> The field is therefore **`type="text" inputmode="decimal"`**. `inputmode` is
> what summons the numeric keypad on a phone; `type="number"` was contributing
> a keyboard nobody needed and a parse nobody could predict. `step` and `min`
> go with it: `step` constrained the spinner arrows and `checkValidity()`,
> which this screen uses neither of, and `min="0"` never stopped anyone typing
> a negative.
>
> The cost is that `numberFromText` inherits the half-typed state a number
> input used to hide. `Number('142.')` is `142`, so an athlete typing `142.5`
> would have the point eaten the moment they pressed it — the state would move,
> and the controlled `value` binding would write `142` back into the field. A
> **trailing separator therefore returns `undefined`**: half a number is not a
> number. This was the "suspected pre-existing bug" listed under Verification;
> it was never reachable through `type="number"`, and making the field honest
> made it reachable.

### The D-11 exception, stated rather than smuggled

`frontend/CLAUDE.md` is unambiguous: "If you find yourself working out a weight,
stop." Snapping is arithmetic on a weight in the frontend, and it is an
exception that has to be written down.

The defence is that this is not plate math. It computes nothing about what can
be loaded, asks nothing about the exercise, and would give the same answer for a
barbell, a dumbbell and a machine. It is the field declining to hold a number
the athlete cannot have meant.

It was checked against the catalogue rather than assumed safe. Every loading
mode resolves to a multiple of 0.5 — barbell at 2.5
(`loading.rs:15`), the dumbbell rack at 2.0 (`exercise.rs:30`), bodyweight at 0
— so no weight the program can prescribe is disturbed by snapping, and no
correct number is ever changed behind the athlete's back.

The cost is stated: a future `Machine { increment }` with a stack that is not a
multiple of 0.5 could not be logged exactly. Nothing in the catalogue is like
that today, and the alternative — refusing the value and blocking the log — is
worse on the screen that gets used mid-set, offline, with chalk on your hands.

### What this incidentally fixes

No value that survives the field can now be altered by the `numeric(6,2)` cast,
because every multiple of 0.5 is exact in two decimal places. The log can no
longer disagree with what was on screen. That was true before only by luck.

### What is not fixed

The unloadable *carried difference* recorded in the 2026-08-05 spec — correct
97.5 to 96 and a 70 kg backoff pre-fills at 68.5 — is untouched and stays
untouched. Snapping makes the difference a multiple of 0.5, which it already
usually was; it does not make it a multiple of 2.5, and it must not, because
the client has no plate arithmetic and is not getting any (D-11).

---

## Amendments to DESIGN.md

**D-04 (Maxes and loading)** gains the plate ink tokens and the measured
contrast of the digits, in the palette note that already carries the light
theme's 1.92:1 acknowledgement. The rounding rules themselves are unchanged.

**D-11 (no business logic in the client)** gains the 0.5 kg snap as a named,
bounded exception, with the reasoning above: it is input hygiene rather than
loading arithmetic, it is verified not to disturb any prescribable weight, and
it does not extend to rounding a weight to something loadable.

---

## Verification

Unit (`npm run test:unit`), new:

- `snap` rounds half up, leaves multiples of 0.5 alone, and handles 0.
- `numberFrom`-equivalent parsing accepts `142,5` and `142.5` as the same
  number, and still returns `undefined` for empty and for junk.
- Every prescribed weight the catalogue can produce is unchanged by `snap`.

E2E (`npm run test:e2e`), extending `session/page.e2e.ts`:

- The cues are not visible until the summary is clicked, and are closed again on
  the next set.
- A weight typed with six decimals reads back as a multiple of 0.5 after blur.
- A weight typed with a comma is recorded rather than dropped.
- The plate stack still exposes its `sr-only` sentence unchanged.

Type and lint (`npm run check`, `npm run lint`) must be clean.

Not verifiable here: there is no Postgres and no running API on this machine, so
the round-trip of a snapped weight through `numeric(6,2)` is reasoned about
rather than exercised. See `frontend/CLAUDE.md`.

Visual, by hand: the rotated digits against real plate colours at phone width in
both themes, and whether the controlled `value={set.actualWeight}` binding eats
the decimal point mid-typing. That last one is a suspected pre-existing bug that
the comma fix would otherwise mask; it must be checked, not assumed.

---

## What this spec is not

No change to the engine, `advance()`, any prescribed weight, the plate
breakdown, or the drift model. No new font family. No change to the peek screen,
which renders plates as text and is not what the feedback was about. No
persistence of the cues' open state.
