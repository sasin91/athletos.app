<?php

namespace App\Data;

use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Contracts\Support\Jsonable;

class ExerciseSummaryItem implements Jsonable, Arrayable
{
    public function __construct(
        public string $name,
        public int $sets,
        public string $reps,
        public string $weight,
    ) {
    }

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'sets' => $this->sets,
            'reps' => $this->reps,
            'weight' => $this->weight,
        ];
    }

    public function toJson($options = 0): string
    {
        return json_encode($this->toArray(), $options);
    }
} 