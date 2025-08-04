<?php

namespace App\Data;

use App\Enums\Exercise;
use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Contracts\Support\Jsonable;

class PlannedExercise implements Jsonable, Arrayable
{
    public function __construct(
        public Exercise $exercise,
        public string $exerciseSlug,
        public int $priority,
        public int $sets,
        public int $reps,
        public int $weight,
        public int $restSeconds,
        public string $displayName,
        public string $category,
        public string $difficulty,
        public array $tags,
        public ?string $notes = null,
        public ?array $cues = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            exercise: $data['exercise'] instanceof Exercise ? $data['exercise'] : Exercise::from($data['exercise']),
            exerciseSlug: $data['exerciseSlug'] ?? $data['exercise_slug'] ?? '',
            priority: $data['priority'] ?? $data['order'] ?? 0,
            sets: $data['sets'] ?? 0,
            reps: $data['reps'] ?? 0,
            weight: $data['weight'] ?? 0,
            restSeconds: $data['restSeconds'] ?? $data['rest_seconds'] ?? 0,
            displayName: $data['displayName'] ?? $data['display_name'] ?? '',
            category: $data['category'] ?? '',
            difficulty: $data['difficulty'] ?? 'medium',
            tags: $data['tags'] ?? [],
            notes: $data['notes'] ?? null,
            cues: $data['cues'] ?? null,
        );
    }

    public function toArray(): array
    {
        return [
            'exercise' => [
                'value' => $this->exercise->value,
                'displayName' => $this->exercise->displayName(),
                'category' => $this->exercise->category()->value,
                'difficulty' => $this->exercise->difficulty()->value,
                'tags' => $this->exercise->tags(),
            ],
            'exerciseSlug' => $this->exerciseSlug,
            'order' => $this->priority,
            'sets' => $this->sets,
            'reps' => $this->reps,
            'weight' => $this->weight,
            'restSeconds' => $this->restSeconds,
            'displayName' => $this->displayName,
            'category' => $this->category,
            'difficulty' => $this->difficulty,
            'tags' => $this->tags,
            'notes' => $this->notes,
            'cues' => $this->cues,
            // Computed properties for React components
            'effectiveCues' => $this->getEffectiveCues(),
            'estimatedDurationMinutes' => $this->getEstimatedDurationMinutes(),
            'isStrengthExercise' => $this->isStrengthExercise(),
            'isRecoveryExercise' => $this->isRecoveryExercise(),
            'difficultyLevel' => $this->getDifficultyLevel(),
            'difficultyColorClass' => $this->getDifficultyColorClass(),
        ];
    }

    public function toJson($options = 0): string
    {
        return json_encode($this->toArray(), $options);
    }

    /**
     * Get effective cues for this exercise - phase-specific cues if available,
     * otherwise fall back to exercise enum defaults
     */
    public function getEffectiveCues(): array
    {
        // Return phase-specific cues if available
        if (!empty($this->cues)) {
            return $this->cues;
        }
        
        // Fall back to exercise enum defaults
        return $this->exercise->cues();
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