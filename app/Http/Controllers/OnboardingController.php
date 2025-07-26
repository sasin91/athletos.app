<?php

namespace App\Http\Controllers;

use App\Enums\Difficulty;
use App\Enums\Exercise;
use App\Enums\ExperienceLevel;
use App\Enums\MuscleGroup;
use App\Enums\TrainingGoal;
use App\Enums\TrainingTime;
use App\Enums\Weekday;
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
use Inertia\Inertia;

class OnboardingController extends Controller
{
    /**
     * Show the profile setup page
     */
    public function profile(): \Inertia\Response
    {
        Gate::authorize('isAthlete');

        return Inertia::render('Onboarding/Profile', [
            'user' => Auth::user(),
            'athlete' => Auth::user()->athlete,
            'onboarding' => Auth::user()->onboarding(),
            'experienceLevels' => collect(ExperienceLevel::cases())->map(fn($level) => [
                'value' => $level->value,
                'label' => $level->getLabel(),
                'description' => $level->getDescription(),
            ]),
            'trainingGoals' => collect(TrainingGoal::cases())->map(fn($goal) => [
                'value' => $goal->value,
                'label' => $goal->getLabel(),
                'description' => $goal->getDescription(),
            ]),
            'muscleGroups' => collect(MuscleGroup::onboardingOptions())->map(fn($group) => [
                'value' => $group->value,
                'label' => $group->label(),
            ]),
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
    public function plan(): \Inertia\Response
    {
        Gate::authorize('isAthlete');

        $athlete = Auth::user()->athlete;
        $allTrainingPlans = TrainingPlan::with('phases')->get();

        // Filter training plans based on athlete preferences (experience level, goal, muscle groups)
        $trainingPlans = $allTrainingPlans->filter(fn(TrainingPlan $plan) => $plan->isSuitableForAthlete($athlete));

        return Inertia::render('Onboarding/Plan', [
            'user' => Auth::user(),
            'athlete' => $athlete,
            'onboarding' => Auth::user()->onboarding(),
            'trainingPlans' => $trainingPlans->values()
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
    public function schedule(): \Inertia\Response
    {
        Gate::authorize('isAthlete');

        return Inertia::render('Onboarding/Schedule', [
            'user' => Auth::user(),
            'athlete' => Auth::user()->athlete,
            'onboarding' => Auth::user()->onboarding(),
            'weekdays' => collect(Weekday::cases())->map(fn($day) => [
                'value' => $day->value,
                'label' => $day->label('en'),
            ]),
            'trainingTimes' => collect(TrainingTime::cases())->map(fn($time) => [
                'value' => $time->value,
                'label' => $time->getLabel(),
                'timeRange' => $time->getTimeRange(),
            ]),
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
            'training_frequency' => 'nullable|string|in:2w,3w,4w',
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
    public function stats(): \Inertia\Response
    {
        Gate::authorize('isAthlete');

        return Inertia::render('Onboarding/Stats', [
            'user' => Auth::user(),
            'athlete' => Auth::user()->athlete,
            'onboarding' => Auth::user()->onboarding(),
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
    public function preferences(): \Inertia\Response
    {
        Gate::authorize('isAthlete');

        return Inertia::render('Onboarding/Preferences', [
            'user' => Auth::user(),
            'athlete' => Auth::user()->athlete,
            'onboarding' => Auth::user()->onboarding(),
            'difficulties' => collect(Difficulty::cases())->map(fn($difficulty) => [
                'value' => $difficulty->value,
                'label' => $difficulty->getLabel(),
                'description' => $difficulty->getDescription(),
            ]),
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

            // Always use canonical exercise for consistency
            $canonicalExercise = $exercise->synonym();

            PerformanceIndicator::create([
                'athlete_id' => $athlete->id,
                'exercise' => $canonicalExercise,
                'label' => '1RM',
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

            // Always use canonical exercise for consistency
            $canonicalExercise = $exercise->synonym();

            PerformanceIndicator::create([
                'athlete_id' => $athlete->id,
                'exercise' => $canonicalExercise,
                'label' => '1RM',
                'value' => $value,
                'unit' => 'kg',
                'type' => 'strength',
            ]);
        }
    }
}
