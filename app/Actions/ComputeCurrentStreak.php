<?php

namespace App\Actions;

use App\Models\Athlete;
use Carbon\Carbon;
use App\Models\Training;

class ComputeCurrentStreak
{
    public function execute(Athlete $athlete, Carbon $date): int
    {
        $completedTrainings = $athlete->trainings->whereNotNull('completed_at');
        $streak = 0;
        
        // Use the preloaded data to calculate streak
        while (true) {
            $hasTrainingOnDate = $completedTrainings->contains(function (Training $training) use ($date) {
                return $training->scheduled_at->isSameDay($date);
            });

            if ($hasTrainingOnDate) {
                $streak++;
                $date->subDay();
            } else {
                break;
            }
        }

        return $streak;
    }
}