#!/bin/sh
#
# Bring a freshly installed FreeBSD box to the state the deploy scripts assume.
#
# Idempotent and re-runnable, and that is the whole point of it: this file, not
# the Terraform beside it, is what would actually have to be reconstructed from
# memory after losing the machine. Terraform declares that a server exists.
# This declares what a server *is*. Run it as often as you like — every step
# checks before it acts, and the ones that write configuration write the same
# bytes every time.
#
#     ssh root@<box>
#     pkg install -y git && git clone <repo> /root/athletos
#     sh /root/athletos/infra/bootstrap.sh
#
# It is /bin/sh rather than bash — POSIX, `set -eu`, no pipefail — for the dull
# reason that it is the script that installs bash. The deploy-time scripts under
# deploy/ are bash and do use `set -euo pipefail`.

set -eu

# --------------------------------------------------------------------------
# Settings
# --------------------------------------------------------------------------

ZPOOL="${ZPOOL:-zroot}"

JAIL_ROOT="/jails"
BASE_JAIL="${JAIL_ROOT}/base"
JAILS="blue green"

# Fixed, and never generated. blue is .2, green is .3, and those two numbers
# appear in the jail.conf snippets, the Caddyfile and the deploy script. They do
# not change; a deploy that had to allocate an address would be a deploy that
# could allocate the wrong one.
BLUE_ADDR="10.0.0.2"
GREEN_ADDR="10.0.0.3"
JAIL_NET="10.0.0.0/24"

APP_USER="athletos"
APP_UID="920"
DEPLOY_USER="deploy"

RELEASES_DIR="/srv/athletos/releases"
CONF_DIR="/usr/local/etc/athletos"
PG_SOCKET_DIR="/var/run/postgresql"
BACKUP_STAGING="/var/backups/athletos"

PG_VERSION="17"

# Ports. Caddy is on high ports so that it need not be root; pf redirects 80 and
# 443 to these. The API and the SvelteKit process use the same ports in both
# jails — the jails differ by address, not by port, which is what makes the two
# jail.conf snippets identical apart from one line.
CADDY_HTTP_PORT="8880"
CADDY_HTTPS_PORT="8843"

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH='' cd -- "${SCRIPT_DIR}/.." && pwd)
DEPLOY_SRC="${REPO_ROOT}/deploy"

step() { printf '\n==> %s\n' "$1"; }
info() { printf '    %s\n' "$1"; }
die() { printf 'bootstrap: %s\n' "$1" >&2; exit 1; }

# --------------------------------------------------------------------------
# Preflight
# --------------------------------------------------------------------------

step "Preflight"

[ "$(uname -s)" = "FreeBSD" ] || die "this is a FreeBSD host script; uname says $(uname -s)"
[ "$(id -u)" -eq 0 ] || die "must run as root"
[ -d "${DEPLOY_SRC}" ] || die "cannot find ${DEPLOY_SRC}; run this from a checkout"
zpool list -H -o name "${ZPOOL}" >/dev/null 2>&1 || die "no zpool named ${ZPOOL}; set ZPOOL="

FREEBSD_RELEASE=$(freebsd-version -u | sed 's/-p[0-9]*$//')
info "FreeBSD ${FREEBSD_RELEASE} on zpool ${ZPOOL}"

# --------------------------------------------------------------------------
# ZFS ARC
# --------------------------------------------------------------------------
#
# ZFS sizes its cache at roughly half of RAM by default. On a 4 GB box that is
# 2 GB reserved for a cache in front of a database whose entire working set is
# a few hundred megabytes, competing with Postgres's own shared buffers for the
# same pages. Capped at 512 MB, the measured total — API 30 MB, two SvelteKit
# processes at 40-60 MB each, Caddy 20 MB, Postgres 200-300 MB, base 150 MB —
# lands near 1.1 GB and leaves genuine headroom.
#
# loader.conf and not a sysctl, because ARC sizing is read at boot.

step "ZFS ARC cap"

if grep -q '^vfs\.zfs\.arc_max=' /boot/loader.conf 2>/dev/null; then
    info "already set: $(grep '^vfs\.zfs\.arc_max=' /boot/loader.conf)"
else
    cat >>/boot/loader.conf <<'EOF'

# AthletOS: ZFS ARC defaults to half of RAM, which on a 4 GB box crowds out
# Postgres for no benefit. Takes effect at the next boot.
vfs.zfs.arc_max="512M"
EOF
    info "added vfs.zfs.arc_max=512M — takes effect at the next reboot"
fi

# --------------------------------------------------------------------------
# Packages
# --------------------------------------------------------------------------
#
# Deliberately short. Everything the application itself needs is either in the
# release tarball or in FreeBSD's base system.
#
#   caddy               the edge, with automatic TLS
#   postgresql17-*      the database, unix socket only
#   node24              the SvelteKit runtime. No npm on this box, ever — see
#                       docs/DEPLOYMENT.md. The release ships node_modules.
#   sanoid              ZFS snapshots on a schedule with tiered retention
#   age                 asymmetric encryption for the offsite dumps. Public key
#                       on the box, private key never on it.
#   bash                for the deploy scripts' `set -euo pipefail`
#   doas                so CI can run one command as root and nothing else

step "Packages"

ASSUME_ALWAYS_YES=yes pkg bootstrap >/dev/null 2>&1 || true
pkg update -q

PACKAGES="caddy postgresql${PG_VERSION}-server postgresql${PG_VERSION}-client node24 sanoid age bash doas ca_root_nss"
# shellcheck disable=SC2086
pkg install -y ${PACKAGES}

# --------------------------------------------------------------------------
# Datasets
# --------------------------------------------------------------------------
#
# The layout encodes one rule: what a deploy may replace and what it must never
# touch are different datasets.
#
#   <pool>/data/pgdata      the training history. Outside the release cycle,
#                           never cloned, never rolled back by a deploy.
#   <pool>/jails/base       one read-only copy of the userland both jails run.
#   <pool>/jails/blue       the writable layer for one jail. Small.
#   <pool>/jails/green      the other.
#   <pool>/releases         artifacts, shared read-only into both jails, so a
#                           release is downloaded once and rolled back to
#                           without a network.
#   <pool>/backups          staging for pg_dump. Not a backup — see D-18.

step "Datasets"

ensure_dataset() {
    _name="$1"
    _mount="$2"
    shift 2
    if zfs list -H -o name "${_name}" >/dev/null 2>&1; then
        info "exists: ${_name}"
    else
        if [ "${_mount}" = "none" ]; then
            zfs create -o canmount=off -o mountpoint=none "${_name}"
        else
            zfs create -o mountpoint="${_mount}" "${_name}"
        fi
        info "created: ${_name}"
    fi
    for _prop in "$@"; do
        zfs set "${_prop}" "${_name}"
    done
}

ensure_dataset "${ZPOOL}/data" none
# 8K records match Postgres's page size, so a single-page write is a
# single-record write rather than a read-modify-write of a 128K block.
ensure_dataset "${ZPOOL}/data/pgdata" "/var/db/postgres" \
    recordsize=8K compression=lz4 atime=off logbias=throughput
ensure_dataset "${ZPOOL}/jails" none
ensure_dataset "${ZPOOL}/jails/base" "${BASE_JAIL}" atime=off compression=lz4
ensure_dataset "${ZPOOL}/jails/blue" "${JAIL_ROOT}/blue" atime=off compression=lz4
ensure_dataset "${ZPOOL}/jails/green" "${JAIL_ROOT}/green" atime=off compression=lz4
ensure_dataset "${ZPOOL}/releases" "${RELEASES_DIR}" atime=off compression=lz4
ensure_dataset "${ZPOOL}/backups" "${BACKUP_STAGING}" atime=off compression=lz4

install -d -m 0755 /srv/athletos
install -d -m 0700 "${BACKUP_STAGING}"

# --------------------------------------------------------------------------
# Users
# --------------------------------------------------------------------------

step "Users"

if ! pw usershow "${APP_USER}" >/dev/null 2>&1; then
    pw useradd -n "${APP_USER}" -u "${APP_UID}" -c "AthletOS services" \
        -d /nonexistent -s /usr/sbin/nologin
    info "created ${APP_USER} on the host"
else
    info "${APP_USER} exists on the host"
fi

if ! pw usershow "${DEPLOY_USER}" >/dev/null 2>&1; then
    pw useradd -n "${DEPLOY_USER}" -c "CI deploy" -m -s /bin/sh
    info "created ${DEPLOY_USER}"
else
    info "${DEPLOY_USER} exists"
fi

# CI gets one command and nothing else. A deploy key that can run `deploy` is a
# very different thing from a deploy key that can run anything.
install -d -m 0755 /usr/local/etc
cat >/usr/local/etc/doas.conf <<EOF
permit nopass ${DEPLOY_USER} as root cmd /usr/local/sbin/athletos-deploy
permit nopass ${DEPLOY_USER} as root cmd /usr/local/sbin/athletos-rollback
permit persist :wheel
EOF
chmod 0600 /usr/local/etc/doas.conf

# --------------------------------------------------------------------------
# Postgres
# --------------------------------------------------------------------------
#
# On the host, not in a jail, and outside the release cycle entirely. A deploy
# stops and starts jails; it never touches this process or this dataset.
#
# The socket directory is /var/run/postgresql rather than FreeBSD's default of
# /tmp, because it is nullfs-mounted into each jail and /tmp is not a directory
# to be sharing across a jail boundary.

step "Postgres ${PG_VERSION}"

PG_DATA="/var/db/postgres/data${PG_VERSION}"

sysrc postgresql_enable="YES" >/dev/null
sysrc postgresql_data="${PG_DATA}" >/dev/null

install -d -o postgres -g postgres -m 0755 /var/db/postgres
install -d -o postgres -g postgres -m 0770 "${PG_SOCKET_DIR}"

if [ -f "${PG_DATA}/PG_VERSION" ]; then
    info "cluster already initialised at ${PG_DATA}"
else
    info "initdb"
    service postgresql initdb
fi

# No TCP port at all. The firewall then has nothing to get wrong about 5432,
# and neither does a future operator: the database is not reachable over the
# network because it is not listening on one.
pg_conf_set() {
    _key="$1"
    _value="$2"
    if grep -qE "^[[:space:]]*${_key}[[:space:]]*=" "${PG_DATA}/postgresql.conf"; then
        sed -i '' -E "s|^[[:space:]]*${_key}[[:space:]]*=.*|${_key} = ${_value}|" \
            "${PG_DATA}/postgresql.conf"
    else
        printf '%s = %s\n' "${_key}" "${_value}" >>"${PG_DATA}/postgresql.conf"
    fi
}

pg_conf_set listen_addresses "''"
pg_conf_set unix_socket_directories "'${PG_SOCKET_DIR}'"
pg_conf_set unix_socket_permissions "0770"
# Modest, because ARC is capped at 512 MB and the two caches should not add up
# to more than the box has.
pg_conf_set shared_buffers "256MB"
pg_conf_set effective_cache_size "512MB"

service postgresql status >/dev/null 2>&1 || service postgresql start
# `pg_isready` over the socket; the cluster may still be coming up.
_tries=0
while ! su -m postgres -c "pg_isready -h ${PG_SOCKET_DIR} -q" >/dev/null 2>&1; do
    _tries=$((_tries + 1))
    [ "${_tries}" -lt 30 ] || die "postgres did not become ready"
    sleep 1
done
service postgresql reload >/dev/null 2>&1 || true

if su -m postgres -c "psql -h ${PG_SOCKET_DIR} -tAc \"select 1 from pg_roles where rolname='${APP_USER}'\"" | grep -q 1; then
    info "role ${APP_USER} exists"
else
    su -m postgres -c "createuser -h ${PG_SOCKET_DIR} ${APP_USER}"
    info "created role ${APP_USER}"
fi

if su -m postgres -c "psql -h ${PG_SOCKET_DIR} -tAlq" | cut -d'|' -f1 | grep -qw athletos; then
    info "database athletos exists"
else
    su -m postgres -c "createdb -h ${PG_SOCKET_DIR} -O ${APP_USER} athletos"
    info "created database athletos"
fi

# The API runs `migrate()` at startup, so the role it connects as must be able
# to create tables. It owns the database; that is enough.

# --------------------------------------------------------------------------
# Loopback aliases
# --------------------------------------------------------------------------
#
# lo1 with two fixed aliases. jail.conf names these addresses and does not
# create them — a jail that manages its own interface addresses is a jail whose
# addresses can differ between a start and a restart.

step "lo1 aliases"

sysrc cloned_interfaces="lo1" >/dev/null
sysrc ifconfig_lo1_name="lo1" >/dev/null
sysrc ifconfig_lo1_alias0="inet ${BLUE_ADDR}/32" >/dev/null
sysrc ifconfig_lo1_alias1="inet ${GREEN_ADDR}/32" >/dev/null

ifconfig lo1 >/dev/null 2>&1 || ifconfig lo1 create
ifconfig lo1 | grep -q "inet ${BLUE_ADDR}" || ifconfig lo1 alias "${BLUE_ADDR}/32"
ifconfig lo1 | grep -q "inet ${GREEN_ADDR}" || ifconfig lo1 alias "${GREEN_ADDR}/32"
info "lo1: ${BLUE_ADDR} (blue), ${GREEN_ADDR} (green)"

# --------------------------------------------------------------------------
# The base jail
# --------------------------------------------------------------------------
#
# One userland, extracted once, nullfs-mounted read-only into both jails. Node
# is installed here rather than in each jail, so there is exactly one copy of it
# on disk and exactly one place to upgrade it.
#
# `pkg -r` installs into a root directory without chrooting, which is the
# supported way to populate a jail from outside it.

step "Base jail"

if [ -x "${BASE_JAIL}/bin/sh" ]; then
    info "base already extracted (${BASE_JAIL})"
else
    info "fetching base.txz for ${FREEBSD_RELEASE}"
    fetch -o /tmp/base.txz \
        "https://download.freebsd.org/ftp/releases/$(uname -m)/${FREEBSD_RELEASE}/base.txz"
    tar -xf /tmp/base.txz -C "${BASE_JAIL}"
    rm -f /tmp/base.txz
fi

cp -f /etc/resolv.conf "${BASE_JAIL}/etc/resolv.conf"
cp -f /etc/localtime "${BASE_JAIL}/etc/localtime" 2>/dev/null || true

if [ ! -x "${BASE_JAIL}/usr/local/bin/node" ]; then
    info "installing node24 into the base jail"
    pkg -r "${BASE_JAIL}" install -y node24 ca_root_nss
else
    info "node present in base: $("${BASE_JAIL}/usr/local/bin/node" --version 2>/dev/null || echo unknown)"
fi

# The service user has to exist inside the jail too, with the same uid, because
# the release files are owned by that uid on a filesystem both sides can see.
pw -R "${BASE_JAIL}" usershow "${APP_USER}" >/dev/null 2>&1 || \
    pw -R "${BASE_JAIL}" useradd -n "${APP_USER}" -u "${APP_UID}" \
        -c "AthletOS services" -d /nonexistent -s /usr/sbin/nologin

# rc scripts are part of the base, not of a release. They are static: they take
# their paths and ports from rc.conf and their secrets from the env file, so a
# new release never needs a new rc script. Changing one is a bootstrap re-run,
# which is exactly the property that makes it safe to change.
install -d -m 0755 "${BASE_JAIL}/usr/local/etc/rc.d"
install -m 0555 "${DEPLOY_SRC}/rc.d/athletos_api" "${BASE_JAIL}/usr/local/etc/rc.d/athletos_api"
install -m 0555 "${DEPLOY_SRC}/rc.d/athletos_web" "${BASE_JAIL}/usr/local/etc/rc.d/athletos_web"

# Mount points that later get something nullfs-mounted over them. They must
# exist inside the read-only base for the mount to have somewhere to land.
install -d -m 0755 "${BASE_JAIL}/usr/local/etc/athletos"

# --------------------------------------------------------------------------
# The two jails
# --------------------------------------------------------------------------
#
# A thin jail here means: the immutable half of the userland is a read-only
# nullfs mount of the base, and the writable half — /etc, /var, /tmp, /root and
# the release symlink — is the jail's own dataset. The writable layer is a few
# megabytes, so the two jails cost almost nothing beyond one base.

step "Jails"

# Read-only from the base. /usr/local is on this list, which is why node and the
# rc scripts live in the base: a jail cannot write to its own /usr/local, and
# that is the point.
RO_MOUNTS="bin sbin lib libexec rescue usr/bin usr/lib usr/libexec usr/sbin usr/share usr/local"

for jail in ${JAILS}; do
    root="${JAIL_ROOT}/${jail}"
    case "${jail}" in
        blue) addr="${BLUE_ADDR}" ;;
        green) addr="${GREEN_ADDR}" ;;
        *) die "unknown jail ${jail}" ;;
    esac

    info "jail ${jail} at ${root} (${addr})"

    for dir in ${RO_MOUNTS}; do
        install -d -m 0755 "${root}/${dir}"
    done
    install -d -m 0755 "${root}/usr/local/etc/athletos"
    install -d -m 0755 "${root}/srv/athletos/releases"
    install -d -m 0755 "${root}/dev"
    install -d -m 1777 "${root}/tmp"
    install -d -m 0750 "${root}/root"
    install -d -m 0755 "${root}/var/run/postgresql"

    # /etc and /var are copied out of the base once. They are never copied again
    # — the rc.conf written below is the jail's, and a re-run must not stamp on
    # it. `cp -a` only when the marker file is absent.
    if [ ! -f "${root}/etc/rc.conf" ]; then
        cp -a "${BASE_JAIL}/etc/" "${root}/etc/"
        cp -a "${BASE_JAIL}/var/" "${root}/var/"
        install -d -m 0755 "${root}/var/run/postgresql"
    fi
    install -d -o "${APP_USER}" -g "${APP_USER}" -m 0750 "${root}/var/log/athletos"

    # The jail's own configuration. Everything here is per-jail and non-secret;
    # secrets come from the env file. The API base URL is the jail's own address
    # and not 127.0.0.1: loopback inside a non-VNET jail is remapped to the
    # jail's first address, which would work, but "would work by a remapping
    # rule" is not a thing to depend on when the explicit form is one line.
    cat >"${root}/etc/rc.conf" <<EOF
# Written by infra/bootstrap.sh. Per-jail, static, non-secret.
hostname="${jail}.athletos.internal"
sendmail_enable="NONE"
syslogd_flags="-ss"
cron_enable="NO"

athletos_api_enable="YES"
athletos_api_bind="0.0.0.0:8080"

athletos_web_enable="YES"
athletos_web_port="3000"
athletos_web_host="0.0.0.0"
athletos_web_api_base_url="http://${addr}:8080"
EOF

    # The read-only base, then the shared release directory, then the config
    # directory over the top of the base's /usr/local. Order matters: a mount
    # that lands on a path provided by an earlier mount has to come after it.
    {
        for dir in ${RO_MOUNTS}; do
            printf '%s/%s\t%s/%s\tnullfs\tro\t0\t0\n' \
                "${BASE_JAIL}" "${dir}" "${root}" "${dir}"
        done
        printf '%s\t%s/usr/local/etc/athletos\tnullfs\tro\t0\t0\n' \
            "${CONF_DIR}" "${root}"
        printf '%s\t%s/srv/athletos/releases\tnullfs\tro\t0\t0\n' \
            "${RELEASES_DIR}" "${root}"
        printf '%s\t%s/var/run/postgresql\tnullfs\trw\t0\t0\n' \
            "${PG_SOCKET_DIR}" "${root}"
    } >"/etc/fstab.athletos-${jail}"

    install -d -m 0755 /etc/jail.conf.d
    install -m 0644 "${DEPLOY_SRC}/jail.conf.d/athletos-${jail}.conf" \
        "/etc/jail.conf.d/athletos-${jail}.conf"
done

sysrc jail_enable="YES" >/dev/null
sysrc jail_list="athletos-blue athletos-green" >/dev/null
sysrc jail_parallel_start="NO" >/dev/null

# --------------------------------------------------------------------------
# Configuration and secrets
# --------------------------------------------------------------------------
#
# One file, 0600, on the host, nullfs-mounted read-only into both jails. The
# signing key is deliberately *not* in it: it is its own 0400 root-owned file,
# read by the rc script — which runs as root — and exported into the process's
# environment before privileges are dropped. The application user never has
# permission to read the key it signs with.

step "Configuration"

install -d -m 0700 "${CONF_DIR}"

if [ -f "${CONF_DIR}/env" ]; then
    info "${CONF_DIR}/env exists — left alone"
else
    install -m 0600 "${REPO_ROOT}/.env.example" "${CONF_DIR}/env"
    info "seeded ${CONF_DIR}/env from .env.example — EDIT IT before the first deploy"
fi
chmod 0600 "${CONF_DIR}/env"

if [ -f "${CONF_DIR}/signing-key.pem" ]; then
    info "signing key present"
else
    cat >&2 <<EOF

    !! No signing key at ${CONF_DIR}/signing-key.pem.
       The API refuses to start without one when APP_ENV=production. Generate:

           openssl genpkey -algorithm ED25519 -out ${CONF_DIR}/signing-key.pem
           chmod 0400 ${CONF_DIR}/signing-key.pem
           # then set AUTH_SIGNING_KEY_ID in ${CONF_DIR}/env

EOF
fi

# --------------------------------------------------------------------------
# pf
# --------------------------------------------------------------------------
#
# Two jobs. It redirects 80 and 443 to the high ports Caddy listens on, so that
# nothing has to run as root to answer them; and it NATs the jail network
# outbound, which matters only if AUTH_HIBP_ENABLED is ever turned on.
#
# It is not the primary firewall — the Hetzner cloud firewall is, because that
# one holds while this box is in rescue mode or mid-boot.

step "pf"

EXT_IF=$(route -n get default 2>/dev/null | awk '/interface:/ {print $2}')
[ -n "${EXT_IF}" ] || EXT_IF="vtnet0"
info "external interface: ${EXT_IF}"

cat >/etc/pf.conf <<EOF
# Written by infra/bootstrap.sh.
ext_if = "${EXT_IF}"
jail_net = "${JAIL_NET}"

set skip on lo0
set skip on lo1

# Caddy runs unprivileged on high ports; the world still talks to 80 and 443.
rdr pass on \$ext_if inet proto tcp to port 80 -> (\$ext_if) port ${CADDY_HTTP_PORT}
rdr pass on \$ext_if inet proto tcp to port 443 -> (\$ext_if) port ${CADDY_HTTPS_PORT}

# Only used if a jail is ever given a reason to reach the internet — the HIBP
# range lookup is the one candidate, and it is off by default.
nat on \$ext_if inet from \$jail_net to any -> (\$ext_if)

block drop in all
pass out all keep state

pass in on \$ext_if inet proto tcp to port { 22, ${CADDY_HTTP_PORT}, ${CADDY_HTTPS_PORT} } keep state
pass in on \$ext_if inet proto icmp
EOF

# pf.ko has to be in the kernel before pfctl will do anything at all, including
# a syntax check: on FreeBSD 15 pfctl talks to the kernel over netlink, so
# without the module even `pfctl -n` fails with "Failed to open netlink", which
# reads like a broken ruleset and is not one.
#
# `pf_load` in loader.conf is what makes it survive a reboot; `service pf start`
# would load it too, but only after this check has already run.
kldstat -q -m pf || kldload pf || die "could not load pf.ko"
sysrc -f /boot/loader.conf pf_load="YES" >/dev/null

pfctl -n -f /etc/pf.conf || die "pf.conf did not parse"
sysrc pf_enable="YES" >/dev/null
sysrc pflog_enable="YES" >/dev/null
if service pf status >/dev/null 2>&1; then
    service pf reload
else
    service pf start
fi

# --------------------------------------------------------------------------
# Caddy
# --------------------------------------------------------------------------

step "Caddy"

install -d -m 0755 /usr/local/etc/caddy
install -m 0644 "${DEPLOY_SRC}/Caddyfile" /usr/local/etc/caddy/Caddyfile

# rc.subr's ${name}_env, so the Caddyfile can carry {$APP_DOMAIN} and
# {$ACME_EMAIL} rather than being generated. A generated Caddyfile is one more
# thing that can be generated wrong.
APP_DOMAIN=$(awk -F= '/^APP_DOMAIN=/ {sub(/^APP_DOMAIN=/, ""); print}' "${CONF_DIR}/env")
ACME_EMAIL=$(awk -F= '/^ACME_EMAIL=/ {sub(/^ACME_EMAIL=/, ""); print}' "${CONF_DIR}/env")
if [ -z "${APP_DOMAIN}" ] || [ -z "${ACME_EMAIL}" ]; then
    info "APP_DOMAIN or ACME_EMAIL is unset in ${CONF_DIR}/env — Caddy will not start until it is"
fi

sysrc caddy_enable="YES" >/dev/null
sysrc caddy_config="/usr/local/etc/caddy/Caddyfile" >/dev/null

# caddy_env is deliberately NOT written into rc.conf with the values read
# above. Doing that copies APP_DOMAIN and ACME_EMAIL out of the env file at
# bootstrap time, and the copy then goes stale the moment anyone edits the env
# file — silently, with the symptom being Caddy requesting a certificate for
# whatever the domain used to be.
#
# rc.conf.d/<service> is sourced as shell by rc.subr, so it can read the one
# source of truth at service start instead of duplicating it.
mkdir -p /usr/local/etc/rc.conf.d
cat >/usr/local/etc/rc.conf.d/caddy <<EOF
# Written by infra/bootstrap.sh. Reads ${CONF_DIR}/env at service start so the
# env file stays the only place APP_DOMAIN and ACME_EMAIL are defined.
if [ -r "${CONF_DIR}/env" ]; then
    . "${CONF_DIR}/env"
    caddy_env="APP_DOMAIN=\${APP_DOMAIN} ACME_EMAIL=\${ACME_EMAIL}"
fi
EOF

# Remove any copy an earlier run of this script left behind, or it wins.
sysrc -x caddy_env >/dev/null 2>&1 || true

# --------------------------------------------------------------------------
# Deploy scripts
# --------------------------------------------------------------------------

step "Deploy scripts"

install -m 0555 "${DEPLOY_SRC}/deploy.sh" /usr/local/sbin/athletos-deploy
install -m 0555 "${DEPLOY_SRC}/rollback.sh" /usr/local/sbin/athletos-rollback
install -m 0555 "${DEPLOY_SRC}/backup.sh" /usr/local/sbin/athletos-backup
install -m 0555 "${DEPLOY_SRC}/restore.sh" /usr/local/sbin/athletos-restore
info "installed into /usr/local/sbin"

# --------------------------------------------------------------------------
# Snapshots and backups
# --------------------------------------------------------------------------
#
# Two different things that both get called "backup".
#
# sanoid takes local ZFS snapshots. They are instant, cheap, and let a mistake
# be undone in seconds — and they are on the same disk as the thing they
# protect, so they are not a backup. They are an undo button.
#
# backup.sh pushes an encrypted pg_dump offsite. That is the backup.

step "Snapshots and backups"

install -d -m 0755 /usr/local/etc/sanoid
install -m 0644 "${DEPLOY_SRC}/sanoid.conf" /usr/local/etc/sanoid/sanoid.conf
sed -i '' "s|^\[zroot/|[${ZPOOL}/|g" /usr/local/etc/sanoid/sanoid.conf

install -d -m 0755 /usr/local/etc/cron.d
install -m 0644 "${DEPLOY_SRC}/cron/athletos" /usr/local/etc/cron.d/athletos
sysrc cron_enable="YES" >/dev/null

# --------------------------------------------------------------------------
# Done
# --------------------------------------------------------------------------

step "Done"
cat <<EOF

    Next, in order:

      1. Edit ${CONF_DIR}/env — at minimum APP_DOMAIN, ACME_EMAIL,
         AUTH_SIGNING_KEY_ID and the backup target.
      2. Generate the signing key (see above), 0400.
      3. Point DNS at this box: A/AAAA for \$APP_DOMAIN and api.\$APP_DOMAIN.
      4. service caddy start
      5. athletos-deploy <tag>   — the first deploy starts both jails.

    Reboot once before the first deploy so the ARC cap takes effect.

EOF
