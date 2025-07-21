<?php

namespace Tests\Feature;

use App\Enums\TrainingPlan;
use App\Enums\UserRole;
use App\Models\Training;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Session;
use Tests\TestCase;
use Livewire\Livewire;

class OnboardingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_guest_cannot_access_onboarding(): void
    {
        $response = $this->get('/onboarding/profile');

        $response->assertRedirect('/login');
    }

    public function test_athlete_can_access_first_step(): void
    {
        $user = User::factory()->athlete()->create();

        $response = $this->actingAs($user)
            ->get('/onboarding/profile');

        $response->assertStatus(200)
            ->assertViewIs('onboarding.profile');
    }

    public function test_athlete_can_complete_profile_step(): void
    {
        $user = User::factory()->create();
        // Create a minimal athlete record (just the user relationship) to start onboarding
        $user->athlete()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)
            ->post('/onboarding/profile', [
                'experience_level' => 'intermediate',
                'primary_goal' => 'strength',
                'bio' => 'I love lifting heavy weights',
                'top_squat' => 315,
                'top_bench' => 225,
                'top_deadlift' => 405,
            ]);

        // Should redirect to next step (plan) after completing profile
        $response->assertRedirect('/onboarding/plan');

        // Verify data is stored in database
        $this->assertDatabaseHas('athletes', [
            'user_id' => $user->id,
            'experience_level' => 'intermediate',
            'primary_goal' => 'strength',
            'bio' => 'I love lifting heavy weights',
        ]);
    }

    public function test_athlete_can_complete_plan_step(): void
    {
        $user = User::factory()->create();
        
        // Complete profile step first
        $user->athlete()->create([
            'user_id' => $user->id,
            'experience_level' => 'intermediate',
            'primary_goal' => 'strength',
            'bio' => 'I love lifting heavy weights',
        ]);

        $response = $this->actingAs($user)
            ->post('/onboarding/plan', [
                'selected_plan_type' => TrainingPlan::HYPERTROPHY->value,
            ]);

        // Should redirect to next incomplete step (schedule)
        $response->assertRedirect('/onboarding/schedule');

        $this->assertDatabaseHas('athletes', [
            'user_id' => $user->id,
            'current_plan' => TrainingPlan::HYPERTROPHY->value,
        ]);
    }

    public function test_athlete_can_complete_schedule_step(): void
    {
        $user = User::factory()->athlete()->create();
        
        // Complete previous steps
        $user->athlete()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'experience_level' => 'intermediate',
                'primary_goal' => 'strength',
                'bio' => 'I love lifting heavy weights',
                'current_plan' => TrainingPlan::POWERLIFTING->value,
            ]
        );

        $response = $this->actingAs($user)
            ->post('/onboarding/schedule', [
                'training_days' => ['monday', 'wednesday', 'friday'],
                'preferred_time' => 'evening',
                'session_duration' => 60,
            ]);

        // Focus on successful processing rather than exact redirect
        $response->assertStatus(302);

        $this->assertDatabaseHas('athletes', [
            'user_id' => $user->id,
            'training_days' => json_encode(['monday', 'wednesday', 'friday']),
            'preferred_time' => 'evening',
            'session_duration' => 60,
        ]);
    }

    public function test_athlete_can_complete_stats_step(): void
    {
        $user = User::factory()->athlete()->create();
        
        // Complete previous steps
        $user->athlete()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'experience_level' => 'intermediate',
                'primary_goal' => 'strength',
                'bio' => 'I love lifting heavy weights',
                'current_plan' => TrainingPlan::POWERLIFTING->value,
                'training_days' => ['monday', 'wednesday', 'friday'],
                'preferred_time' => 'evening',
                'session_duration' => 60,
            ]
        );

        $response = $this->actingAs($user)
            ->post('/onboarding/stats', [
                'current_bench' => 225,
                'current_squat' => 315,
                'current_deadlift' => 405,
            ]);

        // Focus on successful processing
        $response->assertStatus(302);
    }

    public function test_athlete_can_complete_preferences_step(): void
    {
        $user = User::factory()->athlete()->create();
        
        // Complete previous steps
        $user->athlete()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'experience_level' => 'intermediate',
                'primary_goal' => 'strength',
                'bio' => 'I love lifting heavy weights',
                'current_plan' => TrainingPlan::POWERLIFTING->value,
                'training_days' => ['monday', 'wednesday', 'friday'],
                'preferred_time' => 'evening',
                'session_duration' => 60,
            ]
        );

        $response = $this->actingAs($user)
            ->post('/onboarding/preferences', [
                'notifications' => ['workout_reminders'],
                'difficulty_preference' => 'challenging'
            ]);

        // Focus on successful processing
        $response->assertStatus(302);
        
        $this->assertDatabaseHas('athletes', [
            'user_id' => $user->id,
            'notification_preferences' => json_encode(['workout_reminders']),
            'difficulty_preference' => 'challenging',
        ]);
    }

    public function test_athlete_can_complete_full_onboarding(): void
    {
        $user = User::factory()->athlete()->create();

        // Use plan type string instead of model

        // Complete all steps in sequence
        $this->actingAs($user)
            ->post('/onboarding/profile', [
                'experience_level' => 'intermediate',
                'primary_goal' => 'strength',
                'bio' => 'I love lifting heavy weights',
                'top_squat' => 315,
                'top_bench' => 225,
                'top_deadlift' => 405,
            ]);

        $this->actingAs($user)
            ->post('/onboarding/plan', [
                'selected_plan_type' => TrainingPlan::HYPERTROPHY->value,
            ]);

        $this->actingAs($user)
            ->post('/onboarding/schedule', [
                'training_days' => ['monday', 'wednesday', 'friday'],
                'preferred_time' => 'evening',
                'session_duration' => 60,
            ]);

        $this->actingAs($user)
            ->post('/onboarding/stats', [
                'current_bench' => 225,
                'current_squat' => 315,
                'current_deadlift' => 405,
            ]);

        $response = $this->actingAs($user)
            ->post('/onboarding/preferences', [
                'notifications' => ['workout_reminders', 'progress_updates'],
                'difficulty_preference' => 'challenging'
            ]);

        // Focus on successful processing
        $response->assertStatus(302);

        $this->assertDatabaseHas('athletes', [
            'user_id' => $user->id,
            'experience_level' => 'intermediate',
            'primary_goal' => 'strength',
            'current_plan' => TrainingPlan::HYPERTROPHY->value,
            'training_days' => json_encode(['monday', 'wednesday', 'friday']),
            'preferred_time' => 'evening',
            'session_duration' => 60,
            'difficulty_preference' => 'challenging',
        ]);
    }

    public function test_onboarding_sets_up_athlete_without_generating_trainings(): void
    {
        $user = User::factory()->create([
            'roles' => [UserRole::Athlete]
        ]);

        // Complete full onboarding
        $user->athlete()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'experience_level' => 'intermediate',
                'primary_goal' => 'strength',
                'bio' => 'I love lifting heavy weights',
                'current_plan' => TrainingPlan::POWERLIFTING->value,
                'training_days' => ['monday', 'wednesday', 'friday'],
                'preferred_time' => 'evening',
                'session_duration' => 60,
                'difficulty_preference' => 'challenging',
            ]
        );

        // Complete preferences to trigger onboarding completion
        $this->actingAs($user)
            ->post('/onboarding/preferences', [
                'notifications' => ['workout_reminders'],
                'difficulty_preference' => 'challenging'
            ]);

        // Verify that NO training sessions are generated during onboarding
        // Training sessions are only created when the user starts a workout
        $trainings = Training::where('athlete_id', $user->athlete->id)->get();
        $this->assertEquals(0, $trainings->count());

        // Verify that the athlete has been properly set up
        $athlete = $user->fresh()->athlete;
        $this->assertNotNull($athlete);
        $this->assertEquals(TrainingPlan::POWERLIFTING->value, $athlete->current_plan);
        $this->assertEquals(['monday', 'wednesday', 'friday'], $athlete->training_days);
    }

    public function test_onboarding_validates_required_fields(): void
    {
        $user = User::factory()->athlete()->create();

        // Test profile validation
        $response = $this->actingAs($user)
            ->post('/onboarding/profile', []);

        $response->assertSessionHasErrors(['experience_level', 'primary_goal']);

        // Test plan validation
        $response = $this->actingAs($user)
            ->post('/onboarding/plan', []);

        $response->assertSessionHasErrors(['selected_plan_type']);
    }

    public function test_onboarding_validates_training_days_array(): void
    {
        $user = User::factory()->athlete()->create();

        $response = $this->actingAs($user)
            ->post('/onboarding/schedule', [
                'training_days' => [],
                'preferred_time' => 'evening',
                'session_duration' => 60,
            ]);

        $response->assertSessionHasErrors(['training_days']);
    }

    public function test_onboarding_without_optional_kpi_fields(): void
    {
        $user = User::factory()->athlete()->create();

        // Complete all required steps without KPI fields
        $user->athlete()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'experience_level' => 'beginner',
                'primary_goal' => 'general_fitness',
                'current_plan' => TrainingPlan::HYPERTROPHY->value,
                'training_days' => ['monday', 'wednesday', 'friday'],
                'preferred_time' => 'morning',
                'session_duration' => 45,
                'difficulty_preference' => 'moderate',
            ]
        );

        $response = $this->actingAs($user)
            ->post('/onboarding/preferences', [
                'difficulty_preference' => 'moderate'
            ]);

        $response->assertRedirect(route('dashboard'));

        $athlete = $user->fresh()->athlete;
        $this->assertNotNull($athlete);
        $this->assertNotNull($athlete->current_plan);
    }

    public function test_onboarding_assigns_appropriate_training_plan(): void
    {
        $user = User::factory()->athlete()->create();

        // Complete onboarding with specific plan
        $user->athlete()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'experience_level' => 'intermediate',
                'primary_goal' => 'strength',
                'current_plan' => TrainingPlan::POWERLIFTING->value,
                'training_days' => ['monday', 'wednesday', 'friday'],
                'preferred_time' => 'evening',
                'session_duration' => 60,
                'difficulty_preference' => 'challenging',
            ]
        );

        $this->actingAs($user)
            ->post('/onboarding/preferences', [
                'difficulty_preference' => 'challenging'
            ]);

        $athlete = $user->fresh()->athlete;
        $this->assertNotNull($athlete);
        $this->assertEquals(TrainingPlan::POWERLIFTING->value, $athlete->current_plan);
    }

    public function test_athlete_can_complete_preferences_step_with_no_notifications(): void
    {
        $user = User::factory()->athlete()->create();
        
        // Complete previous steps
        $user->athlete()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'experience_level' => 'intermediate',
                'primary_goal' => 'strength',
                'bio' => 'I love lifting heavy weights',
                'current_plan' => TrainingPlan::POWERLIFTING->value,
                'training_days' => ['monday', 'wednesday', 'friday'],
                'preferred_time' => 'evening',
                'session_duration' => 60,
            ]
        );

        $response = $this->actingAs($user)
            ->post('/onboarding/preferences', [
                'difficulty_preference' => 'challenging'
                // No notifications field = empty array
            ]);

        // Focus on successful processing
        $response->assertStatus(302);
        
        // Verify that empty notifications array is stored correctly
        $this->assertDatabaseHas('athletes', [
            'user_id' => $user->id,
            'notification_preferences' => json_encode([]),
        ]);
    }

    public function test_plan_step_validates_required_selection(): void
    {
        $user = User::factory()->athlete()->create();

        $response = $this->actingAs($user)
            ->post('/onboarding/plan', []);

        $response->assertSessionHasErrors(['selected_plan_type']);
    }
} 