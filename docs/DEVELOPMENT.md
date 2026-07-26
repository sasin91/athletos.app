# Development setup

## Database

Postgres runs as a container under **WSLC** — the container runtime that ships
with WSL, with a Docker-compatible CLI at `C:\Program Files\WSL\wslc.exe`. Not
Docker Desktop, and not plain WSL.

```
wslc run -d --name athletos-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=athletos -e POSTGRES_DB=athletos postgres:17

wslc list                 # running?
wslc logs athletos-pg
wslc start athletos-pg    # after a reboot
```

Then:

```
DATABASE_URL=postgres://postgres:athletos@127.0.0.1:5432/athletos
```

`#[sqlx::test]` creates and drops a database per test case, so the role needs
`CREATEDB`. The default `postgres` superuser has it.

> This section used to say "no Postgres, no Docker" and everything touching a
> database was written blind — reasoned, compiled, never executed. The first
> run against a real 17.10 turned up exactly one bug in 111 tests: a
> `?status=activ` query answering 500 instead of 422, because one parser was
> serving both "read the vocabulary out of the column" (an unknown value there
> is our bug) and "read it off the wire" (an unknown value there is the
> client's). Everything else, including both acceptance tests, passed
> first time.

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
cargo run   --bin openapi -- openapi.json  # no database needed; committed
cargo run   --bin set-password             # the only password recovery (D-02)

# frontend
cd frontend
npm install
npm run dev
npm run check                # svelte-check
npm run lint                 # prettier --check && eslint
npm run generate:api         # ../backend/openapi.json -> src/lib/api/schema.d.ts
npm run test:unit            # vitest — pure logic, no browser, no API
npm run test:e2e             # playwright — builds, previews, downloads a browser
npm run test                 # both
```

The frontend reads one variable:

| Variable | Required | Default |
|---|---|---|
| `API_BASE_URL` | no | `http://127.0.0.1:8080` |

Read at request time rather than build time, so one built image can be pointed
at a different API. `secure` on the session cookies follows SvelteKit's `dev`
flag, so a production build must be served over https or the cookies will not be
stored.

## CI

`.github/workflows/ci.yml`. Three jobs, and the first one matters more than
CI usually does: **it is the first place the database tests actually run.**
Everything written against Postgres so far compiles and has never executed,
because this machine has neither Postgres nor Docker. GitHub Actions gives the
backend job a `postgres:17` service container, so the moment this is pushed,
every `#[sqlx::test]` runs for real.

Expect failures on that first run. They are the point of it.

- **backend** — `fmt --check`, `clippy -D warnings`, the pure engine tests on
  their own, then the full suite against a real database.
- **openapi** — asserts `backend/openapi.json` regenerates byte-identically
  from the code, then runs `oasdiff breaking` against the PR's base to enforce
  D-12's additive-only rule by machine rather than by memory.
- **frontend** — `check`, `lint`, `build`.

## Notes

- A C compiler is still a build requirement. `libwebp-sys` and `cmake` are
  gone, but `ring` — the rustls provider behind `sqlx`'s `tls-rustls` and
  `reqwest`'s `rustls-tls` — builds C and assembly through `cc`.
- `cargo run --bin openapi` works from a checkout alone, by design (D-11). It
  is how the frontend's TypeScript client is generated, and it is the one piece
  of backend tooling that is not blocked on the database. The generated document
  is committed at **`backend/openapi.json`** and is what phase 4 consumes;
  regenerate and commit it in the same change as any handler or DTO edit, then
  run `npm run generate:api` in `frontend/` and commit that too.
- **Every `#[utoipa::path]` must carry an explicit `operation_id`.** Left off,
  utoipa derives one from the handler's function name, and two modules both
  having a `list` or a `show` produces duplicate `operationId`s — invalid
  OpenAPI, and code generators silently collapse the operations rather than
  failing. Phase 4 found `GET /v1/programs` typed as the enrolment list this
  way.
- Every weight column is `numeric(6,2)` and sqlx will not decode one into an
  `f64` without `bigdecimal` or `rust_decimal`. The casts are written into the
  SQL instead — `weight::float8` on the way out, `$n::numeric` on the way in.
  A new query that forgets one fails at runtime, not at compile time.
