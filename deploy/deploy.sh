#!/usr/bin/env bash
#
# Roll a release across both jails, one at a time, health-gated.
#
#     athletos-deploy v1.4.0
#
# This is a rolling update rather than blue-green-then-destroy. Both jails run
# at all times and Caddy has both as health-checked upstreams; a deploy updates
# green, waits for it to answer, then updates blue. At no instant are zero
# backends healthy, which is the property that makes this worth doing at all on
# a single box.
#
# The cost is a window of thirty seconds or so where two versions of the
# application are serving one database. That window is not an accident to be
# engineered away, it is the reason for the migration rule in docs/DEPLOYMENT.md:
#
#     A migration must be backward-compatible with the release before it.
#
# `migrate()` runs at API startup, so by the time the first jail is healthy the
# schema has already moved and the other jail is still running the old binary
# against it. sqlx takes an advisory lock, so the two API processes cannot race
# each other into the migration table — but nothing protects an old binary from
# a column that has been dropped out from under it. Only the rule does.
#
# Aborting: any failure leaves the *other* jail serving, and exits non-zero.
# Where exactly it aborts is spelled out at each gate below.

set -euo pipefail

RELEASES_DIR="/srv/athletos/releases"
STATE_DIR="/srv/athletos"
JAIL_ROOT="/jails"
ENV_FILE="/usr/local/etc/athletos/env"

# Which repository's releases to pull from. It comes out of the env file rather
# than being baked in here, so a fork or a staging box needs no edit to a script
# that is installed at 0555 and owned by root.
if [ -r "${ENV_FILE}" ]; then
    # shellcheck source=/dev/null
    . "${ENV_FILE}"
fi
GITHUB_REPO="${GITHUB_REPO:?set GITHUB_REPO in ${ENV_FILE}, e.g. owner/athletos}"

# Fixed, and the same two numbers as the jail.conf snippets and the Caddyfile.
BLUE_ADDR="10.0.0.2"
GREEN_ADDR="10.0.0.3"

API_PORT="8080"
WEB_PORT="3000"

# How long a jail gets to come up and answer both probes before it is judged
# failed. Generous: the API applies migrations before it binds, and a migration
# on a cold page cache is the slowest thing in this sequence.
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-120}"
HEALTH_INTERVAL_SECONDS="2"

# Old releases are what makes rollback instant and offline. Five is about two
# weeks of deploys and a few hundred megabytes.
KEEP_RELEASES="${KEEP_RELEASES:-5}"

log() { printf '[%s] %s\n' "$(date -u '+%H:%M:%S')" "$1"; }
die() { printf 'deploy: %s\n' "$1" >&2; exit 1; }

usage() {
    cat >&2 <<'EOF'
usage: athletos-deploy <tag>

  <tag>   a GitHub Release tag, e.g. v1.4.0. If the release is already on this
          box under /srv/athletos/releases it is reused and nothing is
          downloaded, which is what makes a rollback work without a network.
EOF
    exit 64
}

[ $# -eq 1 ] || usage
TAG="$1"
[ "$(id -u)" -eq 0 ] || die "must run as root"

RELEASE_DIR="${RELEASES_DIR}/${TAG}"

# --------------------------------------------------------------------------
# Fetch, before anything is stopped
# --------------------------------------------------------------------------
#
# Nothing is touched until the artifacts are on disk and their checksums match.
# A deploy that discovers a truncated download after stopping a jail is a deploy
# that has taken the site down to learn something it could have learned first.

fetch_release() {
    local base="https://github.com/${GITHUB_REPO}/releases/download/${TAG}"
    local staging="${RELEASES_DIR}/.staging-${TAG}.$$"

    log "downloading ${TAG} from ${GITHUB_REPO}"
    rm -rf "${staging}"
    mkdir -p "${staging}"
    # shellcheck disable=SC2064
    trap "rm -rf '${staging}'" EXIT

    local asset
    for asset in athletos-api-freebsd-amd64 athletos-web.tar.gz SHA256SUMS; do
        fetch -q -o "${staging}/${asset}" "${base}/${asset}" \
            || die "could not fetch ${asset} — is ${TAG} a published release?"
    done

    log "verifying checksums"
    local expected actual
    for asset in athletos-api-freebsd-amd64 athletos-web.tar.gz; do
        expected="$(awk -v a="${asset}" '$2 == a || $2 == "*"a { print $1 }' "${staging}/SHA256SUMS")"
        [ -n "${expected}" ] || die "SHA256SUMS has no entry for ${asset}"
        actual="$(sha256 -q "${staging}/${asset}")"
        [ "${expected}" = "${actual}" ] \
            || die "checksum mismatch for ${asset}: expected ${expected}, got ${actual}"
    done

    mkdir -p "${staging}/web"
    tar -xf "${staging}/athletos-web.tar.gz" -C "${staging}/web"
    rm -f "${staging}/athletos-web.tar.gz"

    mv "${staging}/athletos-api-freebsd-amd64" "${staging}/api"
    chmod 0555 "${staging}/api"

    [ -f "${staging}/web/build/index.js" ] \
        || die "the web tarball has no build/index.js — wrong artifact?"
    [ -d "${staging}/web/node_modules" ] \
        || die "the web tarball has no node_modules — the box has no npm to make one"

    # The rename is the atomic step: either ${RELEASE_DIR} exists complete or it
    # does not exist at all. Nothing ever half-writes into a released path.
    mv "${staging}" "${RELEASE_DIR}"
    trap - EXIT
    log "release ${TAG} is on disk at ${RELEASE_DIR}"
}

if [ -d "${RELEASE_DIR}" ]; then
    log "release ${TAG} already on disk — not downloading"
else
    fetch_release
fi

[ -x "${RELEASE_DIR}/api" ] || die "${RELEASE_DIR}/api is missing or not executable"
[ -f "${RELEASE_DIR}/web/build/index.js" ] || die "${RELEASE_DIR}/web/build/index.js is missing"

# --------------------------------------------------------------------------
# The health gate
# --------------------------------------------------------------------------
#
# Both probes, not one. The API's readiness probe additionally opens a database
# connection, so it is the one that catches a bad DATABASE_URL or a migration
# that will not apply. /login is the SvelteKit process's equivalent: it renders
# for an anonymous request and touches nothing else, so a 200 means the bundle
# booted and can render.

probe() {
    fetch -q -T 5 -o /dev/null "$1"
}

wait_healthy() {
    local addr="$1"
    local deadline=$(( $(date +%s) + HEALTH_TIMEOUT_SECONDS ))

    while [ "$(date +%s)" -lt "${deadline}" ]; do
        if probe "http://${addr}:${API_PORT}/health/ready" \
            && probe "http://${addr}:${WEB_PORT}/login"; then
            return 0
        fi
        sleep "${HEALTH_INTERVAL_SECONDS}"
    done
    return 1
}

current_target() {
    readlink "${JAIL_ROOT}/$1/srv/athletos/current" 2>/dev/null || true
}

point_at() {
    local jail="$1" target="$2"
    # -h so that an existing symlink to a directory is replaced rather than
    # written *into*, which is the classic way to end up with
    # current/releases/v1.4.0 and a very confusing morning.
    ln -shf "${target}" "${JAIL_ROOT}/${jail}/srv/athletos/current"
}

# --------------------------------------------------------------------------
# Rolling one jail
# --------------------------------------------------------------------------

roll() {
    local jail="$1" addr="$2" target="$3"
    local previous
    previous="$(current_target "${jail}")"

    log "${jail}: stopping"
    service jail stop "athletos-${jail}" >/dev/null 2>&1 || true

    log "${jail}: pointing current -> ${target}"
    point_at "${jail}" "${target}"

    log "${jail}: starting"
    if ! service jail start "athletos-${jail}"; then
        log "${jail}: FAILED to start"
        revert "${jail}" "${previous}"
        return 1
    fi

    log "${jail}: waiting for /health/ready and /login on ${addr} (up to ${HEALTH_TIMEOUT_SECONDS}s)"
    if wait_healthy "${addr}"; then
        log "${jail}: healthy"
        return 0
    fi

    log "${jail}: FAILED to become healthy"
    tail -n 40 "${JAIL_ROOT}/${jail}/var/log/athletos/api.log" 2>/dev/null || true
    tail -n 40 "${JAIL_ROOT}/${jail}/var/log/athletos/web.log" 2>/dev/null || true
    revert "${jail}" "${previous}"
    return 1
}

revert() {
    local jail="$1" previous="$2"

    if [ -z "${previous}" ]; then
        log "${jail}: nothing to revert to — this jail has never had a release"
        service jail stop "athletos-${jail}" >/dev/null 2>&1 || true
        return
    fi

    log "${jail}: reverting to ${previous}"
    service jail stop "athletos-${jail}" >/dev/null 2>&1 || true
    point_at "${jail}" "${previous}"
    service jail start "athletos-${jail}" >/dev/null 2>&1 || true
}

# --------------------------------------------------------------------------
# The sequence
# --------------------------------------------------------------------------
#
# Green, then blue. Two gates, and they abort differently:
#
#   green fails  -> green is put back on its previous release and blue was
#                   never touched. The site is serving the old version on both
#                   jails. Exit 1. Nothing else to do.
#
#   blue fails   -> blue is put back on its previous release, but green is
#                   already on the new one. The site is up and serving a mix.
#                   Exit 2, loudly: either fix forward, or run
#                   `athletos-rollback` to bring green back too.

PREVIOUS_TAG="$(current_target blue | sed 's|^releases/||')"
log "deploying ${TAG}; blue is currently on ${PREVIOUS_TAG:-nothing}"

if ! roll green "${GREEN_ADDR}" "releases/${TAG}"; then
    die "green did not come up on ${TAG}. Blue was never touched and is still serving ${PREVIOUS_TAG:-its previous release}. Nothing was rolled."
fi

if ! roll blue "${BLUE_ADDR}" "releases/${TAG}"; then
    cat >&2 <<EOF

deploy: blue did not come up on ${TAG} and has been put back on ${PREVIOUS_TAG:-its previous release}.

  GREEN IS ALREADY SERVING ${TAG}. The site is up, on a mix of versions.
  Decide, do not wait:

    athletos-rollback ${PREVIOUS_TAG:-<previous-tag>}   # put green back too
    athletos-deploy <fixed-tag>                         # or fix forward

EOF
    exit 2
fi

# --------------------------------------------------------------------------
# Record and prune
# --------------------------------------------------------------------------

if [ -n "${PREVIOUS_TAG}" ] && [ "${PREVIOUS_TAG}" != "${TAG}" ]; then
    printf '%s\n' "${PREVIOUS_TAG}" >"${STATE_DIR}/previous-tag"
fi
printf '%s\n' "${TAG}" >"${STATE_DIR}/current-tag"

# Never prune anything currently pointed at, and never prune the rollback
# target. Ordering is by mtime, which for a directory created by the `mv` above
# is when it was staged — the order releases actually arrived, which is not the
# order their tags sort in.
log "pruning old releases, keeping ${KEEP_RELEASES}"
keep_blue="$(current_target blue | sed 's|^releases/||')"
keep_green="$(current_target green | sed 's|^releases/||')"
keep_prev="$(cat "${STATE_DIR}/previous-tag" 2>/dev/null || true)"

n=0
find "${RELEASES_DIR}" -maxdepth 1 -mindepth 1 -type d -exec stat -f '%m %N' {} + \
    | sort -rn \
    | while read -r _mtime path; do
        dir="$(basename "${path}")"
        case "${dir}" in
            "${keep_blue}" | "${keep_green}" | "${keep_prev}" | .*) continue ;;
        esac
        n=$((n + 1))
        if [ "${n}" -gt "${KEEP_RELEASES}" ]; then
            log "  removing ${dir}"
            rm -rf "${RELEASES_DIR:?}/${dir}"
        fi
    done

log "deployed ${TAG} to both jails"
