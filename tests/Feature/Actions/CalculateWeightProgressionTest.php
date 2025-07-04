<?php

namespace Tests\Feature\Actions;

use App\Actions\CalculateWeightProgression;
use App\Enums\ExperienceLevel;
use App\Enums\Exercise;
use App\Models\Athlete;
use App\Models\PerformanceIndicator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Enums\Difficulty;

class CalculateWeightProgressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_static_progression_for_beginner_squat()
    {
        $athlete = Athlete::factory()->create([
            'experience_level' => ExperienceLevel::Beginner,
            'difficulty_preference' => Difficulty::Moderate,
        ]);
        
        PerformanceIndicator::factory()->create([
            'athlete_id' => $athlete->id,
            'exercise' => Exercise::BarbellBackSquat->value,
            'label' => 'Barbell Back Squat 1RM',
            'type' => 'strength',
            'value' => 100,
            'unit' => 'kg',
        ]);

        $action = new CalculateWeightProgression();
        $progressions = $action->execute($athlete, 4);
        $squatProgression = collect($progressions->progressions)->firstWhere('exercise', Exercise::BarbellBackSquat);

        $this->assertNotNull($squatProgression);
        $expectedWeights = [105.0, 110.0, 115.0, 120.0]; // Compounding: 100+5=105, 105+5=110, 110+5=115, 115+5=120
        foreach ($squatProgression->dataPoints as $i => $point) {
            $this->assertEquals($expectedWeights[$i], $point['expected_weight']);
        }
    }

    public function test_percentage_progression_for_advanced_squat()
    {
        $athlete = Athlete::factory()->create([
            'experience_level' => ExperienceLevel::Advanced,
            'difficulty_preference' => Difficulty::Intense,
        ]);
        
        PerformanceIndicator::factory()->create([
            'athlete_id' => $athlete->id,
            'exercise' => Exercise::BarbellBackSquat->value,
            'label' => 'Barbell Back Squat 1RM',
            'type' => 'strength',
            'value' => 100,
            'unit' => 'kg',
        ]);

        $action = app(CalculateWeightProgression::class);
        $progressions = $action->execute($athlete, 2);
        $squatProgression = collect($progressions->progressions)->firstWhere('exercise', Exercise::BarbellBackSquat);

        $this->assertNotNull($squatProgression);
        // 2.5% per week: week 1 = 102.5, week 2 = 105.1 (100 * 1.025^2 = 105.0625 rounded to 105.1)
        $expectedWeights = [102.5, 105.1];
        foreach ($squatProgression->dataPoints as $i => $point) {
            $this->assertEquals($expectedWeights[$i], $point['expected_weight']);
        }
    }
} 