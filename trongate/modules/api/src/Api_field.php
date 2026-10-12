<?php
/**
 * Documents one property of an `Api_schema` class.
 *
 * Only what a PHP type cannot say lives here. `items` names an array's element
 * type, since `array` alone does not. `format` and `minimum` exist because a
 * PHP `int` cannot say "unsigned 16-bit" and the Rust contract this document
 * mirrors does.
 */
#[Attribute(Attribute::TARGET_PROPERTY | Attribute::TARGET_PARAMETER)]
final class Api_field {

    /**
     * @param class-string|string|null $items Element type of an array: a schema
     *     class, a backed enum, or one of 'string', 'int', 'float', 'bool'.
     */
    public function __construct(
        public readonly string $description = '',
        public readonly mixed $example = null,
        public readonly ?string $items = null,
        public readonly ?string $format = null,
        public readonly int|float|null $minimum = null,
    ) {
    }
}
