# Benchmarks

Numbers measured on the real box, as the deployment was built. Kept because a
blog post written from memory would invent them, and because several of them
are the justification for a decision in `DESIGN.md`.

**Hardware.** Hetzner CX23, `hel1`: 2 vCPU shared, 3.86 GB usable RAM, 40 GB
local disk, FreeBSD 15.1-RELEASE, root-on-ZFS.

---

## Application footprint

Measured on release builds under load, before deployment (see D-16, which was
sized from these):

| | RSS |
|---|---|
| Rust API, idle | 29.5 MB |
| Rust API, after 200 full 5/3/1 session generations | **29.8 MB** |
| Node SSR, after 60 renders | ~40–60 MB |
| Caddy | ~20 MB |

The API grew **0.3 MB across 200 requests**, each of which builds a complete
session with percentage maths and plate breakdown. Whatever this box runs out
of, it will not be the API.

## ZFS ARC

| | |
|---|---|
| `vfs.zfs.arc_max` | 512 MiB |
| Actual ARC, both jails up | **501 MB** |
| Uncapped default | half of RAM, ~1.93 GB |

ARC uses essentially all of whatever it is given, which is why the cap is not
optional on a 4 GB box. Left at the default it would take half the machine and
present as a Postgres problem under memory pressure.

## Jail cycle time

`service jail stop` then `service jail start`, three consecutive runs:

| run | stop | start | total |
|---|---|---|---|
| 1 | 0.233 s | 0.330 s | **0.563 s** |
| 2 | 0.214 s | 0.379 s | **0.592 s** |
| 3 | 0.263 s | 0.413 s | **0.676 s** |

Roughly **0.6 s to cycle a jail**. This is the number the rolling update (D-17)
rests on: one backend is out of service for about half a second while the other
serves, and Caddy's health check interval is 5 s, so in practice it never even
observes the gap.

## Rolling deploy

`athletos-deploy v0.1.1`, artifact already on disk, both jails updated one at
a time:

| step | elapsed |
|---|---|
| green: stop, repoint, start | 0 s |
| green: start → `/health/ready` and `/login` both 200 | **2 s** |
| blue: stop, repoint, start | 1 s |
| blue: start → healthy | **2 s** |
| **total, both jails on the new release** | **5 s** |

The health gate allows 120 s and used 2. At no point in those five seconds were
both backends down — Caddy's health check interval is 5 s, so it never even
observed the gap.

## Live, end to end

Measured from a laptop in Denmark to `hel1`, over the public internet:

| | |
|---|---|
| `https://athletos.app` (303 → /login) | 0.324 s |
| `https://api.athletos.app/health` | 0.233 s |
| TLS | Let's Encrypt, obtained automatically, no certbot |

## Build and release

| | |
|---|---|
| CI, Linux, full backend suite + Postgres service | 4m 00s |
| CI, frontend (check, lint, vitest, build, playwright) | 1m 07s |
| CI, openapi (regen diff, operation-id guard, oasdiff) | 1m 16s |
| Release, FreeBSD VM: full suite **and** build | **12m 40s** |
| Release artifact, API binary | 22.1 MB |
| Release artifact, web tarball | 592 KB |

The FreeBSD job is slow because `vmactions` runs a FreeBSD guest inside a Linux
runner with no hardware acceleration. It only runs on a release tag, so the
cost lands where nobody is waiting on it.

## Install

| | |
|---|---|
| FreeBSD 15.1 install under QEMU/TCG, no KVM | ~30 min |
| `bootstrap.sh` on a bare 15.1 box | ~4 min |

---

## Still to measure

- Request latency through Caddy to a jail, and the loopback hop the BFF makes.
- `bectl` boot-environment rollback.
- Restore drill: `pg_dump` size and restore duration.
