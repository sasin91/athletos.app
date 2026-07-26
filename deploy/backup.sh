#!/usr/bin/env bash
#
# Hourly: dump the database, compress it, encrypt it, push it offsite, prune.
#
#     athletos-backup                # dump, encrypt, push, prune
#     athletos-backup --check-only   # is the newest offsite dump recent and non-empty?
#
# The training history is the only thing on this box that cannot be regenerated.
# Binaries, configuration and the machine itself can be rebuilt within the hour
# from a checkout; a lost workout is lost.
#
# Hourly rather than nightly because the economics invert at this size. A year
# of one athlete's training compresses to a few megabytes, so frequency is
# nearly free, and it moves the worst case from "lose a session" to "lose
# nothing". A nightly schedule here would be optimising a storage cost that does
# not exist.
#
# Two things this is careful about, because both look exactly like a working
# backup right up until the day they do not:
#
#   A dump on the same box is not a backup. It shares a failure domain with the
#   thing it protects. /var/backups/athletos is a staging area, not the artifact.
#
#   An untested backup is not a backup. See restore.sh, which is a script and
#   not a paragraph, and which is meant to be run before it is needed.
#
# Encryption is asymmetric, with age. Only the *public* key is on this machine,
# so a box that is compromised cannot read its own backup history — and the
# private key lives somewhere that is not this box, which is also the only place
# a restore can be performed from. That asymmetry is the point; a symmetric
# passphrase stored next to the dumps would be theatre.

set -euo pipefail

ENV_FILE="/usr/local/etc/athletos/env"
STAGING="/var/backups/athletos"
PG_SOCKET_DIR="/var/run/postgresql"
DB_NAME="athletos"

# Retention, mirrored on the remote. Hourlies cover "I broke it an hour ago",
# dailies cover "we noticed on Thursday", monthlies cover "this row has been
# wrong since spring".
KEEP_HOURLY=24
KEEP_DAILY=30
KEEP_MONTHLY=12

CHECK_ONLY=0
case "${1:-}" in
    --check-only) CHECK_ONLY=1 ;;
    "") ;;
    *) printf 'usage: athletos-backup [--check-only]\n' >&2; exit 64 ;;
esac

log() { printf '[%s] backup: %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$1"; }
die() { printf 'backup: %s\n' "$1" >&2; exit 1; }

[ -r "${ENV_FILE}" ] || die "${ENV_FILE} is missing"
# shellcheck source=/dev/null
. "${ENV_FILE}"

: "${BACKUP_SSH_TARGET:?set BACKUP_SSH_TARGET in ${ENV_FILE}, e.g. u123456@u123456.your-storagebox.de}"
: "${BACKUP_REMOTE_DIR:=athletos}"
: "${BACKUP_AGE_RECIPIENT:?set BACKUP_AGE_RECIPIENT in ${ENV_FILE} — the age *public* key}"
: "${BACKUP_SSH_KEY:=/root/.ssh/id_ed25519_backup}"

SSH="ssh -i ${BACKUP_SSH_KEY} -o BatchMode=yes -o StrictHostKeyChecking=yes"

# --------------------------------------------------------------------------
# --check-only
# --------------------------------------------------------------------------
#
# Not a restore — restore.sh is that, and it needs the private key and a human.
# This catches the two silent failures: the push stopping without anyone
# noticing, and pg_dump producing a file that is technically present and
# entirely empty. A non-zero exit here is mailed to root by cron, which is the
# only reason anyone would ever find out.

if [ "${CHECK_ONLY}" -eq 1 ]; then
    # shellcheck disable=SC2086
    listing="$(${SSH} "${BACKUP_SSH_TARGET}" "ls -1 ${BACKUP_REMOTE_DIR}/hourly" 2>/dev/null \
        | grep -E '^athletos-.*\.sql\.gz\.age$' | sort -r || true)"
    [ -n "${listing}" ] || die "CHECK FAILED: no dumps at all in ${BACKUP_REMOTE_DIR}/hourly"

    newest="$(printf '%s\n' "${listing}" | head -n 1)"
    count="$(printf '%s\n' "${listing}" | wc -l | tr -d ' ')"

    # athletos-20260726T140500Z.sql.gz.age -> 20260726 14 05
    stamp="${newest#athletos-}"
    stamp="${stamp%%.sql.gz.age}"
    newest_epoch="$(date -u -j -f '%Y%m%dT%H%M%SZ' "${stamp}" '+%s' 2>/dev/null || echo 0)"
    [ "${newest_epoch}" -gt 0 ] || die "CHECK FAILED: cannot parse a timestamp out of ${newest}"

    age_hours=$(( ( $(date -u '+%s') - newest_epoch ) / 3600 ))
    log "newest offsite dump: ${newest} (${age_hours}h old); ${count} hourlies retained"

    [ "${age_hours}" -le 3 ] \
        || die "CHECK FAILED: the newest dump is ${age_hours}h old. Backups have stopped."
    [ "${count}" -ge 2 ] \
        || die "CHECK FAILED: only ${count} dump(s) retained; expected up to ${KEEP_HOURLY}"

    log "CHECK PASSED"
    exit 0
fi

STAMP="$(date -u '+%Y%m%dT%H%M%SZ')"
NAME="athletos-${STAMP}.sql.gz.age"
LOCAL="${STAGING}/${NAME}"

install -d -m 0700 "${STAGING}"

# --------------------------------------------------------------------------
# Dump
# --------------------------------------------------------------------------
#
# `pg_dump -Fc` would be smaller and restore in parallel; plain SQL is chosen
# instead because it can be read by eye and restored by a version of Postgres
# that is not this one. In a disaster the constraint is rarely speed, it is
# whether the thing in front of you is legible.

log "dumping ${DB_NAME}"
su -m postgres -c "pg_dump -h '${PG_SOCKET_DIR}' --no-owner --no-privileges '${DB_NAME}'" \
    | gzip -9 \
    | age -r "${BACKUP_AGE_RECIPIENT}" -o "${LOCAL}"

SIZE="$(stat -f %z "${LOCAL}")"

# A pg_dump that writes a zero-byte file for eight months is indistinguishable
# from a healthy one until it matters. This is the cheapest possible check and
# it catches the failure that actually happens.
[ "${SIZE}" -gt 1024 ] || die "${LOCAL} is ${SIZE} bytes — that is not a dump"
log "wrote ${LOCAL} (${SIZE} bytes)"

# --------------------------------------------------------------------------
# Push
# --------------------------------------------------------------------------
#
# Hetzner Storage Boxes answer SSH with a restricted shell — a small set of
# commands including ls, rm, mkdir and rsync, which is all this needs. Promotion
# to daily and monthly is done by uploading the same file to a second directory
# rather than by moving it server-side, because a copy is idempotent and a move
# is not: a retry after a half-finished move is how retention deletes the only
# copy of something.

log "pushing to ${BACKUP_SSH_TARGET}:${BACKUP_REMOTE_DIR}"
# shellcheck disable=SC2086
${SSH} "${BACKUP_SSH_TARGET}" \
    "mkdir -p ${BACKUP_REMOTE_DIR}/hourly ${BACKUP_REMOTE_DIR}/daily ${BACKUP_REMOTE_DIR}/monthly"

push_to() {
    local sub="$1"
    # shellcheck disable=SC2086
    rsync -e "${SSH}" --quiet "${LOCAL}" \
        "${BACKUP_SSH_TARGET}:${BACKUP_REMOTE_DIR}/${sub}/${NAME}" \
        || die "rsync to ${sub} failed"
    log "  -> ${sub}/${NAME}"
}

push_to hourly

HOUR="$(date -u '+%H')"
DAY="$(date -u '+%d')"
[ "${HOUR}" = "03" ] && push_to daily
{ [ "${HOUR}" = "03" ] && [ "${DAY}" = "01" ]; } && push_to monthly

# --------------------------------------------------------------------------
# Prune
# --------------------------------------------------------------------------
#
# Newest-first by name, which is the same as newest-first by time because the
# names are ISO-8601 UTC. Sorting by name rather than by mtime means the remote
# is not trusted to preserve timestamps, and it is not.

prune() {
    local sub="$1" keep="$2" old
    # shellcheck disable=SC2086
    old="$(${SSH} "${BACKUP_SSH_TARGET}" "ls -1 ${BACKUP_REMOTE_DIR}/${sub}" 2>/dev/null \
        | grep -E '^athletos-.*\.sql\.gz\.age$' \
        | sort -r \
        | tail -n "+$((keep + 1))" || true)"

    [ -n "${old}" ] || return 0

    local f
    for f in ${old}; do
        log "  pruning ${sub}/${f}"
        # shellcheck disable=SC2086
        ${SSH} "${BACKUP_SSH_TARGET}" "rm ${BACKUP_REMOTE_DIR}/${sub}/${f}" || true
    done
}

prune hourly "${KEEP_HOURLY}"
prune daily "${KEEP_DAILY}"
prune monthly "${KEEP_MONTHLY}"

# The local copy is staging, not an artifact. Two days of it is enough to
# investigate a bad dump without pretending it is protection.
find "${STAGING}" -name 'athletos-*.sql.gz.age' -mtime +2 -delete

log "done"
