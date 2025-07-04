<?php

namespace App\Data;

use Livewire\Wireable;

class ExerciseSummaryItem implements Wireable
{
    public function __construct(
        public string $name,
        public int $sets,
        public string $reps,
        public string $weight,
    ) {
    }

    public function toLivewire(): array
    {
        return [
            'name' => $this->name,
            'sets' => $this->sets,
            'reps' => $this->reps,
            'weight' => $this->weight,
        ];
    }

    public static function fromLivewire($value): self
    {
        return new self(
            name: $value['name'],
            sets: $value['sets'],
            reps: $value['reps'],
            weight: $value['weight'],
        );
    }
} 