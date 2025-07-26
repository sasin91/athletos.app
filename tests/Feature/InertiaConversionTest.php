<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Athlete;
use App\Models\TrainingPlan;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InertiaConversionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create a user with athlete for most tests
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
    public function dashboard_returns_inertia_response()
    {
        $response = $this->actingAs($this->user)
            ->get('/dashboard');

        $response->assertStatus(200)
            ->assertInertia(fn ($page) => 
                $page->component('Dashboard')
                    ->has('athlete')
                    ->has('metrics')
                    ->has('weightProgressions')
                    ->has('plannedExercises')
            );
    }

    /** @test */
    public function auth_login_returns_inertia_response()
    {
        $response = $this->get('/login');

        $response->assertStatus(200)
            ->assertInertia(fn ($page) => 
                $page->component('Auth/Login')
                    ->has('canResetPassword')
            );
    }

    /** @test */
    public function auth_register_returns_inertia_response()
    {
        $response = $this->get('/register');

        $response->assertStatus(200)
            ->assertInertia(fn ($page) => 
                $page->component('Auth/Register')
            );
    }

    /** @test */
    public function onboarding_profile_returns_inertia_response()
    {
        $user = User::factory()->create(['roles' => [UserRole::Athlete]]);
        
        $response = $this->actingAs($user)
            ->get('/onboarding/profile');

        $response->assertStatus(200)
            ->assertInertia(fn ($page) => 
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
            ->assertInertia(fn ($page) => 
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
            ->assertInertia(fn ($page) => 
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
            ->assertInertia(fn ($page) => 
                $page->component('Onboarding/Preferences')
                    ->has('user')
                    ->has('athlete')
                    ->has('onboarding')
                    ->has('difficulties')
            );
    }

    /** @test */
    public function settings_profile_returns_inertia_response()
    {
        $response = $this->actingAs($this->user)
            ->get('/settings/profile');

        $response->assertStatus(200)
            ->assertInertia(fn ($page) => 
                $page->component('Settings/Profile')
                    ->has('user')
            );
    }

    /** @test */
    public function settings_password_returns_inertia_response()
    {
        $response = $this->actingAs($this->user)
            ->get('/settings/password');

        $response->assertStatus(200)
            ->assertInertia(fn ($page) => 
                $page->component('Settings/Password')
                    ->has('user')
            );
    }

    /** @test */
    public function settings_appearance_returns_inertia_response()
    {
        $response = $this->actingAs($this->user)
            ->get('/settings/appearance');

        $response->assertStatus(200)
            ->assertInertia(fn ($page) => 
                $page->component('Settings/Appearance')
            );
    }

    /** @test */
    public function settings_athlete_profile_returns_inertia_response()
    {
        $response = $this->actingAs($this->user)
            ->get('/settings/athlete-profile');

        $response->assertStatus(200)
            ->assertInertia(fn ($page) => 
                $page->component('Settings/AthleteProfile')
                    ->has('athlete')
                    ->has('experienceLevels')
                    ->has('trainingGoals')
                    ->has('muscleGroups')
                    ->has('trainingTimes')
                    ->has('difficulties')
            );
    }

    /** @test */
    public function training_plan_show_returns_inertia_response()
    {
        $response = $this->actingAs($this->user)
            ->get("/training-plans/{$this->trainingPlan->id}");

        $response->assertStatus(200)
            ->assertInertia(fn ($page) => 
                $page->component('TrainingPlans/Show')
                    ->has('trainingPlan')
            );
    }

    /** @test */
    public function exercise_show_returns_inertia_response()
    {
        $response = $this->actingAs($this->user)
            ->get('/exercises/bench-press');

        $response->assertStatus(200)
            ->assertInertia(fn ($page) => 
                $page->component('Exercises/Show')
                    ->has('exercise')
                    ->has('exerciseData')
            );
    }

    /** @test */
    public function chat_returns_inertia_response()
    {
        $response = $this->actingAs($this->user)
            ->get('/chat');

        $response->assertStatus(200)
            ->assertInertia(fn ($page) => 
                $page->component('Chat')
                    ->has('athlete')
            );
    }

    /** @test */
    public function trainings_index_returns_inertia_response()
    {
        $response = $this->actingAs($this->user)
            ->get('/trainings');

        $response->assertStatus(200)
            ->assertInertia(fn ($page) => 
                $page->component('Trainings/Index')
                    ->has('trainings')
                    ->has('athlete')
            );
    }

    /** @test */
    public function static_pages_return_inertia_responses()
    {
        $staticPages = [
            '/' => 'Welcome',
            '/about' => 'About',
            '/terms' => 'Terms',
            '/privacy' => 'Privacy',
        ];

        foreach ($staticPages as $route => $component) {
            $response = $this->get($route);
            
            $response->assertStatus(200)
                ->assertInertia(fn ($page) => 
                    $page->component($component)
                );
        }
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

    /** @test */
    public function form_submissions_work_with_inertia()
    {
        // Test login form submission
        $response = $this->post('/login', [
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(302); // Redirect due to validation error
        $response->assertSessionHasErrors(['email']);

        // Test profile update
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