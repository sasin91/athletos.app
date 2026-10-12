<?php
/**
 * Marks a class as a named schema in the OpenAPI document.
 *
 * The class's public properties are the schema's properties, in declaration
 * order, and are also exactly what `json_encode` writes, so the document and
 * the wire format are read off the same declaration. A property is required
 * unless its type is nullable.
 *
 * `one_of` turns an interface into a tagged union: each listed class carries
 * an `Api_variant` naming its tag, and is inlined into the union rather than
 * becoming a component of its own, matching serde's internally tagged enums.
 */
#[Attribute(Attribute::TARGET_CLASS)]
final class Api_schema {

    /**
     * @param string|null $name Component name; defaults to the class name.
     * @param list<class-string> $one_of Variant classes, for an interface.
     */
    public function __construct(
        public readonly string $description = '',
        public readonly ?string $name = null,
        public readonly array $one_of = [],
    ) {
    }
}
