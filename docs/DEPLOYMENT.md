# Deployment

AthletOS runs on one FreeBSD box: a Hetzner CX22 in `hel1`, root-on-ZFS, with
Caddy at the edge, Postgres on the host, and two identical jails — `blue` and
`green` — that each run the Rust API and the SvelteKit process. Both jails serve
traffic at all times. A deploy updates one, waits for it to answer, then updates
the other.

This document is the operational half of D-16, D-17 and D-18. Those explain the
decisions; this explains how to carry them out, in the order you will need them.

> **Nothing here has been executed against a FreeBSD machine.** There is no box
> yet. The scripts are shellcheck-clean, the Caddyfile is validated against
> caddy 2.11.4 with its health-check behaviour exercised for real, the Terraform
> validates, and the signing key generation has been verified against the
> running code — but jails, nullfs, rc.d, pf, `bectl` and sanoid cannot be tested
> on a Windows workstation and have not been. The end of this document lists
> exactly what that means, item by item. Read it before the first provision, not
> after.

---

## What is on the box

```
                        the internet
                             │
                    pf: 80 → 8880, 443 → 8843
                             │
                    Caddy (host, unprivileged)
                    automatic TLS, health checks
                       ╱                  ╲
        10.0.0.2 (lo1)                     10.0.0.3 (lo1)
     ┌───────────────────┐              ┌───────────────────┐
     │  jail: blue       │              │  jail: green      │
     │  athletos_api     │              │  athletos_api     │
     │    :8080          │              │    :8080          │
     │  athletos_web     │              │  athletos_web     │
     │    :3000          │              │    :3000          │
     └─────────┬─────────┘              └─────────┬─────────┘
               │      unix socket, no TCP port    │
               └────────────┬─────────────────────┘
                            │
                   Postgres 17 (host)
                   /var/run/postgresql
```

Both jails are upstreams of both Caddy sites, all the time. That is worth more
than the deploy sequence it enables: a backend that dies at three in the morning
is taken out of rotation by an active health check within about five seconds,
without anyone deploying anything. The rolling update then gets its failover for
free, because it is the same mechanism doing the same job.

### The jails

Thin jails, hand-built, static. There is no Bastille, no pot and no iocage —
those manage a fleet, and this is two jails whose configuration has not changed
since it was written and is not expected to.

`/jails/base` holds one extracted `base.txz` plus `node24` and the two rc
scripts. It is nullfs-mounted **read-only** into both jails, one directory at a
time:

```
bin  sbin  lib  libexec  rescue  usr/bin  usr/lib  usr/libexec  usr/sbin
usr/share  usr/local
```

Everything else is the jail's own writable dataset: `/etc`, `/var`, `/tmp`,
`/root`, and `/srv/athletos`, which is where the `current` symlink lives. The
writable layer is a few megabytes, so the second jail costs almost nothing.

`/usr/local` being read-only is the load-bearing part of that list. It is why
node lives in the base rather than in each jail — one copy on disk, one place to
upgrade it — and it is why the rc scripts do too. A release never contains an rc
script. Changing one means re-running `bootstrap.sh`, which is a deliberate act
with a reviewable diff, rather than something a deploy could do quietly.

Two files in `deploy/jail.conf.d/` describe the jails. They differ in four
lines — path, hostname, address, fstab — and are never generated. A deploy that
generated jail configuration would be a deploy that could generate it wrong, at
the worst possible moment.

### The datasets

```
zroot/ROOT/default      the OS. bectl boot environments live here.
zroot/data/pgdata    → /var/db/postgres         the training history
zroot/jails/base     → /jails/base              one read-only userland
zroot/jails/blue     → /jails/blue              writable layer
zroot/jails/green    → /jails/green             writable layer
zroot/releases       → /srv/athletos/releases   artifacts, shared read-only
zroot/backups        → /var/backups/athletos    pg_dump staging, not a backup
```

The layout encodes one rule: **what a deploy may replace and what it must never
touch are different datasets.** `zroot/data/pgdata` is outside the release cycle
entirely. It is never cloned, never rolled back by a deploy, and never inside a
jail. Postgres runs on the host, listening on a unix socket with
`listen_addresses = ''`, so the database is unreachable over the network
regardless of what any firewall is or is not doing. The socket directory is
nullfs-mounted into each jail; that is the only path between the two.

Releases are one dataset shared read-only into both jails, so an artifact is
downloaded once and both jails point a symlink at it. That is also what makes a
rollback work with no network and no rebuild: the previous release is already
sitting there.

### Sizing, and why `arc_max` is not optional

The CX22 has 4 GB. Measured, not guessed:

| | |
|---|---|
| Rust API, under load | 29.8 MB RSS |
| SvelteKit SSR, per jail | 40–60 MB |
| Caddy | ~20 MB |
| Postgres | 200–300 MB |
| FreeBSD base | ~150 MB |

Call it 1.1 GB with both jails running. Comfortable — except that ZFS sizes its
ARC at roughly **half of physical memory** by default, which on this box means
2 GB of cache in front of a database whose entire working set is a few hundred
megabytes, competing with Postgres's own shared buffers for the same pages. So
`/boot/loader.conf` carries:

```
vfs.zfs.arc_max="512M"
```

`bootstrap.sh` writes it. It is read at boot, so **the box must be rebooted once
after bootstrap** before it means anything. This is the single most likely way
for a correctly-built box to behave badly under load, and it is one line.

---

## Provisioning

### 1. Terraform

`infra/` declares three things: a server, a firewall, and an SSH key. That is
all, and the thinness is deliberate. The part that would actually have to be
reconstructed from memory after losing the machine is not "a CX22 exists in
hel1" — it is the packages, the datasets, the jails, the pf rules and the
service configuration, and all of that lives in `infra/bootstrap.sh`, which is
idempotent and can be read.

There is a second reason Terraform stays thin here: **Hetzner has no FreeBSD
image**, so the operating system cannot be declared at all. A configuration that
pretended otherwise would be lying about the one genuinely manual step.

State lives in HCP's free remote backend — versioned, locked, and not a file on
a laptop. The `cloud {}` block names no organization; that comes from
`TF_CLOUD_ORGANIZATION` and `TF_WORKSPACE`.

```sh
cd infra
export TF_CLOUD_ORGANIZATION=<your-hcp-org>
export TF_WORKSPACE=athletos-production
export TF_VAR_hcloud_token=<token>
export TF_VAR_ssh_public_key="$(cat ~/.ssh/id_ed25519.pub)"

terraform init
terraform apply
```

The firewall opens 22, 80, 443 and ICMP. Postgres is absent from that list and
always will be — there is no port to forget to close. ICMP is open because the
first question when a site is down is whether the machine is there at all, and
that is a debugging decision rather than a security one.

### 2. The one-time FreeBSD install

Hetzner installs a Linux image because the API requires one. It is overwritten
within the hour and never booted in anger.

```sh
# Attach the installer and reboot into it
terraform apply -var 'install_iso=FreeBSD-14.3-RELEASE-amd64-dvd1.iso'
```

Open the server's console in the Hetzner web UI and run `bsdinstall`:

- **Auto (ZFS)**, one disk, `zfs` pool named `zroot`. Root-on-ZFS is not a
  preference — boot environments, snapshots and the dataset layout above all
  depend on it.
- No swap partition is needed; the box has 4 GB and nothing here swaps. If you
  want one, a ZFS swap zvol is fine.
- Enable `sshd`. Add the same public key Terraform declared.
- Set a root password you will not need again except through the console.

Then detach the ISO, or the machine boots the installer on every reboot:

```sh
terraform apply    # install_iso back to its null default
```

This step is manual and will stay manual. It happens once per machine, in a
console, and automating a `bsdinstall` through a serial console for a fleet of
one is a project with no payoff.

### 3. Bootstrap

```sh
ssh root@<ip>
pkg install -y git
git clone <repo> /root/athletos
sh /root/athletos/infra/bootstrap.sh
```

It installs packages, cuts the datasets, initialises Postgres, extracts the base
jail, builds `blue` and `green`, writes `pf.conf`, `sanoid.conf`, the cron
entries and the rc.conf entries, and installs the deploy scripts into
`/usr/local/sbin`.

It is idempotent by construction. Every step checks before it acts, and the
steps that write configuration write the same bytes every time. Re-run it after
changing an rc script, a jail definition or the Caddyfile — that is the intended
workflow, not a recovery procedure.

It will not overwrite `/usr/local/etc/athletos/env` once that file exists, and
it will not overwrite a jail's `/etc/rc.conf` after the first run.

Then **reboot**, for `arc_max`.

### 4. DNS

Two records, both pointing at the box:

```
athletos.example        A     <ipv4>
athletos.example        AAAA  <ipv6>
api.athletos.example    A     <ipv4>
api.athletos.example    AAAA  <ipv6>
```

The API is publicly routed on its own name because D-11 has a native client
talking to it directly rather than through the BFF. Both names must resolve
before Caddy starts, or the ACME challenge fails and Caddy retries with backoff
while the site serves nothing.

---

## Configuration

### The env file

`/usr/local/etc/athletos/env`, mode 0600, owned by root, nullfs-mounted
read-only into both jails. `.env.example` at the repository root documents every
variable and is what `bootstrap.sh` seeds it from.

The format is plain `KEY=value` — the same format `dotenvy` reads in
development, and the same file the rc scripts source with `set -a`. One format,
two consumers, no translation layer to get wrong.

What is *not* in it is as deliberate as what is:

- **The signing key.** Its own file. See below.
- **`HOST`, `PORT`, `API_BASE_URL`.** These differ per jail, so they live in
  each jail's `/etc/rc.conf` and are read by the rc scripts the way rc scripts
  read configuration. The env file holds what is shared.

`API_BASE_URL` in each jail is that jail's own address — `http://10.0.0.2:8080`
in blue — rather than `127.0.0.1`. Loopback inside a non-VNET jail is remapped
to the jail's first address, so `127.0.0.1` would in fact work; but "works by
virtue of an address-remapping rule" is not a thing to depend on when the
explicit form is one line and is obviously correct.

`ORIGIN` is not optional. SvelteKit compares the `Origin` header of every form
POST against it, and form actions fail closed without it. The `athletos_web` rc
script refuses to start if it is unset, because the alternative is a site that
looks fine until someone tries to log in.

### The signing key

`AUTH_ALLOW_EPHEMERAL_SIGNING_KEY` is refused outright when `APP_ENV=production`
— two independent mistakes rather than one. So production needs a real key,
once, and it needs to be right.

```sh
openssl genpkey -algorithm ED25519 -out /usr/local/etc/athletos/signing-key.pem
chmod 0400 /usr/local/etc/athletos/signing-key.pem
```

That produces an unencrypted PKCS#8 PEM, which is exactly what
`SigningKey::from_pkcs8_pem` in `auth/keys.rs` expects:

```
-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIKNAV05PAi0g50ynMjrt7g3c3XtOX/a5cBadA5I1vRVt
-----END PRIVATE KEY-----
```

One base64 line between two markers. If your `openssl` emits
`-----BEGIN ED25519 PRIVATE KEY-----` or an `ENCRYPTED PRIVATE KEY` block, it is
not the same thing and will not load.

Then set the `kid` in the env file. It is published in the JWKS and stamped into
every token's header, so give it a name that dates the key:

```
AUTH_SIGNING_KEY_ID=athletos-2026-07
```

**This was verified against the running code, not reasoned about.** A key
generated by exactly that command loads through `KeyRing::from_config` with
`is_production = true`, and the `x` it publishes in the JWKS matches what
`openssl pkey -pubout` says the public half is. The check is reproduced in the
report accompanying this work.

The key deliberately does not go in the env file. The rc script reads the PEM —
as root, before `daemon(8)` drops privileges — and exports it into the process
environment. So the `athletos` service account never has permission to read the
key it signs with, and no PEM has to survive being round-tripped through a
shell-sourced file. If some future host insists on a key in an environment
variable, `keys.rs` accepts the single-line form with literal `\n` escapes:

```sh
sed 's/$/\\n/' signing-key.pem | tr -d '\n'
```

That form was verified to load as the same key as the multi-line original.

**Back the key up somewhere that is not this box, and do not rotate it
casually.** Every outstanding access token is signed by it. A rotation is: mint
the new key, publish it as the signer, move the old *public* key into
`AUTH_ADDITIONAL_VERIFICATION_KEYS` as `kid:base64url`, and remove it one access
token lifetime later — 15 minutes, not the refresh lifetime.

### The backup key

Asymmetric, with `age`, and only the **public** key is ever on the server:

```sh
age-keygen -o athletos-backup.key       # somewhere that is not the box
grep 'public key' athletos-backup.key   # → BACKUP_AGE_RECIPIENT
```

A box that is compromised therefore cannot read its own backup history. The
corollary is the important half: **losing the private key means losing every
backup**, and at this scale that is a more likely way to lose this data than
losing the server is. Treat it accordingly.

---

## Deploying

### Building a release

Tag and push. `.github/workflows/release.yml` runs the **full test suite on
FreeBSD** — `fmt`, clippy, 131 backend tests against a real Postgres, then the
frontend's check, lint, unit tests and build — inside a `vmactions/freebsd-vm`
guest, and only then builds the artifacts and attaches them to a GitHub Release.

Running the suite on the target platform is not ceremony. Rust is Tier 2 on
FreeBSD: the toolchain is built by upstream but not tested by them, so "it
compiles" is a materially weaker statement there than on Linux. Running our own
131 tests against a real database on the target OS is the mitigation, and it
costs one VM in one job.

There is no musl, no cross-compilation and no glibc anywhere in this. Those are
Linux deployment problems and this is not a Linux deployment. The artifact is a
native FreeBSD amd64 binary, produced by a FreeBSD toolchain, against FreeBSD's
own libc. (Cirrus CI is the usual answer to "FreeBSD in CI" and is shutting
down; this runs a FreeBSD guest inside the ordinary Linux runner instead, which
keeps everything in one place.)

Three artifacts land on the release:

```
athletos-api-freebsd-amd64      the binary
athletos-web.tar.gz             build/ + a production-only node_modules/
SHA256SUMS
```

The web tarball carries `node_modules` because **the box has node and no npm, on
purpose.** Running a package install on a production host at deploy time is the
same class of thing as rsyncing over a live directory: a step that can
half-succeed.

Artifacts go on a Release rather than being copied straight from CI to the box,
so that any previous version can be redeployed without being rebuilt — which is
what makes rollback work offline, and still work a year later when the
dependency tree no longer resolves.

### The first deploy

```sh
ssh root@<box>
service caddy start
athletos-deploy v1.0.0
```

The first deploy is the same command as every other one; it just finds both
jails with no `current` symlink and starts them for the first time. Watch for
`migrations applied` in `/jails/green/var/log/athletos/api.log`.

### The rolling deploy

```sh
athletos-deploy v1.4.0
```

In order:

1. **Fetch and verify, before anything is stopped.** Download all three assets,
   check both SHA-256s, unpack into a staging directory, assert
   `web/build/index.js` and `web/node_modules` exist, then `mv` the staging
   directory into `/srv/athletos/releases/<tag>`. The rename is the atomic step:
   the release path either exists complete or does not exist. If the tag is
   already on disk, nothing is downloaded — that is what makes rollback offline.
2. **Roll green.** Stop the jail, repoint `/jails/green/srv/athletos/current` at
   `releases/<tag>`, start the jail, and poll two probes on 10.0.0.3 for up to
   120 seconds: `:8080/health/ready` and `:3000/login`.
3. **Roll blue**, identically, on 10.0.0.2.
4. Record `current-tag` and `previous-tag`, prune to the last five releases —
   never removing anything a jail points at or that is the rollback target.

Both probes, not one. `/health/ready` opens a database connection, so it is the
probe that catches a bad `DATABASE_URL` or a migration that will not apply.
`/login` is the SvelteKit process's equivalent: it renders for an anonymous
request and touches nothing else, so a 200 means the bundle booted and can
render. (`/` is not usable for this — it answers 303 to `/login?from=%2F` for an
anonymous request, which is correct behaviour and a useless health signal.)

**Where it aborts, and what is still serving:**

| Exit | What happened | State of the site |
|---|---|---|
| 1 (fetch) | Download or checksum failed | Untouched. Both jails on the old release. |
| 1 (green) | Green never became healthy. It is put back on its previous release; blue was never stopped. | Up, both jails on the old release. Nothing more to do. |
| 2 (blue) | Blue never became healthy and is put back. Green is already on the new release. | **Up, serving a mix of two versions.** Needs a decision. |

Exit 2 is the interesting one and is loud about it. Either fix forward, or
`athletos-rollback <previous>` to bring green back too. It is not an emergency —
the site is up — but it is not a state to leave running overnight.

On failure the script prints the last 40 lines of both logs from the jail that
failed, so the reason is usually in the terminal you are already looking at.

### Rollback

```sh
athletos-rollback              # the tag recorded as previous
athletos-rollback v1.3.2       # or a specific one
```

It resolves a tag, asserts the release is already on disk, and then runs
**exactly the same** rolling health-gated sequence a deploy runs. That is
deliberate: a rollback path only exercised during an incident is a rollback path
nobody has tested. There is one code path that moves a jail from one release to
another and it is used several times a week.

For the operating system rather than the application, `bectl` gives the same
property one level down. `freebsd-update` and major upgrades create a boot
environment; if one goes wrong, `bectl activate <previous>` and reboot.

### The rule that makes rollback true rather than comforting

> **A migration must be backward-compatible with the release before it.**

`migrate()` runs at API startup. The moment the new binary boots, the schema has
moved — and putting the old binary back does not put the schema back. There is
no tooling fix for that; `sqlx` has no down-migrations and adding them would
only move the lie.

The rolling update sharpens it further. For the thirty seconds between green
coming up and blue coming up, **two versions of the application are serving one
database**. That window is not an accident to be engineered away — it is the
price of never having zero healthy backends — but it means a migration must
tolerate the previous release running against it, not merely survive being
rolled back to.

In practice:

- Add a column; do not drop one in the same release that stops using it. Drop it
  one release later, once the previous version is no longer a rollback target.
- Add a nullable column, or one with a default. A `not null` column with no
  default breaks every insert the old binary issues.
- Rename by adding, backfilling, and removing across three releases. Never in
  one.
- New tables are free. Old code does not know they exist.

It costs a two-step dance a few times a year, and it is what makes "just roll it
back" a true statement.

`sqlx` takes a Postgres advisory lock around migrations, so the two API
processes cannot race each other into the migration table. Nothing protects an
old binary from a column that was dropped out from under it. Only the rule does.

---

## Backups

The training history is the only thing on this box that cannot be regenerated.
Binaries, configuration and the machine itself can be rebuilt within the hour
from a checkout; a lost session is lost.

Two mechanisms, doing two different jobs, and calling both of them "backups" is
how people end up with neither.

### sanoid — the undo button

Local ZFS snapshots, taken by `sanoid --cron` every minute (a no-op unless
something is due). `pgdata` gets one every fifteen minutes kept for a day, then
36 hourly, 14 daily, 3 monthly. The jails and the OS dataset get less.

These are instant and nearly free, and they are on the same disk as the thing
they protect. A dead disk, a destroyed pool or a deleted server takes them with
it. What they buy is the *common* accident — a bad migration, a `delete` without
a `where`, a deploy that broke something at 14:05 — where being able to say
"give me 14:00" and have it in two seconds is worth a great deal.

They are crash-consistent, not application-consistent: a snapshot of a running
Postgres is exactly what Postgres would see after a power cut, and it recovers
from that at startup the same way. That is fine, and it is also why it is not
the backup.

syncoid is deliberately not part of this. Replicating these snapshots to a
second ZFS host would be strictly better than a dump, and it is the obvious next
step if a second box ever exists — but rsync.net's ZFS product has a 10 TB
minimum, three orders of magnitude more storage than this needs, and a Hetzner
Storage Box does not speak ZFS.

### backup.sh — the backup

Hourly, at five past: `pg_dump` → `gzip -9` → `age -r <public key>` → `rsync`
over SSH to a Hetzner Storage Box. Retention 24 hourly, 30 daily, 12 monthly,
where a daily is the 03:00 dump uploaded to a second directory and a monthly is
the one from the first of the month. Copying rather than moving server-side,
because a copy is idempotent and a move is not — a retry after a half-finished
move is how retention deletes the only copy of something.

Hourly rather than nightly because the economics invert at this size. A year of
one athlete's training compresses to a few megabytes, so frequency is nearly
free, and it moves the worst case from "lose a session" to "lose nothing". A
nightly schedule here would be optimising a storage cost that does not exist.

The dump is plain SQL, not `pg_dump -Fc`. Custom format would be smaller and
would restore in parallel; plain SQL can be read by eye and replayed by a
Postgres that is not this one. In a disaster the binding constraint is rarely
speed, it is whether the thing in front of you is legible.

### The two ways a backup lies

**A dump on the same box is not a backup.** It shares a failure domain with the
thing it protects. `/var/backups/athletos` is a staging area — two days of it,
for investigating a bad dump — and the artifact is the offsite copy.

**An untested backup is not a backup.** A `pg_dump` writing a zero-byte file for
eight months is indistinguishable from a healthy one until the day it matters.
Two things guard this. `backup.sh` refuses to push anything under 1 KB. And a
daily `athletos-backup --check-only` asks the remote for its newest hourly and
fails if it is more than three hours old or if fewer than two are retained,
which catches the failure that actually happens: the push silently stopping.

Neither of those is a restore.

### The restore drill

```sh
AGE_IDENTITY_FILE=/path/to/athletos-backup.key athletos-restore --drill
```

Fetches the newest offsite dump, decrypts it, restores it into a scratch
database, replays with `ON_ERROR_STOP=1`, prints row counts for `athletes`,
`athlete_maxes`, `enrollments`, `workouts` and `workout_sets`, and drops the
scratch database again. It touches nothing real.

The row counts are the point. A restore that reports success and leaves an empty
database has told you nothing; those five tables are the ones where a zero would
mean the backup was worthless.

Run it after any change to the backup path, and once a quarter regardless. It
takes under a minute. It is deliberately not a cron job, because it needs the
age private key, and the private key is deliberately not on the box.

For the real thing:

```sh
AGE_IDENTITY_FILE=... athletos-restore --into-production --file <dump>
```

That stops both jails, dumps the current database to
`/var/backups/athletos/pre-restore.sql` first — even a restore from a good
backup is a moment where someone can discover they wanted the other one — drops
and recreates `athletos`, replays, prints the same counts, and starts both jails.
It asks you to type the database name before doing any of it.

---

## Routine operations

```sh
service jail status                       # both jails running?
jls                                       # jail ids and addresses
service caddy status
tail -f /jails/blue/var/log/athletos/api.log
tail -f /jails/green/var/log/athletos/web.log

jexec athletos-blue service athletos_api restart
jexec athletos-blue /bin/sh               # a shell inside a jail

zfs list -t snapshot zroot/data/pgdata | tail
sanoid --monitor-snapshots                # nagios-style, fine to run by hand

su -m postgres -c 'psql -h /var/run/postgresql athletos'
```

Certificates renew themselves. That is the entire reason Caddy is here rather
than nginx and certbot: there is no renewal timer, no reload hook, and no
expired certificate on a Sunday.

To change an rc script, a jail definition, the Caddyfile or the pf rules: edit
the file in the repository, pull on the box, re-run `bootstrap.sh`. It is
idempotent and that is the supported path.

---

## What has not been verified

The development machine is Windows with WSL. There is no FreeBSD anywhere in
reach, and no amount of care makes up for that. Being specific about it is worth
more than confidence.

**Verified, for real, on this machine:**

- Every shell script is shellcheck-clean (`infra/bootstrap.sh`, all four deploy
  scripts, and both rc.d scripts under `-s sh`).
- `terraform fmt -check` and `terraform validate` pass against
  hetznercloud/hcloud, with `terraform init -backend=false`.
- The Caddyfile is `caddy fmt`-clean and `caddy validate`-clean under caddy
  2.11.4, with `APP_DOMAIN` and `ACME_EMAIL` supplied.
- Caddy's health-check syntax does what the file claims: with two stand-in
  upstreams, requests balanced across both; killing one moved every subsequent
  request to the survivor within six seconds with no failed request; the log
  shows the active checker marking it down.
- The auto-generated HTTP→HTTPS redirect answers `Location: https://<host>/`
  with no `:8843` leaking into it, despite `https_port` being non-standard.
- `openssl genpkey -algorithm ED25519` produces a PEM that `KeyRing::from_config`
  loads with `is_production = true`; the `\n`-escaped single-line form loads as
  the same key; the JWKS `x` matches `openssl pkey -pubout`.
- The release binary boots under a production-shaped environment (real PEM,
  `APP_ENV=production`), applies migrations, answers `/health/ready` with 200
  and serves the correct JWKS. It refuses to start with
  `EphemeralKeyInProduction` when the ephemeral flag is set under
  `APP_ENV=production`, and with `NoSigningKey` when neither is set.
- `node <abs-path>/build/index.js` boots from an unrelated working directory —
  which is how the rc script invokes it — serves `/login` with 200, and answers
  `/` with a 303 to `/login`. That is why `/login` is the health URI.
- 131 backend tests, clippy at `-D warnings`, `svelte-check` clean, lint clean,
  48 frontend unit tests, and a successful `npm run build`.

**Not verified, and not verifiable here.** Every one of these is a place the
first provision may need a fix:

- **`jail.conf` syntax and semantics.** The two snippets have never been parsed
  by `jail(8)`. `devfs_ruleset = 4`, `enforce_statfs = 2`, `exec.consolelog` and
  the `allow.*` set are written from the manual page.
- **The nullfs thin-jail layout.** Whether the read-only directory list is
  complete for running node and a Rust binary; whether stacking the config mount
  on top of the read-only `/usr/local` mount behaves as expected; whether the
  fstab ordering is right. This is the most likely thing to need adjusting.
- **The rc.d scripts.** They are idiomatic rc(8) and shellcheck-clean, but
  `rc.subr`'s handling of `daemon -P` with `procname` defaulting to
  `/usr/sbin/daemon` has not been exercised, so `service athletos_api status`
  may need a `procname` line.
- **`caddy_env` in rc.conf.** Whether the FreeBSD Caddy port's rc script honours
  `${name}_env` for `{$APP_DOMAIN}` substitution. If it does not, the fallback
  is to substitute the domain into the Caddyfile in `bootstrap.sh`.
- **The pf rules.** `rdr pass ... -> ($ext_if) port 8880` is written the FreeBSD
  way rather than the modern OpenBSD way, and `pfctl -n -f` has not been run on
  a FreeBSD kernel. `bootstrap.sh` does run it and aborts if it fails.
- **ACME through the redirect.** Caddy solving HTTP-01 on 8880 and TLS-ALPN on
  8843 behind a pf redirect is the documented pattern, but it needs a real
  domain and a real Let's Encrypt round trip to confirm.
- **`bectl`.** Never run. The claim that boot environments give OS-level
  rollback is FreeBSD's, not one that has been tested here.
- **sanoid.** The config file's template syntax has not been parsed by sanoid,
  and no snapshot has been taken.
- **`/usr/local/etc/cron.d`.** FreeBSD's cron has read it since 13.0. If the
  entries do not fire, paste them into `/etc/crontab`; the format is identical.
- **The Hetzner Storage Box restricted shell.** `backup.sh` assumes `ls`, `rm`,
  `mkdir` and `rsync` are available over SSH. That is what Hetzner documents; it
  has not been exercised.
- **`vmactions/freebsd-vm`.** The release workflow has never run. Package names
  (`node24`, `npm-node24`, `rust`), `service postgresql initdb` behaviour and
  `sha256 -r` output format are all written from the FreeBSD ports tree and the
  manual pages rather than from a run.
- **`.github/workflows/deploy.yml`.** Cannot run: there is no host. It is
  written to be small for exactly that reason — it opens one SSH connection and
  runs one command that has its own health gate and its own rollback.
- **The whole rolling sequence.** `deploy.sh` has never moved a symlink or
  stopped a jail. Its logic has been read carefully and its failure paths are
  written out above; that is not the same as having watched it abort.
