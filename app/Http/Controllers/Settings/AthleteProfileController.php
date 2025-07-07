<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Athlete;
use App\Enums\ExperienceLevel;
use App\Enums\TrainingGoal;
use App\Enums\TrainingTime;
use App\Enums\Difficulty;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\View\View;

class AthleteProfileController extends Controller
{
    public function edit(Request $request): View|RedirectResponse
    {
        Gate::authorize('isAthlete');
        
        $athlete = $request->user()->athlete;
        
        if (!$athlete) {
            return redirect()->route('onboarding.profile');
        }

        return view('settings.athlete-profile', [
            'athlete' => $athlete,
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
            'top_squat' => 'nullable|integer|min:0|max:2000',
            'top_bench' => 'nullable|integer|min:0|max:2000',
            'top_deadlift' => 'nullable|integer|min:0|max:2000',
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
                // Delete any existing performance indicator for this exercise to avoid duplicates
                \App\Models\PerformanceIndicator::where('athlete_id', $athlete->id)
                    ->where('exercise', $exerciseEnum)
                    ->where('type', 'strength')
                    ->delete();

                // Create new performance indicator
                \App\Models\PerformanceIndicator::create([
                    'athlete_id' => $athlete->id,
                    'exercise' => $exerciseEnum,
                    'label' => $exerciseEnum->oneRepMaxDisplayName() . ' 1RM',
                    'value' => $value,
                    'unit' => 'lbs',
                    'type' => 'strength',
                ]);
            }
        }
    }
} 