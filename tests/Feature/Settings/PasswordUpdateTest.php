<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use App\Models\Athlete;
use App\Enums\TrainingPlan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_can_be_updated(): void
    {
        $user = User::factory()->athlete()->create();
        $athlete = Athlete::factory()->create([
            'user_id' => $user->id,
            'experience_level' => 'intermediate',
            'primary_goal' => 'strength',
            'current_plan' => TrainingPlan::HYPERTROPHY->value,
            'training_days' => ['monday', 'wednesday', 'friday'],
            'preferred_time' => 'evening',
            'session_duration' => 60,
            'difficulty_preference' => 'challenging',
        ]);

        $response = $this
            ->actingAs($user)
            ->put('/settings/password', [
                'current_password' => 'password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/settings/profile');

        $this->assertTrue(Hash::check('new-password', $user->refresh()->password));
    }

    public function test_correct_password_must_be_provided_to_update_password(): void
    {
        $user = User::factory()->athlete()->create();
        $athlete = Athlete::factory()->create([
            'user_id' => $user->id,
            'experience_level' => 'intermediate',
            'primary_goal' => 'strength',
            'current_plan' => TrainingPlan::HYPERTROPHY->value,
            'training_days' => ['monday', 'wednesday', 'friday'],
            'preferred_time' => 'evening',
            'session_duration' => 60,
            'difficulty_preference' => 'challenging',
        ]);

        $response = $this
            ->actingAs($user)
            ->put('/settings/password', [
                'current_password' => 'wrong-password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ]);

        $response
            ->assertSessionHasErrors('current_password')
            ->assertRedirect('/settings/profile');
    }
}
