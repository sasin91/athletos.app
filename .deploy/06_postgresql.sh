#!/bin/bash
set -e

DB_NAME="athletos"
DB_USER="athletos"
DB_PASS=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 32)

# Install PostgreSQL
apt update
apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl enable --now postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

# Output credentials
cat <<INFO
PostgreSQL database and user created for Laravel:
  Database: $DB_NAME
  Username: $DB_USER
  Password: $DB_PASS

Add these to your .env file:
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=$DB_NAME
DB_USERNAME=$DB_USER
DB_PASSWORD=$DB_PASS
INFO 