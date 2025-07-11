<?php

namespace App\Data;

/**
 * Represents set data structure used in Livewire Training component
 * This is the format used for the completedSets array before persistence
 */
class LivewireSetData
{
    public function __construct(
        public ?int $reps = null,
        public ?float $weight = null,
        public ?int $rpe = null,
        public ?string $notes = null,
        public ?int $timeSpent = null,
    ) {
    }

    /**
     * Check if this set has any meaningful data
     */
    public function hasData(): bool
    {
        return $this->reps !== null || $this->weight !== null;
    }

    /**
     * Check if this set has complete data for calculations
     */
    public function isComplete(): bool
    {
        return $this->reps !== null && 
               $this->weight !== null && 
               $this->reps > 0 && 
               $this->weight > 0;
    }

    /**
     * Convert to array format for Livewire
     */
    public function toArray(): array
    {
        return [
            'reps' => $this->reps,
            'weight' => $this->weight,
            'rpe' => $this->rpe,
            'notes' => $this->notes,
            'timeSpent' => $this->timeSpent,
        ];
    }

    /**
     * Create from array format used in Livewire
     */
    public static function fromArray(array $data): self
    {
        return new self(
            reps: isset($data['reps']) && $data['reps'] !== '' ? (int) $data['reps'] : null,
            weight: isset($data['weight']) && $data['weight'] !== '' ? (float) $data['weight'] : null,
            rpe: isset($data['rpe']) && $data['rpe'] !== '' ? (int) $data['rpe'] : null,
            notes: $data['notes'] ?? null,
            timeSpent: isset($data['timeSpent']) && $data['timeSpent'] !== '' ? (int) $data['timeSpent'] : null,
        );
    }

    /**
     * Get the value for a specific field
     */
    public function getValue(string $field): mixed
    {
        return match($field) {
            'reps' => $this->reps,
            'weight' => $this->weight,
            'rpe' => $this->rpe,
            'notes' => $this->notes,
            'timeSpent' => $this->timeSpent,
            default => null,
        };
    }

    /**
     * Set the value for a specific field
     */
    public function setValue(string $field, mixed $value): self
    {
        return match($field) {
            'reps' => new self($value, $this->weight, $this->rpe, $this->notes, $this->timeSpent),
            'weight' => new self($this->reps, $value, $this->rpe, $this->notes, $this->timeSpent),
            'rpe' => new self($this->reps, $this->weight, $value, $this->notes, $this->timeSpent),
            'notes' => new self($this->reps, $this->weight, $this->rpe, $value, $this->timeSpent),
            'timeSpent' => new self($this->reps, $this->weight, $this->rpe, $this->notes, $value),
            default => $this,
        };
    }
} 