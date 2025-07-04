<?php

namespace App\Livewire\Metrics;

use App\Models\Athlete;
use Livewire\Component;

class WeeklyGoal extends Component
{
    public Athlete $athlete;
    public array $progressMetrics;

    public function mount(Athlete $athlete, array $progressMetrics)
    {
        $this->athlete = $athlete;
        $this->progressMetrics = $progressMetrics;
    }

    public function refreshMetrics()
    {
        // This method can be called to refresh the progress metrics
        // when training progress is updated
        $this->dispatch('progress-updated');
    }

    public function getWeeklyProgressProperty()
    {
        return $this->progressMetrics['weeklyGoal'] > 0 
            ? ($this->progressMetrics['completedThisWeek'] / $this->progressMetrics['weeklyGoal']) * 100 
            : 0;
    }

    public function getGoalMessageProperty()
    {
        $remaining = $this->progressMetrics['weeklyGoal'] - $this->progressMetrics['completedThisWeek'];
        return $this->progressMetrics['completedThisWeek'] >= $this->progressMetrics['weeklyGoal']
            ? 'Goal achieved! Great work!'
            : $remaining . ' more training' . ($remaining > 1 ? 's' : '') . ' to reach your goal';
    }

    public function render()
    {
        return view('livewire.metrics.weekly-goal');
    }
} 