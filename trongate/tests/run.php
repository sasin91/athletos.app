<?php
/**
 * Runs the test suite: `php tests/run.php [filter]`.
 *
 * Creates a throwaway MariaDB database, applies the migrations, serves the app
 * with PHP's built-in server exactly as `public/index.php` is served in
 * production, runs every `tests/*_test.php`, and drops the database again.
 *
 * Needs a MariaDB (10.7 or later, for the UUID type) that the DB_* variables
 * reach, with rights to create and drop a database. Defaults suit a local
 * server with an `athletos` user.
 */

declare(strict_types=1);

$root = dirname(__DIR__);
require $root . '/modules/autoload/Autoload.php';
require $root . '/bin/migrate.php';
require __DIR__ . '/lib/Test_kit.php';
Autoload::register($root . '/modules');

$filter = $argv[1] ?? '';
$db = [
    'host' => getenv('DB_HOST') ?: '127.0.0.1',
    'port' => getenv('DB_PORT') ?: '3306',
    'user' => getenv('DB_USER') ?: 'athletos',
    'password' => getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : 'athletos',
    'database' => 'athletos_test_' . getmypid(),
];

$admin = new PDO("mysql:host={$db['host']};port={$db['port']};charset=utf8mb4", $db['user'], $db['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$admin->exec("create database `{$db['database']}`");
$server = null;

try {
    migrate($db, $root . '/database/migrations');
    $pdo = new PDO("mysql:host={$db['host']};port={$db['port']};dbname={$db['database']};charset=utf8mb4", $db['user'], $db['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    $port = free_port();
    $kit = new Test_kit("http://127.0.0.1:{$port}", $pdo);
    $rust = Test_kit::fixture('rust_access_token.json');

    $env = getenv() + [];
    $env['DB_HOST'] = $db['host'];
    $env['DB_PORT'] = $db['port'];
    $env['DB_USER'] = $db['user'];
    $env['DB_PASSWORD'] = $db['password'];
    $env['DB_NAME'] = $db['database'];
    $env['BASE_URL'] = $kit->base_url;
    $env['AUTH_VERIFICATION_KEYS'] = $kit->test_key['kid'] . ':' . Test_kit::b64($kit->test_key['public'])
        . ',' . $rust['kid'] . ':' . $rust['public_key'];

    $log = sys_get_temp_dir() . "/athletos-trongate-test-{$port}.log";
    $server = proc_open(
        [PHP_BINARY, '-S', "127.0.0.1:{$port}", 'index.php'],
        [0 => ['pipe', 'r'], 1 => ['file', $log, 'a'], 2 => ['file', $log, 'a']],
        $pipes,
        $root . '/public',
        $env,
    );
    wait_for_port($port);

    $passed = 0;
    $failed = [];
    foreach (glob(__DIR__ . '/*_test.php') as $file) {
        $tests = require $file;
        foreach ($tests as $name => $test) {
            $label = basename($file, '_test.php') . ': ' . $name;
            if ($filter !== '' && !str_contains($label, $filter)) {
                continue;
            }
            try {
                $test($kit);
                $passed++;
                echo "  ok  {$label}\n";
            } catch (Throwable $e) {
                $failed[] = $label;
                echo "FAIL  {$label}\n      " . str_replace("\n", "\n      ", $e->getMessage()) . "\n";
                if (!$e instanceof Assertion_failed) {
                    echo '      at ' . $e->getFile() . ':' . $e->getLine() . "\n";
                }
            }
        }
    }

    echo "\n{$passed} passed, " . count($failed) . " failed\n";
    if ($failed !== []) {
        echo "server log: {$log}\n";
    }
    $exit = $failed === [] ? 0 : 1;
} finally {
    if (is_resource($server)) {
        proc_terminate($server);
        proc_close($server);
    }
    $admin->exec("drop database if exists `{$db['database']}`");
}

exit($exit ?? 1);

function free_port(): int {
    $socket = stream_socket_server('tcp://127.0.0.1:0');
    $name = stream_socket_get_name($socket, false);
    fclose($socket);
    return (int) substr($name, strrpos($name, ':') + 1);
}

function wait_for_port(int $port): void {
    for ($i = 0; $i < 100; $i++) {
        $connection = @fsockopen('127.0.0.1', $port);
        if ($connection) {
            fclose($connection);
            return;
        }
        usleep(50_000);
    }
    throw new RuntimeException("the test server never started on port {$port}");
}
