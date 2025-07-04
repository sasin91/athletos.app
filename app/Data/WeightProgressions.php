<?php

namespace App\Data;

use Livewire\Wireable;

class WeightProgressions implements Wireable
{
    public function __construct(
        public array $progressions = [],
    ) {
    }

    public function toLivewire(): array
    {
        return [
            'progressions' => array_map(fn($progression) => $progression->toLivewire(), $this->progressions),
        ];
    }

    public static function fromLivewire($value): self
    {
        $progressions = array_map(fn($progressionData) => WeightProgression::fromLivewire($progressionData), $value['progressions']);
        
        return new self(progressions: $progressions);
    }

    public function add(WeightProgression $progression): void
    {
        $this->progressions[] = $progression;
    }

    public function get(string $exerciseSlug): ?WeightProgression
    {
        foreach ($this->progressions as $progression) {
            if ($progression->exercise->slug === $exerciseSlug) {
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