<?php

namespace App\Data;

use Livewire\Wireable;

class OneRepMaxes implements Wireable
{
    /**
     * @param OneRepMax[] $oneRepMaxes
     */
    public function __construct(
        public array $oneRepMaxes = [],
    ) {
    }

    public function toLivewire(): array
    {
        return [
            'oneRepMaxes' => array_map(fn($max) => $max->toLivewire(), $this->oneRepMaxes),
        ];
    }

    public static function fromLivewire($value): self
    {
        $oneRepMaxes = array_map(fn($maxData) => OneRepMax::fromLivewire($maxData), $value['oneRepMaxes']);
        
        return new self(oneRepMaxes: $oneRepMaxes);
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

    public function toArray(): array
    {
        return $this->oneRepMaxes;
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