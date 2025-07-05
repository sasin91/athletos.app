#!/bin/bash
set -e

DOMAIN="athletos.app"
EMAIL="jonas.kerwin.hansen@gmail.com"

# Install Certbot and nginx plugin
apt update
apt install -y certbot python3-certbot-nginx

# Obtain and install certificate
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect

# Reload nginx to apply changes
systemctl reload nginx

echo "Let's Encrypt SSL certificate installed and nginx reloaded for $DOMAIN." 