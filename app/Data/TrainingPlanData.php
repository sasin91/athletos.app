<?php

namespace App\Data;

use App\Models\TrainingPlan;
use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Contracts\Support\Jsonable;

class TrainingPlanData implements Jsonable, Arrayable
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

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'phases' => $this->phases,
        ];
    }

    public function toJson($options = 0): string
    {
        return json_encode($this->toArray(), $options);
    }
} 