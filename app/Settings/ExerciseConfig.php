<?php

namespace App\Settings;

use App\Enums\Exercise;
use App\Enums\WeightType;
use Illuminate\Contracts\Support\Arrayable;
use Livewire\Wireable;

class ExerciseConfig implements Arrayable, Wireable
{
    public function __construct(
        public string $exercise,
        public int $sets,
        public int $reps,
        public float $weight = 0.0,
        public int $rest_seconds = 120,
        public ?string $notes = null,
        public array $metadata = [],
        public int $day = 1,
        /**
         * Ramping percentages for progressive weight loading across sets
         * Format: [percentage1, percentage2, ...]
         * Example: [0.80, 0.90, 1.00] for 3 sets
         * If null, will use default ramping based on number of sets
         * 
         * @var array<int, float>|null
         */
        public ?array $rampingPercentages = null,
        /**
         * Phase-specific exercise cues and technique tips
         *
         * @var array<string>|null
         */
        public ?array $cues = null,

        public ?WeightType $weight_type = null, // Optional weight type override
    ) {}

    /**
     * Create from array
     */
    public static function fromArray(array $data): self
    {
        return new self(
            exercise: $data['exercise'] ?? $data['exercise_slug'] ?? $data['exercise_id'] ?? '', // Backward compatibility
            sets: (int) $data['sets'],
            reps: (int) $data['reps'],
            weight: (float) $data['weight'],
            rest_seconds: $data['rest_seconds'] ?? 120,
            notes: $data['notes'] ?? null,
            metadata: $data['metadata'] ?? [],
            day: $data['day'] ?? 1,
            cues: $data['cues'] ?? null,
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
            'cues' => $this->cues,
            'rampingPercentages' => $this->rampingPercentages,
            'weight_type' => $this->weight_type?->value
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
            sets: (int) $value['sets'],
            reps: (int) $value['reps'],
            weight: (float) $value['weight'],
            rest_seconds: $value['rest_seconds'] ?? 120,
            notes: $value['notes'] ?? null,
            metadata: $value['metadata'] ?? [],
            day: $value['day'] ?? 1,
            cues: $value['cues'] ?? null,
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

    /**
     * Get effective ramping percentages for this exercise
     * Gets default ramping percentages from exercise enum
     *
     * @return array<int, float>
     */
    public function getEffectiveRampingPercentages(): array
    {
        // Get defaults from the exercise enum
        $exercise = $this->getExercise();
        if ($exercise) {
            return $exercise->rampingPercentages($this->sets);
        }

        // Final fallback - basic ramping
        return match ($this->sets) {
            1 => [1.00],
            2 => [0.85, 1.00],
            3 => [0.80, 0.90, 1.00],
            4 => [0.70, 0.80, 0.90, 1.00],
            5 => [0.60, 0.70, 0.80, 0.90, 1.00],
            default => $this->generateLinearRamping(0.50),
        };
    }


    /**
     * Get ramping percentages for this exercise
     * Returns configured percentages or defaults based on exercise type
     * 
     * @return array<int, float>|null
     */
    public function getRampingPercentages(): ?array
    {
        return $this->rampingPercentages;
    }

    /**
     * Set ramping percentages for this exercise
     * 
     * @param array<int, float>|null $percentages
     */
    public function setRampingPercentages(?array $percentages): void
    {
        $this->rampingPercentages = $percentages;
    }

    /**
     * Get effective cues for this exercise
     * Uses override if available, otherwise gets default from exercise enum
     *
     * @return array<string>
     */
    public function getEffectiveCues(): array
    {
        // If we have override cues, use them
        if ($this->cues !== null && ! empty($this->cues)) {
            return $this->cues;
        }

        // Otherwise get defaults from the exercise enum
        $exercise = $this->getExercise();
        if ($exercise) {
            return $exercise->cues();
        }

        // Final fallback - generic cues
        return [
            'Maintain proper form throughout the movement',
            'Focus on controlled movement patterns',
            'Breathe consistently during execution',
            'Listen to your body and adjust as needed',
        ];
    }

    /**
     * Generate linear ramping from start percentage to 100%
     */
    private function generateLinearRamping(float $startPercentage): array
    {
        $percentages = [];
        for ($set = 1; $set <= $this->sets; $set++) {
            $percentage = $startPercentage + ((1.0 - $startPercentage) * ($set / $this->sets));
            $percentages[] = round($percentage, 2);
        }

        return $percentages;
    }
}
