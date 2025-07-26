<?php

namespace App\Data;

use App\Models\Training;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Contracts\Support\Jsonable;

class TrainingDateSelection implements Jsonable, Arrayable
{
    public function __construct(
        public Carbon $date,
        /** @var Collection<Training> */
        public Collection $trainings
    ) {}

    public function toArray(): array
    {
        return [
            'date' => $this->date->toDateString(),
            'trainings' => $this->trainings->toArray()
        ];
    }

    public function toJson($options = 0): string
    {
        return json_encode($this->toArray(), $options);
    }
} 