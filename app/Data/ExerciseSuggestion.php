<?php

namespace App\Data;

use App\Enums\Exercise;
use App\Enums\ExerciseCategory;
use App\Enums\ExerciseDifficulty;
use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Contracts\Support\Jsonable;

class ExerciseSuggestion implements Jsonable, Arrayable
{
    public function __construct(
        public Exercise $exercise,
        public string $displayName,
        public ExerciseCategory $category,
        public ExerciseDifficulty $difficulty,
        public array $tags,
        public ?string $conditions = null,
        public ?string $benefits = null,
        public ?int $score = null,
    ) {
    }

    public static function fromExercise(Exercise $exercise, ?string $conditions = null, ?string $benefits = null, ?int $score = null): self
    {
        return new self(
            exercise: $exercise,
            displayName: $exercise->displayName(),
            category: $exercise->category(),
            difficulty: $exercise->difficulty(),
            tags: $exercise->tags(),
            conditions: $conditions,
            benefits: $benefits,
            score: $score,
        );
    }

    public function isBodyweight(): bool
    {
        return in_array('bodyweight', $this->tags);
    }

    public function requiresEquipment(): bool
    {
        return !$this->isBodyweight();
    }

    public function getRequiredEquipment(): array
    {
        return array_filter($this->tags, fn($tag) => $tag !== 'bodyweight');
    }

    public function getDifficultyColor(): string
    {
        return match($this->difficulty) {
            ExerciseDifficulty::Beginner => 'text-green-600',
            ExerciseDifficulty::Intermediate => 'text-yellow-600',
            ExerciseDifficulty::Advanced => 'text-red-600',
        };
    }

    public function getCategoryColor(): string
    {
        return match($this->category) {
            ExerciseCategory::Strength => 'text-blue-600',
            ExerciseCategory::Recovery => 'text-green-600',
            ExerciseCategory::Mobility => 'text-purple-600',
            ExerciseCategory::Yoga => 'text-pink-600',
            default => 'text-gray-600',
        };
    }

    public function getEstimatedDurationMinutes(): int
    {
        return match($this->category) {
            ExerciseCategory::Strength => 15,
            ExerciseCategory::Recovery => 5,
            ExerciseCategory::Mobility => 10,
            ExerciseCategory::Yoga => 20,
            default => 10,
        };
    }

    public function toArray(): array
    {
        return [
            'exercise' => [
                'value' => $this->exercise->value,
                'displayName' => $this->displayName,
                'category' => $this->category->value,
                'difficulty' => $this->difficulty->value,
                'tags' => $this->tags,
            ],
            'conditions' => $this->conditions,
            'benefits' => $this->benefits,
            'score' => $this->score,
            // Computed properties for React components
            'isBodyweight' => $this->isBodyweight(),
            'requiresEquipment' => $this->requiresEquipment(),
            'requiredEquipment' => $this->getRequiredEquipment(),
            'difficultyColor' => $this->getDifficultyColor(),
            'categoryColor' => $this->getCategoryColor(),
            'estimatedDurationMinutes' => $this->getEstimatedDurationMinutes(),
        ];
    }

    public function toJson($options = 0): string
    {
        return json_encode($this->toArray(), $options);
    }
} 