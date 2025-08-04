<?php

use App\Actions\CalculateTrainingOffset;
use App\Actions\ComputePlannedTrainings;
use App\Models\Athlete;
use App\Models\TrainingPlan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->action = new CalculateTrainingOffset();
});

it('skips alternate weeks for athlete with 2w offset', function () {
    // Create a user and athlete with 2w training offset
    $user = User::factory()->create();
    $athlete = Athlete::factory()->create([
        'user_id' => $user->id,
        'training_days' => ['monday', 'wednesday', 'friday'],
        'training_frequency' => '2w',
        'plan_start_date' => Carbon::parse('2024-01-01'), // Monday
    ]);

    // Week 0 (start week) - should have training
    $week0Monday = Carbon::parse('2024-01-01');
    expect($this->action->shouldTrainOnDate('2w', $week0Monday, Carbon::instance($athlete->plan_start_date)))->toBeTrue();

    // Week 1 - should not have training
    $week1Monday = Carbon::parse('2024-01-08');
    expect($this->action->shouldTrainOnDate('2w', $week1Monday, Carbon::instance($athlete->plan_start_date)))->toBeFalse();

    // Week 2 - should have training
    $week2Monday = Carbon::parse('2024-01-15');
    expect($this->action->shouldTrainOnDate('2w', $week2Monday, Carbon::instance($athlete->plan_start_date)))->toBeTrue();
});

it('respects training offset in compute planned trainings', function () {
    // Create a user and athlete with 2w training offset
    $user = User::factory()->create();
    $trainingPlan = TrainingPlan::factory()->create();
    
    // Create a training phase for the plan
    $trainingPhase = \App\Models\TrainingPhase::factory()->create([
        'training_plan_id' => $trainingPlan->id,
        'duration_weeks' => 4,
    ]);
    
    $athlete = Athlete::factory()->create([
        'user_id' => $user->id,
        'current_plan_id' => $trainingPlan->id,
        'training_days' => ['monday'],
        'training_frequency' => '2w',
        'plan_start_date' => Carbon::parse('2024-01-01'),
    ]);

    $computePlannedTrainings = new ComputePlannedTrainings(
        app(\App\Actions\DetermineTrainingPhase::class),
        $this->action
    );

    // Week 0 (start week) - should have planned training
    $week0Monday = Carbon::parse('2024-01-01');
    $plannedTrainings = $computePlannedTrainings->execute($athlete, $week0Monday);
    expect($plannedTrainings)->toHaveCount(1);

    // Week 1 - should not have planned training
    $week1Monday = Carbon::parse('2024-01-08');
    $plannedTrainings = $computePlannedTrainings->execute($athlete, $week1Monday);
    expect($plannedTrainings)->toHaveCount(0);

    // Week 2 - should have planned training
    $week2Monday = Carbon::parse('2024-01-15');
    $plannedTrainings = $computePlannedTrainings->execute($athlete, $week2Monday);
    expect($plannedTrainings)->toHaveCount(1);
});

it('works with athlete model helper methods for training offset', function () {
    $user = User::factory()->create();
    $athlete = Athlete::factory()->create([
        'user_id' => $user->id,
        'training_days' => ['monday'],
        'training_frequency' => '2w',
        'plan_start_date' => Carbon::parse('2024-01-01'),
    ]);

    // Test shouldTrainOnDate method
    $week0Monday = Carbon::parse('2024-01-01');
    expect($athlete->shouldTrainOnDate($week0Monday))->toBeTrue();

    $week1Monday = Carbon::parse('2024-01-08');
    expect($athlete->shouldTrainOnDate($week1Monday))->toBeFalse();

    // Test getTrainingOffsetDescription method
    expect($athlete->getTrainingOffsetDescription())->toBe('Every other week (1 week on, 1 week off)');

    // Test getNextTrainingWeek method
    $nextWeek = $athlete->getNextTrainingWeek($week1Monday);
    expect($nextWeek->format('Y-m-d'))->toBe('2024-01-15');

    // Test getPreviousTrainingWeek method
    $prevWeek = $athlete->getPreviousTrainingWeek($week1Monday);
    expect($prevWeek->format('Y-m-d'))->toBe('2024-01-01');
});

it('trains every week for athlete with no offset', function () {
    $user = User::factory()->create();
    $athlete = Athlete::factory()->create([
        'user_id' => $user->id,
        'training_days' => ['monday'],
        'training_frequency' => null, // No offset
        'plan_start_date' => Carbon::parse('2024-01-01'),
    ]);

    // Should train every week
    $week0Monday = Carbon::parse('2024-01-01');
    expect($athlete->shouldTrainOnDate($week0Monday))->toBeTrue();

    $week1Monday = Carbon::parse('2024-01-08');
    expect($athlete->shouldTrainOnDate($week1Monday))->toBeTrue();

    $week2Monday = Carbon::parse('2024-01-15');
    expect($athlete->shouldTrainOnDate($week2Monday))->toBeTrue();

    expect($athlete->getTrainingOffsetDescription())->toBe('Every week');
});

it('defaults to every week for invalid offset strings', function () {
    $user = User::factory()->create();
    $athlete = Athlete::factory()->create([
        'user_id' => $user->id,
        'training_days' => ['monday'],
        'training_frequency' => 'invalid', // Invalid offset
        'plan_start_date' => Carbon::parse('2024-01-01'),
    ]);

    // Should train every week (default behavior for invalid offset)
    $week0Monday = Carbon::parse('2024-01-01');
    expect($athlete->shouldTrainOnDate($week0Monday))->toBeTrue();

    $week1Monday = Carbon::parse('2024-01-08');
    expect($athlete->shouldTrainOnDate($week1Monday))->toBeTrue();

    expect($athlete->getTrainingOffsetDescription())->toBe('Invalid offset');
}); 