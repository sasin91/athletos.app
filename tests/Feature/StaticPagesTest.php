<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('returns inertia responses for static pages', function () {
    $staticPages = [
        '/' => 'welcome',
        '/about' => 'about',
        '/terms' => 'terms',
        '/privacy' => 'privacy',
    ];

    foreach ($staticPages as $route => $component) {
        $response = $this->get($route);

        $response->assertOk();
    }
});