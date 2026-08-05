-- Why the athlete lifted something other than what was asked (D-07, amended).
--
-- Additive, nullable, no default (D-12, D-17). A rolling update runs two
-- releases against one database by design, so the previous release must keep
-- submitting valid workouts through this column's arrival — it does, because
-- nothing about it is required.
--
-- `text` with a `check` rather than a Postgres enum, for the reason the
-- training migration already argues at length: D-12 makes these vocabularies
-- grow, widening a check is an ordinary migration, and `alter type ... add
-- value` cannot run in the transaction that adds it.
alter table workout_sets
    add column drift_reason text
        check (drift_reason in ('too_easy', 'too_heavy', 'already_loaded', 'felt_off'));

-- A reason with no deviation to be about is not a reason.
--
-- The client clears it when the weight goes back to the prescription, when the
-- set is skipped, and on undo. This is what makes that a fact rather than a
-- client convention.
--
-- `is distinct from` rather than `<>`: `<>` yields null when either side is
-- null and a check *passes* on null, which is the exact trap
-- `workouts_cut_reason_iff_cut_short` was written to avoid. A pending or
-- skipped set has no `actual_weight` and therefore cannot carry a reason.
alter table workout_sets
    add constraint workout_sets_drift_reason_needs_drift
        check (drift_reason is null
               or (actual_weight is not null
                   and actual_weight is distinct from prescribed_weight));
