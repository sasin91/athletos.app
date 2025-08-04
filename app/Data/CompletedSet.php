<?php

namespace App\Data;

use App\Enums\Exercise;
use Carbon\Carbon;
use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Contracts\Support\Jsonable;

class CompletedSet implements Jsonable, Arrayable
{
    public function __construct(
        public Exercise $exercise,
        public int $setNumber,
        public ?int $reps,
        public ?float $weight,
        public ?float $rpe,
        public ?string $notes,
        public Carbon $completedAt,
    ) {
    }

    public function hasData(): bool
    {
        return $this->reps !== null || $this->weight !== null;
    }

    public function isComplete(): bool
    {
        return $this->reps !== null && $this->weight !== null;
    }

    public function getFormattedWeight(): string
    {
        if ($this->weight === null) {
            return 'N/A';
        }

        return $this->weight . ' kg';
    }

    public function getFormattedReps(): string
    {
        if ($this->reps === null) {
            return 'N/A';
        }

        return $this->reps . ' reps';
    }

    public function getFormattedRPE(): string
    {
        if ($this->rpe === null) {
            return 'N/A';
        }

        return 'RPE ' . $this->rpe;
    }

    public function getVolume(): ?float
    {
        if ($this->reps === null || $this->weight === null) {
            return null;
        }

        return $this->reps * $this->weight;
    }

    public function getFormattedVolume(): string
    {
        $volume = $this->getVolume();
        if ($volume === null) {
            return 'N/A';
        }

        return number_format($volume, 1) . ' kg';
    }

    public function getIntensityLevel(): string
    {
        if ($this->rpe === null) {
            return 'unknown';
        }

        return match(true) {
            $this->rpe <= 6 => 'light',
            $this->rpe <= 7 => 'moderate',
            $this->rpe <= 8 => 'hard',
            $this->rpe <= 9 => 'very_hard',
            default => 'maximal',
        };
    }

    public function getIntensityColor(): string
    {
        return match($this->getIntensityLevel()) {
            'light' => 'text-green-600',
            'moderate' => 'text-yellow-600',
            'hard' => 'text-orange-600',
            'very_hard' => 'text-red-600',
            'maximal' => 'text-purple-600',
            default => 'text-gray-600',
        };
    }

    public function toArray(): array
    {
        return [
            'exercise' => [
                'value' => $this->exercise->value,
                'displayName' => $this->exercise->displayName(),
            ],
            'setNumber' => $this->setNumber,
            'reps' => $this->reps,
            'weight' => $this->weight,
            'rpe' => $this->rpe,
            'notes' => $this->notes,
            'completedAt' => $this->completedAt->toISOString(),
            // Computed properties for React components
            'hasData' => $this->hasData(),
            'isComplete' => $this->isComplete(),
            'formattedWeight' => $this->getFormattedWeight(),
            'formattedReps' => $this->getFormattedReps(),
            'formattedRpe' => $this->getFormattedRPE(),
            'volume' => $this->getVolume(),
            'formattedVolume' => $this->getFormattedVolume(),
            'intensityLevel' => $this->getIntensityLevel(),
            'intensityColor' => $this->getIntensityColor(),
        ];
    }

    public function toJson($options = 0): string
    {
        return json_encode($this->toArray(), $options);
    }
} 