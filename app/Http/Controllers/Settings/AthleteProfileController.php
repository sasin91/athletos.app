<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Athlete;
use App\Enums\ExperienceLevel;
use App\Enums\MuscleGroup;
use App\Enums\TrainingGoal;
use App\Enums\TrainingTime;
use App\Enums\Difficulty;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\View\View;
use Inertia\Inertia;

class AthleteProfileController extends Controller
{
    public function edit(Request $request): \Inertia\Response|RedirectResponse
    {
        Gate::authorize('isAthlete');

        $athlete = $request->user()->athlete;

        if (!$athlete) {
            return redirect()->route('onboarding.profile');
        }

        return Inertia::render('settings/athlete-profile', [
            'athlete' => $athlete,
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
            'trainingTimes' => collect(TrainingTime::cases())->map(fn($time) => [
                'value' => $time->value,
                'label' => $time->getLabel(),
            ]),
            'difficulties' => collect(Difficulty::cases())->map(fn($difficulty) => [
                'value' => $difficulty->value,
                'label' => $difficulty->getLabel(),
                'description' => $difficulty->getDescription(),
            ]),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        Gate::authorize('isAthlete');

        $athlete = $request->user()->athlete;

        if (!$athlete) {
            return redirect()->route('onboarding.profile');
        }

        $validated = $request->validate([
            'experience_level' => ['required', 'in:' . implode(',', array_column(ExperienceLevel::cases(), 'value'))],
            'primary_goal' => ['required', 'in:' . implode(',', array_column(TrainingGoal::cases(), 'value'))],
            'bio' => 'nullable|string|max:1000',
            'muscle_groups' => 'nullable|array',
            'muscle_groups.*' => ['string', 'in:' . implode(',', array_column(\App\Enums\MuscleGroup::cases(), 'value'))],
            'training_days' => 'required|array|min:1',
            'training_days.*' => 'string|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
            'training_frequency' => 'nullable|string|in:2w,3w,4w',
            'preferred_time' => ['required', 'in:' . implode(',', array_column(TrainingTime::cases(), 'value'))],
            'session_duration' => 'required|integer|in:45,60,75,90,120',
            'difficulty_preference' => ['required', 'in:' . implode(',', array_column(Difficulty::cases(), 'value'))],
            'top_squat' => 'nullable|numeric|min:0|max:2000',
            'top_bench' => 'nullable|numeric|min:0|max:2000',
            'top_deadlift' => 'nullable|numeric|min:0|max:2000',
        ]);

        // Save athlete data (excluding top lifts)
        $athleteData = array_diff_key($validated, array_flip(['top_squat', 'top_bench', 'top_deadlift']));
        $athlete->fill($athleteData);
        $athlete->save();

        // Update performance indicators for top lifts
        $this->updateTopLiftsPerformanceIndicators($athlete, $validated);

        return to_route('settings.athlete-profile.edit')->with('status', __('Athlete profile updated successfully'));
    }

    /**
     * Update performance indicators for top lifts
     */
    private function updateTopLiftsPerformanceIndicators(Athlete $athlete, array $stats): void
    {
        $exercises = [
            'top_bench' => \App\Enums\Exercise::BenchPress,
            'top_squat' => \App\Enums\Exercise::BarbellBackSquat,
            'top_deadlift' => \App\Enums\Exercise::Deadlift,
        ];

        foreach ($exercises as $field => $exerciseEnum) {
            $value = $stats[$field] ?? null;

            if ($value !== null && $value > 0) {
                // Always use canonical exercise for consistency
                $canonicalExercise = $exerciseEnum->synonym();

                // Delete any existing performance indicator for this exercise (check both current and canonical)
                \App\Models\PerformanceIndicator::where('athlete_id', $athlete->id)
                    ->whereIn('exercise', [$exerciseEnum, $canonicalExercise])
                    ->where('type', 'strength')
                    ->where('label', '1RM')
                    ->delete();

                // Create new performance indicator using canonical exercise
                \App\Models\PerformanceIndicator::create([
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
}
