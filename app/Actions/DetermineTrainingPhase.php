<?php

namespace App\Actions;

use App\Models\Athlete;
use App\Models\TrainingPhase;
use Carbon\Carbon;

class DetermineTrainingPhase
{
    public function execute(Athlete $athlete, Carbon $date): ?TrainingPhase
    {
        // Return first phase if no plan start date is set
        if (!$athlete->plan_start_date) {
            return $athlete->currentPlan?->phases->first();
        }
        
        $elapsedDays = $athlete->plan_start_date->diffInDays($date);
        $cumulativeDays = 0;
        $trainingPhase = $athlete->currentPlan->phases->first(function (TrainingPhase $phase) use (&$cumulativeDays, $elapsedDays) {
            $cumulativeDays += ($phase->duration_weeks * 7);

            return $elapsedDays < $cumulativeDays;
        });

        return $trainingPhase;
    }
}