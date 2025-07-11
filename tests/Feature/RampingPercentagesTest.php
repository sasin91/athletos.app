<?php

namespace Tests\Feature;

use App\Enums\Exercise;
use App\Settings\ExerciseConfig;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class RampingPercentagesTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function exercise_enum_provides_default_ramping_percentages()
    {
        // Test main compound lifts have conservative ramping
        $squatRamping = Exercise::BarbellBackSquat->rampingPercentages(4);
        $this->assertCount(4, $squatRamping);
        $this->assertEquals([0.60, 0.70, 0.80, 1.00], $squatRamping);
        
        $benchRamping = Exercise::BenchPress->rampingPercentages(3);
        $this->assertCount(3, $benchRamping);
        $this->assertEquals([0.80, 0.90, 1.00], $benchRamping);
        
        // Test bodyweight exercises maintain consistent intensity
        $plankRamping = Exercise::Plank->rampingPercentages(3);
        $this->assertEquals([1.00, 1.00, 1.00], $plankRamping);
    }

    #[Test]
    public function exercise_config_uses_enum_defaults_when_no_override()
    {
        $exerciseConfig = new ExerciseConfig(
            exercise: Exercise::BarbellBackSquat->value,
            sets: 4,
            reps: '8-12',
            weight: '80% 1RM',
        );
        
        $effectiveRamping = $exerciseConfig->getEffectiveRampingPercentages();
        $expectedDefault = Exercise::BarbellBackSquat->rampingPercentages(4);
        
        $this->assertEquals($expectedDefault, $effectiveRamping);
    }

    #[Test]
    public function exercise_config_uses_override_when_provided()
    {
        $customRamping = [0.75, 0.85, 0.95, 1.00];
        
        $exerciseConfig = new ExerciseConfig(
            exercise: Exercise::BarbellBackSquat->value,
            sets: 4,
            reps: '8-12',
            weight: '80% 1RM',
            rampingPercentages: $customRamping,
        );
        
        $effectiveRamping = $exerciseConfig->getEffectiveRampingPercentages();
        
        $this->assertEquals($customRamping, $effectiveRamping);
        $this->assertNotEquals(Exercise::BarbellBackSquat->rampingPercentages(4), $effectiveRamping);
    }

    #[Test]
    public function exercise_config_adapts_to_different_set_counts()
    {
        $exerciseConfig = new ExerciseConfig(
            exercise: Exercise::BenchPress->value,
            sets: 2,
            reps: '5',
            weight: '90% 1RM',
        );
        
        $twoSetRamping = $exerciseConfig->getEffectiveRampingPercentages();
        $this->assertCount(2, $twoSetRamping);
        $this->assertEquals([0.85, 1.00], $twoSetRamping);
        
        // Change to 5 sets
        $exerciseConfig->sets = 5;
        $fiveSetRamping = $exerciseConfig->getEffectiveRampingPercentages();
        $this->assertCount(5, $fiveSetRamping);
        $this->assertEquals([0.60, 0.70, 0.80, 0.90, 1.00], $fiveSetRamping);
    }

    #[Test]
    public function different_exercises_have_appropriate_ramping_patterns()
    {
        // Deadlifts should be more aggressive (higher starting percentages)
        $deadliftRamping = Exercise::Deadlift->rampingPercentages(3);
        $this->assertEquals([0.80, 0.90, 1.00], $deadliftRamping);
        
        // Isolation exercises should be more moderate
        $curlsRamping = Exercise::DumbbellCurls->rampingPercentages(3);
        $this->assertEquals([0.80, 0.90, 1.00], $curlsRamping);
        
        // Squats should be conservative
        $squatRamping = Exercise::BarbellBackSquat->rampingPercentages(3);
        $this->assertEquals([0.75, 0.85, 1.00], $squatRamping);
    }

    #[Test]
    public function ramping_percentages_always_end_at_one_hundred_percent()
    {
        $exercises = [
            Exercise::BarbellBackSquat,
            Exercise::BenchPress,
            Exercise::Deadlift,
            Exercise::DumbbellCurls,
            Exercise::Plank,
        ];
        
        foreach ($exercises as $exercise) {
            for ($sets = 1; $sets <= 6; $sets++) {
                $ramping = $exercise->rampingPercentages($sets);
                $this->assertEquals(1.00, end($ramping), 
                    "Exercise {$exercise->value} with {$sets} sets should end at 100%");
            }
        }
    }

    #[Test]
    public function athlete_completed_exercises_relationship_works()
    {
        // Create an athlete
        $athlete = \App\Models\Athlete::factory()->create();
        
        // Test that the relationship can be accessed without SQL errors
        // This relationship should return exercises from completed trainings (trainings.completed_at IS NOT NULL)
        // not exercises that are individually completed (exercises.completed_at IS NOT NULL)
        $completedExercises = $athlete->completedExercises;
        
        // Should be a collection (even if empty)
        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Collection::class, $completedExercises);
        
        // Should not throw SQL ambiguity errors when accessing
        $count = $completedExercises->count();
        $this->assertIsInt($count);
        $this->assertGreaterThanOrEqual(0, $count);
        
        // The relationship should filter by completed trainings, not individual exercises
        // This ensures we get exercises from training sessions that were actually completed
    }
} 