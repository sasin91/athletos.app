<?php

namespace Tests\Feature\Actions;

use App\Actions\CalculateTrainingOffset;
use App\Actions\ComputePlannedTrainings;
use App\Models\Athlete;
use App\Models\TrainingPlan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CalculateTrainingOffsetTest extends TestCase
{
    use RefreshDatabase;

    private CalculateTrainingOffset $action;

    protected function setUp(): void
    {
        parent::setUp();
        $this->action = new CalculateTrainingOffset();
    }

    public function test_athlete_with_2w_offset_skips_alternate_weeks()
    {
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
        $this->assertTrue($this->action->shouldTrainOnDate('2w', $week0Monday, Carbon::instance($athlete->plan_start_date)));

        // Week 1 - should not have training
        $week1Monday = Carbon::parse('2024-01-08');
        $this->assertFalse($this->action->shouldTrainOnDate('2w', $week1Monday, Carbon::instance($athlete->plan_start_date)));

        // Week 2 - should have training
        $week2Monday = Carbon::parse('2024-01-15');
        $this->assertTrue($this->action->shouldTrainOnDate('2w', $week2Monday, Carbon::instance($athlete->plan_start_date)));
    }

    public function test_compute_planned_trainings_respects_training_offset()
    {
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
        $this->assertCount(1, $plannedTrainings);

        // Week 1 - should not have planned training
        $week1Monday = Carbon::parse('2024-01-08');
        $plannedTrainings = $computePlannedTrainings->execute($athlete, $week1Monday);
        $this->assertCount(0, $plannedTrainings);

        // Week 2 - should have planned training
        $week2Monday = Carbon::parse('2024-01-15');
        $plannedTrainings = $computePlannedTrainings->execute($athlete, $week2Monday);
        $this->assertCount(1, $plannedTrainings);
    }

    public function test_athlete_model_helper_methods_work_with_training_offset()
    {
        $user = User::factory()->create();
        $athlete = Athlete::factory()->create([
            'user_id' => $user->id,
            'training_days' => ['monday'],
            'training_frequency' => '2w',
            'plan_start_date' => Carbon::parse('2024-01-01'),
        ]);

        // Test shouldTrainOnDate method
        $week0Monday = Carbon::parse('2024-01-01');
        $this->assertTrue($athlete->shouldTrainOnDate($week0Monday));

        $week1Monday = Carbon::parse('2024-01-08');
        $this->assertFalse($athlete->shouldTrainOnDate($week1Monday));

        // Test getTrainingOffsetDescription method
        $this->assertEquals('Every other week (1 week on, 1 week off)', $athlete->getTrainingOffsetDescription());

        // Test getNextTrainingWeek method
        $nextWeek = $athlete->getNextTrainingWeek($week1Monday);
        $this->assertEquals('2024-01-15', $nextWeek->format('Y-m-d'));

        // Test getPreviousTrainingWeek method
        $prevWeek = $athlete->getPreviousTrainingWeek($week1Monday);
        $this->assertEquals('2024-01-01', $prevWeek->format('Y-m-d'));
    }

    public function test_athlete_with_no_offset_trains_every_week()
    {
        $user = User::factory()->create();
        $athlete = Athlete::factory()->create([
            'user_id' => $user->id,
            'training_days' => ['monday'],
            'training_frequency' => null, // No offset
            'plan_start_date' => Carbon::parse('2024-01-01'),
        ]);

        // Should train every week
        $week0Monday = Carbon::parse('2024-01-01');
        $this->assertTrue($athlete->shouldTrainOnDate($week0Monday));

        $week1Monday = Carbon::parse('2024-01-08');
        $this->assertTrue($athlete->shouldTrainOnDate($week1Monday));

        $week2Monday = Carbon::parse('2024-01-15');
        $this->assertTrue($athlete->shouldTrainOnDate($week2Monday));

        $this->assertEquals('Every week', $athlete->getTrainingOffsetDescription());
    }

    public function test_invalid_offset_strings_default_to_every_week()
    {
        $user = User::factory()->create();
        $athlete = Athlete::factory()->create([
            'user_id' => $user->id,
            'training_days' => ['monday'],
            'training_frequency' => 'invalid', // Invalid offset
            'plan_start_date' => Carbon::parse('2024-01-01'),
        ]);

        // Should train every week (default behavior for invalid offset)
        $week0Monday = Carbon::parse('2024-01-01');
        $this->assertTrue($athlete->shouldTrainOnDate($week0Monday));

        $week1Monday = Carbon::parse('2024-01-08');
        $this->assertTrue($athlete->shouldTrainOnDate($week1Monday));

        $this->assertEquals('Invalid offset', $athlete->getTrainingOffsetDescription());
    }
} 