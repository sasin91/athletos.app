-- Training: maxes, enrollments, and the workouts they produce.
--
-- Programs and exercises are compiled-in code, not rows (D-03), so there is no
-- `programs` table and no `exercises` table. What the database holds is only
-- what the code cannot: the athlete's numbers, one opaque blob of program state
-- per enrollment, and the log of what was actually lifted.
--
-- Server-generated ids are UUIDv7 minted in Rust, exactly as in the auth
-- migration — no column here defaults to `gen_random_uuid()`, and `workouts.id`
-- must never acquire such a default for reasons given at that table.
--
-- ## Vocabulary columns are `text` with a `check`, not Postgres enums
--
-- `status`, `outcome` and `cut_reason` are all small closed vocabularies and an
-- enum type is the obvious reach. It is the wrong one here:
--
--  * D-12 makes the API additive-only, so these vocabularies grow. Widening a
--    `check` is one `alter table` in a migration like any other; `alter type
--    ... add value` cannot be used in the same transaction that adds it, and
--    *removing* or renaming a value is effectively impossible once shipped.
--  * The kept code already took this position. `auth::audit::AuthAction` is
--    "free-form text in the schema, enumerated in Rust so the vocabulary stays
--    stable enough to query", and the sole inherited enum type (`team_role`)
--    had to be dropped wholesale in phase 0. The evidence points one way.
--  * sqlx binds `&str` to `text` with nothing further. An enum needs a
--    `#[sqlx(type_name)]` impl per vocabulary before a query can be written.
--
-- The trade accepted in exchange: the database will not enumerate the legal
-- values for a client, and a typo in Rust surfaces as a constraint violation at
-- runtime rather than at compile time. The Rust side is the source of truth
-- either way, and these are runtime-checked query strings regardless.

-- The athlete's entered one-rep maxes, per lift (D-04).
--
-- Entered directly and never derived: each program takes its own view of this
-- number — 5/3/1 works from 90% of it, Sheiko takes it straight — so the
-- conservatism lives in the program rather than in a settings form the athlete
-- has to reason about. An adaptive program's moving training max is not here at
-- all; it lives in `enrollments.state` and moves only through `advance()`.
create table athlete_maxes (
    athlete_id uuid         not null references athletes (id) on delete cascade,

    -- The exercise key from the compiled registry (D-03). Not a foreign key,
    -- because the thing it names is code.
    exercise   text         not null check (length(trim(exercise)) > 0),

    -- Kilograms, as a bare number. No unit is written into any domain type, so
    -- offering lb later is a UI change and not a migration (D-04). `numeric`
    -- rather than a float because these are compared and displayed, and 0.1 kg
    -- of binary rounding error in a prescribed weight is a support ticket.
    weight     numeric(6,2) not null check (weight > 0),

    updated_at timestamptz  not null default now(),

    primary key (athlete_id, exercise)
);

-- No separate index for "maxes for an athlete": `athlete_id` leads the primary
-- key, so `where athlete_id = $1` is already one probe of that index, and the
-- same index serves the cascade when an athlete is deleted.

-- One athlete's run of one program. `id` is server-minted, unlike `workouts.id`
-- below — nothing outside the server ever names an enrollment before it exists.
create table enrollments (
    id          uuid        primary key,
    athlete_id  uuid        not null references athletes (id) on delete cascade,

    -- The registry key of the compiled program (D-03), again deliberately not a
    -- foreign key.
    program_key text        not null check (length(trim(program_key)) > 0),

    -- Opaque, program-owned, and read or written by nothing but the program
    -- that authored it (D-03). Deliberately unconstrained: the day the server
    -- starts validating this shape is the day program authors are answerable to
    -- a schema, which is the coupling `State` exists to avoid.
    state       jsonb       not null,

    status      text        not null check (status in ('active', 'finished', 'abandoned')),

    started_at  timestamptz not null default now(),
    ended_at    timestamptz,

    -- An enrollment is either running or it is over, and "over" has a time. The
    -- two halves are set together or not at all, so a query filtering on
    -- `status` and a query filtering on `ended_at is null` can never disagree
    -- about which enrollments are live.
    constraint enrollments_ended_at_matches_status
        check ((status = 'active') = (ended_at is null))
);

-- The hot path: every next-session lookup starts by finding the live
-- enrollment. Partial, so it holds one row per active program rather than one
-- per enrollment ever created.
--
-- Not unique, though it is tempting while v1 has one athlete and one program.
-- Nothing in the design forbids running a squat block and a bench block side by
-- side, and a unique index here would turn that product question into a
-- constraint violation. Uniqueness can be added later; it cannot be removed
-- from data that has already been rejected.
create index enrollments_active_idx on enrollments (athlete_id)
    where status = 'active';

-- "Which programs have I run", and the index the cascade from `athletes` uses.
create index enrollments_athlete_id_idx on enrollments (athlete_id, started_at desc);

-- One logged session.
--
-- `id` is generated by the CLIENT as a UUIDv7 and is the idempotency key
-- (D-09). This is the single most load-bearing decision in this file:
--
--  * Logging happens offline, in a gym with concrete walls. The submit is one
--    `POST /v1/workouts` afterwards, and a failed submit sits in a local queue
--    and retries.
--  * Submitting a workout runs `advance()` and mutates `enrollments.state`. A
--    retried POST that inserted twice would advance twice — a 5/3/1 training
--    max jumping 5 kg instead of 2.5, silently and permanently.
--  * So the insert is `on conflict (id) do nothing`, and `advance()` runs only
--    when the insert actually inserted.
--
-- Therefore: this column must NEVER be given a default. A `default
-- gen_random_uuid()` would make every retry a fresh row and every retry a
-- second advance, and it would do so without failing a single test that does
-- not deliberately submit twice.
create table workouts (
    id            uuid        primary key,

    enrollment_id uuid        not null references enrollments (id) on delete cascade,

    -- Where in the program this session sat. Not unique with `enrollment_id`:
    -- an open-ended program cycles through the same week and day repeatedly,
    -- and D-08 advances past an interrupted session rather than repeating it,
    -- so a collision here is normal history and not a duplicate.
    week          smallint    not null check (week >= 1),
    day           smallint    not null check (day >= 1),

    -- Wall clock, and the only measure of "the hour" there is (D-10). Stamped
    -- on commit, never on peek: `GET .../next-session` is read-only, because a
    -- timer that starts when the athlete first got curious measures the wrong
    -- thing and trains them to work around it (D-08).
    started_at    timestamptz not null,
    ended_at      timestamptz,

    -- Null while the session is still open. `auto_closed` is not in the
    -- milestone sketch and is added here because D-08 requires a session left
    -- open past three hours to close itself and be flagged, and the sketch left
    -- nowhere to record that it was the server and not the athlete who ended it
    -- — without it, a fourteen-hour workout is indistinguishable from a real
    -- one in every duration query.
    outcome       text        check (outcome in ('completed', 'cut_short', 'auto_closed')),

    -- The one question asked when a session ends early (D-08). The program
    -- advances regardless of the answer; this is recorded to make "work not
    -- done" a queryable second axis of drift, not to gate anything.
    cut_reason    text        check (cut_reason in ('out_of_time', 'pain', 'equipment', 'enough')),

    notes         text,

    -- The one timestamp on this row the server owns. `started_at` and
    -- `ended_at` are measured by a phone that was offline and whose clock we
    -- cannot check, so "when did the server hear about this" is a separate
    -- question from "when was this lifted" — and only the first can be trusted
    -- to order rows against everything else in the database.
    created_at    timestamptz not null default now(),

    -- Closed means closed. A row with an end time but no outcome, or an outcome
    -- but no end time, is a half-written submit and there is no reader that
    -- would know what to do with it.
    constraint workouts_ended_at_matches_outcome
        check ((ended_at is null) = (outcome is null)),

    -- A cut-short session has a reason, and nothing else has one.
    --
    -- Both sides are written as null-proof predicates on purpose. `outcome` is
    -- nullable, so the naive `outcome = 'cut_short'` yields `null` for an open
    -- session, and a check constraint *passes* on `null` — which would have let
    -- an in-progress workout carry a cut reason. `is not distinct from` is what
    -- makes the two sides plain booleans and the constraint total.
    constraint workouts_cut_reason_iff_cut_short
        check ((outcome is not distinct from 'cut_short') = (cut_reason is not null)),

    constraint workouts_ends_after_it_starts
        check (ended_at is null or ended_at >= started_at)
);

-- "The latest workout for this enrollment", which is how the program finds its
-- place and how the session-duration figures are read (D-13). Ordered by
-- `started_at` rather than by `id`: the id is a client-minted v7 and therefore
-- carries a clock we do not control, and `started_at` is the answer the domain
-- means anyway. The same index serves the cascade from `enrollments`.
create index workouts_enrollment_id_idx on workouts (enrollment_id, started_at desc);

-- Every set of a session, prescribed and actual (D-07).
--
-- Four numbers, not two. The prescription is the path of least resistance and
-- never a wall: the athlete going heavier edits the number and it is logged as
-- edited, because a cap produces either dishonest logs or an abandoned app, and
-- honesty must never cost more than dishonesty. Storing both is what makes
-- drift first-class, queryable data rather than something inferred later.
create table workout_sets (
    -- Surrogate and monotonic. `bigint generated always as identity` rather
    -- than the `bigserial` in the milestone sketch, matching `access_audit_log`
    -- and the SQL standard; the two are the same thing with different
    -- ownership rules for the underlying sequence.
    id                bigint       generated always as identity primary key,

    workout_id        uuid         not null references workouts (id) on delete cascade,

    exercise          text         not null check (length(trim(exercise)) > 0),

    -- Order within the session, as prescribed. Held here rather than inferred
    -- from `id` because the client materialises every set at commit time and
    -- submits them as one list, so insertion order is an accident of the wire.
    position          smallint     not null check (position >= 0),

    -- What the program asked for. Already rounded down to a loadable weight by
    -- the engine (D-04) — an unloadable prescription such as 113.4375 kg would
    -- otherwise register as drift on every single set forever.
    prescribed_weight numeric(6,2) not null check (prescribed_weight >= 0),
    prescribed_reps   smallint     not null check (prescribed_reps > 0),

    -- What actually happened. Null until the set is logged. Zero is a legal
    -- actual: a set attempted and failed is an honest log, and `>= 0` rather
    -- than `> 0` is what keeps it recordable. `prescribed_weight` is likewise
    -- `>= 0` because bodyweight exercises carry no load.
    actual_weight     numeric(6,2) check (actual_weight >= 0),
    actual_reps       smallint     check (actual_reps >= 0),

    -- `pending` is a first-class outcome, not a missing row: the client submits
    -- the sets that were prescribed and not done, which is precisely how "work
    -- not done" becomes measurable (D-08).
    status            text         not null check (status in ('pending', 'done', 'skipped')),

    -- A set marked done with no numbers is not a log, it is a hole in every
    -- drift query that will ever run over this table (D-07). The converse is
    -- left permissive on purpose: a pending set that carries a half-entered
    -- weight is odd but not a lie, and rejecting the submit outright would cost
    -- the athlete the whole session's data over a field they touched.
    constraint workout_sets_done_is_logged
        check (
            status <> 'done'
            or (actual_weight is not null and actual_reps is not null)
        ),

    -- "All sets for this workout in order" is the read every session view and
    -- every drift query makes, and this is the index for it. Unique rather than
    -- a plain index because two sets claiming the same slot would make that
    -- ordering arbitrary, and because it is the client — offline, retrying —
    -- that decides these numbers.
    unique (workout_id, position)
);
