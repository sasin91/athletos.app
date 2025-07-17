<?php

namespace App\Data;

use App\Data\PlannedExercise;
use Livewire\Wireable;

class PlannedSet implements Wireable
{
    public function __construct(
        public int $setNumber,
        public int $reps = 0,
        public float $weight = 0.0,
        public int $rpe = 0,
        public int $timeSpent = 0,
        public float $explosiveness = 0.0,
        public string $notes = '',
        public PlannedExercise $meta,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            setNumber: $data['set_number'],
            reps: $data['reps'] ?? 0,
            weight: $data['weight'] ?? 0.0,
            rpe: $data['rpe'] ?? 0,
            timeSpent: $data['time_spent'] ?? 0,
            explosiveness: $data['explosiveness'] ?? 0.0,
            notes: $data['notes'] ?? '',
            meta: $data['meta'] instanceof PlannedExercise ? $data['meta'] : PlannedExercise::fromLivewire($data['meta']),
        );
    }

    public function toArray(): array
    {
        return [
            'set_number' => $this->setNumber,
            'reps' => $this->reps,
            'weight' => $this->weight,
            'rpe' => $this->rpe,
            'time_spent' => $this->timeSpent,
            'explosiveness' => $this->explosiveness,
            'notes' => $this->notes,
            'meta' => $this->meta->toLivewire(),
        ];
    }

    public function toLivewire(): array
    {
        return $this->toArray();
    }

    public static function fromLivewire($value): self
    {
        return self::fromArray($value);
    }
} 