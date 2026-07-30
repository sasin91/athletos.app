-- An optional note on one set.
--
-- Additive, nullable, no default (D-12, D-17). A rolling update runs two
-- releases against one database by design, so the previous release must keep
-- submitting valid workouts through this column's arrival — it does, because
-- nothing about it is required.
--
-- Where the athlete says "left shoulder felt off on this one" or "belt on from
-- here". The session already has a `workouts.notes` for the whole thing; this
-- is the one that can name a set, which is the only place a sentence about a
-- twinge is any use later.
--
-- Bounded in the schema as well as in the handler. The check is what is still
-- true after the next client is written, and 500 characters is a note rather
-- than a training diary — the product does not want to become one.
alter table workout_sets
    add column note text
        check (note is null or length(trim(note)) between 1 and 500);
