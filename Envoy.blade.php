@servers(['web' => 'deploy@95.217.213.48'])

@setup
    $tarball_url = 'https://api.github.com/repos/sasin91/athletos.app/tarball/main';

    $releases_dir = '/var/www/athletos.app/releases';
    $app_dir = '/var/www/athletos.app';
    $release = date('YmdHis');
    $new_release_dir = $releases_dir . '/' . $release;

    if (!$tarball_url) {
        throw new Exception("Tarball URL must be provided as the first argument.");
    }
@endsetup

@task('deploy', ['on' => 'web'])
    echo "Starting deployment to $new_release_dir..."
    cd {{ $app_dir }}

    # Create a new release directory
    mkdir -p {{ $new_release_dir }}

    # Download and extract the tarball from a private repository
    curl -L {{ $tarball_url }} | tar xz -C {{ $new_release_dir }} --strip-components=1

    # Change ownership to deploy
    chown -R deploy:www-data {{ $new_release_dir }}

    # Change into the new release directory
    cd {{ $new_release_dir }}

    # Install Composer dependencies as deploy user
    composer install --optimize-autoloader --no-dev

    # Copy the .env file (ensure this file exists at the root of your project)
    cp {{ $app_dir }}/.env {{ $new_release_dir }}/.env

    # Run migrations as deploy user
    php artisan migrate --force

    # Run optimize command as deploy user
    php artisan optimize

    # Install nodejs dependencies
    npm install

    # Build assets
    npm run build

    # Symlink the current release
    rm -rf {{ $app_dir }}/current
    ln -s {{ $new_release_dir }} {{ $app_dir }}/current

    # reload php-fpm
    sudo systemctl restart php8.4-fpm

    echo "Deployment completed successfully!"
@endtask

@task('rollback', ['on' => 'web'])
    echo "Rolling back to the previous release..."
    cd {{ $app_dir }}

    # Find the previous release
    cd {{ $releases_dir }}
    previous_release=$(ls -1 | sort -r | sed -n '2p')

    if [ -z "$previous_release" ]; then
        echo "No previous release found, cannot roll back."
        exit 1
    fi

    # Remove the current symlink
    rm -rf {{ $app_dir }}/current

    # Create a new symlink to the previous release
    ln -s {{ $releases_dir }}/$previous_release {{ $app_dir }}/current

    echo "Rollback completed successfully!"
@endtask

@story('deploy')
    deploy
@endstory

@story('rollback')
    rollback
@endstory
