<?php
/**
 * An error a handler wants the client to see, as RFC 9457 problem details.
 *
 * Thrown rather than returned so that a model three calls deep can refuse a
 * request without every caller threading the refusal back up. The dispatcher
 * renders it as `{title, status, detail}`, which is the Rust API's
 * `ProblemDetails` exactly.
 */
final class Api_problem extends RuntimeException {

    /** @param array<string, string> $headers */
    public function __construct(
        public readonly int $status,
        public readonly string $detail,
        public readonly array $headers = [],
    ) {
        parent::__construct($detail, $status);
    }

    public static function not_found(): self {
        return new self(404, 'not found');
    }

    public static function unauthenticated(): self {
        return new self(401, 'authentication required');
    }

    public static function forbidden(): self {
        return new self(403, 'not permitted');
    }

    public static function validation(string $detail): self {
        return new self(422, $detail);
    }

    public static function conflict(string $detail): self {
        return new self(409, $detail);
    }

    /**
     * The client is told nothing; the cause goes to the log.
     */
    public static function internal(string $cause): self {
        error_log('internal failure: ' . $cause);
        return new self(500, 'An internal error occurred.');
    }
}
