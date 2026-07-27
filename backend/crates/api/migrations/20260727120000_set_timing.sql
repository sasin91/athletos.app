-- When each set was logged, so an athlete can see where the hour went (D-10).
--
-- Nullable, and it will stay nullable. Every workout recorded before this
-- column existed has no timing and never will, and a `not null default now()`
-- would invent one — stamping the migration's own clock onto sessions logged
-- weeks earlier and making every historical breakdown a fabrication. A null
-- here means "not measured", which is the truth, and the read side is built to
-- say so rather than to guess.
--
-- Stamped on the phone at the moment the athlete taps, not by the server. The
-- logger runs with no network (D-09) and a submission can arrive hours after
-- the session ended, so a server-side clock would measure when the queue
-- flushed rather than when the work happened.
--
-- That means the value is only as trustworthy as a phone's clock, which can
-- jump under NTP correction or a manual change. No constraint can catch that —
-- a set legitimately logged at 06:00 and another at 06:03 look exactly like a
-- pair straddling a clock jump — so the aggregation discards intervals that are
-- negative or absurd instead. The raw stamps stay as recorded; the derived
-- numbers are the ones that have to be robust.
alter table workout_sets
    add column logged_at timestamptz;

-- Deliberately no index. The only reader is the per-workout breakdown, which
-- has already selected the workout's rows through
-- `unique (workout_id, "position")` and needs this column as a payload rather
-- than as a search key.
comment on column workout_sets.logged_at is
    'When the athlete logged or skipped this set, from the phone at tap time. '
    'Null for sets recorded before timing existed, and for any client that '
    'does not send it.';
