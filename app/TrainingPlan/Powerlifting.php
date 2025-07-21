<?php

namespace App\TrainingPlan;

class Powerlifting
{
    /**
     * Get the phases for this training plan
     */
    public function getPhases(): array
    {
        return [
            [
                'name' => 'Prep',
                'duration_weeks' => 4,
                'description' => 'Build technique and work capacity for the big three',
            ],
            [
                'name' => 'Build',
                'duration_weeks' => 8,
                'description' => 'Progressive overload on squat, bench press, and deadlift',
            ],
            [
                'name' => 'Peak',
                'duration_weeks' => 3,
                'description' => 'Maximize strength and prepare for testing',
            ],
            [
                'name' => 'Test',
                'duration_weeks' => 1,
                'description' => 'Test new 1RM or compete',
            ],
        ];
    }

    /**
     * Get the description of this training plan
     */
    public function getDescription(): string
    {
        return 'A strength-focused program targeting the three powerlifting movements: squat, bench press, and deadlift.';
    }
}