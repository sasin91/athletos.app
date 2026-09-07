-- Definitions are reusable content; workouts remain immutable training facts.
alter table enrollments add column revision bigint not null default 0;
alter table enrollments add constraint enrollments_id_athlete_unique unique (id, athlete_id);
alter table workouts add column athlete_id uuid references athletes(id) on delete cascade;
update workouts w set athlete_id = e.athlete_id from enrollments e where e.id = w.enrollment_id;
alter table workouts alter column athlete_id set not null;
alter table workouts alter column enrollment_id drop not null;
alter table workouts alter column week drop not null;
alter table workouts alter column day drop not null;
alter table workouts add constraint workouts_enrollment_owner foreign key (enrollment_id, athlete_id)
    references enrollments(id, athlete_id);
alter table workouts add column schema_version smallint not null default 1 check (schema_version in (1,2));
alter table workouts add column source text not null default 'program' check (source in ('program','saved_workout','ad_hoc'));
alter table workouts add column title text;
alter table workouts add column definition_id uuid;
alter table workouts add column definition_revision integer;
alter table workouts add constraint workouts_definition_revision foreign key (definition_id, definition_revision)
    references workout_revisions(definition_id, revision);
alter table workouts add column baseline jsonb;
alter table workouts add column submission jsonb;
alter table workouts add column receipt jsonb;
alter table workouts add column progression text not null default 'applied'
    check (progression in ('applied','not_applied_stale','none'));
alter table workouts add constraint workouts_source_context check (
    (source = 'program' and enrollment_id is not null and week is not null and day is not null
        and definition_id is null and definition_revision is null and progression <> 'none')
    or (source = 'saved_workout' and enrollment_id is null and week is null and day is null
        and definition_id is not null and definition_revision is not null and progression = 'none')
    or (source = 'ad_hoc' and enrollment_id is null and week is null and day is null
        and definition_id is null and definition_revision is null and progression = 'none')
);
create index workouts_athlete_history_idx on workouts(athlete_id, started_at desc, id);

create table session_drafts (
    id uuid primary key,
    athlete_id uuid not null references athletes(id) on delete cascade,
    enrollment_id uuid not null,
    enrollment_revision bigint not null,
    document jsonb not null,
    workout_id uuid unique references workouts(id),
    created_at timestamptz not null default now(),
    foreign key (enrollment_id, athlete_id) references enrollments(id, athlete_id)
);
create index session_drafts_athlete_idx on session_drafts(athlete_id);
alter table workout_sets add column stable_id uuid;
alter table workout_sets add column origin_id uuid;
alter table workout_sets add column block_id uuid;
alter table workout_sets add column removed boolean not null default false;
alter table workout_sets add column committed_weight numeric(6,2);
alter table workout_sets add column committed_reps smallint;
alter table workout_sets add column amrap boolean not null default false;
alter table workout_sets add column logged_order integer check (logged_order >= 0);
alter table workout_sets add constraint workout_sets_stable_unique unique(workout_id, stable_id);
alter table workout_sets add constraint workout_sets_origin_unique unique(workout_id, origin_id);
alter table workout_sets add constraint workout_sets_removed_unperformed check (
    not removed or (status = 'skipped' and actual_weight is null and actual_reps is null and logged_at is null)
);
alter table enrollment_advances add column projection_version smallint not null default 1
    check (projection_version in (1,2));

-- Compatibility with older deployed writers during the expand-first rollout.
create function workout_owner_from_enrollment() returns trigger language plpgsql as $$
begin
    if new.athlete_id is null and new.enrollment_id is not null then
        select athlete_id into new.athlete_id from enrollments where id = new.enrollment_id;
    end if;
    return new;
end $$;
create trigger workout_owner_before_insert before insert on workouts
    for each row execute function workout_owner_from_enrollment();
create function enrollment_state_revision() returns trigger language plpgsql as $$
begin
    new.revision := old.revision + 1;
    return new;
end $$;
create trigger enrollment_revision_before_update before update of state on enrollments
    for each row execute function enrollment_state_revision();
