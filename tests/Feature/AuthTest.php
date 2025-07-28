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

        $response->assertOk();
    }

    /** @test */
    public function auth_register_returns_inertia_response()
    {
        $response = $this->get('/register');

        $response->assertOk();
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