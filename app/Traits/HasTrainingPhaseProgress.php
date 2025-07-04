<?php

namespace App\Traits;

use Carbon\Carbon;
use App\Models\Athlete;

trait HasTrainingPhaseProgress
{
    /**
     * Returns the number of completed training weeks (advances only when all training days are completed).
     */
    public function getCompletedTrainingWeeks(Athlete $athlete): int
    {
        $trainingDaysPerWeek = count($athlete->training_days ?? []);
        if ($trainingDaysPerWeek === 0) {
            return 0;
        }

        $completedTrainings = $athlete->trainings()
            ->whereNotNull('completed_at')
            ->orderBy('completed_at')
            ->get();

        return (int) floor($completedTrainings->count() / $trainingDaysPerWeek);
    }

    /**
     * Returns the current phase for the athlete based on completed training weeks.
     */
    public function getCurrentPhase(Athlete $athlete)
    {
        if ($athlete->trainingPlan === null) {
            return null;
        }

        $phases = $athlete->trainingPlan->phases;
        if (empty($phases)) {
            return null;
        }

        $currentWeek = $this->getCompletedTrainingWeeks($athlete);
        $weekCount = 0;

        foreach ($phases as $phase) {
            $phaseWeeks = $phase['weeks'] ?? $phase['duration_weeks'] ?? 0;
            if ($currentWeek < $weekCount + $phaseWeeks) {
                return $phase;
            }
            $weekCount += $phaseWeeks;
        }

        return $phases[count($phases) - 1] ?? null;
    }

    /**
     * Returns the progress (0-100) through the current phase based on completed trainings.
     */
    public function getPhaseProgress(Athlete $athlete): float
    {
        $currentPhase = $this->getCurrentPhase($athlete);
        if (!$currentPhase) {
            return 0;
        }
        $trainingDaysPerWeek = count($athlete->training_days ?? []);
        $totalPlannedTrainings = ($currentPhase['weeks'] ?? $currentPhase['duration_weeks'] ?? 0) * $trainingDaysPerWeek;
        if ($totalPlannedTrainings === 0) {
            return 0;
        }
        $completedTrainings = $athlete->trainings()
            ->whereNotNull('completed_at')
            ->orderBy('completed_at')
            ->get();
        // Count how many completed trainings are in the current phase
        $currentWeek = $this->getCompletedTrainingWeeks($athlete);
        $phases = $athlete->trainingPlan->phases;
        $weekCount = 0;
        $phaseStartWeek = 0;
        foreach ($phases as $phase) {
            $phaseWeeks = $phase['weeks'] ?? $phase['duration_weeks'] ?? 0;
            if ($currentPhase['id'] === $phase['id']) {
                $phaseStartWeek = $weekCount;
                break;
            }
            $weekCount += $phaseWeeks;
        }
        $completedThisPhase = $completedTrainings->slice($phaseStartWeek * $trainingDaysPerWeek, $totalPlannedTrainings)->count();
        return ($completedThisPhase / $totalPlannedTrainings) * 100;
    }
} 