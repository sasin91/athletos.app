# AthletOS

Strength training for athletes who already train and want structure rather than
instinct. The product's job is restraint — not going too heavy to recover, and
not letting a session run past an hour. See `docs/DESIGN.md` for the decisions
that follow from that.

## Language

### The athlete and their numbers

**Athlete**:
A person who trains. The only kind of account that exists.
_Avoid_: User, member, client, person

**Entered 1RM**:
A one-rep max the athlete typed in, for one lift. Evidence of what they can do,
and the only weight number they own.
_Avoid_: Max (ambiguous — see Training max), PR, personal best

**Training max**:
The number a program actually prescribes from, derived by that program from the
Entered 1RM. It belongs to the program, moves on its own, and cannot be edited.
Distinct from the Entered 1RM and usually not equal to it.
_Avoid_: TM in prose, working max, adjusted max

**Readout**:
What a program reports about the numbers it is currently working from — a
weight, and a label saying what kind of number it is. The only way to see a
Training max.

**Maxes**:
The athlete's whole set of Entered 1RMs, one per lift. A set they add to and
remove from, not a fixed list of three.

### Programs

**Program**:
A named method of training, compiled into the application. Not something an
athlete or coach authors.
_Avoid_: Plan, routine, template, split

**Prescriptive program**:
A program whose sessions are a pure function of the athlete's maxes, so the
whole block is knowable in advance. Has an end and an honest progress
denominator.
_Avoid_: Static, fixed, dumb

**Adaptive program**:
A program that carries state and changes what it prescribes based on what was
logged. Open-ended, with no meaningful denominator.
_Avoid_: Dynamic, smart, progressive

**Enrollment**:
One athlete's run of one program, from starting it to finishing or abandoning
it. The thing that holds the program's state.
_Avoid_: Enrolment, subscription, assignment, cycle

> Spelled with two `l`s, everywhere. The tree is currently split — 148
> identifiers use `enrollment` and about 70 prose comments use `enrolment` —
> and the identifiers win because `/v1/enrollments` is in the published
> contract and D-12 forbids renaming a path. The comments are the cheap side
> to fix.

**Exercise**:
A movement the catalogue knows by key — squat, bench, hanging leg raise.
_Avoid_: Lift (means something else here), movement

**Lift**:
A prescription of sets, reps and a weight for one exercise. What a program asks
for, before anything has been done.
_Avoid_: Set (means something else here)

**Loadable weight**:
A weight that can actually be assembled from the plates on hand. Prescriptions
are always rounded **down** to one.

### Training

**Session**:
One day's prescribed work — the exercises, and the lifts within them.
_Avoid_: Day, training day

**Peek**:
Looking at the next session without starting it. Reads only; stamps no clock,
writes no record.
_Avoid_: Preview (means the whole-block view), view, open

**Preview**:
The whole remaining plan for a Prescriptive program. Does not exist for an
Adaptive one.

**Commit**:
Starting a session for real. Materialises every prescribed set and stamps the
start time. The opposite of a Peek.
_Avoid_: Start (ambiguous with beginning a program), begin

**Set**:
One performed unit of work, carrying both what was prescribed and what was
actually done. Distinct from a Lift, which is only the prescription.

**Drift**:
The gap between what was prescribed and what was done — heavier, lighter, or
not done at all. The signal the product exists to surface.
_Avoid_: Deviation, variance, compliance, adherence

**Cut short**:
Ending a session before its last set, with a stated reason. A first-class
outcome, not a failure. The program advances regardless.
_Avoid_: Abandoned (means giving up an Enrolment), quit, incomplete

**Pace**:
The athlete's own median seconds per set, measured across recent sessions, used
to project when a session will finish.

## Not in this language

**Streak, badge, goal, reminder, rest timer** — deliberately absent. The
product does not motivate, and a rest timer was tried in the predecessor and
removed for adding stress.

**Coach, team, invitation** — real concepts, but deferred. Nothing in v1 uses
them.
