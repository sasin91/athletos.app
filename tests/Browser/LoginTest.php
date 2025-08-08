<?php

use App\Models\User;

it('may login', function () {
    $user = User::factory()->athlete()->create();

    visit(route('login'))
        ->type('email', $user->email)
        ->type('password', 'password')
        ->press('Sign In')
        ->assertUrlIs(route('dashboard'));

    $this->assertAuthenticatedAs($user);
});
