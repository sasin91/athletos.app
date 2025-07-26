<?php

namespace App\Http\Controllers;

use App\Actions\DetermineTrainingPhase;
use App\Actions\ComputePlannedExercises;
use App\Actions\ComputeTrainingDay;
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

        // Get planned exercises from the same source as Dashboard
        $day = app(ComputeTrainingDay::class)->execute($athlete);
        $plannedExercisesCollection = collect();
        
        if ($training->trainingPhase) {
            try {
                $plannedExercisesCollection = app(ComputePlannedExercises::class)->execute($training, $day);
            } catch (\Exception $e) {
                // If there's an error getting planned exercises, fall back to empty collection
                $plannedExercisesCollection = collect();
            }
        }
        
        // Convert planned exercises to the format expected by the React component
        $plannedExercises = $plannedExercisesCollection->map(function($exercise) {
            return [
                'exercise' => [
                    'value' => $exercise->exercise->value,
                    'displayName' => $exercise->exercise->displayName(),
                    'category' => $exercise->exercise->category()->value,
                    'difficulty' => $exercise->exercise->difficulty()->value,
                ],
                'exerciseSlug' => $exercise->exerciseSlug,
                'order' => $exercise->priority,
                'sets' => $exercise->sets,
                'reps' => $exercise->reps,
                'weight' => $exercise->weight,
                'restSeconds' => $exercise->restSeconds,
                'displayName' => $exercise->displayName,
                'category' => $exercise->category,
                'difficulty' => $exercise->difficulty,
                'tags' => $exercise->tags,
                'notes' => $exercise->notes,
                'cues' => $exercise->cues,
            ];
        })->toArray();
        
        // Create initial sets structure from planned exercises
        $sets = [];
        foreach ($plannedExercisesCollection as $exercise) {
            $exerciseSlug = $exercise->exerciseSlug;
            $sets[$exerciseSlug] = [];
            
            // Create initial sets based on planned sets
            for ($setNumber = 1; $setNumber <= $exercise->sets; $setNumber++) {
                $sets[$exerciseSlug][] = [
                    'setNumber' => $setNumber,
                    'reps' => null, // User will fill these in
                    'weight' => null,
                    'rpe' => null,
                    'timeSpent' => 0,
                    'explosiveness' => 0,
                    'notes' => '',
                    'meta' => [
                        'exercise' => [
                            'value' => $exercise->exercise->value,
                            'displayName' => $exercise->exercise->displayName(),
                            'category' => $exercise->exercise->category()->value,
                            'difficulty' => $exercise->exercise->difficulty()->value,
                        ],
                        'exerciseSlug' => $exercise->exerciseSlug,
                        'displayName' => $exercise->displayName,
                        'sets' => $exercise->sets,
                        'reps' => $exercise->reps,
                        'weight' => $exercise->weight,
                        'restSeconds' => $exercise->restSeconds,
                        'category' => $exercise->category,
                        'difficulty' => $exercise->difficulty,
                        'tags' => $exercise->tags,
                        'notes' => $exercise->notes,
                        'cues' => $exercise->cues,
                    ]
                ];
            }
        }
        
        // Create available exercises list (could be expanded to include more exercises)
        $allExercises = \App\Enums\Exercise::cases();
        $availableExercises = collect($allExercises)->map(function($exercise) {
            return [
                'exercise' => [
                    'value' => $exercise->value,
                    'displayName' => $exercise->displayName()
                ],
                'exerciseSlug' => strtolower(str_replace(' ', '_', $exercise->displayName())),
                'displayName' => $exercise->displayName(),
                'category' => $exercise->category()->value,
                'difficulty' => $exercise->difficulty()->value,
                'tags' => $exercise->tags(),
                'image' => null,
                'summary' => $exercise->description() ?? 'No description available'
            ];
        })->take(10)->toArray(); // Limit to first 10 for performance

        return Inertia::render('Training', [
            'training' => $training,
            'plannedExercises' => $plannedExercises,
            'sets' => $sets,
            'availableExercises' => $availableExercises,
            'totalTimerSeconds' => 0,
            'totalTimerStarted' => false,
            'isLoading' => false,
            'hasError' => false,
            'errorMessage' => null,
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
