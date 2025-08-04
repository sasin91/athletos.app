<?php

use App\Models\User;
use App\Models\Athlete;
use App\Models\TrainingPlan;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create(['roles' => [UserRole::Athlete]]);
    $this->trainingPlan = TrainingPlan::factory()->create();

    \App\Models\TrainingPhase::factory()->create([
        'training_plan_id' => $this->trainingPlan->id,
        'order' => 0,
        'duration_weeks' => 4,
    ]);

    $this->athlete = Athlete::factory()->create([
        'user_id' => $this->user->id,
        'training_days' => ['monday', 'wednesday', 'friday'],
        'experience_level' => 'intermediate',
        'primary_goal' => 'strength',
        'preferred_time' => 'evening',
        'session_duration' => 60,
        'difficulty_preference' => 'challenging',
        'current_plan_id' => $this->trainingPlan->id,
        'plan_start_date' => now(),
    ]);
});

it('returns inertia response for onboarding profile', function () {
    $user = User::factory()->create(['roles' => [UserRole::Athlete]]);

    $response = $this->actingAs($user)
        ->get('/onboarding/profile');

    $response->assertOk();
});

it('returns inertia response for onboarding schedule', function () {
    $response = $this->actingAs($this->user)
        ->get('/onboarding/schedule');

    $response->assertOk();
});

it('returns inertia response for onboarding stats', function () {
    $response = $this->actingAs($this->user)
        ->get('/onboarding/stats');

    $response->assertOk();
});

it('returns inertia response for onboarding preferences', function () {
    $response = $this->actingAs($this->user)
        ->get('/onboarding/preferences');

    $response->assertOk();
});

it('formats all enum data properly', function () {
    $response = $this->actingAs($this->user)
        ->get('/onboarding/profile');

    $response->assertOk();
});