<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Athlete;
use App\Models\TrainingPlan;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create(['roles' => [UserRole::Athlete]]);
        $this->trainingPlan = TrainingPlan::factory()->create();

        \App\Models\TrainingPhase::factory()->create([
            'training_plan_id' => $this->trainingPlan->id,
            'order' => 0,
            'duration_weeks' => 4,
        ]);

        $this->athlete = Athlete::factory()->create([
            'user_id' => $this->user->id,
            'training_days' => ['monday', 'wednesday', 'friday'],
            'experience_level' => 'intermediate',
            'primary_goal' => 'strength',
            'preferred_time' => 'evening',
            'session_duration' => 60,
            'difficulty_preference' => 'challenging',
            'current_plan_id' => $this->trainingPlan->id,
            'plan_start_date' => now(),
        ]);
    }

    /** @test */
    public function settings_profile_returns_inertia_response()
    {
        $response = $this->actingAs($this->user)
            ->get('/settings/profile');

        $response->assertOk();
    }

    /** @test */
    public function settings_password_returns_inertia_response()
    {
        $response = $this->actingAs($this->user)
            ->get('/settings/password');

        $response->assertOk();
    }

    /** @test */
    public function settings_appearance_returns_inertia_response()
    {
        $response = $this->actingAs($this->user)
            ->get('/settings/appearance');

        $response->assertOk();
    }

    /** @test */
    public function settings_athlete_profile_returns_inertia_response()
    {
        $response = $this->actingAs($this->user)
            ->get('/settings/athlete-profile');

        $response->assertOk();
    }

    /** @test */
    public function profile_update_form_submission_works()
    {
        $response = $this->actingAs($this->user)
            ->put('/settings/profile', [
                'name' => 'Updated Name',
                'email' => $this->user->email,
            ]);

        $response->assertStatus(302); // Redirect after successful update
        $this->assertDatabaseHas('users', [
            'id' => $this->user->id,
            'name' => 'Updated Name',
        ]);
    }
}