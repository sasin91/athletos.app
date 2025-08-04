<?php

namespace App\Data;

use Illuminate\Contracts\Support\Jsonable;
use Illuminate\Contracts\Support\Arrayable;

class WeightProgressions implements Jsonable, Arrayable
{
    public function __construct(
        public array $progressions = [],
    ) {
    }

    public function toArray(): array
    {
        return [
            'progressions' => array_map(fn($progression) => $progression instanceof Arrayable ? $progression->toArray() : $progression, $this->progressions),
            // Computed properties for React components
            'hasData' => $this->hasData(),
            'exercisesWithData' => $this->getExercisesWithData(),
            'onTrackExercises' => $this->getOnTrackExercises(),
            'behindExercises' => $this->getBehindExercises(),
            'aheadExercises' => $this->getAheadExercises(),
        ];
    }

    public function toJson($options = 0): string
    {
        return json_encode($this->toArray(), $options);
    }

    public function add(WeightProgression $progression): void
    {
        $this->progressions[] = $progression;
    }

    public function get(string $exerciseSlug): ?WeightProgression
    {
        foreach ($this->progressions as $progression) {
            if ($progression->exercise->value === $exerciseSlug) {
                return $progression;
            }
        }
        
        return null;
    }

    public function hasData(): bool
    {
        return !empty($this->progressions);
    }

    public function getExercisesWithData(): array
    {
        return array_filter($this->progressions, fn($progression) => 
            !empty($progression->dataPoints) && $progression->currentWeight !== null
        );
    }

    public function getOnTrackExercises(): array
    {
        return array_filter($this->progressions, fn($progression) => $progression->isOnTrack());
    }

    public function getBehindExercises(): array
    {
        return array_filter($this->progressions, fn($progression) => $progression->isBehind());
    }

    /**
     * Get exercises that are ahead in progression
     * 
     * @return array<string, array<int, WeightProgression>>
     */
    public function getAheadExercises(): array
    {
        return array_filter($this->progressions, fn($progression) => $progression->isAhead());
    }
} 