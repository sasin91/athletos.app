<?php

namespace App\Data;

use App\Enums\Exercise;
use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Contracts\Support\Jsonable;

class OneRepMax implements Jsonable, Arrayable
{
    public function __construct(
        public Exercise $exercise,
        public int $current,
        public int $previous,
        public int $change,
    ) {
    }

    public function toArray(): array
    {
        return [
            'exercise' => [
                'value' => $this->exercise->value,
                'displayName' => $this->exercise->displayName(),
                'oneRepMaxKey' => $this->exercise->oneRepMaxKey(),
                'oneRepMaxDisplayName' => $this->exercise->oneRepMaxDisplayName(),
            ],
            'current' => $this->current,
            'previous' => $this->previous,
            'change' => $this->change,
            // Computed properties for React components
            'hasImproved' => $this->hasImproved(),
            'hasDeclined' => $this->hasDeclined(),
            'isStable' => $this->isStable(),
            'improvementPercentage' => $this->improvementPercentage(),
            'changeDisplay' => $this->getChangeDisplay(),
            'changeColorClass' => $this->getChangeColorClass(),
        ];
    }

    public function toJson($options = 0): string
    {
        return json_encode($this->toArray(), $options);
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