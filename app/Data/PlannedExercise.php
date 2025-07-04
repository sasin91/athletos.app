<?php

namespace App\Data;

use App\Enums\Exercise;
use Livewire\Wireable;

class PlannedExercise implements Wireable
{
    public function __construct(
        public Exercise $exercise,
        public string $exerciseSlug,
        public int $priority,
        public int $sets,
        public string $reps,
        public string $weight,
        public int $restSeconds,
        public string $displayName,
        public string $category,
        public string $difficulty,
        public array $tags,
    ) {
    }

    public function toLivewire(): array
    {
        return [
            'exercise' => [
                'value' => $this->exercise->value,
                'display_name' => $this->exercise->displayName(),
                'category' => $this->exercise->category()->value,
                'difficulty' => $this->exercise->difficulty()->value,
                'tags' => $this->exercise->tags(),
            ],
            'exercise_slug' => $this->exerciseSlug,
            'order' => $this->priority,
            'sets' => $this->sets,
            'reps' => $this->reps,
            'weight' => $this->weight,
            'rest_seconds' => $this->restSeconds,
            'display_name' => $this->displayName,
            'category' => $this->category,
            'difficulty' => $this->difficulty,
            'tags' => $this->tags,
        ];
    }

    public static function fromLivewire($value): self
    {
        $exercise = Exercise::from($value['exercise']['value']);
        
        return new self(
            exercise: $exercise,
            exerciseSlug: $value['exercise_slug'],
            priority: $value['order'],
            sets: $value['sets'],
            reps: $value['reps'],
            weight: $value['weight'],
            restSeconds: $value['rest_seconds'],
            displayName: $value['display_name'],
            category: $value['category'],
            difficulty: $value['difficulty'],
            tags: $value['tags'],
        );
    }

    /**
     * Get total estimated time for this exercise in minutes
     */
    public function getEstimatedDurationMinutes(): int
    {
        return $this->sets * ($this->restSeconds / 60);
    }

    /**
     * Check if this is a strength exercise
     */
    public function isStrengthExercise(): bool
    {
        return $this->category === 'strength';
    }

    /**
     * Check if this is a recovery/mobility exercise
     */
    public function isRecoveryExercise(): bool
    {
        return in_array($this->category, ['recovery', 'mobility', 'yoga']);
    }

    /**
     * Get difficulty level as integer (easy=1, medium=2, hard=3)
     */
    public function getDifficultyLevel(): int
    {
        return match($this->difficulty) {
            'easy' => 1,
            'medium' => 2,
            'hard' => 3,
            default => 2,
        };
    }

    /**
     * Get CSS class for difficulty color coding
     */
    public function getDifficultyColorClass(): string
    {
        return match($this->difficulty) {
            'easy' => 'text-green-500',
            'medium' => 'text-yellow-500',
            'hard' => 'text-red-500',
            default => 'text-gray-500',
        };
    }
} 