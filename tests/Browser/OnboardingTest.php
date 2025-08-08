<?php

use App\Enums\Exercise;
use App\Models\PerformanceIndicator;
use App\Models\User;
use App\Models\Athlete;
use App\Models\TrainingPlan;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Onboard\OnboardingStep;
use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\be;
use function Pest\Laravel\post;

it('passes smoke tests', function () {
    $user = User::factory()->create();

    $links = $user->onboarding()
        ->steps()
        ->filter(fn (OnboardingStep $step) => $step->incomplete())
        ->map(fn (OnboardingStep $step) => $step->link)
        ->toArray();

    be($user);

    visit($links)
        ->assertNoSmoke();
});

it('can complete profile step', function () {
    $user = User::factory()->create();

    be($user);

    $payload = [
        'experience_level' => 'intermediate',
        'primary_goal' => 'strength',
        'muscle_groups' => ['chest', 'legs'],
        'top_squat' => '150',
        'top_bench' => '100',
        'top_deadlift' => '180',
        'bio' => 'I have been training for 2 years and want to build strength'
    ];

    post('/onboarding/profile', $payload)
        ->assertRedirect('/onboarding/plan');

    assertDatabaseHas(Athlete::class, [
        'user_id' => $user->id,
        'experience_level' => $payload['experience_level'],
        'primary_goal' => $payload['primary_goal'],
        'muscle_groups' => json_encode($payload['muscle_groups']),
        'bio' => $payload['bio'],
    ]);

    assertDatabaseHas(PerformanceIndicator::class, [
        'athlete_id' => $user->athlete->id,
        'exercise' => Exercise::BarbellBackSquat->value,
        'value' => $payload['top_squat'],
        'unit' => 'kg'
    ]);

    assertDatabaseHas(PerformanceIndicator::class, [
        'athlete_id' => $user->athlete->id,
        'exercise' => Exercise::BenchPress->value,
        'value' => $payload['top_bench'],
        'unit' => 'kg'
    ]);

    assertDatabaseHas(PerformanceIndicator::class, [
        'athlete_id' => $user->athlete->id,
        'exercise' => Exercise::Deadlift->value,
        'value' => $payload['top_deadlift'],
        'unit' => 'kg'
    ]);
});

it('can complete plan selection step', function () {
    $user = User::factory()
        ->has(Athlete::factory())
        ->create(['roles' => [UserRole::Athlete]]);

    be($user);

    post('/onboarding/plan', [
        'selected_plan_id' => 1
    ])->assertRedirect('/onboarding/schedule');

    assertDatabaseHas($user->athlete, [
        'current_plan_id' => 1
    ]);
});

it('can complete schedule setup step', function () {
    $user = User::factory()
        ->has(Athlete::factory())
        ->create(['roles' => [UserRole::Athlete]]);

    be($user);

    $payload = [
        'training_days' => ['monday', 'wednesday', 'friday'],
        'training_frequency' => '1w',
        'preferred_time' => 'morning',
        'session_duration' => '60'
    ];

    post('/onboarding/schedule', $payload)
        ->assertRedirect('/onboarding/stats');

    assertDatabaseHas($user->athlete, $payload);
});

it('can complete stats input step', function () {
    $user = User::factory()
        ->has(Athlete::factory())
        ->create(['roles' => [UserRole::Athlete]]);

    be($user);

    $payload = [
        'current_bench' => '185',
        'current_squat' => '225',
        'current_deadlift' => '275'
    ];

    post('/onboarding/stats', $payload)
        ->assertRedirect('/onboarding/preferences');

    assertDatabaseHas($user->athlete, $payload);
});

it('can complete preferences step', function () {
    $user = User::factory()
        ->has(Athlete::factory())
        ->create(['roles' => [UserRole::Athlete]]);

    be($user);

    $payload = [
        'difficulty_preference' => 'moderate',
        'notifications' => ['workout_reminders', 'progress_updates']
    ];

    post('/onboarding/preferences', $payload)
        ->assertRedirect('/dashboard');

    assertDatabaseHas($user->athlete, $payload);
});
