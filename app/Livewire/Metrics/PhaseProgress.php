<?php

namespace App\Livewire\Metrics;

use App\Data\ProgressMetrics;
use App\Models\Athlete;
use Livewire\Component;

class PhaseProgress extends Component
{
    public Athlete $athlete;
    public ProgressMetrics $progressMetrics;

    public function mount(Athlete $athlete, ProgressMetrics $progressMetrics)
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

    public function render()
    {
        return view('livewire.metrics.phase-progress');
    }
} 