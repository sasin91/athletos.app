<?php

namespace App\Actions;

use App\Data\OneRepMax;
use App\Data\OneRepMaxes;
use App\Data\WeightProgression;
use App\Data\WeightProgressions;
use App\Enums\ExperienceLevel;
use App\Enums\Exercise;
use App\Models\Athlete;

use App\Models\PerformanceIndicator;
use App\Models\Training;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class CalculateWeightProgression
{
    /**
     * Calculate weight progression for an athlete
     */
    public function execute(Athlete $athlete, int $weeks = 12): WeightProgressions
    {
        $progressions = [];
        
        // Get the main compound lifts using the enum
        $mainLifts = Exercise::mainLifts();
        
        foreach ($mainLifts as $exerciseEnum) {
            $progression = $this->calculateWeightProgression($athlete, $exerciseEnum, $weeks);
            if ($progression) {
                $progressions[] = $progression;
            }
        }
        
        return new WeightProgressions($progressions);
    }

    /**
     * Calculate progression for a specific exercise
     */
    private function calculateWeightProgression(Athlete $athlete, Exercise $exerciseEnum, int $weeks): ?WeightProgression
    {
        // Get current 1RM from performance indicators
        $currentOneRM = $this->getCurrentOneRM($athlete, $exerciseEnum);
        
        if ($currentOneRM <= 0.0) {
            return null;
        }

        // Get progression settings
        $progressionSettings = $this->getProgressionSettings($athlete, $exerciseEnum);
        
        // Calculate progression data points
        $dataPoints = [];
        
        for ($week = 1; $week <= $weeks; $week++) {
            $expectedWeight = $this->calculateExpectedWeight($currentOneRM, $progressionSettings, $week);
            
            $dataPoints[] = [
                'week' => $week,
                'expected_weight' => round($expectedWeight, 1),
                'current_weight' => round($currentOneRM, 1),
            ];
        }
        
        return new WeightProgression(
            exercise: $exerciseEnum,
            dataPoints: $dataPoints,
        );
    }

    /**
     * Get the current 1RM for an exercise
     */
    private function getCurrentOneRM(Athlete $athlete, Exercise $exerciseEnum): float
    {
        // Try to get from performance indicators first
        $indicator = PerformanceIndicator::where('athlete_id', $athlete->id)
            ->where('exercise', $exerciseEnum)
            ->where('type', 'strength')
            ->latest()
            ->first();

        if ($indicator) {
            return (float) $indicator->value;
        }

        return 0;
    }

    /**
     * Get progression settings for an exercise
     */
    private function getProgressionSettings(Athlete $athlete, Exercise $exerciseEnum): array
    {
        // Get progression settings from the exercise enum
        $progressionSettings = $exerciseEnum->progressionSettings();
        
        // Advanced athletes use percentage progression for main lifts
        if ($athlete->experience_level === \App\Enums\ExperienceLevel::Advanced && $exerciseEnum->isOneRepMaxExercise()) {
            return [
                'type' => \App\Enums\ProgressionType::Percentage,
                'rate' => 2.5, // 2.5% per week for advanced athletes
            ];
        }
        
        // Apply experience level adjustments for static progression
        $experienceMultiplier = match($athlete->experience_level) {
            \App\Enums\ExperienceLevel::Beginner => 1.0,
            \App\Enums\ExperienceLevel::Intermediate => 0.7,
            \App\Enums\ExperienceLevel::Advanced => 0.5,
        };
        
        return [
            'type' => $progressionSettings['type'],
            'rate' => $progressionSettings['rate'] * $progressionSettings['difficulty_multiplier'] * $experienceMultiplier,
        ];
    }

    /**
     * Calculate expected weight based on progression settings
     */
    private function calculateExpectedWeight(float $currentWeight, array $progression, int $week): float
    {
        $rate = $progression['rate'];
        
        return match($progression['type']) {
            \App\Enums\ProgressionType::Static => $currentWeight + ($rate * $week),
            \App\Enums\ProgressionType::Percentage => $currentWeight * pow(1 + ($rate / 100), $week),
            default => $currentWeight + ($rate * $week),
        };
    }
} 