<?php

namespace App\Data;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Livewire\Wireable;

class DashboardMetrics implements Wireable
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

    public function toLivewire(): array
    {
        return [
            'total_workouts' => $this->totalWorkouts,
            'current_streak' => $this->currentStreak,
            'completed_this_week' => $this->completedThisWeek,
            'weekly_goal' => $this->weeklyGoal,
            'phase_progress' => $this->phaseProgress,
            'current_phase_name' => $this->currentPhaseName,
            'current_phase_week' => $this->currentPhaseWeek,
            'total_phase_weeks' => $this->totalPhaseWeeks,
            'last_workout_date' => $this->lastWorkoutDate?->toISOString(),
            'next_workout_date' => $this->nextWorkoutDate?->toISOString(),
        ];
    }

    public static function fromLivewire($value): self
    {
        return new self(
            totalWorkouts: $value['total_workouts'],
            currentStreak: $value['current_streak'],
            completedThisWeek: $value['completed_this_week'],
            weeklyGoal: $value['weekly_goal'],
            phaseProgress: $value['phase_progress'],
            currentPhaseName: $value['current_phase_name'],
            currentPhaseWeek: $value['current_phase_week'],
            totalPhaseWeeks: $value['total_phase_weeks'],
            lastWorkoutDate: $value['last_workout_date'] ? Carbon::parse($value['last_workout_date']) : null,
            nextWorkoutDate: $value['next_workout_date'] ? Carbon::parse($value['next_workout_date']) : null,
        );
    }
} 