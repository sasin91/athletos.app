<?php

namespace App\Data;

use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Contracts\Support\Jsonable;

class ProgressMetrics implements Jsonable, Arrayable
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

    public function toArray(): array
    {
        return [
            'totalWorkouts' => $this->totalWorkouts,
            'currentStreak' => $this->currentStreak,
            'weeklyGoal' => $this->weeklyGoal,
            'completedThisWeek' => $this->completedThisWeek,
            'phaseProgress' => $this->phaseProgress,
            'phaseWeek' => $this->phaseWeek,
            'totalPhaseWeeks' => $this->totalPhaseWeeks,
            // Computed properties for React components
            'weeklyProgressPercentage' => $this->weeklyProgressPercentage(),
            'phaseProgressPercentage' => $this->phaseProgressPercentage(),
            'isOnTrack' => $this->isOnTrack(),
            'needsCatchUp' => $this->needsCatchUp(),
        ];
    }

    public function toJson($options = 0): string
    {
        return json_encode($this->toArray(), $options);
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