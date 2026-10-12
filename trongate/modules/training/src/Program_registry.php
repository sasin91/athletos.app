<?php
/**
 * The compiled-in program catalogue, in the Rust registry's order.
 *
 * Programs are code (D-03): adding one means a deploy.
 */
final class Program_registry {

    /**
     * @return list<Catalogued>
     */
    public static function all(): array {
        static $registry = null;
        return $registry ??= [new Smolov_jr(), new Wendler_531_bbb(), new Bench_row_specialization()];
    }

    public static function find(string $key): ?Catalogued {
        foreach (self::all() as $program) {
            if ($program->meta()->key === $key) {
                return $program;
            }
        }
        return null;
    }
}
