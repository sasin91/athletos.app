<?php

namespace App\Data;

use App\Models\TrainingPlan;
use Livewire\Wireable;

class TrainingPlanData implements Wireable
{
    public function __construct(
        public int $id,
        public string $name,
        public string $description,
        public array $phases = [],
    ) {
    }

    public static function fromModel(TrainingPlan $trainingPlan): self
    {
        return new self(
            id: $trainingPlan->id,
            name: $trainingPlan->name,
            description: $trainingPlan->description,
            phases: [], // Could be expanded to include phase data
        );
    }

    public function toLivewire(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'phases' => $this->phases,
        ];
    }

    public static function fromLivewire($value): self
    {
        return new self(
            id: $value['id'],
            name: $value['name'],
            description: $value['description'],
            phases: $value['phases'] ?? [],
        );
    }
} 