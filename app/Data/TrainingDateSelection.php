<?php

namespace App\Data;

use App\Models\Training;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Livewire\Wireable;

class TrainingDateSelection implements Wireable
{
    public function __construct(
        public Carbon $date,
        /** @var Collection<Training> */
        public Collection $trainings
    ) {}

    public function toLivewire(): array
    {
        return [
            'date' => $this->date->toDateString(),
            'trainings' => $this->trainings->toArray()
        ];
    }

    public static function fromLivewire($value): self
    {
        return new self(
            date: Carbon::parse($value['date']),
            trainings: collect($value['trainings'])->map(fn($training) => 
                is_array($training) ? new Training($training) : $training
            )
        );
    }
} 