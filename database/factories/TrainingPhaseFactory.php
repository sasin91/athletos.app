<?php

namespace Database\Factories;

use App\Enums\Exercise;
use App\Enums\ProgressionType;
use App\Models\TrainingPlan;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TrainingPhase>
 */
class TrainingPhaseFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'training_plan_id' => TrainingPlan::factory(),
            'name' => $this->faker->words(2, true),
            'description' => $this->faker->sentence(),
            'duration_weeks' => $this->faker->numberBetween(4, 12),
            'order' => 0,
            'progression_type' => $this->faker->randomElement([ProgressionType::Static, ProgressionType::Percentage]),
            'progression_rate' => $this->faker->randomFloat(2, 1.0, 5.0),
            'settings' => [
                'exercises' => [
                    [
                        'exercise' => Exercise::BarbellBackSquat->value,
                        'day' => 1,
                        'sets' => 4,
                        'reps' => '6-8',
                        'weight' => 'Progressive',
                        'rest_seconds' => 180
                    ],
                    [
                        'exercise' => Exercise::BenchPress->value,
                        'day' => 1,
                        'sets' => 4,
                        'reps' => '6-8',
                        'weight' => 'Progressive',
                        'rest_seconds' => 180
                    ]
                ]
            ],
        ];
    }
}
