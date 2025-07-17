<?php

namespace App\Livewire;

use App\Actions\CalculateWeightProgression;
use App\Actions\ComputeCurrentStreak;
use App\Actions\ComputePlannedExercises;
use App\Actions\ComputeTrainingDay;
use App\Actions\DetermineTrainingPhase;
use App\Data\DashboardMetrics;
use App\Data\OneRepMax;
use App\Data\OneRepMaxes;
use App\Data\WeightProgressions;
use App\Enums\Exercise;
use App\Models\Athlete;
use App\Models\PerformanceIndicator;
use App\Models\Training;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Livewire\Component;
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

    public function mount(Athlete $athlete): void
    {
        $this->athlete = $athlete;
        $this->date = Carbon::today();
    }

    public function startTraining(): void
    {
        $dateKey = $this->date->format('Y-m-d');
        $training = $this->training->get($dateKey);

        if ($training->exists === false) {
            $training->save();
        }

        $this->redirect(route('trainings.show', $training));
    }

    #[Computed]
    public function plannedExercises(): Collection
    {
        return app(ComputePlannedExercises::class)->execute(
            training: $this->training->last(),
            day: $this->trainingDay
        );
    }

    #[Computed]
    public function trainingDay(): int
    {
        return app(ComputeTrainingDay::class)->execute($this->athlete);
    }

    #[Computed]
    public function training(): Collection
    {
        $trainings = [];

        /** @var Collection<int, Training> $allTrainings */
        $allTrainings = $this->athlete->trainings()->orderBy('scheduled_at')->get();

        foreach ($allTrainings as $training) {
            $trainings[$training->scheduled_at->format('Y-m-d')] = $training;
        }

        $dateKey = $this->date->format('Y-m-d');

        if (isset($trainings[$dateKey]) === false) {
            $training = new Training();
            $training->scheduled_at = $this->date;
            $training->athlete()->associate($this->athlete);
            $training->trainingPlan()->associate($this->athlete->currentPlan);
            $trainingPhase = app(DetermineTrainingPhase::class)->execute($this->athlete, Carbon::today());
            $training->trainingPhase()->associate($trainingPhase);

            $trainings[$dateKey] = $training;
        }

        return new Collection($trainings);
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
