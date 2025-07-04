<?php

namespace App\Settings;

use App\Enums\Exercise;
use Illuminate\Contracts\Support\Arrayable;
use Livewire\Wireable;

class ExerciseConfig implements Arrayable, Wireable
{
    public function __construct(
        public string $exercise,
        public int $sets,
        public string $reps,
        public string $weight = 'Progressive',
        public int $rest_seconds = 120,
        public ?string $notes = null,
        public array $metadata = [],
        public int $day = 1,
    ) {
    }

    /**
     * Create from array
     */
    public static function fromArray(array $data): self
    {
        return new self(
            exercise: $data['exercise'] ?? $data['exercise_slug'] ?? $data['exercise_id'] ?? '', // Backward compatibility
            sets: $data['sets'],
            reps: $data['reps'],
            weight: $data['weight'] ?? 'Progressive',
            rest_seconds: $data['rest_seconds'] ?? 120,
            notes: $data['notes'] ?? null,
            metadata: $data['metadata'] ?? [],
            day: $data['day'] ?? 1,
        );
    }

    /**
     * Convert to array
     */
    public function toArray(): array
    {
        return [
            'exercise' => $this->exercise,
            'sets' => $this->sets,
            'reps' => $this->reps,
            'weight' => $this->weight,
            'rest_seconds' => $this->rest_seconds,
            'notes' => $this->notes,
            'metadata' => $this->metadata,
            'day' => $this->day,
        ];
    }

    /**
     * Convert to Livewire format
     */
    public function toLivewire(): array
    {
        return $this->toArray();
    }

    /**
     * Create from Livewire format
     */
    public static function fromLivewire($value): self
    {
        return new self(
            exercise: $value['exercise'] ?? $value['exercise_slug'] ?? $value['exercise_id'] ?? '', // Backward compatibility
            sets: $value['sets'],
            reps: $value['reps'],
            weight: $value['weight'] ?? 'Progressive',
            rest_seconds: $value['rest_seconds'] ?? 120,
            notes: $value['notes'] ?? null,
            metadata: $value['metadata'] ?? [],
            day: $value['day'] ?? 1,
        );
    }

    /**
     * Get the exercise enum
     */
    public function getExercise(): ?Exercise
    {
        return Exercise::tryFromSlug($this->exercise);
    }

    /**
     * Get rest time in minutes
     */
    public function getRestMinutes(): float
    {
        return $this->rest_seconds / 60;
    }

    /**
     * Set rest time in minutes
     */
    public function setRestMinutes(float $minutes): void
    {
        $this->rest_seconds = (int) ($minutes * 60);
    }
} 