<?php

namespace App\Actions;

use App\Models\Athlete;
use App\Models\Training;
use App\Models\TrainingPhase;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class ComputePlannedTrainings
{
    public function __construct(
        private DetermineTrainingPhase $determineTrainingPhase,
    ) {}

    public function execute(Athlete $athlete, Carbon $date): Collection
    {
        $plannedTrainings = new Collection();

        // Single date logic
        $dayOfWeek = strtolower($date->format('l')); // 'monday', 'tuesday', etc.
        $dateKey = $date->format('Y-m-d');

        if (in_array($dayOfWeek, $athlete->training_days)) {
            $scheduledTraining = new Training();
            $scheduledTraining->forceFill([
                'scheduled_at' => $date,
                'completed_at' => null,
            ]);

            $scheduledTraining->setRelation('trainingPlan', $athlete->trainingPlan);

            $trainingPhase = $this->determineTrainingPhase->execute(
                $athlete,
                $date,
            );

            $scheduledTraining->setRelation('trainingPhase', $trainingPhase);
            $plannedTrainings[$dateKey] = $scheduledTraining;
        }

        return $plannedTrainings;
    }
}
