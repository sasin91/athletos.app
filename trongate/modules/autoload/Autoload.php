<?php
/**
 * Makes every class under a module's `src/` directory loadable by name.
 *
 * Trongate's own autoloader finds exactly one class per module, the one named
 * after it (`modules/db/Db.php`). An API needs more than that per module: the
 * attribute classes, the request and response types, the training engine's
 * value objects. Putting each in a module of its own would make the module list
 * meaningless, so a module keeps them in `src/`, one class per file, the file
 * named after the class.
 *
 * Registered as the first interceptor, and called directly by the CLI scripts
 * and the test runner, which never pass through `public/index.php`.
 */
class Autoload {

    /** @var array<string, string>|null Class name => absolute file path. */
    private static ?array $class_map = null;

    public function __construct(?string $module_name = null) {
    }

    /**
     * Interceptor entry point.
     */
    public function _register(): void {
        self::register(dirname(__DIR__));
    }

    /**
     * Registers the loader for every `src/` directory under $modules_dir.
     *
     * Idempotent, so a test runner that boots twice does not stack loaders.
     */
    public static function register(string $modules_dir): void {
        if (self::$class_map !== null) {
            return;
        }

        self::$class_map = self::build_class_map($modules_dir);

        spl_autoload_register(static function (string $class_name): void {
            $file = self::$class_map[$class_name] ?? null;
            if ($file !== null) {
                require_once $file;
            }
        });
    }

    /**
     * @return array<string, string>
     */
    private static function build_class_map(string $modules_dir): array {
        $map = [];

        foreach (glob($modules_dir . '/*/src', GLOB_ONLYDIR) ?: [] as $src_dir) {
            $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($src_dir, FilesystemIterator::SKIP_DOTS));

            foreach ($files as $file) {
                if ($file->getExtension() !== 'php') {
                    continue;
                }

                $class_name = $file->getBasename('.php');

                // Two modules defining the same class name would make which one
                // loads depend on glob order. Refuse instead of guessing.
                if (isset($map[$class_name])) {
                    throw new RuntimeException("Class {$class_name} is defined in both {$map[$class_name]} and {$file->getPathname()}");
                }

                $map[$class_name] = $file->getPathname();
            }
        }

        return $map;
    }
}
