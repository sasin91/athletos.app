<?php

namespace Tests\Feature;

use App\Models\Athlete;
use App\Models\Training;
use App\Models\TrainingPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class TrainingCompletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_complete_training_with_feedback(): void
    {
        // Create a user with athlete profile
        $user = User::factory()->create();
        $athlete = Athlete::factory()->create(['user_id' => $user->id]);
        
        // Create a training plan and training session
        $trainingPlan = TrainingPlan::factory()->create();
        $training = Training::factory()->create([
            'athlete_id' => $athlete->id,
            'training_plan_id' => $trainingPlan->id,
            'scheduled_at' => now(),
            'completed_at' => null,
        ]);

        // Prepare training completion data
        $completionData = [
            'overall_rating' => 4,
            'mood' => 'good',
            'energy_level' => 7,
            'difficulty' => 'just_right',
            'difficulty_level' => 6,
            'notes' => 'Great training session, felt strong today!',
            'total_timer_seconds' => 3600, // 1 hour
            'exercise_sets' => [
                'bench_press' => [
                    [
                        'setNumber' => 1,
                        'reps' => 8,
                        'weight' => 80,
                        'rpe' => 7,
                        'notes' => 'Felt good'
                    ],
                    [
                        'setNumber' => 2,
                        'reps' => 8,
                        'weight' => 80,
                        'rpe' => 8,
                        'notes' => 'Getting challenging'
                    ]
                ]
            ]
        ];

        // Act: Submit training completion
        $response = $this->actingAs($user)
            ->post("/trainings/{$training->id}/complete", $completionData);

        // Assert: Check response
        $response->assertRedirect(route('dashboard'))
            ->assertSessionHas('success', 'Training completed successfully! Great work!');

        // Assert: Check database was updated
        $training->refresh();
        
        $this->assertNotNull($training->completed_at);
        $this->assertEquals(4, $training->overall_rating);
        $this->assertEquals('good', $training->mood);
        $this->assertEquals(7, $training->energy_level);
        $this->assertEquals('just_right', $training->difficulty);
        $this->assertEquals(6, $training->difficulty_level);
        $this->assertEquals('Great training session, felt strong today!', $training->notes);
        $this->assertEquals(3600, $training->total_timer_seconds);
        $this->assertNotNull($training->exercise_sets);
        $this->assertArrayHasKey('bench_press', $training->exercise_sets);
    }

    public function test_completion_requires_authentication(): void
    {
        $training = Training::factory()->create();

        $response = $this->post("/trainings/{$training->id}/complete", [
            'overall_rating' => 4,
            'mood' => 'good',
            'energy_level' => 7,
            'difficulty' => 'just_right',
            'difficulty_level' => 6,
        ]);

        $response->assertRedirect(route('login'));
    }

    public function test_completion_validates_required_fields(): void
    {
        $user = User::factory()->create();
        $athlete = Athlete::factory()->create(['user_id' => $user->id]);
        $training = Training::factory()->create(['athlete_id' => $athlete->id]);

        $response = $this->actingAs($user)
            ->post("/trainings/{$training->id}/complete", []);

        $response->assertSessionHasErrors([
            'overall_rating',
            'mood',
            'energy_level',
            'difficulty',
            'difficulty_level'
        ]);
    }

    public function test_completion_validates_rating_range(): void
    {
        $user = User::factory()->create();
        $athlete = Athlete::factory()->create(['user_id' => $user->id]);
        $training = Training::factory()->create(['athlete_id' => $athlete->id]);

        $response = $this->actingAs($user)
            ->post("/trainings/{$training->id}/complete", [
                'overall_rating' => 6, // Invalid: should be 1-5
                'mood' => 'good',
                'energy_level' => 7,
                'difficulty' => 'just_right',
                'difficulty_level' => 6,
            ]);

        $response->assertSessionHasErrors(['overall_rating']);
    }

    public function test_completion_validates_mood_options(): void
    {
        $user = User::factory()->create();
        $athlete = Athlete::factory()->create(['user_id' => $user->id]);
        $training = Training::factory()->create(['athlete_id' => $athlete->id]);

        $response = $this->actingAs($user)
            ->post("/trainings/{$training->id}/complete", [
                'overall_rating' => 4,
                'mood' => 'invalid_mood', // Invalid mood option
                'energy_level' => 7,
                'difficulty' => 'just_right',
                'difficulty_level' => 6,
            ]);

        $response->assertSessionHasErrors(['mood']);
    }
}
