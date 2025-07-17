<?php

namespace App\Livewire;

use App\Actions\CalculateWeightProgression;
use App\Data\WeightProgressions;
use App\Models\Athlete;
use Livewire\Component;

class WeightProgressionChart extends Component
{
    public Athlete $athlete;
    public ?WeightProgressions $weightProgressions = null;
    public int $weeks = 12;
    public ?string $selectedExercise = null;
    public ?string $timeframe = '12';

    public function mount(Athlete $athlete, int $weeks = 12)
    {
        $this->athlete = $athlete;
        $this->weeks = $weeks;
        $this->loadWeightProgressions();
    }

    public function loadWeightProgressions()
    {
        $calculator = new CalculateWeightProgression();
        $this->weightProgressions = $calculator->execute($this->athlete, $this->weeks);
        
        // Set default selected exercise
        if ($this->weightProgressions && $this->weightProgressions->hasData()) {
            $this->selectedExercise = $this->weightProgressions->progressions[0]->exercise->value ?? null;
        }
    }

    public function selectExercise(string $exerciseSlug)
    {
        $this->selectedExercise = $exerciseSlug;
    }

    public function setTimeframe(string $timeframe)
    {
        $this->timeframe = $timeframe;
        $this->weeks = (int) $timeframe;
        $this->loadWeightProgressions();
    }

    public function getSelectedProgressionProperty()
    {
        if (!$this->weightProgressions || !$this->selectedExercise) {
            return null;
        }

        $progressions = $this->weightProgressions->progressions ?? [];
        return collect($progressions)
            ->firstWhere('exercise.value', $this->selectedExercise);
    }

    public function getExercisesWithDataProperty()
    {
        if (!$this->weightProgressions) {
            return collect();
        }
        
        return collect($this->weightProgressions->progressions);
    }

    public function render()
    {
        return view('livewire.weight-progression-chart');
    }
} 