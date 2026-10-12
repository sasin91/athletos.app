<?php
#[Api_schema(description: <<<'TXT'
    RFC 9457 problem details. `type` is omitted until we publish stable problem
    type URIs; consumers should branch on `status` plus `title` for now.
    TXT)]
final class ProblemDetails {

    public function __construct(
        #[Api_field(description: 'Short, human-readable summary of the problem type.', example: 'Not Found')]
        public readonly string $title,
        #[Api_field(description: 'HTTP status code, repeated in the body per RFC 9457.', example: 404, format: 'int32', minimum: 0)]
        public readonly int $status,
        #[Api_field(description: 'Human-readable explanation specific to this occurrence.')]
        public readonly string $detail,
    ) {
    }
}
