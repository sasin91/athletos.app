<?php

namespace Tests\Feature;

use App\Enums\Exercise;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Athlete;

class ExerciseViewTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that all exercises can be accessed via the React/Inertia exercise route.
     */
    public function test_all_exercises_have_react_pages(): void
    {
        $user = User::factory()->athlete()->create();

        $exercises = Exercise::cases();
        
        $this->assertGreaterThan(0, count($exercises), 'No exercises found in enum');
        
        foreach ($exercises as $exercise) {
            $response = $this->actingAs($user)->get("/exercises/{$exercise->value}");
            
            $response->assertOk();
        }
    }

    /**
     * Test that exercise pages can be accessed via React/Inertia routes.
     */
    public function test_exercise_pages_are_accessible(): void
    {
        $user = User::factory()->athlete()->create();

        $exercise = Exercise::Deadlift;
        $this->assertNotNull($exercise, 'Deadlift exercise not found');
        
        $response = $this->actingAs($user)->get("/exercises/{$exercise->value}");
        
        $response->assertOk();
    }

    /**
     * Test that all exercise pages return 200 and render correctly.
     */
    public function test_all_exercise_pages_return_200(): void
    {
        $user = User::factory()->athlete()->create();
        
        $exercises = Exercise::cases();
        
        foreach ($exercises as $exercise) {
            $response = $this->actingAs($user)->get("/exercises/{$exercise->value}");
            $response->assertOk();
        }
    }
} 