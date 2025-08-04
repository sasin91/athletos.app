<?php

namespace App\Data;

use App\Enums\Exercise;
use App\Models\Training;
use Carbon\Carbon;
use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Contracts\Support\Jsonable;

class TrainingSession implements Jsonable, Arrayable
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

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'scheduledAt' => $this->scheduledAt->toISOString(),
            'completedAt' => $this->completedAt?->toISOString(),
            'postponed' => $this->postponed,
            'progress' => $this->progress,
            'mood' => $this->mood,
            'energyLevel' => $this->energyLevel,
            'trainingPlan' => $this->trainingPlan?->toArray(),
            'plannedExercises' => $this->plannedExercises,
            'completedSets' => $this->completedSets,
            'exerciseNotes' => $this->exerciseNotes,
            // Computed properties for React components
            'isVirtual' => $this->isVirtual(),
            'isCompleted' => $this->isCompleted(),
            'isInProgress' => $this->isInProgress(),
            'canStart' => $this->canStart(),
            'durationMinutes' => $this->getDurationMinutes(),
            'formattedDuration' => $this->getFormattedDuration(),
            'statusColor' => $this->getStatusColor(),
            'statusText' => $this->getStatusText(),
            'completedSetsCount' => $this->getCompletedSetsCount(),
            'totalPlannedSets' => $this->getTotalPlannedSets(),
            'progressPercentage' => $this->getProgressPercentage(),
        ];
    }

    public function toJson($options = 0): string
    {
        return json_encode($this->toArray(), $options);
    }
} 