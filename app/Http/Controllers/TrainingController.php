<?php

namespace App\Http\Controllers;

use App\Actions\DetermineTrainingPhase;
use App\Enums\TrainingPlan;
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
            ->orderBy('scheduled_at', 'desc')
            ->paginate(20);

        return view('trainings.index', compact('trainings'));
    }

    public function store(Request $request, #[CurrentUser] User $user): \Illuminate\Http\RedirectResponse
    {
        Gate::authorize('create', Training::class);
        
        $request->validate([
            'plan' => ['required', 'string', TrainingPlan::validationRule()],
            'scheduled_at' => 'required|date',
        ]);

        $athlete = $user->athlete;
        $scheduledAt = Carbon::parse($request->scheduled_at);
        
        $training = Training::create([
            'athlete_id' => $athlete->id,
            'plan' => $request->plan,
            'scheduled_at' => $request->scheduled_at,
        ]);

        return redirect()->route('trainings.show', $training);
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
