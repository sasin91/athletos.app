<?php

namespace App\Http\Controllers;

use App\Enums\ExperienceLevel;
use App\Enums\ProgressionType;
use App\Enums\TrainingGoal;
use App\Models\TrainingPlan;
use App\Models\TrainingPhase;
use App\Models\User;
use App\Settings\ExerciseConfig;
use App\Settings\TrainingPhaseSettings;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Illuminate\Http\Response;

class TrainingPlanController extends Controller
{
    public function assign(TrainingPlan $trainingPlan, #[CurrentUser] User $user)
    {
        Gate::authorize('update', $user->athlete);

        $athlete = $user->athlete;
        $athlete->current_plan_id = $trainingPlan->id;
        $athlete->plan_start_date = now();
        $athlete->save();

        return Redirect::route('dashboard')->with('status', 'Training plan assigned successfully!');
    }

    public function create(#[CurrentUser] User $user): Response
    {
        Gate::authorize('create', TrainingPlan::class);

        return inertia('training-plans/create');
    }

    public function store(Request $request, #[CurrentUser] User $user)
    {
        Gate::authorize('create', TrainingPlan::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:1000'],
            'goal' => ['required', Rule::enum(TrainingGoal::class)],
            'experience_level' => ['required', Rule::enum(ExperienceLevel::class)],
            'default_progression_type' => ['required', Rule::enum(ProgressionType::class)],
            'default_progression_rate' => ['required', 'numeric', 'min:0.1', 'max:50'],
            'easy_progression_rate' => ['nullable', 'numeric', 'min:0.1', 'max:50'],
            'medium_progression_rate' => ['nullable', 'numeric', 'min:0.1', 'max:50'],
            'hard_progression_rate' => ['nullable', 'numeric', 'min:0.1', 'max:50'],
            'phases' => ['required', 'array', 'min:1', 'max:8'],
            'phases.*.name' => ['required', 'string', 'max:255'],
            'phases.*.description' => ['nullable', 'string', 'max:500'],
            'phases.*.duration_weeks' => ['required', 'integer', 'min:1', 'max:12'],
            'phases.*.progression_type' => ['nullable', Rule::enum(ProgressionType::class)],
            'phases.*.progression_rate' => ['nullable', 'numeric', 'min:0.1', 'max:50'],
            'phases.*.exercises' => ['required', 'array', 'min:1'],
            'phases.*.exercises.*.exercise' => ['required', 'string'],
            'phases.*.exercises.*.sets' => ['required', 'integer', 'min:1', 'max:10'],
            'phases.*.exercises.*.reps' => ['required', 'string', 'max:50'],
            'phases.*.exercises.*.weight' => ['required', 'string', 'max:50'],
            'phases.*.exercises.*.rest_seconds' => ['required', 'integer', 'min:30', 'max:600'],
            'phases.*.exercises.*.day' => ['required', 'integer', 'min:1', 'max:7'],
            'phases.*.exercises.*.notes' => ['nullable', 'string', 'max:500'],
        ]);

        // Create the training plan
        $trainingPlan = TrainingPlan::create([
            'name' => $validated['name'],
            'description' => $validated['description'],
            'goal' => TrainingGoal::from($validated['goal']),
            'experience_level' => ExperienceLevel::from($validated['experience_level']),
            'default_progression_type' => ProgressionType::from($validated['default_progression_type']),
            'default_progression_rate' => $validated['default_progression_rate'],
            'easy_progression_rate' => $validated['easy_progression_rate'],
            'medium_progression_rate' => $validated['medium_progression_rate'],
            'hard_progression_rate' => $validated['hard_progression_rate'],
        ]);

        // Create the training phases
        foreach ($validated['phases'] as $index => $phaseData) {
            $exercises = [];
            foreach ($phaseData['exercises'] as $exerciseData) {
                $exercises[] = new ExerciseConfig(
                    exercise: $exerciseData['exercise'],
                    sets: $exerciseData['sets'],
                    reps: $exerciseData['reps'],
                    weight: $exerciseData['weight'],
                    rest_seconds: $exerciseData['rest_seconds'],
                    notes: $exerciseData['notes'],
                    day: $exerciseData['day']
                );
            }

            $phaseSettings = new TrainingPhaseSettings(exercises: $exercises);

            TrainingPhase::create([
                'training_plan_id' => $trainingPlan->id,
                'name' => $phaseData['name'],
                'description' => $phaseData['description'],
                'duration_weeks' => $phaseData['duration_weeks'],
                'order' => $index,
                'progression_type' => isset($phaseData['progression_type']) ? ProgressionType::from($phaseData['progression_type']) : null,
                'progression_rate' => $phaseData['progression_rate'],
                'settings' => $phaseSettings,
            ]);
        }

        return Redirect::route('training-plans.show', $trainingPlan)
            ->with('status', 'Custom training plan created successfully!');
    }

    public function show(TrainingPlan $trainingPlan)
    {
        Gate::authorize('view', $trainingPlan);

        $trainingPlan->load('phases');

        return Inertia::render('training-plans/show', [
            'trainingPlan' => $trainingPlan,
        ]);
    }
}
