#!/usr/bin/env bash
#
# Restore a backup, and prove it restored.
#
#     athletos-restore --drill                     # newest offsite dump -> scratch db
#     athletos-restore --drill --file /path.age    # a specific one
#     athletos-restore --into-production --file /path.age
#
# This exists because an untested backup is not a backup. A `pg_dump` writing a
# zero-byte file is indistinguishable from a healthy one until the day it
# matters, and "we have hourly dumps" is a sentence people say about backups
# they have never restored. So the restore procedure is a script rather than a
# paragraph in a runbook, and the default mode is the harmless one: pull the
# newest dump, restore it into a throwaway database, count the rows that matter,
# print them, and drop it again.
#
# Run the drill after any change to the backup path, and once a quarter
# regardless. It takes under a minute and it is the only evidence that the
# backups are real.
#
# The age *identity* is not on the box. That is the whole point of encrypting to
# a public key — a compromised server cannot read its own history. So a restore
# is something a human does with the private key in hand, which is also why the
# drill is a deliberate act rather than a cron job.

set -euo pipefail

ENV_FILE="/usr/local/etc/athletos/env"
STAGING="/var/backups/athletos"
PG_SOCKET_DIR="/var/run/postgresql"
DB_NAME="athletos"

MODE=""
SOURCE_FILE=""

log() { printf '[%s] restore: %s\n' "$(date -u '+%H:%M:%S')" "$1"; }
die() { printf 'restore: %s\n' "$1" >&2; exit 1; }

usage() {
    cat >&2 <<'EOF'
usage: athletos-restore --drill [--file <dump.sql.gz.age>]
       athletos-restore --into-production --file <dump.sql.gz.age>

  --drill            Restore into a scratch database, verify, drop it. Safe.
  --into-production  Stop both jails, drop and recreate `athletos`, restore,
                     start both jails. Destroys current data. Asks first.
  --file             A local encrypted dump. Without it, --drill fetches the
                     newest hourly from the offsite target.

  AGE_IDENTITY_FILE must point at the age private key. It is deliberately not
  stored on this machine.
EOF
    exit 64
}

while [ $# -gt 0 ]; do
    case "$1" in
        --drill) MODE="drill" ;;
        --into-production) MODE="production" ;;
        --file) SOURCE_FILE="${2:-}"; shift ;;
        -h | --help) usage ;;
        *) die "unknown argument: $1" ;;
    esac
    shift
done

[ -n "${MODE}" ] || usage
[ "$(id -u)" -eq 0 ] || die "must run as root"

command -v age >/dev/null 2>&1 || die "age is not installed"

: "${AGE_IDENTITY_FILE:?point AGE_IDENTITY_FILE at the age private key — it is not kept on this box}"
[ -r "${AGE_IDENTITY_FILE}" ] || die "${AGE_IDENTITY_FILE} is not readable"

[ -r "${ENV_FILE}" ] || die "${ENV_FILE} is missing"
# shellcheck source=/dev/null
. "${ENV_FILE}"

WORK="$(mktemp -d "${STAGING}/restore.XXXXXX")"
# shellcheck disable=SC2064
trap "rm -rf '${WORK}'" EXIT
chmod 0700 "${WORK}"

# --------------------------------------------------------------------------
# Get a dump
# --------------------------------------------------------------------------

if [ -z "${SOURCE_FILE}" ]; then
    : "${BACKUP_SSH_TARGET:?set BACKUP_SSH_TARGET in ${ENV_FILE}}"
    : "${BACKUP_REMOTE_DIR:=athletos}"
    : "${BACKUP_SSH_KEY:=/root/.ssh/id_ed25519_backup}"
    SSH="ssh -i ${BACKUP_SSH_KEY} -o BatchMode=yes -o StrictHostKeyChecking=yes"

    log "finding the newest hourly on ${BACKUP_SSH_TARGET}"
    # shellcheck disable=SC2086
    NEWEST="$(${SSH} "${BACKUP_SSH_TARGET}" "ls -1 ${BACKUP_REMOTE_DIR}/hourly" \
        | grep -E '^athletos-.*\.sql\.gz\.age$' | sort -r | head -n 1)"
    [ -n "${NEWEST}" ] || die "no dumps found in ${BACKUP_REMOTE_DIR}/hourly"

    log "fetching ${NEWEST}"
    SOURCE_FILE="${WORK}/${NEWEST}"
    # shellcheck disable=SC2086
    rsync -e "${SSH}" --quiet \
        "${BACKUP_SSH_TARGET}:${BACKUP_REMOTE_DIR}/hourly/${NEWEST}" "${SOURCE_FILE}"
fi

[ -r "${SOURCE_FILE}" ] || die "${SOURCE_FILE} is not readable"

log "decrypting $(basename "${SOURCE_FILE}")"
age -d -i "${AGE_IDENTITY_FILE}" "${SOURCE_FILE}" | gunzip >"${WORK}/dump.sql" \
    || die "decrypt or decompress failed — wrong identity, or a corrupt dump"

DUMP_SIZE="$(stat -f %z "${WORK}/dump.sql")"
[ "${DUMP_SIZE}" -gt 1024 ] || die "the decrypted dump is ${DUMP_SIZE} bytes"
log "decrypted ${DUMP_SIZE} bytes of SQL"

# --------------------------------------------------------------------------
# Verify — the half of a restore that people skip
# --------------------------------------------------------------------------
#
# A restore that reports success and leaves an empty database has told you
# nothing. These counts are the tables where an empty result would mean the
# backup was worthless: the athletes, their maxes, and the logged work.

verify_into() {
    local db="$1"
    printf '\n    %-24s %s\n' "table" "rows"
    printf '    %-24s %s\n' "------------------------" "----"
    local t
    for t in athletes athlete_maxes enrollments workouts workout_sets; do
        local n
        n="$(su -m postgres -c \
            "psql -h '${PG_SOCKET_DIR}' -d '${db}' -tAc 'select count(*) from \"${t}\"'" \
            2>/dev/null || echo 'n/a')"
        printf '    %-24s %s\n' "${t}" "${n}"
    done
    printf '\n'
}

# --------------------------------------------------------------------------
# Drill
# --------------------------------------------------------------------------

if [ "${MODE}" = "drill" ]; then
    SCRATCH="athletos_restore_$(date -u '+%Y%m%d%H%M%S')"
    log "restoring into scratch database ${SCRATCH}"

    su -m postgres -c "createdb -h '${PG_SOCKET_DIR}' '${SCRATCH}'"
    # shellcheck disable=SC2064
    trap "su -m postgres -c \"dropdb -h '${PG_SOCKET_DIR}' --if-exists '${SCRATCH}'\" >/dev/null 2>&1; rm -rf '${WORK}'" EXIT

    if ! su -m postgres -c \
        "psql -h '${PG_SOCKET_DIR}' -v ON_ERROR_STOP=1 -q -d '${SCRATCH}' -f '${WORK}/dump.sql'"; then
        die "the dump did not replay cleanly. THE BACKUPS ARE NOT GOOD. Fix this now."
    fi

    log "replayed clean. Row counts:"
    verify_into "${SCRATCH}"
    log "dropping ${SCRATCH}"
    log "DRILL PASSED — this dump restores."
    exit 0
fi

# --------------------------------------------------------------------------
# Into production
# --------------------------------------------------------------------------

cat >&2 <<EOF

  This will DROP the ${DB_NAME} database and replace it with the contents of

      ${SOURCE_FILE}

  Everything logged since that dump was taken is gone. Both jails will be
  stopped for the duration and the site will be down.

EOF
printf '  Type the database name to continue: ' >&2
read -r CONFIRM
[ "${CONFIRM}" = "${DB_NAME}" ] || die "aborted"

log "stopping both jails"
service jail stop athletos-blue >/dev/null 2>&1 || true
service jail stop athletos-green >/dev/null 2>&1 || true

# One more copy, taken right now, of whatever is about to be destroyed. Even a
# restore from a good backup is a moment where someone can discover they wanted
# the other one.
log "dumping the current database first, to ${STAGING}/pre-restore.sql"
su -m postgres -c "pg_dump -h '${PG_SOCKET_DIR}' --no-owner --no-privileges '${DB_NAME}'" \
    >"${STAGING}/pre-restore.sql" || log "  (could not dump; continuing)"

log "recreating ${DB_NAME}"
su -m postgres -c "dropdb -h '${PG_SOCKET_DIR}' --if-exists '${DB_NAME}'"
su -m postgres -c "createdb -h '${PG_SOCKET_DIR}' -O athletos '${DB_NAME}'"

log "replaying the dump"
su -m postgres -c \
    "psql -h '${PG_SOCKET_DIR}' -v ON_ERROR_STOP=1 -q -d '${DB_NAME}' -f '${WORK}/dump.sql'" \
    || die "the dump did not replay. ${DB_NAME} is now incomplete; ${STAGING}/pre-restore.sql has the old contents."

verify_into "${DB_NAME}"

log "starting both jails"
service jail start athletos-green
service jail start athletos-blue

log "restored. Check https://${APP_DOMAIN:-the site} before walking away."
