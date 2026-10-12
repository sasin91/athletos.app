<?php
/**
 * The api module's routing: what answers, what refuses, and that nothing is
 * reachable around the declared routes.
 */

return [
    'GET /health' => static function (Test_kit $t): void {
        $response = $t->get('/health');
        Test_kit::same(200, $response['status']);
        Test_kit::same('{"status":"ok","service":"athletos-api"}', $response['body']);
    },

    'GET /health/ready reaches the database' => static function (Test_kit $t): void {
        $response = $t->get('/health/ready');
        Test_kit::same(200, $response['status']);
        Test_kit::same('{"status":"ready","service":"athletos-api"}', $response['body']);
    },

    'HEAD answers where GET does, with no body' => static function (Test_kit $t): void {
        $response = $t->request('HEAD', '/health');
        Test_kit::same(200, $response['status']);
        Test_kit::same('', $response['body']);
    },

    'an unknown path is an empty 404, as in axum' => static function (Test_kit $t): void {
        foreach (['/nope', '/v1', '/v1/programs/', '/health/', '/', '//x/health', '/v1//programs'] as $path) {
            $response = $t->get($path);
            Test_kit::same(404, $response['status'], $path);
            Test_kit::same('', $response['body'], $path);
            Test_kit::same(null, $response['headers']['content-type'] ?? null, $path);
        }
    },

    'a known path with the wrong method is an empty 405 with Allow' => static function (Test_kit $t): void {
        $response = $t->request('POST', '/v1/programs');
        Test_kit::same(405, $response['status']);
        Test_kit::same('', $response['body']);
        Test_kit::same(['GET,HEAD'], $response['headers']['allow'] ?? null);
    },

    "Trongate's /module/method URLs do not reach around the routes" => static function (Test_kit $t): void {
        // Each of these would run a public method through Trongate's own
        // dispatcher, skipping the authenticator, if the api module let
        // unclaimed requests through.
        foreach ([
            '/programs/list_programs',
            '/programs/show_program/smolov-jr',
            '/exercises/list_exercises',
            '/health/health',
            '/api/not_found',
            '/api/_dispatch',
            '/athlete_auth/_authenticate',
            '/utilities/block_url',
            '/db/query',
        ] as $path) {
            $response = $t->get($path);
            Test_kit::same(404, $response['status'], $path);
            Test_kit::same('', $response['body'], $path);
        }
    },

    'no response sets a cookie or a session cache header' => static function (Test_kit $t): void {
        foreach (['/health', '/v1/programs', '/nope', '/api-docs/openapi.json'] as $path) {
            $headers = $t->get($path)['headers'];
            foreach (['set-cookie', 'expires', 'pragma', 'cache-control'] as $name) {
                Test_kit::same(null, $headers[$name] ?? null, "{$path} sent {$name}");
            }
        }
    },

    'Swagger UI is served and points at the document' => static function (Test_kit $t): void {
        $response = $t->get('/swagger-ui');
        Test_kit::same(200, $response['status']);
        Test_kit::true(str_contains($response['body'], json_encode($t->base_url . '/api-docs/openapi.json', JSON_UNESCAPED_SLASHES)), 'the page names the spec URL');
    },
];
