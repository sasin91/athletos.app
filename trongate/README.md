# AthletOS on Trongate

A port of the Rust API (`backend/`) to [Trongate](https://trongate.io) v2, run on
MariaDB, so that AthletOS can be served from trongate.cloud to native mobile
apps. The port moves **one slice at a time**. Each slice must answer exactly
what the Rust API answers, both byte for byte on the wire and in the OpenAPI
document, before the next slice starts.

The Rust API is still the product. Nothing here serves traffic yet.

## Status

| Slice | Operations | State |
|---|---|---|
| 0. Foundation | `#[OpenAPI]` routing and Swagger, migrations, test runner, access-token verification | done |
| 1. Catalogue | `GET /health`, `GET /health/ready`, `GET /v1/programs`, `GET /v1/programs/{key}`, `GET /v1/exercises` | done (5 of 40) |
| 2. Auth | register, login, refresh, logout, me, JWKS | next |
| 3. Maxes | `GET/PUT /v1/athlete/maxes` | |
| 4. Enrollments | create, list, next-session, exercise adjustments, and the engine's `Program` trait | |
| 5. Workouts | idempotent submit, which needs the transaction and `advance()`, plus history | |
| 6. Progress | `/v1/progress`, `/v2/progress` | |
| 7. My workouts | workout definitions, shares, and the `/v2` editable sessions | |

`php tests/run.php` prints the current count.

### How data moves

The two backends have separate databases: Postgres for Rust, MariaDB here. That
means no slice can take real traffic on its own. Parity is proven by the tests
instead, and the switch happens once, at the end: copy the data across, then
point clients at this app. Until the auth slice lands, this app verifies access
tokens that the Rust API signed. The test suite includes one such token as a
test vector.

## Running it

You need PHP 8.1 or later with `pdo_mysql`, `sodium` and `curl`, plus MariaDB
**10.7 or later**, because the schema uses the native `UUID` type.

```sh
# configuration comes from the environment (see config/*.php for every variable)
export DB_USER=athletos DB_PASSWORD=athletos DB_NAME=athletos
export AUTH_VERIFICATION_KEYS='kid:base64url-ed25519-public-key'   # the Rust API's JWKS `x`

php bin/migrate.php
cd public && php -S 127.0.0.1:8090 index.php
```

- `GET /api-docs/openapi.json` serves the document.
- `GET /swagger-ui` serves Swagger UI.
- These are the Rust API's own paths.

### Tests

```sh
php tests/run.php            # everything
php tests/run.php catalogue  # tests whose name contains "catalogue"
```

The runner does the following:
1. Creates a throwaway database and applies the migrations.
2. Serves `public/index.php` with PHP's built-in server.
3. Runs `tests/*_test.php` over real HTTP.
4. Drops the database.

There is no Composer, so the whole framework is `tests/lib/Test_kit.php`.

`tests/fixtures/` holds the JSON the Rust API answers with, generated from its
own types:

```sh
cargo run --manifest-path parity/fixtures-gen/Cargo.toml -- tests/fixtures
```

CI regenerates the fixtures and fails if they have drifted. It also runs the
suite against MariaDB 10.11.

## Layout

```
engine/            Trongate 2.2026.0927, unmodified (trongate-framework@cc968cf)
modules/db, url, utilities   Trongate modules, unmodified
modules/autoload   makes each module's src/ directory loadable
modules/api        #[OpenAPI] routing, authentication hook, document, Swagger UI
modules/athlete_auth   the authenticator: Ed25519 JWT plus athlete and denylist check
modules/training   the engine, plain PHP with no Trongate in it (D-15)
modules/programs, exercises, health   one module per Rust route file
database/migrations   MariaDB DDL, applied by bin/migrate.php
tests/             runner, kit, fixtures, *_test.php
parity/fixtures-gen   Rust program that writes tests/fixtures
```

`engine/` and the three vendored modules are copied verbatim. Every workaround
lives in modules of our own, so upgrading Trongate is a copy.

## The `api` module

One attribute on a controller method is the whole contract. The module routes by
it, authenticates by it and documents from it:

```php
#[OpenAPI(
    path: '/v1/programs/{key}',
    methods: ['GET'],                       // default
    description: "One program's catalogue entry.\n\nMore prose...",
    required_user_level: 'athlete',         // null = public
    responses: [200 => ['The program', ProgramSummary::class], 404 => 'No program has that key'],
    params: ['key' => ["The program's registry key", 'smolov-jr']],
)]
public function show_program(string $key): ProgramSummary
```

- **Arguments.** Path parameters arrive by name. A parameter named `$principal`
  receives whatever the authenticator returned.
- **Return values.** Return a value to send it as JSON with `status` (default
  200). Return an `Api_response` to choose the status or headers yourself.
- **Errors.** Throw `Api_problem` to send an RFC 9457 body:
  `{title, status, detail}`.
- **The document.**
  - The first paragraph of `description` becomes the operation's summary and the
    rest becomes its description, the way utoipa splits a doc comment.
  - `operation_id` defaults to the method name.
  - `tag` defaults to the module name.
  - An operation with a `required_user_level` gets the security scheme and a 401
    automatically.
  - An error response with no class gets `ProblemDetails`.
- **Authentication.** Any operation with a `required_user_level` runs
  `config/openapi.php`'s `authenticator` first, with the level. Returning null
  answers 401.
- **Schemas.**
  - Classes marked `#[Api_schema]` are read off their public properties, in
    declaration order. That order is exactly what `json_encode` writes, so the
    document and the wire format come from one declaration.
  - `#[Api_field]` adds what a PHP type cannot say: `items`, `format`,
    `minimum`, `description` and `example`.
  - A backed enum becomes a string enum.
  - An interface with `one_of` becomes a tagged union. Each variant carries an
    `#[Api_variant(tag, value)]`.
- **Exclusive routing.** The module answers every request itself. Any request
  that no attribute claims gets an empty 404, the same as axum's. That rules out
  Trongate's `/module/method` URLs reaching a controller method around its
  declared path and access rule. `tests/routing_test.php` checks this.

## Schema translation (Postgres to MariaDB)

| Postgres | MariaDB |
|---|---|
| `uuid` | `UUID` (10.7+), minted by the application |
| `timestamptz` | `DATETIME(6)`, always UTC |
| `text` | `VARCHAR(n)` when indexed or bounded, otherwise `TEXT` |
| partial unique index | generated column that is NULL where the predicate is false, under a plain unique index |
| `jsonb` + `jsonb_typeof` check | `JSON` + `JSON_VALID` / `JSON_TYPE` check (slice 7) |
| `on conflict do nothing` | `insert ignore`, checking the affected row count (slice 5) |
| `deferrable initially deferred` FK | MariaDB has none, so the cycle between definitions and revisions must be redesigned (slice 7) |

## Dogfooding notes: Trongate and trongate.cloud

These are findings from building slices 0 and 1, roughly in order of how much
they cost.

1. **Class names are case-insensitive, and module controllers live in the global
   namespace.** An attribute class called `OpenAPI` *is* a module controller
   called `Openapi`, which is why the module is named `api`. Any
   framework-provided attribute or helper class needs a name no module could
   take.
2. **`/module/method` routing exposes every public controller method.** An API
   needs routes it declares and nothing else, so the `api` interceptor answers
   every request. A framework option for "declared routes only" would remove the
   need.
3. **`ignition.php` always calls `session_start()`.** Every response then
   carries `Set-Cookie` and the session cache headers. The interceptor withdraws
   them, but a stateless API shouldn't have to.
4. **The autoloader finds exactly one class per module.** An API needs DTOs,
   attributes and an engine, so `modules/autoload` maps each module's `src/`
   directory.
5. **`Db` has no transactions and doesn't set the connection time zone.** It
   also opens persistent connections. Slice 5's idempotent submit needs a
   transaction plus `select ... for update`, so it will need a thin PDO wrapper.
6. **No migrations and no test tooling.** `bin/migrate.php` and
   `tests/run.php` cover both, using nothing beyond PHP.
7. **Hidden module dependencies.**
   - `Db` calls `block_url()`, which needs the `utilities` and `url` modules.
   - The `out()` helper needs `string_service`.
   - None of these show up until a request hits them.
8. **Apache drops `Authorization`** unless `.htaccess` passes it through. The
   rewrite is in `public/.htaccess`. trongate.cloud should make sure its PHP
   setup preserves the header.
9. **Interceptors work well.** They were the one hook needed to build all of
   the above without editing `engine/`.
10. **Open questions for trongate.cloud:**
    - Can an app live in a subdirectory of the repository (`trongate/`), or must
      the framework be at the root?
    - Are database credentials provided as environment variables? The config
      files here read `DB_*` from the environment.
    - Which MariaDB version is provisioned? This schema needs 10.7 or later.
