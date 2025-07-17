<?php

namespace App\Actions;

use App\Data\PlannedExercise;
use App\Enums\Exercise;
use App\Models\Exercise as ExerciseModel;
use App\Models\Training;
use Illuminate\Support\Collection;
use WeakMap;

class SuggestRecoveryExercises
{
    /**
     * Suggest recovery exercises based on completed training
     */
    public function execute(Training $training): Collection
    {
        /** @var Collection<int, Exercise> $completedExercises */
        $completedExercises = $training->exercises()
            ->completed()
            ->pluck('exercise_enum')
            ->unique();

        if ($completedExercises->isEmpty()) {
            return new Collection();
        }

        $recoveryExercises = Exercise::recovery();

        $suggestedExercises = [];
        // Assume $completedExercises contains only unique exercises
        foreach ($completedExercises as $completedExercise) {
            $candidates = [];
            foreach ($recoveryExercises as $recoveryExercise) {
                $completedTags = $completedExercise->tags();
                $recoveryTags = $recoveryExercise->tags();
                $overlap = array_intersect($completedTags, $recoveryTags);
                $numOverlap = count($overlap);
                if ($numOverlap > 0) {
                    $candidates[] = [
                        'exercise' => $recoveryExercise,
                        'numOverlap' => $numOverlap,
                    ];
                }
            }
            // Find top 3 candidates by numOverlap using a linear scan
            $topCandidates = [];
            foreach ($candidates as $candidate) {
                if (count($topCandidates) < 3) {
                    $topCandidates[] = $candidate;
                    usort($topCandidates, function ($a, $b) {
                        return $a['numOverlap'] <=> $b['numOverlap'];
                    });
                } else if ($candidate['numOverlap'] > $topCandidates[0]['numOverlap']) {
                    $topCandidates[0] = $candidate;
                    usort($topCandidates, function ($a, $b) {
                        return $a['numOverlap'] <=> $b['numOverlap'];
                    });
                }
            }
            // Reverse to get descending order
            $topCandidates = array_reverse($topCandidates);
            foreach ($topCandidates as $candidate) {
                $recoveryExercise = $candidate['exercise'];
                $numOverlap = $candidate['numOverlap'];
                $suggestedExercises[$completedExercise->value][] = new PlannedExercise(
                    exercise: $recoveryExercise,
                    exerciseSlug: $recoveryExercise->value,
                    priority: $numOverlap,
                    sets: 1,
                    reps: 1,
                    weight: 0, // 0 indicates bodyweight
                    restSeconds: 120,
                    displayName: $recoveryExercise->displayName(),
                    category: $recoveryExercise->category()->value,
                    difficulty: $recoveryExercise->difficulty()->value,
                    tags: $recoveryExercise->tags(),
                );
            }
        }

        return collect($suggestedExercises);
    }
}
