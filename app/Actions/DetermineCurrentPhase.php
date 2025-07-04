<?php

namespace App\Actions;

use App\Models\Athlete;
use App\Traits\HasTrainingPhaseProgress;

class DetermineCurrentPhase
{
    use HasTrainingPhaseProgress;

    public function execute(Athlete $athlete)
    {
        return $this->getCurrentPhase($athlete);
    }
} 