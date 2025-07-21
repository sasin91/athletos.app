<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Models\Athlete;
use App\Enums\TrainingPlan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PasswordConfirmationTest extends TestCase
{
    use RefreshDatabase;

    public function test_confirm_password_screen_can_be_rendered(): void
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

        $response = $this->actingAs($user)->get('/confirm-password');

        $response->assertStatus(200);
    }

    public function test_password_can_be_confirmed(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/confirm-password', [
            'password' => 'password',
        ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();
    }

    public function test_password_is_not_confirmed_with_invalid_password(): void
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

        $response = $this->actingAs($user)->post('/confirm-password', [
            'password' => 'wrong-password',
        ]);

        $response->assertSessionHasErrors();
    }
}
