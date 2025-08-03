<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Default AI Provider
    |--------------------------------------------------------------------------
    |
    | This option controls the default AI provider that will be used for
    | chat responses, plan generation, and other AI-powered features.
    | Supported: "openai", "ollama"
    |
    */
    'default_provider' => env('AI_PROVIDER', 'openai'),

    /*
    |--------------------------------------------------------------------------
    | AI Provider Configurations
    |--------------------------------------------------------------------------
    |
    | Here you can configure the settings for each AI provider.
    | Each provider can have different models and settings.
    |
    */
    'providers' => [
        'openai' => [
            'chat_model' => env('AI_OPENAI_CHAT_MODEL', 'gpt-4.1'),
            'extraction_model' => env('AI_OPENAI_EXTRACTION_MODEL', 'gpt-4.1'),
            'subject_model' => env('AI_OPENAI_SUBJECT_MODEL', 'gpt-4.1'),
            'temperature' => env('AI_OPENAI_TEMPERATURE', 0.7),
            'max_tokens' => env('AI_OPENAI_MAX_TOKENS', 1200),
        ],

        'ollama' => [
            'chat_model' => env('AI_OLLAMA_CHAT_MODEL', 'llama3.2:8b'),
            'extraction_model' => env('AI_OLLAMA_EXTRACTION_MODEL', 'llama3.2:8b'),
            'subject_model' => env('AI_OLLAMA_SUBJECT_MODEL', 'llama3.2:3b'),
            'temperature' => env('AI_OLLAMA_TEMPERATURE', 0.7),
            'max_tokens' => env('AI_OLLAMA_MAX_TOKENS', 1200),
            'base_url' => env('AI_OLLAMA_BASE_URL', 'http://localhost:11434'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Model Recommendations by Environment
    |--------------------------------------------------------------------------
    |
    | Suggested models for different deployment environments.
    | These are just recommendations - actual configuration is done via env vars.
    |
    */
    'recommendations' => [
        'local_development' => [
            'provider' => 'ollama',
            'models' => [
                'low_resource' => 'llama3.2:3b',      // 8GB RAM or less
                'medium_resource' => 'llama3.2:8b',   // 16GB RAM
                'high_resource' => 'qwen2.5:14b',     // 32GB+ RAM or GPU
            ],
        ],
        'production' => [
            'provider' => 'openai',
            'models' => [
                'cost_optimized' => 'gpt-4o-mini',
                'performance_optimized' => 'gpt-4o',
            ],
        ],
    ],
];
