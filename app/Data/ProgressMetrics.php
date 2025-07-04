<?php

namespace App\Data;

use Livewire\Wireable;

class ProgressMetrics implements Wireable
{
    public function __construct(
        public int $totalWorkouts,
        public int $currentStreak,
        public int $weeklyGoal,
        public int $completedThisWeek,
        public int $phaseProgress,
        public int $phaseWeek,
        public int $totalPhaseWeeks,
    ) {
    }

    public function toLivewire(): array
    {
        return [
            'totalWorkouts' => $this->totalWorkouts,
            'currentStreak' => $this->currentStreak,
            'weeklyGoal' => $this->weeklyGoal,
            'completedThisWeek' => $this->completedThisWeek,
            'phaseProgress' => $this->phaseProgress,
            'phaseWeek' => $this->phaseWeek,
            'totalPhaseWeeks' => $this->totalPhaseWeeks,
        ];
    }

    public static function fromLivewire($value): self
    {
        return new self(
            totalWorkouts: $value['totalWorkouts'],
            currentStreak: $value['currentStreak'],
            weeklyGoal: $value['weeklyGoal'],
            completedThisWeek: $value['completedThisWeek'],
            phaseProgress: $value['phaseProgress'],
            phaseWeek: $value['phaseWeek'],
            totalPhaseWeeks: $value['totalPhaseWeeks'],
        );
    }

    public function weeklyProgressPercentage(): float
    {
        if ($this->weeklyGoal === 0) {
            return 0;
        }
        
        return min(100, ($this->completedThisWeek / $this->weeklyGoal) * 100);
    }

    public function phaseProgressPercentage(): float
    {
        if ($this->totalPhaseWeeks === 0) {
            return 0;
        }
        
        return min(100, ($this->phaseWeek / $this->totalPhaseWeeks) * 100);
    }

    public function isOnTrack(): bool
    {
        return $this->completedThisWeek >= $this->weeklyGoal;
    }

    public function needsCatchUp(): bool
    {
        return $this->completedThisWeek < $this->weeklyGoal;
    }
} 