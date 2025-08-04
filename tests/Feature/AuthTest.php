<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('returns inertia response for login page', function () {
    $response = $this->get('/login');

    $response->assertOk();
});

it('returns inertia response for register page', function () {
    $response = $this->get('/register');

    $response->assertOk();
});

it('handles validation errors on login form submission', function () {
    $response = $this->post('/login', [
        'email' => 'test@example.com',
        'password' => 'wrongpassword',
    ]);

    $response->assertStatus(302); // Redirect due to validation error
    $response->assertSessionHasErrors(['email']);
});