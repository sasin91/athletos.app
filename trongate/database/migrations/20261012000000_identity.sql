-- Identity: the athletes table and the access-token denylist, the two tables
-- the athlete_auth authenticator reads on every authenticated request.
--
-- A MariaDB port of the matching parts of the Rust API's
-- `20260726010000_auth.sql`; read that file for why each column exists. Refresh
-- tokens, the login throttle and the audit log arrive with the auth slice,
-- which is the first code that writes them.
--
-- Translation rules every later migration follows:
--   uuid         -> UUID (native since MariaDB 10.7), minted by the application
--   timestamptz  -> DATETIME(6), always UTC: the connection sets time_zone '+00:00'
--   text         -> VARCHAR when indexed or bounded, TEXT otherwise
--   partial unique index -> a generated column that is NULL where the
--                   predicate is false, under a plain unique index (NULLs never
--                   collide)

create table athletes (
    id             uuid         not null primary key,

    -- Shape-checked only: this is the floor, not the policy.
    email          varchar(320) not null check (locate('@', email) > 1),

    display_name   varchar(200) not null check (char_length(trim(display_name)) > 0),

    password_hash  varchar(255) not null,

    created_at     datetime(6)  not null default current_timestamp(6),
    last_active_at datetime(6)  null,

    -- Soft delete. The authenticator's `deleted_at is null` is what stops an
    -- access token that is still inside its lifetime from working after the
    -- account goes away.
    deleted_at     datetime(6)  null,

    -- Postgres has `unique (lower(email)) where deleted_at is null`. MariaDB has
    -- no partial index, so the predicate becomes this column: the lowered
    -- address while the account is live, NULL once it is deleted.
    live_email     varchar(320) as (case when deleted_at is null then lower(email) end) persistent,
    unique key athletes_email_key (live_email)
) engine = InnoDB default charset = utf8mb4 collate = utf8mb4_bin;

create table access_token_denylist (
    jti           uuid         not null primary key,
    athlete_id    uuid         not null,
    expires_at    datetime(6)  not null,
    denylisted_at datetime(6)  not null default current_timestamp(6),
    reason        varchar(64)  not null,
    key access_token_denylist_expires_at_idx (expires_at),
    constraint access_token_denylist_athlete_fk foreign key (athlete_id) references athletes (id) on delete cascade
) engine = InnoDB default charset = utf8mb4 collate = utf8mb4_bin;
