<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaticPagesTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function static_pages_return_inertia_responses()
    {
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
    }
}