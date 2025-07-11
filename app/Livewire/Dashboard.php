<?php

namespace App\Livewire;

use App\Actions\CalculateWeightProgression;
use App\Actions\ComputeCurrentStreak;
use App\Actions\ComputePlannedExercises;
use App\Actions\ComputePlannedTrainings;
use App\Actions\DetermineTrainingPhase;
use App\Calculations\WeightProgressionCalculator;
use App\Data\CalendarDay;
use App\Data\DashboardMetrics;
use App\Data\OneRepMax;
use App\Data\OneRepMaxes;
use App\Data\ProgressMetrics;
use App\Data\WeightProgression;
use App\Data\WeightProgressions;
use App\Enums\CalendarDayType;
use App\Enums\Exercise;
use App\Models\Athlete;
use App\Models\PerformanceIndicator;
use App\Models\Training;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Livewire\Component;
use Livewire\Attributes\On;
use Livewire\Attributes\Computed;
use App\Traits\HasTrainingPhaseProgress;

/**
 * @property-read int $totalWorkouts
 * @property-read int $currentStreak
 * @property-read int $completedThisWeek
 * @property-read int $weeklyGoal
 * @property-read int $phaseProgress
 * @property-read string $currentPhaseName
 * @property-read int $currentPhaseWeek
 * @property-read int $totalPhaseWeeks
 * @property-read \Illuminate\Support\Collection $completedTrainings
 * @property-read \Illuminate\Support\Collection $allTrainingsForCurrentPlan
 * @property-read \Illuminate\Support\Collection $training
 * @property-read WeightProgressions $weightProgressions
 * @property-read DashboardMetrics $metrics
 */
class Dashboard extends Component
{
    use HasTrainingPhaseProgress;

    public Athlete $athlete;
    public ?Carbon $date = null;

    #[Computed]
    public function training(): Collection
    {
        // Instead of filtering by date or day of week, always show the next not completed workout
        // or the most recent uncompleted one, regardless of the day.
        /** @var Collection<int, Training> $allTrainings */
        $allTrainings = $this->athlete->trainings()->orderBy('scheduled_at')->get();
        /** @var Training|null $nextUncompleted */
        $nextUncompleted = $allTrainings->first(function (Training $training) {
            return $training->completed_at === null;
        });

        if ($nextUncompleted) {
            // Only show the next uncompleted training
            return collect([$nextUncompleted->scheduled_at->format('Y-m-d') => $nextUncompleted]);
        }

        // If all trainings are completed, show the most recent one
        /** @var Training|null $lastCompleted */
        $lastCompleted = $allTrainings->whereNotNull('completed_at')->last();
        if ($lastCompleted) {
            return collect([$lastCompleted->scheduled_at->format('Y-m-d') => $lastCompleted]);
        }

        // Fallback: empty collection
        return new Collection();
    }

    #[Computed]
    public function weightProgressions(): WeightProgressions
    {
        return app(CalculateWeightProgression::class)->execute($this->athlete);
    }

    #[Computed]
    public function metrics(): DashboardMetrics
    {
        $trainingDaysPerWeek = count($this->athlete->training_days ?? []);
        $currentPhase = $this->getCurrentPhase($this->athlete);
        $totalPhaseWeeks = $this->athlete->trainingPlan 
            ? $this->athlete->trainingPlan->phases->sum(fn($phase) => $phase['weeks'] ?? $phase['duration_weeks'] ?? 0) 
            : 0;
        $phaseProgress = $this->getPhaseProgress($this->athlete);
        $currentPhaseWeek = $this->getCompletedTrainingWeeks($this->athlete);
        $currentPhaseName = $currentPhase['name'] ?? 'Training Phase';

        return new DashboardMetrics(
            totalWorkouts: $this->athlete->trainings()->count(),
            currentStreak: app(ComputeCurrentStreak::class)->execute($this->athlete, $this->date),
            completedThisWeek: $this->athlete->trainings()
                ->whereBetween('scheduled_at', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()])
                ->whereNotNull('completed_at')
                ->count(),
            weeklyGoal: $trainingDaysPerWeek,
            phaseProgress: (int) $phaseProgress,
            currentPhaseName: $currentPhaseName,
            currentPhaseWeek: $currentPhaseWeek,
            totalPhaseWeeks: $totalPhaseWeeks,
            lastWorkoutDate: $this->athlete->trainings()
                ->whereNotNull('completed_at')
                ->orderBy('completed_at', 'desc')
                ->value('scheduled_at'),
            nextWorkoutDate: $this->training->first()?->scheduled_at,
        );
    }

    public function mount(Athlete $athlete): void
    {
        $this->athlete = $athlete;
        $this->date = Carbon::today();
    }

    public function subDay(): void
    {
        $this->date = $this->date->copy()->subDay();
    }

    public function today(): void
    {
        $this->date = Carbon::today();
    }

    public function addDay(): void
    {
        $this->date = $this->date->copy()->addDay();
    }

    #[Computed]
    public function plannedExercises(): Collection
    {
        if ($this->date === null || $this->training->isEmpty()) {
            return new Collection();
        }

        // Get the training for the specific date
        $dateKey = $this->date->format('Y-m-d');
        /** @var Training|null $training */
        $training = $this->training->get($dateKey);
        
        if (!$training) {
            return new Collection();
        }
        
        if ($training->id === null) {
            // For planned trainings, get the planned exercises
            $trainingDayNumber = $this->getTrainingDayNumber($training);
            return $training->getPlannedExercises($trainingDayNumber);
        }

        // For completed trainings, get the completed exercises
        return $training->exercises()
            ->completed()
            ->select('exercise_enum', 'reps', 'weight')
            ->get()
            ->groupBy('exercise_enum')
            ->map(function ($exerciseGroup) {
                $firstExercise = $exerciseGroup->first();
                return (object) [
                    'exercise' => $firstExercise->exercise_enum,
                    'sets' => $exerciseGroup->count(),
                    'reps' => $exerciseGroup->pluck('reps')->implode('-'),
                    'weight' => $firstExercise->weight ?? 'Body weight'
                ];
            });
    }

    #[Computed]
    public function todaysCompletedTraining(): ?Training
    {
        /** @var Training|null $training */
        $training = $this->athlete->trainings()
            ->whereDate('scheduled_at', $this->date)
            ->whereNotNull('completed_at')
            ->first();
            
        return $training;
    }

    #[Computed]
    public function hasTodaysWorkoutCompleted(): bool
    {
        return $this->todaysCompletedTraining() !== null;
    }

    #[Computed]
    public function recoveryExercises(): Collection
    {
        $completedTraining = $this->todaysCompletedTraining();
        
        if (!$completedTraining) {
            return new Collection();
        }

        // Get recovery suggestions based on completed exercises
        return app(\App\Actions\SuggestRecoveryExercises::class)->execute($completedTraining);
    }

    private function getTrainingDayNumber(Training $training): int
    {
        // Instead of using day of week, use the order of the training in the plan
        /** @var Collection<int, Training> $allTrainings */
        $allTrainings = $this->athlete->trainings()->orderBy('scheduled_at')->get();
        $index = $allTrainings->search(fn(Training $t) => $t->id === $training->id);
        return $index !== false ? $index + 1 : 1;
    }

    #[Computed]
    public function oneRepMaxes(): OneRepMaxes
    {
        $exercises = Exercise::mainLifts();
        $oneRepMaxes = [];

        foreach ($exercises as $exercise) {
            $current1RM = $this->getCurrent1RM($exercise);
            $previous1RM = $this->getPrevious1RM($exercise);

            $oneRepMaxes[] = new OneRepMax(
                exercise: $exercise,
                current: $current1RM,
                previous: $previous1RM,
                change: $current1RM - $previous1RM
            );
        }

        return new OneRepMaxes($oneRepMaxes);
    }

    private function getCurrent1RM(Exercise $exercise)
    {
        $indicator = PerformanceIndicator::where('athlete_id', $this->athlete->id)
            ->where('exercise', $exercise)
            ->latest()
            ->first();

        return $indicator ? $indicator->value : 0;
    }

    private function getPrevious1RM(Exercise $exercise)
    {
        $indicator = PerformanceIndicator::where('athlete_id', $this->athlete->id)
            ->where('exercise', $exercise)
            ->where('created_at', '<=', Carbon::now()->subMonth())
            ->latest()
            ->first();

        return $indicator ? $indicator->value : 0;
    }

    #[Computed]
    public function currentPhaseName(): string
    {
        $currentPhase = $this->getCurrentPhase($this->athlete);
        return $currentPhase['name'] ?? 'No Plan';
    }

    #[Computed]
    public function currentPhaseWeek(): int
    {
        return $this->getCompletedTrainingWeeks($this->athlete);
    }

    #[Computed]
    public function selectedDateWeek(): int
    {
        if (!$this->date || !$this->athlete->plan_start_date) {
            return 0;
        }

        $startDate = Carbon::parse($this->athlete->plan_start_date)->startOfDay();
        $selectedDate = $this->date->startOfDay();
        
        // If selected date is before plan start, return 0
        if ($selectedDate->lt($startDate)) {
            return 0;
        }

        $daysDiff = $startDate->diffInDays($selectedDate);
        $trainingDaysPerWeek = count($this->athlete->training_days ?? []);
        
        if ($trainingDaysPerWeek === 0) {
            return 0;
        }

        return (int) floor($daysDiff / 7) + 1;
    }

    #[Computed]
    public function dayNumber(): int
    {
        $dateKey = $this->date?->format('Y-m-d');
        $training = $this->training->get($dateKey) ?? null;
        if (!$training) {
            return 1;
        }
        return $this->getTrainingDayNumber($training);
    }

    #[Computed]
    public function formattedDate(): string
    {
        if (!$this->date) {
            return '';
        }
        
        return $this->date->format('M j, Y');
    }

    public function render(): \Illuminate\View\View
    {
        return view('livewire.dashboard');
    }
}
