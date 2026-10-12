<?php
/**
 * A response whose status or headers differ from what the attribute declares.
 *
 * Most handlers never need this: returning a value sends it as JSON with the
 * attribute's `status`. A handler that answers 200 or 201 depending on whether
 * it created something returns one of these.
 */
final class Api_response {

    /** @param array<string, string> $headers */
    public function __construct(
        public readonly mixed $body,
        public readonly int $status = 200,
        public readonly array $headers = [],
    ) {
    }

    /**
     * A response with no body at all, the way axum answers 404 and 405.
     */
    public static function empty(int $status, array $headers = []): self {
        return new self(null, $status, $headers);
    }
}
