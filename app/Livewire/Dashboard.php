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
        if ($this->date === null) {
            return new Collection();
        }

        $dateIsPast = Carbon::today()->startOfDay()->greaterThan($this->date);

        if ($dateIsPast) {
            return $this->athlete->trainings()
                ->where('scheduled_at', '>=', $this->date->startOfDay())
                ->where('scheduled_at', '<=', $this->date->endOfDay())
                ->get()
                ->keyBy(fn(Training $training) => $training->scheduled_at->format('Y-m-d'));
        }

        return app(ComputePlannedTrainings::class)->execute($this->athlete, $this->date);
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
            phaseProgress: $phaseProgress,
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
        $dayNumber = $dayIndex !== false ? $dayIndex + 1 : 1;
        
        // If the day number exceeds the available exercise days, cycle back to day 1
        // This handles cases where athlete has more training days than exercise configurations
        $maxExerciseDay = 4; // Based on the seeder data
        if ($dayNumber > $maxExerciseDay) {
            $dayNumber = ((($dayNumber - 1) % $maxExerciseDay) + 1);
        }
        
        return $dayNumber;
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
