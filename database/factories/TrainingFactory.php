<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use App\Models\Athlete;
use App\Models\Training;


/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Training>
 */
class TrainingFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Training::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'athlete_id' => Athlete::factory(),
            'plan' => fake()->randomElement(['hypertrophy', 'powerlifting']),

            'scheduled_at' => fake()->dateTimeBetween('-30 days', '+30 days'),
            'postponed' => fake()->boolean(),
            'reschedule_reason' => fake()->text(),
            'mood' => fake()->word(),
            'energy_level' => fake()->numberBetween(-10000, 10000),
            'completed_at' => fake()->dateTime(),
        ];
    }
}
