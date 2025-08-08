<?php

use App\Actions\AdjustTrainingPlan;
use App\Models\Athlete;
use App\Models\TrainingPlan;
use App\Models\TrainingPhase;
use App\Models\User;
use App\Enums\TrainingGoal;
use App\Enums\Exercise;
use App\Enums\WeightType;
use App\Settings\TrainingPhaseSettings;
use App\Settings\ExerciseConfig;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->action = app(AdjustTrainingPlan::class);
});

it('creates modified plan with exercise adjustments', function () {
    // Arrange: Create a hypertrophy plan
    $user = User::factory()->create();
    $originalPlan = TrainingPlan::factory()->create([
        'name' => 'Hypertrophy Focus',
        'goal' => TrainingGoal::Hypertrophy,
    ]);

    // Create phase with chest/back exercises
    TrainingPhase::factory()->create([
        'training_plan_id' => $originalPlan->id,
        'name' => 'Upper Body Phase',
        'order' => 1,
        'settings' => new TrainingPhaseSettings([
            new ExerciseConfig(Exercise::BenchPress->value, 4, 8, 80, weight_type: WeightType::Percentage),
            new ExerciseConfig(Exercise::OneArmDumbbellRow->value, 4, 8, 75, weight_type: WeightType::Percentage),
        ])
    ]);

    $athlete = Athlete::factory()->create([
        'user_id' => $user->id,
        'current_plan_id' => $originalPlan->id,
    ]);

    // Act: Adjust plan to focus more on shoulders
    $adjustments = [
        'name' => 'Shoulder-Focused Hypertrophy',
        'phases' => [
            1 => [
                'exercises' => [
                    new ExerciseConfig(Exercise::InclineDumbbellPress->value, 4, 8, 80, weight_type: WeightType::Percentage),
                    new ExerciseConfig(Exercise::SideLateralRaises->value, 3, 12, 70, weight_type: WeightType::Percentage),
                    new ExerciseConfig(Exercise::OneArmDumbbellRow->value, 3, 8, 75, weight_type: WeightType::Percentage),
                ]
            ]
        ]
    ];

    $result = $this->action->execute($athlete->id, $adjustments, 'User wants to focus more on shoulders');

    // Assert: Verify the plan was created with shoulder exercises
    expect($result['success'])->toBeTrue();
    expect($result['plan_name'])->toBe('Shoulder-Focused Hypertrophy');

    $newPlan = TrainingPlan::find($result['new_plan_id']);
    expect($newPlan->name)->toBe('Shoulder-Focused Hypertrophy');
    expect($newPlan->goal)->toBe(TrainingGoal::Hypertrophy);

    // Verify the phase has the new shoulder exercises
    $newPhase = $newPlan->phases()->where('order', 1)->first();
    expect($newPhase->name)->toBe('Upper Body Phase');

    $exercises = $newPhase->settings->getExerciseConfigs();
    expect($exercises)->toHaveCount(3);

    $exerciseNames = array_map(fn($config) => $config->exercise, $exercises);
    expect($exerciseNames)->toContain(Exercise::InclineDumbbellPress->value);
    expect($exerciseNames)->toContain(Exercise::SideLateralRaises->value);
    expect($exerciseNames)->toContain(Exercise::OneArmDumbbellRow->value);
});
