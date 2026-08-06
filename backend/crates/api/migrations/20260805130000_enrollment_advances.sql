-- What every fold did, so a wrong one can be found (D-19).
--
-- `advance(state, logged) -> state` is a pure fold and `enrollments.state`
-- keeps only its latest result. D-09 already names the fear — "a 5/3/1 training
-- max jumping 5 kg instead of 2.5, silently, permanently" — and answers only
-- the half where it happens twice. Without this table a wrong advance is not
-- merely undetected, it is unfixable: the inputs are gone and the repair is
-- editing JSON in production.
--
-- Additive, no backfill (D-12, D-17). Enrolments already running have advanced
-- many times with no record and never will have one. `verify-advances` must
-- read "no rows" as *nothing to check*, never as *nothing wrong*.
create table enrollment_advances (
    -- The workout that caused this advance, and the primary key: one advance
    -- per workout is a schema fact rather than a convention, so a retry that
    -- somehow reached the advancing branch would be refused by the database
    -- rather than quietly appending a second row.
    workout_id     uuid        primary key references workouts (id) on delete cascade,
    enrollment_id  uuid        not null references enrollments (id),

    -- The fold's input and output, verbatim. Opaque here exactly as they are in
    -- `enrollments.state` (D-03): this table stores them and never reads them.
    state_before   jsonb       not null,
    state_after    jsonb       not null,

    -- The API crate's version at the moment of the fold. Coarse on purpose —
    -- two builds of one version can differ — because it is a hint for a person
    -- investigating a divergence the verifier has already found, not the
    -- mechanism that finds it.
    engine_version text        not null,

    advanced_at    timestamptz not null default now()
);

-- The verifier walks one enrolment at a time, in fold order.
create index enrollment_advances_enrollment_idx
    on enrollment_advances (enrollment_id, advanced_at);
