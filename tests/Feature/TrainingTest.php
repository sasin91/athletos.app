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

it('returns inertia response for training plan show', function () {
    $response = $this->actingAs($this->user)
        ->get("/training-plans/{$this->trainingPlan->id}");

    $response->assertOk();
});

it('returns inertia response for exercise show', function () {
    $response = $this->actingAs($this->user)
        ->get('/exercises/bench-press');

    $response->assertOk();
});

it('returns inertia response for trainings index', function () {
    $response = $this->actingAs($this->user)
        ->get('/trainings');

    $response->assertOk();
});