<?php
/**
 * Routes, authenticates and documents every `#[OpenAPI]` operation.
 *
 * Runs as an interceptor, ahead of Trongate's own dispatcher, and answers
 * every request itself: an API has no pages, and leaving unclaimed URLs to
 * Trongate's `/module/method` routing would make a controller method reachable
 * twice, once through its declared path and access rule and once around both.
 *
 * Also serves the document at `spec_path` and Swagger UI at `docs_path`.
 */
class Api extends Trongate {

    /** HTTP reason phrases, for the `title` of a problem response. */
    private const REASONS = [
        400 => 'Bad Request',
        401 => 'Unauthorized',
        403 => 'Forbidden',
        404 => 'Not Found',
        405 => 'Method Not Allowed',
        409 => 'Conflict',
        413 => 'Payload Too Large',
        422 => 'Unprocessable Entity',
        426 => 'Upgrade Required',
        429 => 'Too Many Requests',
        500 => 'Internal Server Error',
        503 => 'Service Unavailable',
    ];

    /**
     * Interceptor entry point. Never returns.
     */
    public function _dispatch(): void {
        // ignition.php starts a session on every request. An API is stateless
        // and must not hand out a cookie, so the session is dropped unwritten
        // and the headers it queued are withdrawn.
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_abort();
        }
        foreach (['Set-Cookie', 'Expires', 'Cache-Control', 'Pragma'] as $header) {
            header_remove($header);
        }

        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $path = self::request_path();
        $config = self::config();

        try {
            if ($method === 'GET' && $path === $config['spec_path']) {
                $this->send(new Api_response(self::spec()), $method);
            }
            if ($method === 'GET' && $path === $config['docs_path']) {
                $this->send_docs($config);
            }

            $registry = self::registry();
            $match = $registry->match($method, $path);

            if ($match === null) {
                $allowed = $registry->allowed_methods($path);
                $this->send($allowed === []
                    ? Api_response::empty(404)
                    : Api_response::empty(405, ['Allow' => implode(',', $allowed)]), $method);
            }

            [$route, $params] = $match;
            $principal = null;
            if ($route->operation->required_user_level !== null) {
                $principal = Modules::run($config['authenticator'], $route->operation->required_user_level);
                if ($principal === null) {
                    throw Api_problem::unauthenticated();
                }
            }

            $this->send($this->invoke($route, $params, $principal), $method);
        } catch (Api_problem $problem) {
            $this->send($this->problem($problem), $method);
        } catch (Throwable $e) {
            error_log('unhandled ' . get_class($e) . ': ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            $this->send($this->problem(new Api_problem(500, 'An internal error occurred.')), $method);
        }
    }

    /**
     * Trongate's ERROR_404 handler. Unreachable while the interceptor answers
     * every request, and kept so that a request which somehow reaches Core
     * still gets the API's empty 404 rather than an HTML page.
     */
    public function not_found(): void {
        http_response_code(404);
        exit;
    }

    /**
     * The OpenAPI document, built from every `#[OpenAPI]` attribute.
     *
     * @return array<string, mixed>
     */
    public static function spec(): array {
        return (new Spec_builder(self::registry(), self::config()))->build();
    }

    /**
     * Every operation in the application. Built once per process.
     */
    public static function registry(): Route_registry {
        static $registry = null;
        return $registry ??= new Route_registry(APPPATH . 'modules');
    }

    /**
     * Encodes $value exactly as the Rust API's serde_json would: no escaped
     * slashes or non-ASCII, and a float keeps its fraction, so 100.0 is sent
     * as 100.0 rather than as the integer 100.
     */
    public static function encode(mixed $value): string {
        return json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
    }

    /**
     * @param array<string, string> $params
     */
    private function invoke(Api_route $route, array $params, mixed $principal): Api_response {
        $controller = new ($route->class)($route->module);
        $reflection = new ReflectionMethod($controller, $route->method);

        $args = [];
        foreach ($reflection->getParameters() as $parameter) {
            $name = $parameter->getName();
            if (array_key_exists($name, $params)) {
                $args[] = $params[$name];
            } elseif ($name === 'principal') {
                $args[] = $principal;
            } elseif ($parameter->isDefaultValueAvailable()) {
                $args[] = $parameter->getDefaultValue();
            } else {
                throw new LogicException("{$route->class}::{$route->method} asks for \${$name}, which is neither a path parameter of {$route->operation->path} nor \$principal");
            }
        }

        $result = $reflection->invokeArgs($controller, $args);
        return $result instanceof Api_response ? $result : new Api_response($result, $route->operation->status);
    }

    private function problem(Api_problem $problem): Api_response {
        return new Api_response([
            'title' => self::REASONS[$problem->status] ?? 'Error',
            'status' => $problem->status,
            'detail' => $problem->detail,
        ], $problem->status, $problem->headers);
    }

    private function send(Api_response $response, string $method): never {
        $body = $response->body === null ? '' : self::encode($response->body);

        http_response_code($response->status);
        foreach ($response->headers as $name => $value) {
            header("{$name}: {$value}");
        }
        if ($response->body !== null) {
            header('Content-Type: application/json');
        } else {
            // Otherwise PHP labels the empty body text/html.
            ini_set('default_mimetype', '');
        }
        header('Content-Length: ' . strlen($body));

        if ($method !== 'HEAD') {
            echo $body;
        }
        exit;
    }

    private function send_docs(array $config): never {
        header('Content-Type: text/html; charset=utf-8');
        $this->view('swagger', ['spec_url' => rtrim(BASE_URL, '/') . $config['spec_path'], 'title' => $config['info']['title'] ?? 'API']);
        exit;
    }

    /**
     * The request path, relative to BASE_URL's path, without a query string.
     */
    private static function request_path(): string {
        // Not parse_url(): it reads a leading `//x` as a host, which would make
        // `//x/v1/programs` an alias of `/v1/programs`.
        $path = explode('?', $_SERVER['REQUEST_URI'] ?? '/', 2)[0];
        $base = rtrim(parse_url(BASE_URL, PHP_URL_PATH) ?: '', '/');
        if ($base !== '' && str_starts_with($path, $base . '/')) {
            $path = substr($path, strlen($base));
        }
        return $path;
    }

    /**
     * @return array<string, mixed>
     */
    private static function config(): array {
        static $openapi = null;
        if ($openapi === null) {
            $config = [];
            require APPPATH . 'config/openapi.php';
            $openapi = $config['openapi'];
        }
        return $openapi;
    }
}
