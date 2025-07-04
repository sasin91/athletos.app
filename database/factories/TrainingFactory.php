<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use App\Models\Athlete;
use App\Models\Training;
use App\Models\TrainingPlan;
use App\Models\TrainingPhase;

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
            'training_plan_id' => TrainingPlan::factory(),
            'training_phase_id' => TrainingPhase::factory(),
            'scheduled_at' => fake()->dateTimeBetween('-30 days', '+30 days'),
            'postponed' => fake()->boolean(),
            'reschedule_reason' => fake()->text(),
            'mood' => fake()->word(),
            'energy_level' => fake()->numberBetween(-10000, 10000),
            'completed_at' => fake()->dateTime(),
        ];
    }
}
