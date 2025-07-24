<?php

namespace Tests\Feature;

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
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AdjustTrainingPlanTest extends TestCase
{
    use RefreshDatabase;

    private AdjustTrainingPlan $action;

    protected function setUp(): void
    {
        parent::setUp();
        $this->action = app(AdjustTrainingPlan::class);
    }

    #[Test]
    public function it_creates_modified_plan_with_exercise_adjustments(): void
    {
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
        $this->assertTrue($result['success']);
        $this->assertEquals('Shoulder-Focused Hypertrophy', $result['plan_name']);

        $newPlan = TrainingPlan::find($result['new_plan_id']);
        $this->assertEquals('Shoulder-Focused Hypertrophy', $newPlan->name);
        $this->assertEquals(TrainingGoal::Hypertrophy, $newPlan->goal);

        // Verify the phase has the new shoulder exercises
        $newPhase = $newPlan->phases()->where('order', 1)->first();
        $this->assertEquals('Upper Body Phase', $newPhase->name);

        $exercises = $newPhase->settings->getExerciseConfigs();
        $this->assertCount(3, $exercises);

        $exerciseNames = array_map(fn($config) => $config->exercise, $exercises);
        $this->assertContains(Exercise::InclineDumbbellPress->value, $exerciseNames);
        $this->assertContains(Exercise::SideLateralRaises->value, $exerciseNames);
        $this->assertContains(Exercise::OneArmDumbbellRow->value, $exerciseNames);
    }
}
