<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function auth_login_returns_inertia_response()
    {
        $response = $this->get('/login');

        $response->assertStatus(200)
            ->assertInertia(
                fn($page) =>
                $page->component('auth/login')
                    ->has('canResetPassword')
            );
    }

    /** @test */
    public function auth_register_returns_inertia_response()
    {
        $response = $this->get('/register');

        $response->assertStatus(200)
            ->assertInertia(
                fn($page) =>
                $page->component('auth/register')
            );
    }

    /** @test */
    public function login_form_submission_handles_validation_errors()
    {
        $response = $this->post('/login', [
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(302); // Redirect due to validation error
        $response->assertSessionHasErrors(['email']);
    }
}