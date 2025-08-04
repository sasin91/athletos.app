<?php

use App\Models\User;
use App\Models\Athlete;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

it('can update password', function () {
    $user = User::factory()->athlete()->create();

    $response = $this
        ->actingAs($user)
        ->put('/settings/password', [
            'current_password' => 'password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/profile');

    expect(Hash::check('new-password', $user->refresh()->password))->toBeTrue();
});

it('requires correct password to update password', function () {
    $user = User::factory()->athlete()->create();
    
    $response = $this
        ->actingAs($user)
        ->put('/settings/password', [
            'current_password' => 'wrong-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

    $response
        ->assertSessionHasErrors('current_password')
        ->assertRedirect('/settings/profile');
});
