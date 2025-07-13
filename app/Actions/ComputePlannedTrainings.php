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

        // Check if athlete should train on this date based on training offset
        $startDate = $athlete->plan_start_date ? Carbon::instance($athlete->plan_start_date) : Carbon::now();
        if (!$this->calculateTrainingOffset->shouldTrainOnDate($athlete->training_frequency, $date, $startDate)) {
            return $plannedTrainings; // No training planned for this date
        }

        // Check if this date is a training day for the athlete
        $dayOfWeek = strtolower($date->format('l'));
        if (!in_array($dayOfWeek, $athlete->training_days)) {
            return $plannedTrainings; // Not a training day
        }

        // Check if a training already exists for this date
        $existingTraining = Training::where('athlete_id', $athlete->id)
            ->whereDate('scheduled_at', $date)
            ->first();

        if ($existingTraining) {
            $dateKey = $existingTraining->scheduled_at->format('Y-m-d');
            $plannedTrainings[$dateKey] = $existingTraining;
            return $plannedTrainings;
        }

        // Create a virtual planned training for this date
        $trainingPhase = $this->determineTrainingPhase->execute($athlete, $date);
        if (!$trainingPhase) {
            return $plannedTrainings; // No training phase for this date
        }

        // Create a virtual training object for planning purposes
        $virtualTraining = new Training([
            'athlete_id' => $athlete->id,
            'training_plan_id' => $athlete->current_plan_id,
            'training_phase_id' => $trainingPhase->id,
            'scheduled_at' => $date->setTime(9, 0), // Default to 9 AM
            'postponed' => false,
            'reschedule_reason' => null,
        ]);

        $dateKey = $date->format('Y-m-d');
        $plannedTrainings[$dateKey] = $virtualTraining;

        return $plannedTrainings;
    }
}
