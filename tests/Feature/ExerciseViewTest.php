<?php

namespace Tests\Feature;

use App\Enums\Exercise;
use App\Enums\TrainingPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Illuminate\Support\Facades\View;
use App\Models\Athlete;

class ExerciseViewTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that all exercises have corresponding Blade view files.
     */
    public function test_all_exercises_have_blade_views(): void
    {
        $exercises = Exercise::cases();
        
        $this->assertGreaterThan(0, count($exercises), 'No exercises found in enum');
        
        foreach ($exercises as $exercise) {
            $viewPath = "exercises.{$exercise->value}";
            
            $this->assertTrue(
                View::exists($viewPath),
                "Exercise '{$exercise->value}' is missing its Blade view at resources/views/exercises/{$exercise->value}.blade.php"
            );
        }
    }

    /**
     * Test that exercise pages can be accessed via Folio routes.
     */
    public function test_exercise_pages_are_accessible(): void
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

        $exercise = Exercise::Deadlift;
        $this->assertNotNull($exercise, 'Deadlift exercise not found');
        
        $response = $this->actingAs($user)->get("/exercises/{$exercise->value}");
        
        $response->assertStatus(200);
        $response->assertSee('Deadlift');
    }

    /**
     * Test that all exercise pages can be accessed.
     */
    public function test_all_exercise_pages_return_200(): void
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

        $exercises = Exercise::cases();
        
        foreach ($exercises as $exercise) {
            $response = $this->actingAs($user)->get("/exercises/{$exercise->value}");
            $response->assertStatus(200);
        }
    }
} 