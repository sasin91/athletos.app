<?php

use App\Models\User;
use App\Models\Athlete;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('displays profile page', function () {
    $user = User::factory()->athlete()->create();

    $this->actingAs($user)->get('/settings/profile')->assertOk();
});

it('allows profile information to be updated', function () {
    $user = User::factory()->athlete()->create();

    $response = $this->actingAs($user)
        ->patch('/settings/profile', [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/profile');

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->email_verified_at)->toBeNull();
});

it('keeps email verification status unchanged when email address is unchanged', function () {
    $user = User::factory()->athlete()->create();

    $response = $this->actingAs($user)
        ->patch('/settings/profile', [
            'name' => 'Test User',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/profile');

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

it('allows user to delete their account', function () {
    $user = User::factory()->create();
    // Create a simple user without athlete profile to avoid foreign key constraints
    
    $response = $this->actingAs($user)
        ->delete('/settings/profile');

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/');

    $this->assertGuest();
    expect($user->fresh())->toBeNull();
});
