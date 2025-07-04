<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use App\Models\Athlete;
use App\Models\BonusActivity;
use App\Models\Exercise;
use App\Models\User;

class BonusActivityFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = BonusActivity::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'athlete_id' => Athlete::factory(),
            'exercise_id' => Exercise::factory(),
            'scheduled_at' => fake()->date(),
            'scheduled_by' => User::factory()->create()->scheduled_by,
            'completed_at' => fake()->dateTime(),
            'notes' => fake()->text(),
            'user_id' => User::factory(),
        ];
    }
}
