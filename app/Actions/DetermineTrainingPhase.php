<?php

namespace App\Actions;

use App\Data\TrainingPhase;
use App\Models\Athlete;
use Carbon\Carbon;

class DetermineTrainingPhase
{
    public function execute(Athlete $athlete, Carbon $date): ?TrainingPhase
    {
        $plan = $athlete->plan();
        if (!$plan) {
            return null;
        }

        $phases = $plan->getPhases();
        
        // Return first phase if no plan start date is set
        if (!$athlete->plan_start_date) {
            return $phases[0] ?? null;
        }
        
        $elapsedDays = $athlete->plan_start_date->diffInDays($date);
        $cumulativeDays = 0;
        
        foreach ($phases as $phase) {
            $cumulativeDays += ($phase->durationWeeks * 7);
            if ($elapsedDays < $cumulativeDays) {
                return $phase;
            }
        }

        // If we've gone past all phases, return the last phase
        return end($phases) ?: null;
    }
}