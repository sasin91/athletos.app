<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Athlete;
use App\Models\TrainingPlan;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OnboardingTest extends TestCase
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
    public function onboarding_profile_returns_inertia_response()
    {
        $user = User::factory()->create(['roles' => [UserRole::Athlete]]);

        $response = $this->actingAs($user)
            ->get('/onboarding/profile');

        $response->assertStatus(200)
            ->assertInertia(
                fn($page) =>
                $page->component('Onboarding/Profile')
                    ->has('user')
                    ->has('athlete')
                    ->has('onboarding')
                    ->has('experienceLevels')
                    ->has('trainingGoals')
                    ->has('muscleGroups')
            );
    }

    /** @test */
    public function onboarding_schedule_returns_inertia_response()
    {
        $response = $this->actingAs($this->user)
            ->get('/onboarding/schedule');

        $response->assertStatus(200)
            ->assertInertia(
                fn($page) =>
                $page->component('Onboarding/Schedule')
                    ->has('user')
                    ->has('athlete')
                    ->has('onboarding')
                    ->has('weekdays')
                    ->has('trainingTimes')
            );
    }

    /** @test */
    public function onboarding_stats_returns_inertia_response()
    {
        $response = $this->actingAs($this->user)
            ->get('/onboarding/stats');

        $response->assertStatus(200)
            ->assertInertia(
                fn($page) =>
                $page->component('Onboarding/Stats')
                    ->has('user')
                    ->has('athlete')
                    ->has('onboarding')
            );
    }

    /** @test */
    public function onboarding_preferences_returns_inertia_response()
    {
        $response = $this->actingAs($this->user)
            ->get('/onboarding/preferences');

        $response->assertStatus(200)
            ->assertInertia(
                fn($page) =>
                $page->component('Onboarding/Preferences')
                    ->has('user')
                    ->has('athlete')
                    ->has('onboarding')
                    ->has('difficulties')
            );
    }

    /** @test */
    public function all_enum_data_is_properly_formatted()
    {
        $response = $this->actingAs($this->user)
            ->get('/onboarding/profile');

        $response->assertInertia(function ($page) {
            $page->has('experienceLevels.0.value')
                ->has('experienceLevels.0.label')
                ->has('experienceLevels.0.description')
                ->has('trainingGoals.0.value')
                ->has('trainingGoals.0.label')
                ->has('trainingGoals.0.description')
                ->has('muscleGroups.0.value')
                ->has('muscleGroups.0.label');
        });
    }
}