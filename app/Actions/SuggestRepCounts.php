<?php

namespace App\Actions;

use App\Enums\Exercise;
use App\Enums\ExerciseCategory;
use App\Enums\ExperienceLevel;
use App\Models\Athlete;

class SuggestRepCounts
{
    /**
     * Suggest rep counts for multiple sets based on exercise type and athlete data
     * 
     * @param Athlete $athlete
     * @param Exercise $exerciseEnum
     * @param int $numberOfSets
     * @return array Array of suggested rep counts for each set
     */
    public function execute(Athlete $athlete, Exercise $exerciseEnum, int $numberOfSets = 3): array
    {
        // Get base rep range for this exercise type
        $baseReps = $this->getBaseRepRange($exerciseEnum);
        
        // Adjust based on athlete experience
        $adjustedReps = $this->adjustRepsForExperience($baseReps, $athlete->experience_level);
        
        // Generate progressive rep counts for sets
        return $this->generateProgressiveReps($adjustedReps, $numberOfSets);
    }

    /**
     * Get base rep range for different exercise types
     * 
     * @param Exercise $exerciseEnum
     * @return array [min_reps, max_reps]
     */
    private function getBaseRepRange(Exercise $exerciseEnum): array
    {
        return match($exerciseEnum->category()) {
            // Strength exercises: Lower reps, higher weight
            ExerciseCategory::Strength => match($exerciseEnum) {
                // Main lifts: 3-6 reps for strength building
                Exercise::BarbellBackSquat,
                Exercise::FlatBarbellBenchPress,
                Exercise::BenchPress,
                Exercise::Deadlift => [3, 6],
                
                // Other strength exercises: 6-8 reps
                default => [6, 8]
            },
            
            // Hypertrophy exercises: Higher reps, moderate weight
            ExerciseCategory::Hypertrophy => [8, 12],
            
            // Endurance exercises: High reps, lower weight
            ExerciseCategory::Endurance => [12, 20],
            
            // Recovery/mobility: Time-based or higher reps
            ExerciseCategory::Recovery,
            ExerciseCategory::Mobility => [10, 15],
            
            // Default to hypertrophy range
            default => [8, 12]
        };
    }

    /**
     * Adjust rep counts based on athlete experience level
     * 
     * @param array $baseRange [min_reps, max_reps]
     * @param ExperienceLevel $experienceLevel
     * @return array [min_reps, max_reps]
     */
    private function adjustRepsForExperience(array $baseRange, ExperienceLevel $experienceLevel): array
    {
        [$minReps, $maxReps] = $baseRange;
        
        return match($experienceLevel) {
            // Beginners: Higher reps for form practice
            ExperienceLevel::Beginner => [
                max(1, $minReps + 2),
                $maxReps + 3
            ],
            
            // Intermediate: Standard ranges
            ExperienceLevel::Intermediate => [$minReps, $maxReps],
            
            // Advanced: Can handle lower reps with higher intensity
            ExperienceLevel::Advanced => [
                max(1, $minReps - 1),
                max(1, $maxReps - 1)
            ],
        };
    }

    /**
     * Generate progressive rep counts across sets
     * 
     * @param array $repRange [min_reps, max_reps]
     * @param int $numberOfSets
     * @return array
     */
    private function generateProgressiveReps(array $repRange, int $numberOfSets): array
    {
        [$minReps, $maxReps] = $repRange;
        
        if ($numberOfSets <= 1) {
            return [rand($minReps, $maxReps)];
        }
        
        $reps = [];
        $midReps = intval(($minReps + $maxReps) / 2);
        
        // Generate progressive reps: start higher, decrease slightly for later sets
        for ($i = 0; $i < $numberOfSets; $i++) {
            if ($i === 0) {
                // First set: higher reps (warm-up)
                $reps[] = min($maxReps, $midReps + 2);
            } elseif ($i === $numberOfSets - 1) {
                // Last set: target reps
                $reps[] = $midReps;
            } else {
                // Middle sets: slightly decreasing
                $adjustment = intval(($numberOfSets - $i - 1) / 2);
                $reps[] = max($minReps, $midReps + $adjustment);
            }
        }
        
        return $reps;
    }
}