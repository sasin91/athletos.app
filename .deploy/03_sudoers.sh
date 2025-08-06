#!/bin/bash
set -e

DEPLOY_USER="deploy"
SUDOERS_FILE="/etc/sudoers.d/$DEPLOY_USER"

echo "$DEPLOY_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart php8.4-fpm, /usr/bin/systemctl reload nginx, /usr/bin/systemctl restart laravel-ssr, /usr/bin/systemctl start laravel-ssr, /usr/bin/systemctl stop laravel-ssr" > "$SUDOERS_FILE"
chmod 440 "$SUDOERS_FILE"

echo "Sudoers file created for $DEPLOY_USER with SSR service permissions."
