<?php

namespace App\Http\Controllers;

use App\Actions\DetermineTrainingPhase;
use App\Models\Training;
use App\Models\User;
use App\Actions\CalculateTrainingOffset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Illuminate\Container\Attributes\CurrentUser;

class TrainingController extends Controller
{
    public function __construct(
        private CalculateTrainingOffset $calculateTrainingOffset,
    ) {}

    public function index(#[CurrentUser] User $user): \Illuminate\View\View|\Illuminate\Http\RedirectResponse
    {
        Gate::authorize('viewAny', Training::class);
        $athlete = $user->athlete;

        // Get all trainings for the athlete, paginated
        $trainings = Training::where('athlete_id', $athlete->id)
            ->with(['trainingPlan'])
            ->orderBy('scheduled_at', 'desc')
            ->paginate(20);

        return view('trainings.index', compact('trainings'));
    }

    public function show(Training $training): \Illuminate\View\View
    {
        Gate::authorize('view', $training);

        // Load the training with all necessary relationships
        $training->load([
            'trainingPlan',
            'athlete.user'
        ]);

        return view('trainings.show', compact('training'));
    }

    /**
     * Create a new training session form
     * Generates exercises and form for today's workout
     */
    public function create(#[CurrentUser] User $user)
    {
        Gate::authorize('create', Training::class);

        $athlete = $user->athlete;
        $today = Carbon::now();
        
        // Check if athlete has a current training plan
        if (!$athlete->currentPlan) {
            return redirect()->route('dashboard')->with('error', 'Please select a training plan first.');
        }

        // Remove $dayOfWeek logic and use next uncompleted or most recent completed training if needed
        // (Implementation depends on the context of this method)
        // If you want to fetch the next uncompleted training:
        // $nextUncompleted = $athlete->trainings()->orderBy('scheduled_at')->get()->first(fn($t) => $t->completed_at === null);
        // If you want the most recent completed:
        // $lastCompleted = $athlete->trainings()->orderBy('scheduled_at')->get()->whereNotNull('completed_at')->last();
        // Use as needed in your controller logic.

        // (Removed $dayOfWeek and $trainingDays logic)

        // Check if training should occur on this date based on offset
        $startDate = $athlete->plan_start_date ? \Carbon\Carbon::instance($athlete->plan_start_date) : Carbon::now();
        if (!$this->calculateTrainingOffset->shouldTrainOnDate($athlete->training_frequency, $today, $startDate)) {
            return redirect()->route('dashboard')->with('info', 'This is a recovery week. No training scheduled for today.');
        }

        // Check if a training session already exists for today
        $existingTraining = Training::where('athlete_id', $athlete->id)
            ->whereDate('scheduled_at', $today)
            ->first();

        if ($existingTraining) {
            // Redirect to existing training session
            return redirect()->route('trainings.show', $existingTraining);
        }

        $training = new Training();
        // Determine which training day this is
        $allTrainings = $athlete->trainings()->orderBy('scheduled_at')->get();
        $index = $allTrainings->search(fn($t) => $t->id === $training->id);
        $trainingDayNumber = $index !== false ? $index + 1 : 1;
        
        $training->setRelation('trainingPlan', $athlete->currentPlan);

        $trainingPhase = app(DetermineTrainingPhase::class)->execute(
            $athlete,
            $today,
        );
        $training->setRelation('trainingPhase', $trainingPhase);
        
        // Get planned exercises for this specific training day
        $plannedExercises = $training->getPlannedExercises($trainingDayNumber);

        return view('trainings.create', [
            'athlete' => $athlete,
            'trainingPlan' => $athlete->currentPlan,
            'plannedExercises' => $plannedExercises,
            'date' => $today,
        ]);
    }

    /**
     * Store a new training session
     * Creates the Training model when the user actually starts training
     */
    public function store(Request $request, #[CurrentUser] User $user, \App\Actions\DetermineTrainingPhase $determineTrainingPhase)
    {
        Gate::authorize('create', Training::class);
        $athlete = $user->athlete;

        $validated = $request->validate([
            'training_plan_id' => 'required|exists:training_plans,id',
            'scheduled_at' => 'required|date',
        ]);

        $scheduledAt = Carbon::parse($validated['scheduled_at']);

        // Check if a training session already exists for this date
        $existingTraining = Training::where('athlete_id', $athlete->id)
            ->whereDate('scheduled_at', $scheduledAt)
            ->first();

        if ($existingTraining) {
            // Redirect to existing training session
            return redirect()->route('trainings.show', $existingTraining);
        }

        // Determine the current training phase for this date using method injection
        $trainingPhase = $determineTrainingPhase->execute($athlete, $scheduledAt);
        if (!$trainingPhase) {
            return redirect()->route('dashboard')->with('error', 'No training phase found for this date.');
        }

        // Create a new training session
        $training = Training::create([
            'athlete_id' => $athlete->id,
            'training_plan_id' => $validated['training_plan_id'],
            'training_phase_id' => $trainingPhase->id,
            'scheduled_at' => $scheduledAt,
            'postponed' => false,
            'reschedule_reason' => null,
        ]);

        // Redirect to the new training session
        return redirect()->route('trainings.show', $training)->with('success', 'Training session started!');
    }
}
