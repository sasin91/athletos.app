<?php

use App\Models\User;
use App\Models\Athlete;
use App\Models\TrainingPlan;
use App\Enums\UserRole;
use App\Enums\ExperienceLevel;
use App\Enums\TrainingGoal;
use App\Enums\TrainingTime;
use App\Enums\Difficulty;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('prevents guests from accessing athlete profile settings', function () {
    $this->get('/settings/athlete-profile')->assertRedirect('/login');
});

it('prevents non-athletes from accessing athlete profile settings', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/settings/athlete-profile')
        ->assertRedirect();
});

it('redirects athletes without profile to onboarding', function () {
    $user = User::factory()->create(['roles' => [UserRole::Athlete]]);

    $this->actingAs($user)
        ->get('/settings/athlete-profile')
        ->assertRedirect('/onboarding/profile');
});

it('allows athletes to access athlete profile settings', function () {
    $user = User::factory()->create(['roles' => [UserRole::Athlete]]);
    
    // Create a training plan first to satisfy foreign key constraint
    $trainingPlan = TrainingPlan::factory()->create();
    
    $athlete = Athlete::factory()->create([
        'user_id' => $user->id,
        'experience_level' => 'intermediate',
        'primary_goal' => 'strength',
        'preferred_time' => 'evening',
        'session_duration' => 60,
        'difficulty_preference' => 'challenging',
        'training_days' => ['monday', 'wednesday', 'friday'],
        'current_plan_id' => $trainingPlan->id,
    ]);

    $this->actingAs($user)
        ->get('/settings/athlete-profile')
        ->assertStatus(200)
        ->assertInertia(fn($page) => 
            $page->component('settings/athlete-profile')
                ->has('athlete')
        );
});

it('allows athletes to update their profile', function () {
    $user = User::factory()->create(['roles' => [UserRole::Athlete]]);
    
    // Create a training plan first to satisfy foreign key constraint
    $trainingPlan = TrainingPlan::factory()->create();
    
    $athlete = Athlete::factory()->create([
        'user_id' => $user->id,
        'experience_level' => 'beginner',
        'primary_goal' => 'general_fitness',
        'bio' => 'Old bio',
        'preferred_time' => 'morning',
        'session_duration' => 45,
        'difficulty_preference' => 'moderate',
        'training_days' => ['monday', 'friday'],
        'current_plan_id' => $trainingPlan->id,
    ]);

    $updateData = [
        'experience_level' => 'advanced',
        'primary_goal' => 'strength',
        'bio' => 'Updated bio with more details about my training journey',
        'preferred_time' => 'evening',
        'session_duration' => 90,
        'difficulty_preference' => 'intense',
        'training_days' => ['tuesday', 'thursday', 'saturday'],
    ];

    $this->actingAs($user)
        ->put('/settings/athlete-profile', $updateData)
        ->assertRedirect('/settings/athlete-profile')
        ->assertSessionHas('status');

    $this->assertDatabaseHas('athletes', [
        'id' => $athlete->id,
        'user_id' => $user->id,
        'experience_level' => 'advanced',
        'primary_goal' => 'strength',
        'bio' => 'Updated bio with more details about my training journey',
        'preferred_time' => 'evening',
        'session_duration' => 90,
        'difficulty_preference' => 'intense',
        'training_days' => json_encode(['tuesday', 'thursday', 'saturday']),
    ]);
});

it('requires valid experience level in validation', function () {
    $user = User::factory()->create(['roles' => [UserRole::Athlete]]);
    
    // Create a training plan first to satisfy foreign key constraint
    $trainingPlan = TrainingPlan::factory()->create();
    
    $athlete = Athlete::factory()->create([
        'user_id' => $user->id,
        'current_plan_id' => $trainingPlan->id,
        'training_days' => ['monday'],
        'preferred_time' => 'evening',
        'session_duration' => 60,
        'difficulty_preference' => 'challenging',
    ]);

    $this->actingAs($user)
        ->put('/settings/athlete-profile', [
            'experience_level' => 'invalid_level',
            'primary_goal' => 'strength',
            'preferred_time' => 'evening',
            'session_duration' => 60,
            'difficulty_preference' => 'challenging',
            'training_days' => ['monday'],
        ])
        ->assertSessionHasErrors('experience_level');
});

it('requires at least one training day in validation', function () {
    $user = User::factory()->create(['roles' => [UserRole::Athlete]]);
    
    // Create a training plan first to satisfy foreign key constraint
    $trainingPlan = TrainingPlan::factory()->create();
    
    $athlete = Athlete::factory()->create([
        'user_id' => $user->id,
        'current_plan_id' => $trainingPlan->id,
        'training_days' => ['monday'],
        'preferred_time' => 'evening',
        'session_duration' => 60,
        'difficulty_preference' => 'challenging',
    ]);

    $this->actingAs($user)
        ->put('/settings/athlete-profile', [
            'experience_level' => 'intermediate',
            'primary_goal' => 'strength',
            'preferred_time' => 'evening',
            'session_duration' => 60,
            'difficulty_preference' => 'challenging',
            'training_days' => [],
        ])
        ->assertSessionHasErrors('training_days');
}); 