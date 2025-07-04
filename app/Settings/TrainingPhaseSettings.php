<?php

namespace App\Settings;

use App\Enums\Exercise;
use App\Settings\ExerciseConfig;

class TrainingPhaseSettings
{
    public function __construct(
        /**
         * @var array<int, ExerciseConfig>
         */
        public array $exercises = [],
        public ?string $notes = null,
        public array $metadata = [],
    ) {
    }

    /**
     * Create from array
     */
    public static function fromArray(array $data): self
    {
        $exercises = array_map(fn($exercise) => ExerciseConfig::fromArray($exercise), $data['exercises'] ?? []);

        return new self(
            exercises: $exercises,
            notes: $data['notes'] ?? null,
            metadata: $data['metadata'] ?? [],
        );
    }

    /**
     * Convert to array
     */
    public function toArray(): array
    {
        return [
            'exercises' => $this->exercises,
            'notes' => $this->notes,
            'metadata' => $this->metadata,
        ];
    }

    /**
     * Get exercise configuration for a specific exercise
     */
    public function getExerciseConfig(Exercise $exercise): ?ExerciseConfig
    {
        foreach ($this->exercises as $exerciseData) {
            $exerciseFromData = is_array($exerciseData) 
                ? ($exerciseData['exercise'] ?? $exerciseData['exercise_slug'] ?? $exerciseData['exercise_id'] ?? '')
                : ($exerciseData->exercise ?? $exerciseData->exercise_slug ?? $exerciseData->exercise_id ?? '');
                
            if ($exerciseFromData === $exercise->value) {
                return is_array($exerciseData) 
                    ? ExerciseConfig::fromArray($exerciseData)
                    : $exerciseData;
            }
        }

        return null;
    }

    /**
     * Get all exercise configurations as typed objects
     */
    public function getExerciseConfigs(): array
    {
        return array_map(function($data) {
            return is_array($data) 
                ? ExerciseConfig::fromArray($data)
                : $data;
        }, $this->exercises);
    }

    /**
     * Add or update an exercise configuration
     */
    public function setExerciseConfig(ExerciseConfig $config): void
    {
        $found = false;
        
        foreach ($this->exercises as $key => $exerciseData) {
            $exerciseFromData = is_array($exerciseData) 
                ? ($exerciseData['exercise'] ?? $exerciseData['exercise_slug'] ?? $exerciseData['exercise_id'] ?? '')
                : ($exerciseData->exercise ?? $exerciseData->exercise_slug ?? $exerciseData->exercise_id ?? '');
                
            if ($exerciseFromData === $config->exercise) {
                $this->exercises[$key] = $config->toArray();
                $found = true;
                break;
            }
        }

        if (!$found) {
            $this->exercises[] = $config->toArray();
        }
    }

    /**
     * Remove an exercise configuration
     */
    public function removeExerciseConfig(Exercise $exercise): bool
    {
        foreach ($this->exercises as $key => $exerciseData) {
            $exerciseFromData = is_array($exerciseData) 
                ? ($exerciseData['exercise'] ?? $exerciseData['exercise_slug'] ?? $exerciseData['exercise_id'] ?? '')
                : ($exerciseData->exercise ?? $exerciseData->exercise_slug ?? $exerciseData->exercise_id ?? '');
                
            if ($exerciseFromData === $exercise->value) {
                unset($this->exercises[$key]);
                $this->exercises = array_values($this->exercises); // Re-index array
                return true;
            }
        }

        return false;
    }

    /**
     * Check if an exercise is configured
     */
    public function hasExercise(Exercise $exercise): bool
    {
        return $this->getExerciseConfig($exercise) !== null;
    }
} 