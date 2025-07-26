<?php

namespace App\Http\Controllers;

use App\Actions\CalculateWeightProgression;
use App\Actions\ComputeCurrentStreak;
use App\Actions\ComputePlannedExercises;
use App\Actions\ComputeTrainingDay;
use App\Actions\DetermineTrainingPhase;
use App\Data\DashboardMetrics;
use App\Data\OneRepMax;
use App\Data\OneRepMaxes;
use App\Enums\Exercise;
use App\Models\PerformanceIndicator;
use App\Models\Training;
use App\Models\User;
use App\Traits\HasTrainingPhaseProgress;
use Carbon\Carbon;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    use AuthorizesRequests, HasTrainingPhaseProgress;

    /**
     * Display the dashboard
     */
    public function index(Request $request, #[CurrentUser] User $user): Response
    {
        Gate::authorize('isAthlete');

        $athlete = $user->athlete;
        $date = $request->get('date') ? Carbon::parse($request->get('date')) : Carbon::today();
        $timeframe = (int) ($request->get('timeframe', 12));

        // Get training for the selected date
        $training = $this->getTraining($athlete, $date);
        
        // Calculate metrics
        $metrics = $this->getMetrics($athlete, $date);
        
        // Get planned exercises for today
        $plannedExercises = app(ComputePlannedExercises::class)->execute(
            training: $training,
            day: app(ComputeTrainingDay::class)->execute($athlete)
        );

        // Get weight progressions
        $weightProgressions = app(CalculateWeightProgression::class)->execute($athlete, $timeframe);

        // Get 1RM data
        $oneRepMaxes = $this->getOneRepMaxes($athlete);

        // Get recovery exercises if there's a completed workout today
        $recoveryExercises = collect();
        if ($date->isToday()) {
            $todaysCompletedTraining = $athlete->trainings()
                ->whereDate('scheduled_at', $date)
                ->whereNotNull('completed_at')
                ->first();
                
            if ($todaysCompletedTraining) {
                $recoveryExercises = app(\App\Actions\SuggestRecoveryExercises::class)->execute($todaysCompletedTraining);
            }
        }

        return Inertia::render('Dashboard', [
            'athlete' => $athlete,
            'metrics' => $metrics,
            'weightProgressions' => $weightProgressions,
            'plannedExercises' => $plannedExercises->map(fn($exercise) => [
                'name' => $exercise->exercise->displayName(),
                'sets' => $exercise->sets,
                'reps' => $exercise->reps,
                'weight' => $exercise->weight
            ]),
            'oneRepMaxes' => $oneRepMaxes,
            'recoveryExercises' => $recoveryExercises->map(fn($exercise) => [
                'name' => $exercise->displayName()
            ]),
            'date' => $date->toISOString(),
            'formattedDate' => $date->format('M j, Y'),
        ]);
    }

    /**
     * Start a training session
     */
    public function startTraining(Request $request, #[CurrentUser] User $user)
    {
        Gate::authorize('isAthlete');

        $athlete = $user->athlete;
        $date = $request->get('date') ? Carbon::parse($request->get('date')) : Carbon::today();
        
        $training = $this->getTraining($athlete, $date);
        
        if (!$training->exists) {
            $training->save();
        }

        return redirect()->route('trainings.show', $training);
    }

    private function getTraining($athlete, Carbon $date): Training
    {
        $existingTraining = $athlete->trainings()
            ->whereDate('scheduled_at', $date)
            ->first();

        if ($existingTraining) {
            return $existingTraining;
        }

        $training = new Training();
        $training->scheduled_at = $date;
        $training->athlete()->associate($athlete);
        $training->trainingPlan()->associate($athlete->currentPlan);
        
        if ($athlete->currentPlan) {
            $trainingPhase = app(DetermineTrainingPhase::class)->execute($athlete, $date);
            $training->trainingPhase()->associate($trainingPhase);
        }

        return $training;
    }

    private function getMetrics($athlete, Carbon $date): DashboardMetrics
    {
        $trainingDaysPerWeek = count($athlete->training_days ?? []);
        $currentPhase = $this->getCurrentPhase($athlete);
        $totalPhaseWeeks = $athlete->trainingPlan
            ? $athlete->trainingPlan->phases->sum(fn($phase) => $phase['weeks'] ?? $phase['duration_weeks'] ?? 0)
            : 0;
        $phaseProgress = $this->getPhaseProgress($athlete);
        $currentPhaseWeek = $this->getCompletedTrainingWeeks($athlete);
        $currentPhaseName = $currentPhase['name'] ?? 'Training Phase';

        return new DashboardMetrics(
            totalWorkouts: $athlete->trainings()->count(),
            currentStreak: app(ComputeCurrentStreak::class)->execute($athlete, $date),
            completedThisWeek: $athlete->trainings()
                ->whereBetween('scheduled_at', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()])
                ->whereNotNull('completed_at')
                ->count(),
            weeklyGoal: $trainingDaysPerWeek,
            phaseProgress: (int) $phaseProgress,
            currentPhaseName: $currentPhaseName,
            currentPhaseWeek: $currentPhaseWeek,
            totalPhaseWeeks: $totalPhaseWeeks,
            lastWorkoutDate: $athlete->trainings()
                ->whereNotNull('completed_at')
                ->orderBy('completed_at', 'desc')
                ->value('scheduled_at'),
            nextWorkoutDate: $athlete->trainings()
                ->whereNull('completed_at')
                ->orderBy('scheduled_at')
                ->value('scheduled_at'),
        );
    }

    private function getOneRepMaxes($athlete): OneRepMaxes
    {
        $exercises = Exercise::mainLifts();
        $oneRepMaxes = [];

        foreach ($exercises as $exercise) {
            $current1RM = $this->getCurrent1RM($athlete, $exercise);
            $previous1RM = $this->getPrevious1RM($athlete, $exercise);

            $oneRepMaxes[] = new OneRepMax(
                exercise: $exercise,
                current: $current1RM,
                previous: $previous1RM,
                change: $current1RM - $previous1RM
            );
        }

        return new OneRepMaxes($oneRepMaxes);
    }

    private function getCurrent1RM($athlete, Exercise $exercise)
    {
        $indicator = PerformanceIndicator::where('athlete_id', $athlete->id)
            ->where('exercise', $exercise)
            ->latest()
            ->first();

        return $indicator ? $indicator->value : 0;
    }

    private function getPrevious1RM($athlete, Exercise $exercise)
    {
        $indicator = PerformanceIndicator::where('athlete_id', $athlete->id)
            ->where('exercise', $exercise)
            ->where('created_at', '<=', Carbon::now()->subMonth())
            ->latest()
            ->first();

        return $indicator ? $indicator->value : 0;
    }
} 