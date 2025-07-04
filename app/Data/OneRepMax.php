<?php

namespace App\Data;

use App\Enums\Exercise;
use Livewire\Wireable;

class OneRepMax implements Wireable
{
    public function __construct(
        public Exercise $exercise,
        public int $current,
        public int $previous,
        public int $change,
    ) {
    }

    public function toLivewire(): array
    {
        return [
            'exercise' => [
                'value' => $this->exercise->value,
                'display_name' => $this->exercise->displayName(),
                'one_rep_max_key' => $this->exercise->oneRepMaxKey(),
                'one_rep_max_display_name' => $this->exercise->oneRepMaxDisplayName(),
            ],
            'current' => $this->current,
            'previous' => $this->previous,
            'change' => $this->change,
        ];
    }

    public static function fromLivewire($value): self
    {
        $exercise = Exercise::from($value['exercise']['value']);
        
        return new self(
            exercise: $exercise,
            current: $value['current'],
            previous: $value['previous'],
            change: $value['change'],
        );
    }

    public function hasImproved(): bool
    {
        return $this->change > 0;
    }

    public function hasDeclined(): bool
    {
        return $this->change < 0;
    }

    public function isStable(): bool
    {
        return $this->change === 0;
    }

    public function improvementPercentage(): float
    {
        if ($this->previous === 0) {
            return 0;
        }
        
        return ($this->change / $this->previous) * 100;
    }

    public function getChangeDisplay(): string
    {
        if ($this->change === 0) {
            return 'No change';
        }
        
        $sign = $this->change > 0 ? '+' : '';
        return "{$sign}{$this->change} kg";
    }

    public function getChangeColorClass(): string
    {
        if ($this->hasImproved()) {
            return 'text-green-400';
        }
        
        if ($this->hasDeclined()) {
            return 'text-red-400';
        }
        
        return 'text-gray-400';
    }
} 