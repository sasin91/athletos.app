<?php
/**
 * Declares a controller method as an HTTP API operation.
 *
 * One attribute is the whole contract: the api module routes requests by
 * it, authenticates by it, and builds the OpenAPI document from it, so the
 * route, the access rule and the documentation cannot drift apart.
 *
 *     #[OpenAPI(
 *         path: '/v1/programs/{key}',
 *         methods: ['GET'],
 *         description: "One program's catalogue entry.",
 *         required_user_level: 'athlete',
 *         responses: [200 => ['The program', ProgramSummary::class], 404 => 'No program has that key'],
 *         params: ['key' => ["The program's registry key", 'smolov-jr']],
 *     )]
 *     public function show_program(string $key): ProgramSummary { ... }
 *
 * Path parameters are passed to the method by name. A parameter named
 * `$principal` receives whatever the authenticator returned. The return value
 * is encoded as JSON with `$status`, unless it is an `Api_response`.
 */
#[Attribute(Attribute::TARGET_METHOD)]
final class OpenAPI {

    /** @var list<string> */
    public readonly array $methods;

    /**
     * @param string $path Path template, `{name}` for a parameter.
     * @param list<string>|string $methods HTTP methods this operation answers.
     * @param string $description Prose for the document. The first paragraph
     *     becomes the summary and the rest the description, the way utoipa
     *     splits a doc comment.
     * @param int|string|null $required_user_level Null for a public operation;
     *     anything else is handed to the configured authenticator, and the
     *     operation is documented with the configured security scheme and a 401.
     * @param array<int, string|array{0: string, 1?: class-string|null}> $responses
     *     Status => description, or status => [description, schema class]. An
     *     error status without a class is given the configured problem schema.
     * @param array<string, string|array{0: string, 1?: mixed}> $params
     *     Path parameter => description, or => [description, example].
     * @param class-string|null $request Schema class of the JSON request body.
     */
    public function __construct(
        public readonly string $path,
        array|string $methods = ['GET'],
        public readonly string $description = '',
        public readonly int|string|null $required_user_level = null,
        public readonly ?string $operation_id = null,
        public readonly ?string $tag = null,
        public readonly array $responses = [],
        public readonly array $params = [],
        public readonly ?string $request = null,
        public readonly int $status = 200,
    ) {
        $this->methods = array_map('strtoupper', (array) $methods);
    }
}
