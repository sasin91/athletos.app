<?php

namespace App\Data;

use App\Enums\Exercise;
use App\Models\Training;
use Carbon\Carbon;
use Livewire\Wireable;

class TrainingSession implements Wireable
{
    public function __construct(
        public ?int $id,
        public Carbon $scheduledAt,
        public ?Carbon $completedAt,
        public bool $postponed,
        public int $progress,
        public ?string $mood,
        public ?int $energyLevel,
        public ?TrainingPlanData $trainingPlan,
        public array $plannedExercises = [],
        public array $completedSets = [],
        public array $exerciseNotes = [],
    ) {
    }

    public static function fromTraining(Training $training): self
    {
        return new self(
            id: $training->id,
            scheduledAt: $training->scheduled_at,
            completedAt: $training->completed_at ? Carbon::parse($training->completed_at) : null,
            postponed: $training->postponed,
            progress: $training->progress,
            mood: $training->mood,
            energyLevel: $training->energy_level,
            trainingPlan: $training->trainingPlan ? TrainingPlanData::fromModel($training->trainingPlan) : null,
            plannedExercises: $training->plannedExercises,
            completedSets: [],
            exerciseNotes: [],
        );
    }

    public static function createVirtual(Carbon $date, ?TrainingPlanData $trainingPlan = null): self
    {
        return new self(
            id: null,
            scheduledAt: $date->copy()->setTime(9, 0),
            completedAt: null,
            postponed: false,
            progress: 0,
            mood: null,
            energyLevel: null,
            trainingPlan: $trainingPlan,
            plannedExercises: [],
            completedSets: [],
            exerciseNotes: [],
        );
    }

    public function isVirtual(): bool
    {
        return $this->id === null;
    }

    public function isCompleted(): bool
    {
        return $this->completedAt !== null;
    }

    public function isInProgress(): bool
    {
        return !$this->isVirtual() && !$this->isCompleted() && !$this->postponed;
    }

    public function canStart(): bool
    {
        return $this->isVirtual() || $this->postponed;
    }

    public function getDurationMinutes(): ?int
    {
        if (!$this->completedAt || !$this->scheduledAt) {
            return null;
        }

        return (int) $this->scheduledAt->diffInMinutes($this->completedAt);
    }

    public function getFormattedDuration(): ?string
    {
        $minutes = $this->getDurationMinutes();
        if ($minutes === null) {
            return null;
        }

        $hours = intval($minutes / 60);
        $remainingMinutes = $minutes % 60;

        if ($hours > 0) {
            return "{$hours}h {$remainingMinutes}m";
        }

        return "{$remainingMinutes}m";
    }

    public function getStatusColor(): string
    {
        return match(true) {
            $this->isCompleted() => 'text-green-600',
            $this->isInProgress() => 'text-blue-600',
            $this->postponed => 'text-yellow-600',
            default => 'text-gray-600',
        };
    }

    public function getStatusText(): string
    {
        return match(true) {
            $this->isCompleted() => 'Completed',
            $this->isInProgress() => 'In Progress',
            $this->postponed => 'Postponed',
            default => 'Scheduled',
        };
    }

    public function getCompletedSetsCount(): int
    {
        return collect($this->completedSets)->sum(fn($sets) => count($sets));
    }

    public function getTotalPlannedSets(): int
    {
        return collect($this->plannedExercises)->sum(fn($exercise) => $exercise['sets'] ?? 0);
    }

    public function getProgressPercentage(): int
    {
        if (empty($this->plannedExercises)) {
            return 0;
        }

        $totalSets = $this->getTotalPlannedSets();
        if ($totalSets === 0) {
            return 0;
        }

        return min(100, intval(($this->getCompletedSetsCount() / $totalSets) * 100));
    }

    public function toLivewire(): array
    {
        return [
            'id' => $this->id,
            'scheduled_at' => $this->scheduledAt->toISOString(),
            'completed_at' => $this->completedAt?->toISOString(),
            'postponed' => $this->postponed,
            'progress' => $this->progress,
            'mood' => $this->mood,
            'energy_level' => $this->energyLevel,
            'training_plan' => $this->trainingPlan?->toLivewire(),
            'planned_exercises' => $this->plannedExercises,
            'completed_sets' => $this->completedSets,
            'exercise_notes' => $this->exerciseNotes,
        ];
    }

    public static function fromLivewire($value): self
    {
        return new self(
            id: $value['id'],
            scheduledAt: Carbon::parse($value['scheduled_at']),
            completedAt: $value['completed_at'] ? Carbon::parse($value['completed_at']) : null,
            postponed: $value['postponed'],
            progress: $value['progress'],
            mood: $value['mood'],
            energyLevel: $value['energy_level'],
            trainingPlan: $value['training_plan'] ? TrainingPlanData::fromLivewire($value['training_plan']) : null,
            plannedExercises: $value['planned_exercises'] ?? [],
            completedSets: $value['completed_sets'] ?? [],
            exerciseNotes: $value['exercise_notes'] ?? [],
        );
    }
} 