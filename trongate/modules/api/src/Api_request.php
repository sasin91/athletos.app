<?php
/**
 * Read access to the current request, for handlers and authenticators.
 *
 * Static because PHP serves one request per process; there is no second
 * request for an instance to be confused with.
 */
final class Api_request {

    /**
     * The value of a request header, by case-insensitive name.
     */
    public static function header(string $name): ?string {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        if (isset($_SERVER[$key])) {
            return $_SERVER[$key];
        }

        // Apache without the .htaccess rewrite, or a CGI host, may only
        // expose the Authorization header here.
        if (strcasecmp($name, 'Authorization') === 0 && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        return null;
    }

    /**
     * The credential from `Authorization: Bearer <token>`.
     *
     * The scheme is case-insensitive (RFC 7235); the token is not.
     */
    public static function bearer_token(): ?string {
        $value = self::header('Authorization');
        if ($value === null) {
            return null;
        }

        $parts = explode(' ', $value, 2);
        if (count($parts) !== 2 || strcasecmp($parts[0], 'Bearer') !== 0) {
            return null;
        }

        $token = trim($parts[1]);
        return $token === '' ? null : $token;
    }

    /**
     * The request body decoded as a JSON object, or a 400 explaining why not.
     *
     * @return array<string, mixed>
     */
    public static function json(): array {
        $body = file_get_contents('php://input');
        try {
            $decoded = json_decode($body === false ? '' : $body, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            throw new Api_problem(400, 'the request body is not valid JSON: ' . $e->getMessage());
        }

        if (!is_array($decoded) || array_is_list($decoded) && $decoded !== []) {
            throw new Api_problem(422, 'the request body must be a JSON object');
        }

        return $decoded;
    }
}
