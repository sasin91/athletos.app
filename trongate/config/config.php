<?php
// The main config file.
//
// Every value a deployment changes is read from the environment, so one
// checkout runs unchanged on a laptop, in the test runner and on
// trongate.cloud. The fallbacks are what `php -S` in development wants.

define('BASE_URL', rtrim(getenv('BASE_URL') ?: 'http://127.0.0.1:8090', '/') . '/');
define('ENV', getenv('APP_ENV') === 'production' ? 'production' : 'dev');
define('DEFAULT_MODULE', 'api');
define('DEFAULT_METHOD', 'not_found');
define('MODULE_ASSETS_TRIGGER', '_module');

// An API has no HTML error page: an unknown path answers the way the Rust API
// does, with an empty 404.
define('ERROR_404', 'api/not_found');

// Early hooks, run in order before Trongate's own dispatcher. `autoload` makes
// every module's `src/` directory loadable; `api` then answers every request
// itself, from the `#[OpenAPI]` attributes, so Trongate's dispatcher never runs.
define('INTERCEPTORS', [
    'autoload' => '_register',
    'api' => '_dispatch',
]);
