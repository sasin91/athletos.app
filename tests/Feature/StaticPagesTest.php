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
            '/' => 'Welcome',
            '/about' => 'About',
            '/terms' => 'Terms',
            '/privacy' => 'Privacy',
        ];

        foreach ($staticPages as $route => $component) {
            $response = $this->get($route);

            $response->assertStatus(200)
                ->assertInertia(
                    fn($page) =>
                    $page->component($component)
                );
        }
    }
}