#!/bin/bash
set -e

DEPLOY_USER="deploy"
APP_DIR="/var/www/athletos.app"
RELEASES_DIR="$APP_DIR/releases"

mkdir -p "$RELEASES_DIR"
chown -R "$DEPLOY_USER:www-data" "$APP_DIR"
chmod -R 775 "$APP_DIR"

echo "Directories prepared and permissions set." 