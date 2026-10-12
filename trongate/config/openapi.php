<?php
// The document the api module builds from every `#[OpenAPI]` attribute.
// Values here are the parts no single endpoint owns.
$config['openapi'] = [
    'info' => [
        'title' => 'AthletOS API',
        'description' => 'A governor for athletes who already train.',
        'license' => ['name' => ''],
        'version' => '0.1.0',
    ],
    // Listed in the order the Rust API lists them. Only tags an operation uses
    // are emitted.
    'tags' => [
        'health' => 'Liveness and readiness probes',
        'auth' => 'Athlete authentication: tokens and keys (ADR-0003)',
        'programs' => 'The compiled-in program catalogue (D-03, D-05)',
        'exercises' => 'The compiled-in exercise registry (D-03, D-04)',
        'athlete' => "The athlete's own numbers (D-04)",
        'enrollments' => 'Running a program, and peeking at what is next (D-08)',
        'workouts' => 'Submitting a logged session, idempotently (D-09)',
        'progress' => 'A year of training, derived from the rows that already exist (D-13)',
    ],
    // Applied to every operation with a `required_user_level`.
    'security_scheme' => [
        'name' => 'bearer_token',
        'definition' => [
            'type' => 'http',
            'scheme' => 'bearer',
            'bearerFormat' => 'JWT',
            'description' => 'Ed25519 (EdDSA) access token from /v1/auth/login, verifiable against /.well-known/jwks.json',
        ],
    ],
    // The schema every 4xx/5xx response without one of its own is given.
    'problem_schema' => 'ProblemDetails',
    // "module/method" run for any operation with a `required_user_level`. It is
    // given the level and returns the principal, or null for 401.
    'authenticator' => 'athlete_auth/_authenticate',
    // Where the document and Swagger UI are served; the Rust API's paths.
    'spec_path' => '/api-docs/openapi.json',
    'docs_path' => '/swagger-ui',
];
