<?php

namespace App\Http\Controllers;

use App\Enums\Difficulty;
use App\Enums\Exercise;
use App\Enums\ExperienceLevel;
use App\Enums\TrainingGoal;
use App\Enums\TrainingTime;
use App\Models\Athlete;
use App\Models\PerformanceIndicator;
use App\Models\TrainingPlan;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class OnboardingController extends Controller
{
    /**
     * Show the profile setup page
     */
    public function profile(): \Illuminate\View\View
    {
        Gate::authorize('isAthlete');

        return view('onboarding.profile', [
            'user' => Auth::user(),
            'athlete' => Auth::user()->athlete,
            'onboarding' => Auth::user()->onboarding()
        ]);
    }

    /**
     * Store profile information
     */
    public function storeProfile(
        Request $request,
        #[CurrentUser] User $user
    ): \Illuminate\Http\RedirectResponse {
        Gate::authorize('isAthlete');

        $validated = $request->validate([
            'experience_level' => ['required', Rule::enum(ExperienceLevel::class)],
            'primary_goal' => ['required', Rule::enum(TrainingGoal::class)],
            'bio' => 'nullable|string|max:1000',
            'muscle_groups' => 'nullable|array',
            'muscle_groups.*' => ['string', Rule::enum(\App\Enums\MuscleGroup::class)],
            'top_squat' => 'nullable|integer|min:0|max:2000',
            'top_bench' => 'nullable|integer|min:0|max:2000',
            'top_deadlift' => 'nullable|integer|min:0|max:2000',
        ]);

        // updateOrCreate incase an athlete decides to onboard again
        $athlete = $user->athlete()->updateOrCreate(
            ['user_id' => $user->id],
            Arr::except($validated, ['top_squat', 'top_bench', 'top_deadlift'])
        );

        $this->createTopLiftsPerformanceIndicators($athlete, [
            'top_squat' => (int) $validated['top_squat'],
            'top_bench' => (int) $validated['top_bench'],
            'top_deadlift' => (int) $validated['top_deadlift'],
        ]);

        // Find next incomplete step or redirect to dashboard if all complete
        $nextStep = $this->getNextIncompleteStep($user);
        return redirect($nextStep)->with('success', 'Profile updated successfully!');
    }

    /**
     * Show the training plan selection page
     */
    public function plan(): \Illuminate\View\View
    {
        Gate::authorize('isAthlete');

        $athlete = Auth::user()->athlete;
        $allTrainingPlans = TrainingPlan::with('phases')->get();

        // Filter training plans based on athlete preferences (experience level, goal, muscle groups)
        $trainingPlans = $allTrainingPlans->filter(fn(TrainingPlan $plan) => $plan->isSuitableForAthlete($athlete));

        return view('onboarding.plan', [
            'user' => Auth::user(),
            'athlete' => $athlete,
            'onboarding' => Auth::user()->onboarding(),
            'trainingPlans' => $trainingPlans
        ]);
    }

    /**
     * Store selected training plan
     */
    public function storePlan(
        Request $request,
        #[CurrentUser] User $user
    ): \Illuminate\Http\RedirectResponse {
        Gate::authorize('isAthlete');

        $validated = $request->validate([
            'selected_plan_id' => 'required|exists:training_plans,id',
        ]);

        $user->athlete()->update(
            [
                'current_plan_id' => $validated['selected_plan_id'],
                'plan_start_date' => now(),
            ]
        );

        $nextStep = $this->getNextIncompleteStep($user);
        return redirect($nextStep)->with('success', 'Training plan selected!');
    }

    /**
     * Show the schedule setup page
     */
    public function schedule(): \Illuminate\View\View
    {
        Gate::authorize('isAthlete');

        return view('onboarding.schedule', [
            'user' => Auth::user(),
            'athlete' => Auth::user()->athlete,
            'onboarding' => Auth::user()->onboarding()
        ]);
    }

    /**
     * Store schedule preferences
     */
    public function storeSchedule(
        Request $request,
        #[CurrentUser] User $user
    ): \Illuminate\Http\RedirectResponse {
        Gate::authorize('isAthlete');

        $validated = $request->validate([
            'training_days' => 'required|array|min:1',
            'preferred_time' => ['required', Rule::enum(TrainingTime::class)],
            'session_duration' => 'required|integer|in:45,60,75,90,120',
        ]);

        $user->athlete()->update($validated);

        $nextStep = $this->getNextIncompleteStep($user);
        return redirect($nextStep)->with('success', 'Training schedule set!');
    }

    /**
     * Show the stats entry page
     */
    public function stats(): \Illuminate\View\View
    {
        Gate::authorize('isAthlete');

        return view('onboarding.stats', [
            'user' => Auth::user(),
            'athlete' => Auth::user()->athlete,
            'onboarding' => Auth::user()->onboarding()
        ]);
    }

    /**
     * Store current stats (optional step)
     */
    public function storeStats(
        Request $request,
        #[CurrentUser] User $user
    ): \Illuminate\Http\RedirectResponse {
        Gate::authorize('isAthlete');

        $validated = $request->validate([
            'current_bench' => 'nullable|integer|min:0|max:1000',
            'current_squat' => 'nullable|integer|min:0|max:1000',
            'current_deadlift' => 'nullable|integer|min:0|max:1000',
        ]);

        $this->createPerformanceIndicators($user->athlete, [
            'current_bench' => (int) $validated['current_bench'],
            'current_squat' => (int) $validated['current_squat'],
            'current_deadlift' => (int) $validated['current_deadlift'],
        ]);

        $nextStep = $this->getNextIncompleteStep($user);
        return redirect($nextStep)->with('success', 'Stats updated!');
    }

    /**
     * Show the preferences setup page
     */
    public function preferences(): \Illuminate\View\View
    {
        Gate::authorize('isAthlete');

        return view('onboarding.preferences', [
            'user' => Auth::user(),
            'athlete' => Auth::user()->athlete,
            'onboarding' => Auth::user()->onboarding()
        ]);
    }

    /**
     * Store preferences and potentially complete onboarding
     */
    public function storePreferences(
        Request $request,
        #[CurrentUser] User $user
    ): \Illuminate\Http\RedirectResponse {
        Gate::authorize('isAthlete');

        $validated = $request->validate([
            'notifications' => 'nullable|array',
            'difficulty_preference' => ['required', Rule::enum(Difficulty::class)],
        ]);

        $user->athlete()->update([
            'notification_preferences' => $validated['notifications'] ?? [],
            'difficulty_preference' => $validated['difficulty_preference']
        ]);

        // If all onboarding steps are now complete, run the final setup
        if ($user->onboarding()->finished()) {
            return redirect()->route('dashboard')->with('success', 'Welcome to your training journey! Your profile has been set up successfully.');
        }

        $nextStep = $this->getNextIncompleteStep($user);
        return redirect($nextStep)->with('success', 'Preferences saved!');
    }

    /**
     * Get the next incomplete onboarding step URL
     */
    private function getNextIncompleteStep(User $user): string
    {
        $onboarding = $user->onboarding();

        if ($onboarding->finished()) {
            return route('dashboard');
        }

        $nextStep = $onboarding->nextUnfinishedStep();

        // If no next step found but onboarding not finished, stay on current step
        if (!$nextStep) {
            return route('onboarding.profile');
        }

        return $nextStep->link;
    }

    /**
     * @param array<string, mixed> $stats
     */
    private function createPerformanceIndicators(Athlete $athlete, array $stats): void
    {
        foreach ($stats as $field => $value) {
            $exercise = match ($field) {
                'current_bench' => Exercise::BenchPress,
                'current_squat' => Exercise::BarbellBackSquat,
                'current_deadlift' => Exercise::Deadlift,
            };

            PerformanceIndicator::create([
                'athlete_id' => $athlete->id,
                'exercise' => $exercise,
                'label' => $exercise->displayName() . ' 1RM',
                'value' => $value,
                'unit' => 'kg',
                'type' => 'strength',
            ]);
        }
    }

    /**
     * Create performance indicators for top lifts from onboarding
     */
    private function createTopLiftsPerformanceIndicators(Athlete $athlete, array $stats): void
    {
        foreach ($stats as $field => $value) {
            $exercise = match ($field) {
                'top_bench' => Exercise::BenchPress,
                'top_squat' => Exercise::BarbellBackSquat,
                'top_deadlift' => Exercise::Deadlift,
            };

            PerformanceIndicator::create([
                'athlete_id' => $athlete->id,
                'exercise' => $exercise,
                'label' => $exercise->displayName() . ' 1RM',
                'value' => $value,
                'unit' => 'kg',
                'type' => 'strength',
            ]);
        }
    }
}
