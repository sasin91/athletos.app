<?php
/**
 * One `#[OpenAPI]` attribute, resolved to the controller method that carries it.
 */
final class Api_route {

    /** @var list<string> Path parameter names, in template order. */
    public readonly array $param_names;

    private readonly string $regex;

    public function __construct(
        public readonly OpenAPI $operation,
        public readonly string $module,
        public readonly string $class,
        public readonly string $method,
    ) {
        preg_match_all('/\{([A-Za-z_][A-Za-z0-9_]*)\}/', $operation->path, $matches);
        $this->param_names = $matches[1];

        // Each `{name}` matches exactly one non-empty segment; everything else
        // in the template is literal. Anchored at both ends, so a trailing
        // slash is a different path, as it is in axum.
        $literal_parts = preg_split('/\{[A-Za-z_][A-Za-z0-9_]*\}/', $operation->path);
        $pattern = '';
        foreach ($literal_parts as $i => $literal) {
            $pattern .= preg_quote($literal, '#');
            if ($i < count($this->param_names)) {
                $pattern .= '([^/]+)';
            }
        }
        $this->regex = '#^' . $pattern . '$#';
    }

    /**
     * The path parameters if $path matches this route's template, else null.
     *
     * @return array<string, string>|null
     */
    public function match_path(string $path): ?array {
        if (!preg_match($this->regex, $path, $matches)) {
            return null;
        }

        $params = [];
        foreach ($this->param_names as $i => $name) {
            $params[$name] = rawurldecode($matches[$i + 1]);
        }
        return $params;
    }

    /**
     * Whether this route answers $method. HEAD is answered wherever GET is.
     */
    public function answers(string $method): bool {
        return in_array($method, $this->operation->methods, true)
            || ($method === 'HEAD' && in_array('GET', $this->operation->methods, true));
    }

    /**
     * Sort key: a route with fewer parameters is more specific, so
     * `/v1/workouts/history` wins over `/v1/workouts/{id}`.
     */
    public function specificity(): array {
        return [count($this->param_names), -strlen($this->operation->path)];
    }
}
