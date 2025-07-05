#!/bin/bash
set -e

DEPLOY_USER="deploy"
DEPLOY_HOME="/home/$DEPLOY_USER"
PUBKEY_PATH="./deploy_athletos_app.pub"

if [ ! -f "$PUBKEY_PATH" ]; then
    echo "Public key $PUBKEY_PATH not found!"
    exit 1
fi

mkdir -p "$DEPLOY_HOME/.ssh"
cat "$PUBKEY_PATH" >> "$DEPLOY_HOME/.ssh/authorized_keys"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_HOME/.ssh"
chmod 700 "$DEPLOY_HOME/.ssh"
chmod 600 "$DEPLOY_HOME/.ssh/authorized_keys"

echo "SSH key added for $DEPLOY_USER." 