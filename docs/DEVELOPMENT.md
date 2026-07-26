# Development setup

## The blocker

This machine has **no Postgres and no Docker**. Everything that touches a
database is written and compiles, but has never been executed — including the
two acceptance tests that matter most (D-09 double-POST idempotency, and the
offline round-trip). Fixing this is the first task of the next session.

Three ways out, cheapest first:

**Postgres.app-style native install.** `winget install PostgreSQL.PostgreSQL.17`
gives you a service on 5432 and `psql` on PATH. Simplest, no daemon to babysit,
and the only one that needs no further decisions.

**Docker Desktop.** Heavier, but gets you a throwaway database per test run,
which is what `#[sqlx::test]` wants:

```
docker run -d --name athletos-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=athletos -e POSTGRES_DB=athletos postgres:17
```

**Laravel Herd.** Already installed and running `HerdHelper`, but ships no
Postgres — Herd Pro's database services would need enabling. Mentioned only
because it's the DB you already run for `sasin91.xyz`; it is a MySQL-shaped
answer to a Postgres-shaped question.

Whichever you pick, `#[sqlx::test]` creates and drops a database per test, so
the role needs `CREATEDB`.

## Environment

Backend reads these (see `crates/api/src/config.rs`):

| Variable | Required | Default |
|---|---|---|
| `DATABASE_URL` | **yes** | — |
| `DATABASE_MAX_CONNECTIONS` | no | `10` |
| `BIND_ADDR` | no | `0.0.0.0:8080` |
| `APP_ENV` | no | — (`production` locks down the next one) |
| `AUTH_SIGNING_KEY_PEM` / `AUTH_SIGNING_KEY_ID` | pair | — |
| `AUTH_ALLOW_EPHEMERAL_SIGNING_KEY` | no | `false` |
| `AUTH_ACCESS_TOKEN_TTL_SECONDS` | no | `900` |
| `AUTH_REFRESH_TOKEN_TTL_SECONDS` | no | — |
| `AUTH_ISSUER` / `AUTH_AUDIENCE` | no | `athletos-api` / `athletos` |
| `AUTH_HIBP_ENABLED` | no | `false` |
| `AUTH_HIBP_TIMEOUT_MS` | no | `2000` |

For local work, set `AUTH_ALLOW_EPHEMERAL_SIGNING_KEY=true` and leave
`APP_ENV` unset — the key ring then generates a throwaway signing key that
lives and dies with the process, so there is no PEM to manage. It is refused
when `APP_ENV=production`.

`.env` is read via `dotenvy`. It is gitignored; there is no `.env.example` yet.

## Commands

```
# backend
cd backend
cargo check --workspace --all-targets
cargo test  -p athletos-training       # pure, no database
cargo test  --workspace                # needs DATABASE_URL
cargo run   --bin api
cargo run   --bin openapi > openapi.json   # no database needed
cargo run   --bin set-password             # the only password recovery (D-02)

# frontend
cd frontend
npm install
npm run dev
npm run check
```

## Notes

- A C compiler is still a build requirement. `libwebp-sys` and `cmake` are
  gone, but `ring` — the rustls provider behind `sqlx`'s `tls-rustls` and
  `reqwest`'s `rustls-tls` — builds C and assembly through `cc`.
- `cargo run --bin openapi` works from a checkout alone, by design (D-11). It
  is how the frontend's TypeScript client is generated, and it is the one piece
  of backend tooling that is not blocked on the database.
