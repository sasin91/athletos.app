<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Athlete;
use App\Models\TrainingPlan;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrainingTest extends TestCase
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
    public function training_plan_show_returns_inertia_response()
    {
        $response = $this->actingAs($this->user)
            ->get("/training-plans/{$this->trainingPlan->id}");

        $response->assertOk();
    }

    /** @test */
    public function exercise_show_returns_inertia_response()
    {
        $response = $this->actingAs($this->user)
            ->get('/exercises/bench-press');

        $response->assertOk();
    }



    /** @test */
    public function trainings_index_returns_inertia_response()
    {
        $response = $this->actingAs($this->user)
            ->get('/trainings');

        $response->assertOk();
    }
}