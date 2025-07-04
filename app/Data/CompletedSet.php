<?php

namespace App\Data;

use App\Enums\Exercise;
use Carbon\Carbon;
use Livewire\Wireable;

class CompletedSet implements Wireable
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

    public function toLivewire(): array
    {
        return [
            'exercise' => [
                'value' => $this->exercise->value,
                'display_name' => $this->exercise->displayName(),
            ],
            'set_number' => $this->setNumber,
            'reps' => $this->reps,
            'weight' => $this->weight,
            'rpe' => $this->rpe,
            'notes' => $this->notes,
            'completed_at' => $this->completedAt->toISOString(),
        ];
    }

    public static function fromLivewire($value): self
    {
        $exercise = Exercise::from($value['exercise']['value']);
        
        return new self(
            exercise: $exercise,
            setNumber: $value['set_number'],
            reps: $value['reps'],
            weight: $value['weight'],
            rpe: $value['rpe'],
            notes: $value['notes'],
            completedAt: Carbon::parse($value['completed_at']),
        );
    }
} 