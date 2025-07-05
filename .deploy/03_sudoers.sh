#!/bin/bash
set -e

DEPLOY_USER="deploy"
SUDOERS_FILE="/etc/sudoers.d/$DEPLOY_USER"

echo "$DEPLOY_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart php8.4-fpm, /usr/bin/systemctl reload nginx" > "$SUDOERS_FILE"
chmod 440 "$SUDOERS_FILE"

echo "Sudoers file created for $DEPLOY_USER." 