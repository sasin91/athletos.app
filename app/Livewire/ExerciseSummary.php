<?php

namespace App\Livewire;

use App\Actions\ComputePlannedTrainings;
use App\Data\ExerciseSummaryItem;
use App\Data\PlannedExercise;
use App\Models\Athlete;
use App\Models\Training;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Livewire\Attributes\Computed;
use Livewire\Attributes\On;
use Livewire\Component;

/**
 * @property Collection<int, ExerciseSummaryItem> $summary
 */
class ExerciseSummary extends Component
{
    public Athlete $athlete;
    public Collection $trainings;
    public ?Carbon $date = null;
    public bool $show = false;

    #[Computed]
    public function summary(): Collection
    {
        if ($this->date === null) {
            return new Collection();
        }

        if ($this->trainings->has($this->date->format('Y-m-d')) === false) {
            return new Collection();
        }

        /** @var Training $training */
        $training = $this->trainings[$this->date->format('Y-m-d')];

        if ($training->id === null) {
            return $training
                ->getPlannedExercises($this->getTrainingDayNumber($training))
                ->map(function (PlannedExercise $exercise) {
                    return new ExerciseSummaryItem(
                        name: $exercise->exercise->displayName(),
                        sets: $exercise->sets,
                        reps: $exercise->reps,
                        weight: $exercise->weight
                    );
                });
        }

        return $training->exercises()
            ->completed()
            ->select('exercise_enum', 'reps', 'weight')
            ->get()
            ->groupBy('exercise_enum')
            ->map(function (EloquentCollection $exerciseGroup) {
                $firstExercise = $exerciseGroup->first();
                return new ExerciseSummaryItem(
                    name: $firstExercise->exercise_enum->displayName(),
                    sets: $exerciseGroup->count(),
                    reps: $exerciseGroup->pluck('reps')->implode('-'),
                    weight: $firstExercise->weight ?? 'Body weight'
                );
            });
    }

    /**
     * Determine which training day number this session represents
     */
    private function getTrainingDayNumber(Training $training): int
    {
        $trainingDays = $this->athlete->training_days ?? [];
        
        if (empty($trainingDays)) {
            return 1; // Default to day 1 if no training days set
        }
        
        $dayOfWeek = strtolower($training->scheduled_at->format('l')); // 'monday', 'tuesday', etc.
        
        // Find the index of this day in the training days array
        $dayIndex = array_search($dayOfWeek, $trainingDays);
        
        // Return 1-based index (day 1, day 2, etc.) or default to 1
        return $dayIndex !== false ? $dayIndex + 1 : 1;
    }

    #[On('show')]
    public function show($date)
    {
        $this->date = Carbon::parse($date);
        $this->show = true;
    }

    public function mount(Athlete $athlete, Collection $trainings): void
    {
        $this->athlete = $athlete;
        $this->trainings = $trainings;
    }

    public function hide()
    {
        $this->show = false;
    }

    public function render()
    {
        return view('livewire.exercise-summary');
    }
}
