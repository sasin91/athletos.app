<?php

namespace Tests\Feature;

use App\Actions\CompleteTraining;
use App\Actions\SuggestRecoveryExercises;
use App\Enums\Exercise;
use App\Enums\UserRole;
use App\Models\Athlete;
use App\Models\Training;
use App\Models\TrainingPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use Carbon\Carbon;
use PHPUnit\Framework\Attributes\DataProvider;

class TrainingTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_view_training_page(): void
    {
        $user = User::factory()->create();
        $trainingPlan = TrainingPlan::factory()->create();
        $athlete = Athlete::factory()->create([
            'user_id' => $user->id,
            'experience_level' => 'intermediate',
            'primary_goal' => 'strength',
            'current_plan_id' => $trainingPlan->id,
            'training_days' => ['monday', 'wednesday', 'friday'],
            'preferred_time' => 'evening',
            'session_duration' => 60,
            'difficulty_preference' => 'challenging',
            'plan_start_date' => now(),
        ]);

        // Create a training session manually (simulating user starting a session)
        $training = Training::factory()->create([
            'athlete_id' => $athlete->id,
            'training_plan_id' => $trainingPlan->id,
            'scheduled_at' => Carbon::today()->setTime(9, 0),
        ]);

        $this->actingAs($user)
            ->get(route('trainings.show', $training))
            ->assertStatus(200)
            ->assertViewIs('trainings.show')
            ->assertViewHas('training', $training);
    }

    public function test_user_can_complete_training_with_exercises(): void
    {
        $user = User::factory()->create();
        $trainingPlan = TrainingPlan::factory()->create();
        $athlete = Athlete::factory()->create([
            'user_id' => $user->id,
            'experience_level' => 'intermediate',
            'primary_goal' => 'strength',
            'current_plan_id' => $trainingPlan->id,
            'training_days' => ['monday', 'wednesday', 'friday'],
            'preferred_time' => 'evening',
            'session_duration' => 60,
            'difficulty_preference' => 'challenging',
            'plan_start_date' => now(),
        ]);

        // Create a training session manually (simulating user starting a session)
        $training = Training::factory()->create([
            'athlete_id' => $athlete->id,
            'training_plan_id' => $trainingPlan->id,
            'scheduled_at' => Carbon::today()->setTime(9, 0),
        ]);

        $response = $this->actingAs($user)
            ->post(route('trainings.complete', $training), [
                'exercises' => [
                    Exercise::BarbellBackSquat->value => [
                        '1' => ['reps' => 5, 'weight' => 315, 'rpe' => 8],
                        '2' => ['reps' => 5, 'weight' => 315, 'rpe' => 8],
                        '3' => ['reps' => 5, 'weight' => 315, 'rpe' => 9],
                    ],
                    Exercise::BenchPress->value => [
                        '1' => ['reps' => 5, 'weight' => 225, 'rpe' => 7],
                        '2' => ['reps' => 5, 'weight' => 225, 'rpe' => 7],
                        '3' => ['reps' => 5, 'weight' => 225, 'rpe' => 8],
                    ]
                ],
                'mood' => 'good',
                'energy_level' => 8,
            ]);

        $response->assertRedirect(route('trainings.complete.show', $training))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('trainings', [
            'id' => $training->id,
            'mood' => 'good',
            'energy_level' => 8,
        ]);
        
        // Verify training was marked as completed (has completed_at timestamp)
        $this->assertDatabaseMissing('trainings', [
            'id' => $training->id,
            'completed_at' => null,
        ]);
    }

    public function test_guest_cannot_access_training_page(): void
    {
        $training = Training::factory()->create();

        $response = $this->get(route('trainings.show', $training));

        $response->assertRedirect('/login');
    }

    public function test_user_cannot_access_other_users_training(): void
    {
        $user1 = User::factory()->create();
        $trainingPlan1 = TrainingPlan::factory()->create();
        $athlete1 = Athlete::factory()->create([
            'user_id' => $user1->id,
            'experience_level' => 'intermediate',
            'primary_goal' => 'strength',
            'current_plan_id' => $trainingPlan1->id,
            'training_days' => ['monday', 'wednesday', 'friday'],
            'preferred_time' => 'evening',
            'session_duration' => 60,
            'difficulty_preference' => 'challenging',
            'plan_start_date' => now(),
        ]);

        // Create a training session for user1
        $training = Training::factory()->create([
            'athlete_id' => $athlete1->id,
            'training_plan_id' => $trainingPlan1->id,
            'scheduled_at' => Carbon::today()->setTime(9, 0),
        ]);

        $user2 = User::factory()->create();
        $trainingPlan2 = TrainingPlan::factory()->create();
        $athlete2 = Athlete::factory()->create([
            'user_id' => $user2->id,
            'experience_level' => 'beginner',
            'primary_goal' => 'general_fitness',
            'current_plan_id' => $trainingPlan2->id,
            'training_days' => ['tuesday', 'thursday'],
            'preferred_time' => 'morning',
            'session_duration' => 45,
            'difficulty_preference' => 'moderate',
            'plan_start_date' => now(),
        ]);

        $response = $this->actingAs($user2)
            ->get(route('trainings.show', $training));

        $response->assertStatus(403);
    }

    public function test_cannot_start_training_for_non_training_day(): void
    {
        $user = User::factory()->create();
        $trainingPlan = TrainingPlan::factory()->create();
        $athlete = Athlete::factory()->create([
            'user_id' => $user->id,
            'experience_level' => 'intermediate',
            'primary_goal' => 'strength',
            'current_plan_id' => $trainingPlan->id,
            'training_days' => ['monday'], // Only Monday
            'preferred_time' => 'evening',
            'session_duration' => 60,
            'difficulty_preference' => 'challenging',
            'plan_start_date' => now(),
        ]);

        // Set today to Tuesday (not a training day)
        $tuesday = Carbon::parse('next tuesday');
        Carbon::setTestNow($tuesday);

        $response = $this->actingAs($user)
            ->get(route('trainings.create'));

        $response->assertStatus(403);

        Carbon::setTestNow(); // Reset
    }

    public function test_recovery_suggestions(): void
    {
        $user = User::factory()->create();
        $trainingPlan = TrainingPlan::factory()->create();
        $athlete = Athlete::factory()->create([
            'user_id' => $user->id,
            'current_plan_id' => $trainingPlan->id,
            'plan_start_date' => now(),
        ]);

        $training = Training::factory()->create([
            'athlete_id' => $athlete->id,
            'training_plan_id' => $trainingPlan->id,
        ]);
        
        app(CompleteTraining::class)->execute($training, [
            Exercise::BarbellBackSquat->value => [
                '1' => ['reps' => 8, 'weight' => 70, 'rpe' => 5],
                '2' => ['reps' => 8, 'weight' => 100, 'rpe' => 6],
                '3' => ['reps' => 8, 'weight' => 140, 'rpe' => 8],
                '4' => ['reps' => 8, 'weight' => 140, 'rpe' => 8],
            ],
            Exercise::BenchPress->value => [
                '1' => ['reps' => 8, 'weight' => 70, 'rpe' => 5],
                '2' => ['reps' => 8, 'weight' => 100, 'rpe' => 6],
                '3' => ['reps' => 6, 'weight' => 110, 'rpe' => 7],
                '4' => ['reps' => 6, 'weight' => 110, 'rpe' => 7],
            ],
            Exercise::Deadlift->value => [
                '1' => ['reps' => 8, 'weight' => 70, 'rpe' => 3],
                '2' => ['reps' => 8, 'weight' => 100, 'rpe' => 4],
                '3' => ['reps' => 8, 'weight' => 140, 'rpe' => 6],
                '4' => ['reps' => 8, 'weight' => 160, 'rpe' => 8],
            ],
        ], 'good', 8);

        $suggestions = app(SuggestRecoveryExercises::class)->execute($training);

        $expected = [
            'barbell-back-squat' => [
                ['exerciseSlug' => 'glute-bridge', 'priority' => 2],
                ['exerciseSlug' => 'plank', 'priority' => 1],
                ['exerciseSlug' => 'bretzel-stretch', 'priority' => 1],
            ],
            'bench-press' => [
                ['exerciseSlug' => 'cat-cow-stretch', 'priority' => 2],
                ['exerciseSlug' => 'sphinx-pose', 'priority' => 2],
                ['exerciseSlug' => 'downward-dog', 'priority' => 1],
            ],
            'deadlift' => [
                ['exerciseSlug' => 'bird-dog', 'priority' => 2],
                ['exerciseSlug' => 'glute-bridge', 'priority' => 2],
                ['exerciseSlug' => 'bridge-pose', 'priority' => 2],
            ],
        ];

        foreach ($expected as $exerciseSlug => $expectedSuggestions) {
            $this->assertArrayHasKey($exerciseSlug, $suggestions);
            $actual = $suggestions[$exerciseSlug];
            $this->assertCount(3, $actual);
            foreach ($expectedSuggestions as $i => $exp) {
                $this->assertEquals($exp['exerciseSlug'], $actual[$i]->exerciseSlug);
                $this->assertEquals($exp['priority'], $actual[$i]->priority);
            }
        }
    }

    #[Test]
    public function can_complete_training(): void
    {
        $user = User::factory()->create();
        $trainingPlan = TrainingPlan::factory()->create();
        $athlete = Athlete::factory()->create([
            'user_id' => $user->id,
            'current_plan_id' => $trainingPlan->id,
            'plan_start_date' => now(),
        ]);
        $training = Training::factory()->create([
            'athlete_id' => $athlete->id,
            'training_plan_id' => $trainingPlan->id,
        ]);
        
        $this->actingAs($user);

        $response = $this->post(route('trainings.complete', $training), [
            'exercises' => [],
            'mood' => 'good',
            'energy_level' => 8,
            'notes' => 'Great session!'
        ]);

        $response->assertSessionHasNoErrors();
    }

    public function test_user_can_start_training_session_via_store(): void
    {
        $user = User::factory()->create();
        $trainingPlan = TrainingPlan::factory()->create();
        $athlete = Athlete::factory()->create([
            'user_id' => $user->id,
            'current_plan_id' => $trainingPlan->id,
            'training_days' => ['monday', 'wednesday', 'friday'],
            'plan_start_date' => now(),
        ]);

        $scheduledAt = now()->setTime(9, 0);

        $this->actingAs($user);

        $response = $this->post(route('trainings.store'), [
            'training_plan_id' => $trainingPlan->id,
            'scheduled_at' => $scheduledAt->format('Y-m-d H:i:s'),
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('trainings', [
            'athlete_id' => $athlete->id,
            'training_plan_id' => $trainingPlan->id,
            'scheduled_at' => $scheduledAt->format('Y-m-d H:i:s'),
        ]);
    }

    public function test_can_assign_training_plan(): void
    {
        $user = User::factory()->create();
        $trainingPlan1 = TrainingPlan::factory()->create();
        $athlete = Athlete::factory()->create([
            'user_id' => $user->id,
            'experience_level' => 'intermediate',
            'primary_goal' => 'strength',
            'current_plan_id' => $trainingPlan1->id,
            'training_days' => ['monday', 'wednesday', 'friday'],
            'preferred_time' => 'evening',
            'session_duration' => 60,
            'difficulty_preference' => 'challenging',
            'plan_start_date' => now(),
        ]);

        $trainingPlan = TrainingPlan::factory()->create();

        $response = $this->actingAs($user)
            ->post(route('training-plans.assign', $trainingPlan));

        $response->assertRedirect(route('dashboard'));
        
        $this->assertDatabaseHas('athletes', [
            'user_id' => $user->id,
            'current_plan_id' => $trainingPlan->id,
        ]);
    }
} 