<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Output Path
    |--------------------------------------------------------------------------
    |
    | This value determines the path where the TypeScript route definitions
    | will be generated. This should typically be in your JavaScript/TypeScript
    | resources directory.
    |
    */
    'output' => resource_path('js/lib/wayfinder.ts'),

    /*
    |--------------------------------------------------------------------------
    | Route Filters
    |--------------------------------------------------------------------------
    |
    | These values determine which routes should be included or excluded from
    | the generated TypeScript definitions. You can specify route names,
    | patterns, or use middleware to filter routes.
    |
    */
    'only' => [
        // Include only specific routes
    ],

    'except' => [
        // Exclude specific routes
        'debugbar.*',
        '_ignition.*',
    ],

    /*
    |--------------------------------------------------------------------------
    | Middleware Filter
    |--------------------------------------------------------------------------
    |
    | Only routes using these middleware will be included in the generated
    | TypeScript definitions. Leave empty to include all routes.
    |
    */
    'middleware' => [
        // 'web',
    ],

    /*
    |--------------------------------------------------------------------------
    | Route Groups
    |--------------------------------------------------------------------------
    |
    | Group related routes together in the generated TypeScript output.
    | This makes the generated code more organized and easier to use.
    |
    */
    'groups' => [
        'auth' => ['login', 'register', 'logout', 'password.*'],
        'dashboard' => ['dashboard*'],
        'settings' => ['settings.*'],
        'onboarding' => ['onboarding.*'],
        'training' => ['training*', 'trainings.*'],
        'exercises' => ['exercises.*'],
    ],
];