<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Athlete;
use App\Models\TrainingPlan;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_user_without_athlete_gets_redirected_to_onboarding(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertRedirect('/onboarding/profile');
    }

    public function test_user_with_athlete_can_access_dashboard(): void
    {
        $user = User::factory()->create(['roles' => [UserRole::Athlete]]);
        
        // Create a training plan first to satisfy foreign key constraint
        $trainingPlan = TrainingPlan::factory()->create();
        
        // Ensure the plan has at least one phase
        \App\Models\TrainingPhase::factory()->create([
            'training_plan_id' => $trainingPlan->id,
            'order' => 0,
            'duration_weeks' => 4,
        ]);
        
        $athlete = Athlete::factory()->create([
            'user_id' => $user->id,
            'training_days' => ['monday', 'wednesday', 'friday'],
            'experience_level' => 'intermediate',
            'primary_goal' => 'strength',
            'preferred_time' => 'evening',
            'session_duration' => 60,
            'difficulty_preference' => 'challenging',
            'current_plan_id' => $trainingPlan->id,
            'plan_start_date' => now(),
        ]);

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertStatus(200)
            ->assertViewIs('dashboard')
            ->assertViewHas('athlete', $athlete);
    }
}
