<?php
/**
 * One arm of an `Api_schema(one_of: ...)` union.
 *
 * The tag is serialised as the first property, the way serde writes an
 * internally tagged enum, so the class must declare it first: `public string
 * $kind = 'fixed'`. Declaring it here as well is what lets the document say
 * `enum: ['fixed']` without instantiating anything.
 */
#[Attribute(Attribute::TARGET_CLASS)]
final class Api_variant {

    public function __construct(
        public readonly string $tag,
        public readonly string $value,
    ) {
    }
}
