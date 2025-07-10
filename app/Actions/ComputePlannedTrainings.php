<?php

namespace App\Actions;

use App\Models\Athlete;
use App\Models\Training;
use App\Models\TrainingPhase;
use App\Actions\CalculateTrainingOffset;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class ComputePlannedTrainings
{
    public function __construct(
        private DetermineTrainingPhase $determineTrainingPhase,
        private CalculateTrainingOffset $calculateTrainingOffset,
    ) {}

    public function execute(Athlete $athlete, Carbon $date): Collection
    {
        $plannedTrainings = new Collection();

        // Find the next uncompleted training for the athlete
        $nextUncompleted = $athlete->trainings()->orderBy('scheduled_at')->get()->first(function ($training) {
            return $training->completed_at === null;
        });

        if ($nextUncompleted) {
            $dateKey = $nextUncompleted->scheduled_at->format('Y-m-d');
            $plannedTrainings[$dateKey] = $nextUncompleted;
            return $plannedTrainings;
        }

        // If all trainings are completed, return the most recent one
        $lastCompleted = $athlete->trainings()->orderBy('scheduled_at')->get()->whereNotNull('completed_at')->last();
        if ($lastCompleted) {
            $dateKey = $lastCompleted->scheduled_at->format('Y-m-d');
            $plannedTrainings[$dateKey] = $lastCompleted;
            return $plannedTrainings;
        }

        // Fallback: empty collection
        return $plannedTrainings;
    }
}
