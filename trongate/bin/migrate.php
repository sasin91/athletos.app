<?php
/**
 * Applies every pending migration in database/migrations, in filename order.
 *
 * Trongate has no migration system, so this is the smallest one that is still
 * honest: each file runs once, is recorded in `schema_migrations` with a
 * checksum, and a migration that was edited after it ran stops the run rather
 * than being silently skipped. MariaDB commits DDL implicitly, so a file is not
 * atomic: a migration that fails halfway must be repaired by hand, which is
 * why each file should do one thing.
 *
 * Usage: php bin/migrate.php   (reads the same DB_* variables as the app)
 */

declare(strict_types=1);

require __DIR__ . '/../config/database.php';

function migrate(array $db, string $dir): array {
    $pdo = new PDO(
        "mysql:host={$db['host']};port={$db['port']};dbname={$db['database']};charset=utf8mb4",
        $db['user'],
        $db['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
    );
    $pdo->exec("set time_zone = '+00:00'");
    $pdo->exec('create table if not exists schema_migrations (
        version    varchar(255) not null primary key,
        checksum   char(64)     not null,
        applied_at datetime(6)  not null default current_timestamp(6)
    ) engine = InnoDB');

    $applied = $pdo->query('select version, checksum from schema_migrations')->fetchAll(PDO::FETCH_KEY_PAIR);
    $ran = [];

    $files = glob($dir . '/*.sql') ?: [];
    sort($files, SORT_STRING);

    foreach ($files as $file) {
        $version = basename($file, '.sql');
        $sql = file_get_contents($file);
        $checksum = hash('sha256', $sql);

        if (isset($applied[$version])) {
            if ($applied[$version] !== $checksum) {
                throw new RuntimeException("{$version} was edited after it was applied; add a new migration instead");
            }
            continue;
        }

        foreach (split_statements($sql) as $statement) {
            $pdo->exec($statement);
        }

        $insert = $pdo->prepare('insert into schema_migrations (version, checksum) values (?, ?)');
        $insert->execute([$version, $checksum]);
        $ran[] = $version;
    }

    return $ran;
}

/**
 * Splits a migration into statements on a `;` that ends a line, after
 * dropping `--` comments. Migrations therefore must not put a `;` at the end
 * of a line inside a string literal.
 *
 * @return list<string>
 */
function split_statements(string $sql): array {
    $without_comments = preg_replace('/^\s*--.*$/m', '', $sql);
    $statements = preg_split('/;\s*$/m', $without_comments);
    return array_values(array_filter(array_map('trim', $statements), static fn (string $s) => $s !== ''));
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    foreach (migrate($databases['default'], __DIR__ . '/../database/migrations') as $version) {
        echo "applied {$version}\n";
    }
    echo "up to date\n";
}
