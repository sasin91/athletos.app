<?php

declare(strict_types=1);

namespace App\Actions;

use App\Data\ExerciseSuggestion;
use App\Enums\Exercise;
use Illuminate\Support\Collection;

final readonly class SuggestExercises
{
    /**
     * @param array<string> $muscleGroups
     * @param array<Exercise> $blacklistedExercises
     * @return Collection<int, ExerciseSuggestion>
     */
    public function execute(array $muscleGroups = [], array $blacklistedExercises = []): Collection
    {
        $results = [];
        foreach (Exercise::cases() as $ex) {
            if (!empty($muscleGroups) && count(array_intersect($muscleGroups, $ex->tags())) === 0) {
                continue;
            }

            if (in_array($ex, $blacklistedExercises)) {
                continue;
            }

            $results[] = ExerciseSuggestion::fromExercise($ex);
        }

        return new Collection($results);
    }
} 