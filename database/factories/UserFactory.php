<?php

namespace Database\Factories;

use App\Enums\TrainingPlan;
use App\Enums\UserRole;
use App\Models\Athlete;
use App\Models\Training;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'roles' => [UserRole::Athlete]
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function athlete(string $planType = null): static
    {
        return $this
            ->state(fn (array $attributes) => [
                'roles' => [UserRole::Athlete]
            ])
            ->afterCreating(function (User $user) use ($planType) {
                $planValue = $planType ?? TrainingPlan::HYPERTROPHY->value;
                
                $athlete = Athlete::factory()
                    ->for($user)
                    ->state(['current_plan' => $planValue])
                    ->create();

                $training = Training::factory()
                    ->state(['plan' => $planValue])
                    ->for($athlete)
                    ->create();

                $athlete->setRelation('training', $training);

                $user->athlete()->save($athlete);
            });
    }
}
