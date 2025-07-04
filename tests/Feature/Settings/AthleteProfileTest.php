<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use App\Models\Athlete;
use App\Models\TrainingPlan;
use App\Enums\UserRole;
use App\Enums\ExperienceLevel;
use App\Enums\TrainingGoal;
use App\Enums\TrainingTime;
use App\Enums\Difficulty;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AthleteProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_athlete_profile_settings(): void
    {
        $this->get('/settings/athlete-profile')->assertRedirect('/login');
    }

    public function test_non_athletes_cannot_access_athlete_profile_settings(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/settings/athlete-profile')
            ->assertRedirect();
    }

    public function test_athletes_without_profile_are_redirected_to_onboarding(): void
    {
        $user = User::factory()->create(['roles' => [UserRole::Athlete]]);

        $this->actingAs($user)
            ->get('/settings/athlete-profile')
            ->assertRedirect('/onboarding/profile');
    }

    public function test_athletes_can_access_athlete_profile_settings(): void
    {
        $user = User::factory()->create(['roles' => [UserRole::Athlete]]);
        
        // Create a training plan first to satisfy foreign key constraint
        $trainingPlan = TrainingPlan::factory()->create();
        
        $athlete = Athlete::factory()->create([
            'user_id' => $user->id,
            'experience_level' => 'intermediate',
            'primary_goal' => 'strength',
            'preferred_time' => 'evening',
            'session_duration' => 60,
            'difficulty_preference' => 'challenging',
            'training_days' => ['monday', 'wednesday', 'friday'],
            'current_plan_id' => $trainingPlan->id,
        ]);

        $this->actingAs($user)
            ->get('/settings/athlete-profile')
            ->assertStatus(200)
            ->assertViewIs('settings.athlete-profile')
            ->assertViewHas('athlete', $athlete);
    }

    public function test_athletes_can_update_their_profile(): void
    {
        $user = User::factory()->create(['roles' => [UserRole::Athlete]]);
        
        // Create a training plan first to satisfy foreign key constraint
        $trainingPlan = TrainingPlan::factory()->create();
        
        $athlete = Athlete::factory()->create([
            'user_id' => $user->id,
            'experience_level' => 'beginner',
            'primary_goal' => 'general_fitness',
            'bio' => 'Old bio',
            'preferred_time' => 'morning',
            'session_duration' => 45,
            'difficulty_preference' => 'moderate',
            'training_days' => ['monday', 'friday'],
            'current_plan_id' => $trainingPlan->id,
        ]);

        $updateData = [
            'experience_level' => 'advanced',
            'primary_goal' => 'strength',
            'bio' => 'Updated bio with more details about my training journey',
            'preferred_time' => 'evening',
            'session_duration' => 90,
            'difficulty_preference' => 'intense',
            'training_days' => ['tuesday', 'thursday', 'saturday'],
        ];

        $this->actingAs($user)
            ->put('/settings/athlete-profile', $updateData)
            ->assertRedirect('/settings/athlete-profile')
            ->assertSessionHas('status');

        $this->assertDatabaseHas('athletes', [
            'id' => $athlete->id,
            'user_id' => $user->id,
            'experience_level' => 'advanced',
            'primary_goal' => 'strength',
            'bio' => 'Updated bio with more details about my training journey',
            'preferred_time' => 'evening',
            'session_duration' => 90,
            'difficulty_preference' => 'intense',
            'training_days' => json_encode(['tuesday', 'thursday', 'saturday']),
        ]);
    }

    public function test_validation_requires_valid_experience_level(): void
    {
        $user = User::factory()->create(['roles' => [UserRole::Athlete]]);
        
        // Create a training plan first to satisfy foreign key constraint
        $trainingPlan = TrainingPlan::factory()->create();
        
        $athlete = Athlete::factory()->create([
            'user_id' => $user->id,
            'current_plan_id' => $trainingPlan->id,
            'training_days' => ['monday'],
            'preferred_time' => 'evening',
            'session_duration' => 60,
            'difficulty_preference' => 'challenging',
        ]);

        $this->actingAs($user)
            ->put('/settings/athlete-profile', [
                'experience_level' => 'invalid_level',
                'primary_goal' => 'strength',
                'preferred_time' => 'evening',
                'session_duration' => 60,
                'difficulty_preference' => 'challenging',
                'training_days' => ['monday'],
            ])
            ->assertSessionHasErrors('experience_level');
    }

    public function test_validation_requires_at_least_one_training_day(): void
    {
        $user = User::factory()->create(['roles' => [UserRole::Athlete]]);
        
        // Create a training plan first to satisfy foreign key constraint
        $trainingPlan = TrainingPlan::factory()->create();
        
        $athlete = Athlete::factory()->create([
            'user_id' => $user->id,
            'current_plan_id' => $trainingPlan->id,
            'training_days' => ['monday'],
            'preferred_time' => 'evening',
            'session_duration' => 60,
            'difficulty_preference' => 'challenging',
        ]);

        $this->actingAs($user)
            ->put('/settings/athlete-profile', [
                'experience_level' => 'intermediate',
                'primary_goal' => 'strength',
                'preferred_time' => 'evening',
                'session_duration' => 60,
                'difficulty_preference' => 'challenging',
                'training_days' => [],
            ])
            ->assertSessionHasErrors('training_days');
    }
} 