#!/bin/bash
set -e

# Variables
PHP_VERSION="8.4"

# Update and install prerequisites
apt update && apt upgrade -y
apt install -y apt-transport-https lsb-release ca-certificates curl gnupg2 software-properties-common unzip git

# Add deb.sury.org PHP repository
if ! grep -q 'packages.sury.org' /etc/apt/sources.list /etc/apt/sources.list.d/*; then
    curl -fsSL https://packages.sury.org/php/apt.gpg | gpg --dearmor -o /etc/apt/trusted.gpg.d/php.gpg
    echo "deb https://packages.sury.org/php/ $(lsb_release -sc) main" > /etc/apt/sources.list.d/php.list
    apt update
fi

# Install PHP, nginx, and common PHP extensions for Laravel
apt install -y \
    nginx \
    php${PHP_VERSION} \
    php${PHP_VERSION}-cli \
    php${PHP_VERSION}-fpm \
    php${PHP_VERSION}-mbstring \
    php${PHP_VERSION}-xml \
    php${PHP_VERSION}-bcmath \
    php${PHP_VERSION}-zip \
    php${PHP_VERSION}-curl \
    php${PHP_VERSION}-pgsql \
    php${PHP_VERSION}-sqlite3 \
    php${PHP_VERSION}-gd \
    php${PHP_VERSION}-intl

# Install Composer globally (using provided instructions)
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php -r "if (hash_file('sha384', 'composer-setup.php') === 'dac665fdc30fdd8ec78b38b9800061b4150413ff2e3b6f88543c636f7cd84f6db9189d43a81e5503cda447da73c7e5b6') { echo 'Installer verified'.PHP_EOL; } else { echo 'Installer corrupt'.PHP_EOL; unlink('composer-setup.php'); exit(1); }"
php composer-setup.php
php -r "unlink('composer-setup.php');"
sudo mv composer.phar /usr/local/bin/composer

# Enable and start services
systemctl enable nginx
systemctl enable php${PHP_VERSION}-fpm
systemctl restart nginx
systemctl restart php${PHP_VERSION}-fpm

echo "Debian setup complete: PHP $PHP_VERSION, nginx, and Composer installed." 