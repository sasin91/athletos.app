<?php

namespace App\Data;

use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Contracts\Support\Jsonable;

class OneRepMaxes implements Jsonable, Arrayable
{
    /**
     * @param OneRepMax[] $oneRepMaxes
     */
    public function __construct(
        public array $oneRepMaxes = [],
    ) {
    }

    public function toArray(): array
    {
        return [
            'oneRepMaxes' => array_map(fn($max) => $max->toArray(), $this->oneRepMaxes),
            // Computed properties for React components
            'count' => $this->count(),
            'isEmpty' => $this->isEmpty(),
            'isNotEmpty' => $this->isNotEmpty(),
            'improved' => array_map(fn($max) => $max->toArray(), $this->getImproved()->oneRepMaxes),
            'declined' => array_map(fn($max) => $max->toArray(), $this->getDeclined()->oneRepMaxes),
            'stable' => array_map(fn($max) => $max->toArray(), $this->getStable()->oneRepMaxes),
        ];
    }

    public function toJson($options = 0): string
    {
        return json_encode($this->toArray(), $options);
    }

    public function add(OneRepMax $oneRepMax): void
    {
        $this->oneRepMaxes[] = $oneRepMax;
    }

    public function get(string $exerciseKey): ?OneRepMax
    {
        foreach ($this->oneRepMaxes as $oneRepMax) {
            if ($oneRepMax->exercise->oneRepMaxKey() === $exerciseKey) {
                return $oneRepMax;
            }
        }
        
        return null;
    }

    public function has(string $exerciseKey): bool
    {
        return $this->get($exerciseKey) !== null;
    }

    public function count(): int
    {
        return count($this->oneRepMaxes);
    }

    public function isEmpty(): bool
    {
        return empty($this->oneRepMaxes);
    }

    public function isNotEmpty(): bool
    {
        return !$this->isEmpty();
    }

    public function filter(callable $callback): self
    {
        $filtered = array_filter($this->oneRepMaxes, $callback);
        return new self(oneRepMaxes: array_values($filtered));
    }

    public function map(callable $callback): array
    {
        return array_map($callback, $this->oneRepMaxes);
    }

    public function getImproved(): self
    {
        return $this->filter(fn($max) => $max->hasImproved());
    }

    public function getDeclined(): self
    {
        return $this->filter(fn($max) => $max->hasDeclined());
    }

    public function getStable(): self
    {
        return $this->filter(fn($max) => $max->isStable());
    }
} 