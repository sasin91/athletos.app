<?php

namespace App\Http\Controllers;

use App\Enums\ExperienceLevel;
use App\Enums\ProgressionType;
use App\Enums\TrainingGoal;
use App\Managers\TrainingPlanManager;

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

    public function store(Request $request, TrainingPlanManager $trainingPlanManager, #[CurrentUser] User $user)
    {
        Gate::authorize('update', $user->athlete);

        $validated = $request->validate([
            'plan' => ['required', 'string', 'in:hypertrophy,powerlifting'],
            'experience_level' => ['required', Rule::enum(ExperienceLevel::class)],
        ]);

        $planDriver = $trainingPlanManager->driver($validated['plan']);
        $experienceLevel = ExperienceLevel::from($validated['experience_level']);
        
        // Build the plan with the driver
        $planData = $planDriver->buildPlan($experienceLevel);

        // Assign to athlete
        $athlete = $user->athlete;
        $athlete->current_plan = $validated['plan'];
        $athlete->plan_start_date = now();
        $athlete->save();

        return Redirect::route('dashboard')
            ->with('status', 'Training plan assigned successfully!');
    }

    public function show(string $plan, TrainingPlanManager $trainingPlanManager)
    {
        $planDriver = $trainingPlanManager->driver($plan);
        $phases = $planDriver->getPhases();
        
        return view('training-plans.show', [
            'planDriver' => $planDriver,
            'phases' => $phases,
            'plan' => $plan,
        ]);
    }
}
