<?php

namespace Database\Seeders;

use App\Enums\Exercise;
use App\Enums\UserRole;
use App\Models\Athlete;
use App\Models\PerformanceIndicator;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $athleteUser = User::factory()->create([
            'email' => 'athlete@example.com',
            'roles' => [UserRole::Athlete]
        ]);

        $this->call([
            GymSeeder::class,
            // TrainingPlanSeeder::class - Removed: phases are now generated at runtime
        ]);

        // Create athlete directly for seeding
        $athlete = Athlete::create([
            'user_id' => $athleteUser->id,
            'current_plan' => 'hypertrophy',
            'training_days' => ["monday", "thursday", "saturday"],
            'experience_level' => 'beginner',
            'primary_goal' => 'strength',
            'bio' => 'I am a beginner athlete',
            'preferred_time' => 'evening',
            'session_duration' => 60,
            'notification_preferences' => [],
            'difficulty_preference' => 'moderate',
            'plan_start_date' => now(),
        ]);

        // Create initial 1RM Performance Indicators
        $performanceIndicators = [
            ['exercise' => Exercise::BenchPress, 'value' => 130],
            ['exercise' => Exercise::BarbellBackSquat, 'value' => 150],
            ['exercise' => Exercise::Deadlift, 'value' => 210],
        ];

        foreach ($performanceIndicators as $indicator) {
            // Always use canonical exercise for consistency
            $canonicalExercise = $indicator['exercise']->synonym();
            
            PerformanceIndicator::create([
                'athlete_id' => $athlete->id,
                'exercise' => $canonicalExercise,
                'label' => '1RM',
                'value' => $indicator['value'],
                'unit' => 'kg',
                'type' => 'strength',
            ]);
        }
    }
}
