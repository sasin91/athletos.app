<?php

namespace Database\Factories;

use App\Models\Athlete;
use App\Models\PerformanceIndicator;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PerformanceIndicator>
 */
class PerformanceIndicatorFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = PerformanceIndicator::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'athlete_id' => Athlete::factory(),
            'exercise' => 'barbell-back-squat',
            'label' => $this->faker->randomElement(['1RM Bench Press', '1RM Squat', '1RM Deadlift', 'Body Weight', 'Sleep Quality']),
            'value' => $this->faker->randomFloat(2, 50, 300),
            'unit' => $this->faker->randomElement(['kg', 'lbs', 'hours', 'score']),
            'type' => 'strength',
        ];
    }
}
