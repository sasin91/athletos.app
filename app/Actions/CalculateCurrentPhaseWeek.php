<?php

namespace App\Actions;

use App\Models\Athlete;
use App\Traits\HasTrainingPhaseProgress;

class CalculateCurrentPhaseWeek
{
    use HasTrainingPhaseProgress;

    public function execute(Athlete $athlete): int
    {
        return $this->getCompletedTrainingWeeks($athlete);
    }
} 