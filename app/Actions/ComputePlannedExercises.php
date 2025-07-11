<?php

namespace App\Actions;

use App\Data\PlannedExercise;
use App\Enums\Exercise;
use App\Models\Training;
use App\Settings\ExerciseConfig;
use Illuminate\Support\Collection;
use ValueError;
use TypeError;

class ComputePlannedExercises
{
    /**
     * Compute planned exercises for a training phase
     * 
     * @param Training $training
     * @param null|int $day null means all days
     * @return Collection<string|int, PlannedExercise>
     * @throws ValueError 
     * @throws TypeError 
     */
    public function execute(Training $training, ?int $day = null)
    {
        /** @var array<int, ExerciseConfig> $exercises */
        $exercises = $training->trainingPhase->settings->exercises;

        if (empty($exercises)) {
            return collect();
        }

        $plannedExercises = [];
        $order = 1;

        $maxDay = max(array_column($exercises, 'day'));

        if ($day !== null && $day > $maxDay) {
            return app(SuggestRecoveryExercises::class)->execute($training);
        }

        foreach ($exercises as $exerciseConfig) {
            if ($day !== null && $exerciseConfig->day !== $day) {
                continue;
            }

            $exercise = Exercise::from($exerciseConfig->exercise);

            $plannedExercises[] = new PlannedExercise(
                exercise: $exercise,
                exerciseSlug: $exerciseConfig->exercise,
                priority: $order++,
                sets: $exerciseConfig->sets,
                reps: $exerciseConfig->reps,
                weight: $exerciseConfig->weight,
                restSeconds: $exerciseConfig->rest_seconds,
                displayName: $exercise->displayName(),
                category: $exercise->category()->value,
                difficulty: $exercise->difficulty()->value,
                tags: $exercise->tags(),
                notes: $exerciseConfig->notes,
                cues: $exerciseConfig->cues,
            );
        }

        return collect($plannedExercises);
    }
}