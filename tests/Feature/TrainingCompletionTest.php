<?php

use App\Models\Athlete;
use App\Models\Training;
use App\Models\TrainingPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;

uses(RefreshDatabase::class);

it('allows user to complete training with feedback', function () {
    // Create a user with athlete profile
    $user = User::factory()->create();
    $athlete = Athlete::factory()->create(['user_id' => $user->id]);
    
    // Create a training plan and training session
    $trainingPlan = TrainingPlan::factory()->create();
    $training = Training::factory()->create([
        'athlete_id' => $athlete->id,
        'training_plan_id' => $trainingPlan->id,
        'scheduled_at' => now(),
        'completed_at' => null,
    ]);

    // Prepare training completion data
    $completionData = [
        'overall_rating' => 4,
        'mood' => 'good',
        'energy_level' => 7,
        'difficulty' => 'just_right',
        'difficulty_level' => 6,
        'notes' => 'Great training session, felt strong today!',
        'total_timer_seconds' => 3600, // 1 hour
        'exercise_sets' => [
            'bench_press' => [
                [
                    'setNumber' => 1,
                    'reps' => 8,
                    'weight' => 80,
                    'rpe' => 7,
                    'notes' => 'Felt good'
                ],
                [
                    'setNumber' => 2,
                    'reps' => 8,
                    'weight' => 80,
                    'rpe' => 8,
                    'notes' => 'Getting challenging'
                ]
            ]
        ]
    ];

    // Act: Submit training completion
    $response = $this->actingAs($user)
        ->post("/trainings/{$training->id}/complete", $completionData);

    // Assert: Check response
    $response->assertRedirect(route('dashboard'))
        ->assertSessionHas('success', 'Training completed successfully! Great work!');

    // Assert: Check database was updated
    $training->refresh();
    
    expect($training->completed_at)->not->toBeNull();
    expect($training->overall_rating)->toBe(4);
    expect($training->mood)->toBe('good');
    expect($training->energy_level)->toBe(7);
    expect($training->difficulty)->toBe('just_right');
    expect($training->difficulty_level)->toBe(6);
    expect($training->notes)->toBe('Great training session, felt strong today!');
    expect($training->total_timer_seconds)->toBe(3600);
    expect($training->exercise_sets)->not->toBeNull();
    expect($training->exercise_sets)->toHaveKey('bench_press');
});

it('requires authentication for completion', function () {
    $training = Training::factory()->create();

    $response = $this->post("/trainings/{$training->id}/complete", [
        'overall_rating' => 4,
        'mood' => 'good',
        'energy_level' => 7,
        'difficulty' => 'just_right',
        'difficulty_level' => 6,
    ]);

    $response->assertRedirect(route('login'));
});

it('validates required fields for completion', function () {
    $user = User::factory()->create();
    $athlete = Athlete::factory()->create(['user_id' => $user->id]);
    $training = Training::factory()->create(['athlete_id' => $athlete->id]);

    $response = $this->actingAs($user)
        ->post("/trainings/{$training->id}/complete", []);

    $response->assertSessionHasErrors([
        'overall_rating',
        'mood',
        'energy_level',
        'difficulty',
        'difficulty_level'
    ]);
});

it('validates rating range for completion', function () {
    $user = User::factory()->create();
    $athlete = Athlete::factory()->create(['user_id' => $user->id]);
    $training = Training::factory()->create(['athlete_id' => $athlete->id]);

    $response = $this->actingAs($user)
        ->post("/trainings/{$training->id}/complete", [
            'overall_rating' => 6, // Invalid: should be 1-5
            'mood' => 'good',
            'energy_level' => 7,
            'difficulty' => 'just_right',
            'difficulty_level' => 6,
        ]);

    $response->assertSessionHasErrors(['overall_rating']);
});

it('validates mood options for completion', function () {
    $user = User::factory()->create();
    $athlete = Athlete::factory()->create(['user_id' => $user->id]);
    $training = Training::factory()->create(['athlete_id' => $athlete->id]);

    $response = $this->actingAs($user)
        ->post("/trainings/{$training->id}/complete", [
            'overall_rating' => 4,
            'mood' => 'invalid_mood', // Invalid mood option
            'energy_level' => 7,
            'difficulty' => 'just_right',
            'difficulty_level' => 6,
        ]);

    $response->assertSessionHasErrors(['mood']);
});
