<?php
/**
 * Every `#[OpenAPI]` operation in the application, found by reflection.
 *
 * Built by loading each module's controller and reading its public methods'
 * attributes. That is a handful of files, and it is the price of keeping the
 * route declared on the method that answers it rather than in a second file
 * that can disagree with it.
 */
final class Route_registry {

    /** @var list<Api_route> */
    private array $routes = [];

    /**
     * @param string $modules_dir Absolute path of the `modules/` directory.
     */
    public function __construct(string $modules_dir) {
        foreach (glob($modules_dir . '/*', GLOB_ONLYDIR) ?: [] as $module_dir) {
            $module = basename($module_dir);
            $class = ucfirst($module);
            $file = $module_dir . '/' . $class . '.php';

            if (!is_file($file)) {
                continue;
            }

            require_once $file;
            if (!class_exists($class, false)) {
                continue;
            }

            foreach ((new ReflectionClass($class))->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
                foreach ($method->getAttributes(OpenAPI::class) as $attribute) {
                    $this->routes[] = new Api_route($attribute->newInstance(), $module, $class, $method->getName());
                }
            }
        }

        usort($this->routes, static fn (Api_route $a, Api_route $b) => $a->specificity() <=> $b->specificity());
        $this->assert_unique();
    }

    /**
     * @return list<Api_route>
     */
    public function routes(): array {
        return $this->routes;
    }

    /**
     * The route answering $method at $path, and the path parameters it read.
     *
     * @return array{0: Api_route, 1: array<string, string>}|null
     */
    public function match(string $method, string $path): ?array {
        foreach ($this->routes as $route) {
            $params = $route->match_path($path);
            if ($params !== null && $route->answers($method)) {
                return [$route, $params];
            }
        }
        return null;
    }

    /**
     * The methods some route answers at $path, for a 405's `Allow` header.
     * Empty when no route has this path at all.
     *
     * @return list<string>
     */
    public function allowed_methods(string $path): array {
        $allowed = [];
        foreach ($this->routes as $route) {
            if ($route->match_path($path) !== null) {
                array_push($allowed, ...$route->operation->methods);
                if (in_array('GET', $route->operation->methods, true)) {
                    $allowed[] = 'HEAD';
                }
            }
        }
        return array_values(array_unique($allowed));
    }

    /**
     * Two methods claiming the same path and HTTP method, or the same
     * operation id, is a programming error. Refuse to serve rather than let
     * declaration order decide which one answers.
     */
    private function assert_unique(): void {
        $seen_routes = [];
        $seen_ids = [];

        foreach ($this->routes as $route) {
            $operation_id = $route->operation->operation_id ?? $route->method;
            $owner = "{$route->class}::{$route->method}";

            if (isset($seen_ids[$operation_id])) {
                throw new LogicException("operation id {$operation_id} is declared by both {$seen_ids[$operation_id]} and {$owner}");
            }
            $seen_ids[$operation_id] = $owner;

            $shape = preg_replace('/\{[^}]+\}/', '{}', $route->operation->path);
            foreach ($route->operation->methods as $http_method) {
                $key = "{$http_method} {$shape}";
                if (isset($seen_routes[$key])) {
                    throw new LogicException("{$key} is declared by both {$seen_routes[$key]} and {$owner}");
                }
                $seen_routes[$key] = $owner;
            }
        }
    }
}
