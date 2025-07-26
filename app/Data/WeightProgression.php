<?php

namespace App\Data;

use App\Enums\Exercise;
use Carbon\Carbon;
use Illuminate\Contracts\Support\Jsonable;
use Illuminate\Contracts\Support\Arrayable;

class WeightProgression implements Jsonable, Arrayable
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

    public function toArray(): array
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
            'chartData' => $this->getChartData(),
            'progressPercentage' => $this->getProgressPercentage(),
            'isOnTrack' => $this->isOnTrack(),
            'isAhead' => $this->isAhead(),
            'isBehind' => $this->isBehind(),
        ];
    }

    public function toJson($options = 0): string
    {
        return json_encode($this->toArray(), $options);
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