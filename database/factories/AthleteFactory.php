<?php

namespace Database\Factories;

use App\Enums\Difficulty;
use App\Enums\ExperienceLevel;
use App\Enums\TrainingGoal;
use App\Enums\TrainingTime;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use App\Models\Athlete;
use App\Models\TrainingPlan;
use App\Models\User;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Athlete>
 */
class AthleteFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Athlete::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'current_plan_id' => TrainingPlan::factory(),
            'training_days' => ['monday', 'wednesday', 'friday'],
            'experience_level' => $this->faker->randomElement(ExperienceLevel::values()),
            'primary_goal' => $this->faker->randomElement(TrainingGoal::values()),
            'bio' => $this->faker->optional()->paragraph(),
            'muscle_groups' => $this->faker->optional()->randomElements(['chest', 'back', 'legs', 'shoulders', 'arms', 'core'], $this->faker->numberBetween(1, 3)),
            'preferred_time' => $this->faker->randomElement(TrainingTime::values()),
            'session_duration' => $this->faker->randomElement([45, 60, 75, 90, 120]),
            'notification_preferences' => $this->faker->randomElements(['workout_reminders', 'progress_updates', 'recovery_tips'], $this->faker->numberBetween(0, 3)),
            'difficulty_preference' => $this->faker->randomElement(Difficulty::values()),
        ];
    }
}
