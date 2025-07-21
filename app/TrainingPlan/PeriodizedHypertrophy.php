<?php

namespace App\TrainingPlan;

class PeriodizedHypertrophy
{
    /**
     * Get the phases for this training plan
     */
    public function getPhases(): array
    {
        return [
            [
                'name' => 'Foundation',
                'duration_weeks' => 4,
                'description' => 'Build movement patterns and base conditioning',
            ],
            [
                'name' => 'Hypertrophy',
                'duration_weeks' => 6,
                'description' => 'Focus on muscle growth with moderate to high volume',
            ],
            [
                'name' => 'Strength',
                'duration_weeks' => 4,
                'description' => 'Transition to heavier loads and lower rep ranges',
            ],
            [
                'name' => 'Peak',
                'duration_weeks' => 2,
                'description' => 'Maximize strength gains and prepare for next cycle',
            ],
        ];
    }

    /**
     * Get the description of this training plan
     */
    public function getDescription(): string
    {
        return 'A progressive muscle-building program focused on hypertrophy through periodized volume and intensity.';
    }
}