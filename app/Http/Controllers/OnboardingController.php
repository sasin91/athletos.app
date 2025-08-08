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
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Response;
use Inertia\Inertia;

class OnboardingController extends Controller
{
    /**
     * Show the profile setup page
     */
    public function profile(): Response
    {
        Gate::authorize('isAthlete');

        return inertia('onboarding/profile', [
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
    ): RedirectResponse {
        Gate::authorize('isAthlete');

        $validated = $request->validate([
            'experience_level' => ['required', Rule::enum(ExperienceLevel::class)],
            'primary_goal' => ['required', Rule::enum(TrainingGoal::class)],
            'bio' => 'nullable|string|max:1000',
            'muscle_groups' => 'nullable|array',
            'muscle_groups.*' => ['string', Rule::enum(MuscleGroup::class)],
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

        // Note: Athlete was already updated above, just need to redirect
        return $this->next($user, 'Profile updated successfully!');
    }

    /**
     * Show the training plan selection page
     */
    public function plan(): Response
    {
        Gate::authorize('isAthlete');

        $trainingPlans = TrainingPlan::with('phases')->get();

        return inertia('onboarding/plan', [
            'trainingPlans' => $trainingPlans
        ]);
    }

    /**
     * Store selected training plan
     */
    public function storePlan(
        Request $request,
        #[CurrentUser] User $user
    ): RedirectResponse {
        Gate::authorize('isAthlete');

        $validated = $request->validate([
            'selected_plan_id' => 'required|exists:training_plans,id',
        ]);

        return $this->next($user, 'Training plan selected!', [
            'current_plan_id' => $validated['selected_plan_id'],
            'plan_start_date' => now(),
        ]);
    }

    /**
     * Show the schedule setup page
     */
    public function schedule(): Response
    {
        Gate::authorize('isAthlete');

        return inertia('onboarding/schedule', [
            'athlete' => Auth::user()->athlete,
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
    ): RedirectResponse {
        Gate::authorize('isAthlete');

        $validated = $request->validate([
            'training_days' => 'required|array|min:1',
            'training_frequency' => 'nullable|string|in:1w,2w,3w,4w',
            'preferred_time' => ['required', Rule::enum(TrainingTime::class)],
            'session_duration' => 'required|integer|in:45,60,75,90,120',
        ]);

        return $this->next($user, 'Training schedule set!', $validated);
    }

    /**
     * Show the stats entry page
     */
    public function stats(): Response
    {
        Gate::authorize('isAthlete');

        return inertia('onboarding/stats');
    }

    /**
     * Store current stats (optional step)
     */
    public function storeStats(
        Request $request,
        #[CurrentUser] User $user
    ): RedirectResponse {
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

        // Refresh and redirect (no athlete update needed, just performance indicators)
        return $this->next($user, 'Stats updated!');
    }

    /**
     * Show the preferences setup page
     */
    public function preferences(): Response
    {
        Gate::authorize('isAthlete');

        return inertia('onboarding/preferences', [
            'athlete' => Auth::user()->athlete,
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
    ): RedirectResponse {
        Gate::authorize('isAthlete');

        $validated = $request->validate([
            'notifications' => 'nullable|array',
            'difficulty_preference' => ['required', Rule::enum(Difficulty::class)],
        ]);

        $user->athlete()->update([
            'notification_preferences' => $validated['notifications'] ?? [],
            'difficulty_preference' => $validated['difficulty_preference']
        ]);

        // Refresh the user model to ensure onboarding status is current
        $user->refresh();
        $user->load('athlete');

        // If all onboarding steps are now complete, run the final setup
        if ($user->onboarding()->finished()) {
            return redirect()->route('dashboard')->with('success', 'Welcome to your training journey! Your profile has been set up successfully.');
        }

        $nextStep = $this->getNextIncompleteStep($user);
        return redirect($nextStep)->with('success', 'Preferences saved!');
    }

    /**
     * Update athlete data (if provided) and redirect to next onboarding step
     */
    private function next(User $user, string $successMessage, array $attributes = []): RedirectResponse
    {
        if (filled($attributes)) {
            $user->athlete()->update($attributes);
        }

        // Refresh the user model to ensure onboarding status is current
        $user->refresh();
        $user->load('athlete');

        $nextStep = $this->getNextIncompleteStep($user);
        return redirect($nextStep)->with('success', $successMessage);
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
