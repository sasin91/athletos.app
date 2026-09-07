-- Reusable athlete-authored workouts. Revisions are append-only in the API;
-- archived definitions and their revisions remain available to recorded sessions.
create table workout_definitions (
    id uuid primary key,
    athlete_id uuid not null references athletes(id),
    current_revision integer not null check (current_revision > 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    archived_at timestamptz,
    unique (id, athlete_id)
);
create index workout_definitions_library on workout_definitions (athlete_id, updated_at desc, id)
    where archived_at is null;

create table workout_revisions (
    definition_id uuid not null references workout_definitions(id),
    revision integer not null check (revision > 0),
    schema_version integer not null default 1 check (schema_version = 1),
    document jsonb not null check (jsonb_typeof(document) = 'object'),
    created_at timestamptz not null default now(),
    primary key (definition_id, revision)
);
alter table workout_definitions add constraint workout_definitions_current_revision
    foreign key (id, current_revision) references workout_revisions(definition_id, revision)
    deferrable initially deferred;

create table workout_shares (
    id uuid primary key,
    definition_id uuid not null,
    revision integer not null,
    athlete_id uuid not null,
    token_hash bytea not null unique check (octet_length(token_hash) = 32),
    created_at timestamptz not null default now(),
    revoked_at timestamptz,
    foreign key (definition_id, revision) references workout_revisions(definition_id, revision),
    foreign key (definition_id, athlete_id) references workout_definitions(id, athlete_id)
);
create index workout_shares_definition on workout_shares(definition_id);
