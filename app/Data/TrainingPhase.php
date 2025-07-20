<?php

namespace App\Data;

use App\Enums\ProgressionType;
use App\Settings\TrainingPhaseSettings;

class TrainingPhase
{
    public function __construct(
        public string $name,
        public string $description,
        public int $durationWeeks,
        public int $order,
        public ProgressionType $progressionType,
        public float $progressionRate,
        public TrainingPhaseSettings $settings,
    ) {}

    /**
     * Get progression settings for a specific exercise
     */
    public function getExerciseProgressionSettings(\App\Enums\Exercise $exercise): array
    {
        // Get progression settings from the exercise enum
        $progressionSettings = $exercise->progressionSettings();
        
        // Override with phase-specific settings if available
        return [
            'type' => $this->progressionType,
            'rate' => $this->progressionRate,
            'difficulty_multiplier' => $progressionSettings['difficulty_multiplier'],
        ];
    }
}