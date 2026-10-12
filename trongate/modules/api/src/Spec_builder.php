<?php
/**
 * Builds the OpenAPI 3.1 document from the route registry and config.
 */
final class Spec_builder {

    /**
     * @param array<string, mixed> $config `$config['openapi']`.
     */
    public function __construct(
        private readonly Route_registry $registry,
        private readonly array $config,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function build(): array {
        $schemas = new Schema_builder();
        $problem = $this->config['problem_schema'] ?? null;
        $scheme = $this->config['security_scheme'] ?? null;
        $paths = [];
        $used_tags = [];
        $secured = false;

        foreach ($this->registry->routes() as $route) {
            $operation = $route->operation;
            $tag = $operation->tag ?? $route->module;
            $used_tags[$tag] = true;
            $secured = $secured || $operation->required_user_level !== null;

            $document = ['tags' => [$tag]];
            [$summary, $description] = self::split_description($operation->description);
            if ($summary !== '') {
                $document['summary'] = $summary;
            }
            if ($description !== '') {
                $document['description'] = $description;
            }
            $document['operationId'] = $operation->operation_id ?? $route->method;

            $parameters = $this->parameters($route);
            if ($parameters !== []) {
                $document['parameters'] = $parameters;
            }

            if ($operation->request !== null) {
                $document['requestBody'] = [
                    'content' => ['application/json' => ['schema' => $schemas->ref($operation->request)]],
                    'required' => true,
                ];
            }

            $responses = $operation->responses;
            if ($operation->required_user_level !== null && !isset($responses[401])) {
                $responses[401] = 'Missing or invalid access token';
            }
            ksort($responses);
            $document['responses'] = [];
            foreach ($responses as $status => $response) {
                [$text, $class] = is_array($response) ? [$response[0], $response[1] ?? null] : [$response, null];
                $entry = ['description' => $text];
                $schema = $class !== null ? $schemas->ref($class) : null;
                if ($schema === null && $status >= 400 && $problem !== null) {
                    $schema = $schemas->ref($problem);
                }
                if ($schema !== null) {
                    $entry['content'] = ['application/json' => ['schema' => $schema]];
                }
                $document['responses'][(string) $status] = $entry;
            }

            if ($operation->required_user_level !== null && $scheme !== null) {
                $document['security'] = [[$scheme['name'] => []]];
            }

            foreach ($operation->methods as $method) {
                $paths[$operation->path][strtolower($method)] = $document;
            }
        }

        ksort($paths);

        $spec = [
            'openapi' => '3.1.0',
            'info' => $this->config['info'] ?? ['title' => 'API', 'version' => '0.0.0'],
            'paths' => $paths,
            'components' => ['schemas' => $schemas->components()],
        ];
        if ($secured && $scheme !== null) {
            $spec['components']['securitySchemes'] = [$scheme['name'] => $scheme['definition']];
        }

        $tags = [];
        foreach ($this->config['tags'] ?? [] as $name => $description) {
            if (isset($used_tags[$name])) {
                $tags[] = ['name' => $name, 'description' => $description];
            }
        }
        if ($tags !== []) {
            $spec['tags'] = $tags;
        }

        return $spec;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function parameters(Api_route $route): array {
        $parameters = [];
        foreach ($route->param_names as $name) {
            $declared = $route->operation->params[$name] ?? '';
            [$description, $example] = is_array($declared) ? [$declared[0], $declared[1] ?? null] : [$declared, null];

            $parameter = ['name' => $name, 'in' => 'path'];
            if ($description !== '') {
                $parameter['description'] = $description;
            }
            $parameter['required'] = true;
            $parameter['schema'] = ['type' => 'string'];
            if ($example !== null) {
                $parameter['example'] = $example;
            }
            $parameters[] = $parameter;
        }
        return $parameters;
    }

    /**
     * The first paragraph, and the rest, the way utoipa reads a doc comment.
     *
     * @return array{0: string, 1: string}
     */
    private static function split_description(string $text): array {
        $parts = preg_split('/\R\s*\R/', trim($text), 2);
        return [trim($parts[0] ?? ''), trim($parts[1] ?? '')];
    }
}
