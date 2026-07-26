#!/usr/bin/env bash
#
# Put both jails back on a release that is already on this box.
#
#     athletos-rollback              # the tag deploy.sh recorded as previous
#     athletos-rollback v1.3.2       # or a specific one
#
# This is deliberately not a separate mechanism. It resolves a tag, asserts the
# release is already on disk, and then runs the same rolling, health-gated
# sequence deploy.sh runs — because a rollback path that is only exercised
# during an incident is a rollback path nobody has tested. There is exactly one
# code path that moves a jail from one release to another, and it is used
# several times a week.
#
# What it does not do, and cannot:
#
#   IT DOES NOT ROLL BACK THE SCHEMA.
#
# `migrate()` runs when the API starts, so the moment the release being rolled
# back *from* booted, the database moved forward. Rolling back the binaries
# leaves old code against a new schema, and that is fine only because every
# migration is required to be backward-compatible with the release before it.
# See docs/DEPLOYMENT.md. If a migration broke that rule, this script will
# happily start a binary that then fails against the schema — and the health
# gate will catch it and put the new release back, which is the least-bad
# outcome available.

set -euo pipefail

RELEASES_DIR="/srv/athletos/releases"
STATE_DIR="/srv/athletos"

die() { printf 'rollback: %s\n' "$1" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "must run as root"

if [ $# -gt 1 ]; then
    printf 'usage: athletos-rollback [tag]\n' >&2
    exit 64
fi

if [ $# -eq 1 ]; then
    TAG="$1"
else
    TAG="$(cat "${STATE_DIR}/previous-tag" 2>/dev/null || true)"
    [ -n "${TAG}" ] || die "no previous tag recorded in ${STATE_DIR}/previous-tag; name one explicitly"
fi

CURRENT="$(cat "${STATE_DIR}/current-tag" 2>/dev/null || echo unknown)"

[ -d "${RELEASES_DIR}/${TAG}" ] || {
    printf 'rollback: %s is not on this box. Releases available:\n' "${TAG}" >&2
    ls -1t "${RELEASES_DIR}" >&2
    printf '\nTo pull it down instead: athletos-deploy %s\n' "${TAG}" >&2
    exit 1
}

printf 'rolling back from %s to %s\n' "${CURRENT}" "${TAG}"
exec /usr/local/sbin/athletos-deploy "${TAG}"
