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
            'training_phase_id' => $trainingPhase->id,
            'scheduled_at' => $request->scheduled_at,
        ]);

        return redirect()->route('trainings.show', $training);
    }
}
