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
    public function execute(Athlete $athlete, int $weeks = 12, ?array $exercises = null): WeightProgressions
    {
        $progressions = [];
        
        // Use provided exercises or fallback to main lifts
        $exercisesToCalculate = $exercises ?? Exercise::mainLifts();
        
        foreach ($exercisesToCalculate as $exerciseEnum) {
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
                'expected_weight' => round($expectedWeight, 1), // Round to 1 decimal place instead of whole numbers
                'current_weight' => round($currentOneRM),
            ];
        }
        
        // Calculate current expected weight (for current week/training day)
        $currentExpectedWeight = $this->calculateExpectedWeight($currentOneRM, $progressionSettings, 1);
        
        return new WeightProgression(
            exercise: $exerciseEnum,
            dataPoints: $dataPoints,
            currentWeight: $currentOneRM,
            expectedWeight: round($currentExpectedWeight, 1),
            startingWeight: $currentOneRM,
        );
    }

    /**
     * Get the current 1RM for an exercise
     */
    private function getCurrentOneRM(Athlete $athlete, Exercise $exerciseEnum): float
    {
        // Always use canonical exercise for consistency
        $canonicalExercise = $exerciseEnum->synonym();
        
        // Try to get 1RM from performance indicators (check both current and canonical)
        // Look for both '1RM' and exercise-specific labels like 'Barbell Back Squat 1RM'
        $indicator = PerformanceIndicator::where('athlete_id', $athlete->id)
            ->whereIn('exercise', [$exerciseEnum, $canonicalExercise])
            ->where('type', 'strength')
            ->where(function($query) use ($exerciseEnum) {
                $query->where('label', '1RM')
                      ->orWhere('label', 'like', '%1RM%');
            })
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

    /**
     * Suggest progressive weights for an exercise across multiple sets
     */
    public function suggestWeight(\App\Models\Athlete $athlete, \App\Enums\Exercise $exerciseEnum, array $previousWeights = []): float
    {
        // This method now returns the top set weight - use suggestProgressiveWeights for full progression
        return $this->suggestProgressiveWeights($athlete, $exerciseEnum, 1, $previousWeights)[0] ?? 0.0;
    }

    /**
     * Suggest progressive weights for multiple sets of an exercise
     * 
     * @param \App\Models\Athlete $athlete
     * @param \App\Enums\Exercise $exerciseEnum  
     * @param int $numberOfSets
     * @param array $previousWeights
     * @param \App\Settings\TrainingPhaseSettings|null $phaseSettings
     * @return array Array of weights for each set
     */
    public function suggestProgressiveWeights(\App\Models\Athlete $athlete, \App\Enums\Exercise $exerciseEnum, int $numberOfSets = 3, array $previousWeights = [], ?\App\Settings\TrainingPhaseSettings $phaseSettings = null): array
    {
        // 1. Try to get 1RM (with synonym fallback)
        $performanceIndicators = $athlete->performanceIndicators->where('type', 'strength')->keyBy(fn($pi) => $pi->exercise->value);
        $oneRM = $performanceIndicators[$exerciseEnum->value]->value ?? null;
        $source = "direct";
        if (!$oneRM) {
            $synonymEnum = $exerciseEnum->synonym();
            if ($synonymEnum !== $exerciseEnum && isset($performanceIndicators[$synonymEnum->value])) {
                $oneRM = $performanceIndicators[$synonymEnum->value]->value;
                $source = "synonym ({$synonymEnum->value})";
            }
        }
        
        // SAFETY CAP: Never suggest working weights based on unrealistic 1RMs
        if ($oneRM && $oneRM > 200) {
            \Log::error("Extremely high 1RM found for {$exerciseEnum->value}: {$oneRM}kg from {$source}. Capping at 120kg for safety.");
            $oneRM = 120; // Cap at reasonable 1RM
        } elseif ($oneRM) {
            \Log::info("Using 1RM for {$exerciseEnum->value}: {$oneRM}kg from {$source}");
        }

        // 2. If we have 1RM, calculate progressive weights based on training percentage (not 1RM itself!)
        if ($oneRM && $oneRM > 0) {
            // Use 70% of 1RM for main strength lifts, 65% for other strength, 55% for others
            if ($exerciseEnum->category()->value === 'strength') {
                // Main barbell lifts get 70%, others 65%
                $mainLifts = [
                    Exercise::BarbellBackSquat,
                    Exercise::FlatBarbellBenchPress,
                    Exercise::BenchPress,
                    Exercise::Deadlift,
                    Exercise::RomanianDeadlift,
                ];
                $workingPercent = in_array($exerciseEnum, $mainLifts, true) ? 0.70 : 0.65;
                $workingWeight = (float) $oneRM * $workingPercent;
            } else {
                $workingPercent = 0.55;
                $workingWeight = (float) $oneRM * $workingPercent;
            }
            // Enhanced debug logging
            \Log::warning("Weight calculation for {$exerciseEnum->value}: FOUND 1RM={$oneRM}kg, Using working weight={$workingWeight}kg (" . ($workingPercent * 100) . "% of 1RM). If 1RM seems too high, check performance indicators table.");
            return $this->calculateProgressiveWeights($workingWeight, $numberOfSets, $exerciseEnum);
        }

        // 3. Fallback: use last logged weights with progression
        if (!empty($previousWeights)) {
            $lastWeight = (float) $previousWeights[0];
            if ($lastWeight > 0) {
                return $this->calculateProgressiveWeights($lastWeight + 2.5, $numberOfSets, $exerciseEnum);
            }
        }

        // 4. Default starting weights with progression
        // Set more realistic minimums for accessories
        if ($exerciseEnum === Exercise::CableChestFly) {
            $baseWeight = 20.0;
        } elseif (str_contains(strtolower($exerciseEnum->value), 'dumbbell')) {
            $baseWeight = 7.5;
        } elseif ($exerciseEnum->category()->value === 'strength') {
            $baseWeight = 20.0;
        } else {
            $baseWeight = 12.5;
        }
        return $this->calculateProgressiveWeights($baseWeight, $numberOfSets, $exerciseEnum);
    }

    /**
     * Calculate progressive weights across sets using typical ramping pattern
     * 
     * SAFETY NOTE: This method expects a WORKING WEIGHT (typically 50-60% of 1RM), 
     * NOT the actual 1RM! Never pass 1RM directly to this method.
     * 
     * @param float $topSetWeight The target working weight for the heaviest set (should be 50-60% of 1RM)
     * @param int $numberOfSets Total number of sets
     * @param \App\Enums\Exercise $exerciseEnum The exercise to get ramping pattern for
     * @return array Progressive weights for each set
     */
    private function calculateProgressiveWeights(float $topSetWeight, int $numberOfSets, \App\Enums\Exercise $exerciseEnum): array
    {
        // Get minimum weight for this exercise (barbell weight for most strength exercises)
        $minimumWeight = $this->getMinimumWeight($exerciseEnum);
        
        // SAFETY CHECK: Warn if weight seems dangerously high (likely a 1RM was passed instead of working weight)
        if ($topSetWeight > 80 && $exerciseEnum->isOneRepMaxExercise()) {
            \Log::warning("High weight suggested: {$topSetWeight}kg for {$exerciseEnum->value}. Verify this is working weight (50% of 1RM), not 1RM itself.");
        }
        
        // Ensure top set weight meets minimum
        $topSetWeight = max($topSetWeight, $minimumWeight);
        
        if ($numberOfSets <= 1) {
            return [round($topSetWeight)];
        }

        // Get ramping percentages directly from the exercise enum
        $rampingPercentages = $exerciseEnum->rampingPercentages($numberOfSets);

        // Calculate weights using the ramping percentages
        $weights = [];
        foreach ($rampingPercentages as $percentage) {
            $suggestedWeight = $topSetWeight * $percentage;
            // Ensure each weight meets minimum and round to whole number
            $weights[] = round(max($suggestedWeight, $minimumWeight));
        }

        return $weights;
    }

    /**
     * Get minimum weight for an exercise (e.g., barbell weight)
     * 
     * @param \App\Enums\Exercise $exerciseEnum
     * @return float
     */
    private function getMinimumWeight(\App\Enums\Exercise $exerciseEnum): float
    {
        return match($exerciseEnum) {
            // Barbell exercises typically use a 20kg barbell
            \App\Enums\Exercise::BarbellBackSquat,
            \App\Enums\Exercise::FlatBarbellBenchPress,
            \App\Enums\Exercise::BenchPress,
            \App\Enums\Exercise::Deadlift,
            \App\Enums\Exercise::RomanianDeadlift => 20.0,
            
            // Dumbbell and other exercises can start lower
            default => 12.5
        };
    }

} 