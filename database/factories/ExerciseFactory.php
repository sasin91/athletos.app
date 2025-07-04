<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use App\Models\Exercise;

class ExerciseFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Exercise::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'slug' => fake()->slug(),
            'category' => fake()->randomElement(['strength', 'mobility', 'recovery', 'yoga']),
            'difficulty' => fake()->randomElement(['beginner', 'intermediate', 'advanced']),
            'tags' => ['compound'],
        ];
    }
}
