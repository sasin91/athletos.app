<?php

namespace App\Livewire;

use App\Enums\ExperienceLevel;
use App\Enums\TrainingGoal;
use App\Models\TrainingPlan as TrainingPlanModel;
use Livewire\Attributes\Computed;
use Livewire\Component;

class TrainingPlan extends Component
{
    public ?int $selectedPlanId = null;
    public ?TrainingPlanModel $selectedPlan = null;
    public ?string $goal = null;
    public ?string $experience = null;

    public function mount($currentPlanId = null)
    {
        if ($currentPlanId) {
            $this->selectedPlanId = $currentPlanId;
            $this->loadSelectedPlan();
        }
    }

    public function updatedSelectedPlanId($planId)
    {
        $this->loadSelectedPlan();

        // Dispatch event so parent can update form state
        $this->dispatch('plan-selected', planId: $planId);
    }

    private function loadSelectedPlan()
    {
        $this->selectedPlan = TrainingPlanModel::with(['phases' => function ($query) {
            $query->orderBy('order');
        }])->find($this->selectedPlanId);
    }

    public function plans()
    {
        $query = TrainingPlanModel::with(['phases' => function ($query) {
            $query->orderBy('order');
        }]);

        if ($this->goal) {
            $query->where('goal', $this->goal);
        }

        if ($this->experience) {
            $query->where('experience_level', $this->experience);
        }

        return $query->orderBy('default_progression_rate')->get();
    }

    #[Computed]
    public function goals()
    {
        return collect(TrainingGoal::cases())->mapWithKeys(function ($goal) {
            return [$goal->value => [
                'label' => $goal->getLabel(),
                'description' => $goal->getDescription()
            ]];
        });
    }

    #[Computed]
    public function experienceLevels()
    {
        $experienceLevels = [];

        foreach (ExperienceLevel::cases() as $level) {
            $experienceLevels[$level->value] = [
                'label' => $level->getLabel(),
                'description' => $level->getDescription()
            ];
        }

        return $experienceLevels;
    }

    public function render()
    {
        $plans = $this->plans();

        return view('livewire.training-plan', [
            'plans' => $plans,
        ]);
    }
} 