<?php

namespace App\Data;

use App\Enums\Exercise;
use Carbon\Carbon;
use Livewire\Wireable;

class WeightProgression implements Wireable
{
    public function __construct(
        public Exercise $exercise,
        public array $dataPoints,
        public ?float $currentWeight = null,
        public ?float $expectedWeight = null,
        public ?float $startingWeight = null,
        public ?Carbon $startDate = null,
        public ?Carbon $endDate = null,
    ) {
    }

    public function toLivewire(): array
    {
        return [
            'exercise' => [
                'value' => $this->exercise->value,
                'displayName' => $this->exercise->displayName(),
                'category' => $this->exercise->category()->value,
                'difficulty' => $this->exercise->difficulty()->value,
            ],
            'dataPoints' => $this->dataPoints,
            'currentWeight' => $this->currentWeight,
            'expectedWeight' => $this->expectedWeight,
            'startingWeight' => $this->startingWeight,
            'startDate' => $this->startDate?->toISOString(),
            'endDate' => $this->endDate?->toISOString(),
        ];
    }

    public static function fromLivewire($value): self
    {
        $exercise = Exercise::from($value['exercise']['value']);
        
        return new self(
            exercise: $exercise,
            dataPoints: $value['dataPoints'],
            currentWeight: $value['currentWeight'],
            expectedWeight: $value['expectedWeight'],
            startingWeight: $value['startingWeight'],
            startDate: $value['startDate'] ? Carbon::parse($value['startDate']) : null,
            endDate: $value['endDate'] ? Carbon::parse($value['endDate']) : null,
        );
    }

    public function getChartData(): array
    {
        $categories = [];
        $actualWeights = [];
        $expectedWeights = [];

        foreach ($this->dataPoints as $point) {
            $categories[] = $point['week'] ?? $point['date'] ?? '';
            $actualWeights[] = $point['actual_weight'] ?? null;
            $expectedWeights[] = $point['expected_weight'] ?? null;
        }

        return [
            'categories' => $categories,
            'series' => [
                [
                    'name' => 'Actual Weight',
                    'data' => $actualWeights,
                    'color' => '#3B82F6', // Blue
                ],
                [
                    'name' => 'Expected Weight',
                    'data' => $expectedWeights,
                    'color' => '#10B981', // Green
                ],
            ],
        ];
    }

    public function getProgressPercentage(): float
    {
        if (!$this->startingWeight || !$this->currentWeight) {
            return 0;
        }

        $totalExpected = $this->expectedWeight - $this->startingWeight;
        $actualProgress = $this->currentWeight - $this->startingWeight;

        if ($totalExpected <= 0) {
            return 0;
        }

        return min(100, max(0, ($actualProgress / $totalExpected) * 100));
    }

    public function isOnTrack(): bool
    {
        if (!$this->currentWeight || !$this->expectedWeight) {
            return true;
        }

        $progress = $this->getProgressPercentage();
        return $progress >= 90; // Consider on track if within 90% of expected
    }

    public function isAhead(): bool
    {
        if (!$this->currentWeight || !$this->expectedWeight) {
            return false;
        }

        return $this->currentWeight > $this->expectedWeight;
    }

    public function isBehind(): bool
    {
        if (!$this->currentWeight || !$this->expectedWeight) {
            return false;
        }

        $progress = $this->getProgressPercentage();
        return $progress < 90;
    }
} 