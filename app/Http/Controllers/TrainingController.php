<?php

namespace App\Http\Controllers;

use App\Actions\DetermineTrainingPhase;
use App\Models\Training;
use App\Models\User;
use App\Actions\CalculateTrainingOffset;
use App\Actions\SuggestRecoveryExercises;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\View\View;
use Inertia\Inertia;
use Inertia\Response;

class TrainingController extends Controller
{
    public function __construct(
        private CalculateTrainingOffset $calculateTrainingOffset,
    ) {}

    public function index(#[CurrentUser] User $user): Response
    {
        Gate::authorize('viewAny', Training::class);
        $athlete = $user->athlete;

        // Get all trainings for the athlete, paginated
        $trainings = Training::where('athlete_id', $athlete->id)
            ->with(['trainingPlan'])
            ->orderBy('scheduled_at', 'desc')
            ->paginate(20);

        return Inertia::render('Trainings/Index', [
            'trainings' => $trainings
        ]);
    }

    public function store(Request $request, #[CurrentUser] User $user): \Illuminate\Http\RedirectResponse
    {
        Gate::authorize('create', Training::class);

        $request->validate([
            'training_plan_id' => 'required|exists:training_plans,id',
            'scheduled_at' => 'required|date',
        ]);

        $athlete = $user->athlete;
        $scheduledAt = Carbon::parse($request->scheduled_at);

        // Determine the training phase for this athlete
        $trainingPhase = app(DetermineTrainingPhase::class)->execute($athlete, $scheduledAt);

        $training = Training::create([
            'athlete_id' => $athlete->id,
            'training_plan_id' => $request->training_plan_id,
            'training_phase_id' => $trainingPhase?->id,
            'scheduled_at' => $request->scheduled_at,
        ]);

        return redirect()->route('trainings.show', $training);
    }

    public function show(Training $training, #[CurrentUser] User $user): Response
    {
        Gate::authorize('view', $training);

        $athlete = $user->athlete;
        
        // Load the training with relationships
        $training->load([
            'trainingPlan',
            'trainingPhase',
            'exercises' => function($query) {
                $query->orderBy('created_at');
            }
        ]);

        return Inertia::render('Training', [
            'training' => $training,
            'athlete' => $athlete,
        ]);
    }

    public function complete(
        Training $training,
        SuggestRecoveryExercises $suggestRecoveryExercises
    ): View {
        Gate::authorize('viewComplete', $training);

        return view('trainings.complete', [
            'training' => $training,
            'recoveryExercises' => $suggestRecoveryExercises->execute($training)
        ]);
    }
}
