<?php

namespace App\Data;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Support\Jsonable;
use Illuminate\Contracts\Support\Arrayable;

class DashboardMetrics implements Jsonable, Arrayable
{
    public function __construct(
        public int $totalWorkouts,
        public int $currentStreak,
        public int $completedThisWeek,
        public int $weeklyGoal,
        public int $phaseProgress,
        public string $currentPhaseName,
        public int $currentPhaseWeek,
        public int $totalPhaseWeeks,
        public ?CarbonInterface $lastWorkoutDate = null,
        public ?CarbonInterface $nextWorkoutDate = null,
    ) {
    }

    public function getWeeklyProgressPercentage(): int
    {
        if ($this->weeklyGoal === 0) {
            return 0;
        }

        return min(100, intval(($this->completedThisWeek / $this->weeklyGoal) * 100));
    }

    public function getPhaseProgressPercentage(): int
    {
        if ($this->totalPhaseWeeks === 0) {
            return 0;
        }

        return min(100, intval(($this->currentPhaseWeek / $this->totalPhaseWeeks) * 100));
    }

    public function getWeeklyProgressColor(): string
    {
        $percentage = $this->getWeeklyProgressPercentage();
        
        return match(true) {
            $percentage >= 100 => 'text-green-600',
            $percentage >= 75 => 'text-blue-600',
            $percentage >= 50 => 'text-yellow-600',
            $percentage >= 25 => 'text-orange-600',
            default => 'text-red-600',
        };
    }

    public function getPhaseProgressColor(): string
    {
        $percentage = $this->getPhaseProgressPercentage();
        
        return match(true) {
            $percentage >= 100 => 'text-green-600',
            $percentage >= 75 => 'text-blue-600',
            $percentage >= 50 => 'text-yellow-600',
            $percentage >= 25 => 'text-orange-600',
            default => 'text-red-600',
        };
    }

    public function getStreakColor(): string
    {
        return match(true) {
            $this->currentStreak >= 7 => 'text-green-600',
            $this->currentStreak >= 3 => 'text-blue-600',
            $this->currentStreak >= 1 => 'text-yellow-600',
            default => 'text-gray-600',
        };
    }

    public function getStreakIcon(): string
    {
        return match(true) {
            $this->currentStreak >= 7 => '🔥',
            $this->currentStreak >= 3 => '⚡',
            $this->currentStreak >= 1 => '💪',
            default => '😴',
        };
    }

    public function getDaysSinceLastWorkout(): ?int
    {
        if (!$this->lastWorkoutDate) {
            return null;
        }

        return (int) Carbon::now()->diffInDays($this->lastWorkoutDate);
    }

    public function getDaysUntilNextWorkout(): ?int
    {
        if (!$this->nextWorkoutDate) {
            return null;
        }

        return (int) Carbon::now()->diffInDays($this->nextWorkoutDate, false);
    }

    public function isOnTrack(): bool
    {
        return $this->getWeeklyProgressPercentage() >= 75;
    }

    public function needsAttention(): bool
    {
        return $this->getWeeklyProgressPercentage() < 50;
    }

    public function toArray(): array
    {
        return [
            'totalWorkouts' => $this->totalWorkouts,
            'currentStreak' => $this->currentStreak,
            'completedThisWeek' => $this->completedThisWeek,
            'weeklyGoal' => $this->weeklyGoal,
            'phaseProgress' => $this->phaseProgress,
            'currentPhaseName' => $this->currentPhaseName,
            'currentPhaseWeek' => $this->currentPhaseWeek,
            'totalPhaseWeeks' => $this->totalPhaseWeeks,
            'lastWorkoutDate' => $this->lastWorkoutDate?->toISOString(),
            'nextWorkoutDate' => $this->nextWorkoutDate?->toISOString(),
            'weeklyProgressPercentage' => $this->getWeeklyProgressPercentage(),
            'phaseProgressPercentage' => $this->getPhaseProgressPercentage(),
            'weeklyProgressColor' => $this->getWeeklyProgressColor(),
            'phaseProgressColor' => $this->getPhaseProgressColor(),
            'streakColor' => $this->getStreakColor(),
            'streakIcon' => $this->getStreakIcon(),
            'daysSinceLastWorkout' => $this->getDaysSinceLastWorkout(),
            'daysUntilNextWorkout' => $this->getDaysUntilNextWorkout(),
            'isOnTrack' => $this->isOnTrack(),
            'needsAttention' => $this->needsAttention(),
        ];
    }

    public function toJson($options = 0): string
    {
        return json_encode($this->toArray(), $options);
    }
} 