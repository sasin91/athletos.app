<?php

namespace Database\Factories;

use App\Enums\ExperienceLevel;
use App\Enums\ProgressionType;
use App\Enums\TrainingGoal;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use App\Models\TrainingPlan;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TrainingPlan>
 */
class TrainingPlanFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = TrainingPlan::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'name' => fake()->randomElement([
                'Beginner Strength Program',
                'Powerlifting Prep',
                'Hypertrophy Focus',
                'Competition Peak',
                'General Fitness'
            ]),
            'description' => fake()->sentence(10),
            'goal' => fake()->randomElement(TrainingGoal::cases()),
            'experience_level' => fake()->randomElement(ExperienceLevel::cases()),
            'default_progression_type' => fake()->randomElement(ProgressionType::cases()),
            'default_progression_rate' => fake()->randomFloat(2, 1.0, 5.0),
            'easy_progression_rate' => fake()->randomFloat(2, 0.5, 2.0),
            'medium_progression_rate' => fake()->randomFloat(2, 1.5, 3.0),
            'hard_progression_rate' => fake()->randomFloat(2, 2.5, 5.0),
        ];
    }

    public function configure()
    {
        return $this->afterCreating(function (\App\Models\TrainingPlan $plan) {
            \App\Models\TrainingPhase::factory()->create([
                'training_plan_id' => $plan->id,
                'order' => 0,
                'duration_weeks' => 4,
            ]);
        });
    }
}
