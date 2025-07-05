#!/bin/bash
set -e

DEPLOY_USER="deploy"
DEPLOY_HOME="/home/$DEPLOY_USER"

# Create deploy user if it doesn't exist
if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$DEPLOY_USER"
    usermod -aG www-data "$DEPLOY_USER"
    echo "User $DEPLOY_USER created."
else
    echo "User $DEPLOY_USER already exists."
fi 