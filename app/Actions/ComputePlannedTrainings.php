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

        // Single date logic
        $dayOfWeek = strtolower($date->format('l')); // 'monday', 'tuesday', etc.
        $dateKey = $date->format('Y-m-d');

        // Check if this is a training day
        if (!in_array($dayOfWeek, $athlete->training_days)) {
            return $plannedTrainings;
        }

        // Check if training should occur on this date based on offset
        $startDate = $athlete->plan_start_date ? \Carbon\Carbon::instance($athlete->plan_start_date) : Carbon::now();
        if (!$this->calculateTrainingOffset->shouldTrainOnDate($athlete->training_frequency, $date, $startDate)) {
            return $plannedTrainings;
        }

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

        return $plannedTrainings;
    }
}
