<?php

namespace App\Http\Controllers;

use App\Enums\ExperienceLevel;
use App\Enums\ProgressionType;
use App\Enums\TrainingGoal;
use App\Enums\TrainingPlan;
use App\Models\User;
use App\Settings\ExerciseConfig;
use App\Settings\TrainingPhaseSettings;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;

class TrainingPlanController extends Controller
{
    public function assign(string $plan, #[CurrentUser] User $user)
    {
        Gate::authorize('update', $user->athlete);

        $athlete = $user->athlete;
        $athlete->current_plan = $plan;
        $athlete->plan_start_date = now();
        $athlete->save();

        return Redirect::route('dashboard')->with('status', 'Training plan assigned successfully!');
    }

    public function create(#[CurrentUser] User $user)
    {
        Gate::authorize('update', $user->athlete);
        
        return view('training-plans.create');
    }

    public function store(Request $request, #[CurrentUser] User $user)
    {
        Gate::authorize('update', $user->athlete);

        $validated = $request->validate([
            'plan' => ['required', 'string', TrainingPlan::validationRule()],
            'experience_level' => ['required', Rule::enum(ExperienceLevel::class)],
        ]);

        $trainingPlan = TrainingPlan::from($validated['plan']);
        $experienceLevel = ExperienceLevel::from($validated['experience_level']);
        
        // Get plan implementation
        $planImplementation = $trainingPlan->getImplementation();

        // Assign to athlete
        $athlete = $user->athlete;
        $athlete->current_plan = $validated['plan'];
        $athlete->plan_start_date = now();
        $athlete->save();

        return Redirect::route('dashboard')
            ->with('status', 'Training plan assigned successfully!');
    }

    public function show(string $plan)
    {
        $trainingPlan = TrainingPlan::from($plan);
        $phases = $trainingPlan->getPhases();
        
        return view('training-plans.show', [
            'trainingPlan' => $trainingPlan,
            'phases' => $phases,
            'plan' => $plan,
        ]);
    }
}
