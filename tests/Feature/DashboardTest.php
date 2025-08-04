<?php

use App\Models\User;
use App\Models\Athlete;
use App\Models\TrainingPlan;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('returns inertia response for dashboard', function () {
    $user = User::factory()
        ->athlete()
        ->create(['email' => 'jonas.kerwin.hansen@gmail.com']);

    $response = $this->actingAs($user)
        ->get('/dashboard');

    $response->assertOk();
});

it('returns inertia response for chat', function () {
    $user = User::factory()
        ->athlete()
        ->create(['email' => 'jonas.kerwin.hansen@gmail.com']);

    $response = $this->actingAs($user)
        ->get('/chat');

    $response->assertOk();
});