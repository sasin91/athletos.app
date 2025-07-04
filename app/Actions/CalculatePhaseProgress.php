<?php

namespace App\Actions;

use App\Models\Athlete;
use App\Traits\HasTrainingPhaseProgress;

class CalculatePhaseProgress
{
    use HasTrainingPhaseProgress;

    public function execute(Athlete $athlete): float
    {
        return $this->getPhaseProgress($athlete);
    }
} 