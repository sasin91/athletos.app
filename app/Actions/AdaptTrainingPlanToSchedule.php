<?php

namespace App\Actions;

use App\Enums\Exercise;
use App\Models\Athlete;
use App\Models\TrainingPlan;
use App\Models\TrainingPhase;
use Carbon\Carbon;

class AdaptTrainingPlanToSchedule
{
    /**
     * Adapt a training plan to an athlete's schedule
     * 
     * @param TrainingPlan $plan
     * @param Athlete $athlete
     * @return array
     */
    public function execute(TrainingPlan $plan, Athlete $athlete): array
    {
        $adaptedPhases = [];
        $currentDate = Carbon::now();
        
        foreach ($plan->phases as $phase) {
            $adaptedPhase = $this->adaptPhaseToSchedule($phase, $athlete, $currentDate);
            $adaptedPhases[] = $adaptedPhase;
            
            // Update current date for next phase
            $currentDate = $adaptedPhase['end_date'];
        }
        
        $totalOriginalWeeks = $plan->phases->sum('duration_weeks');
        $totalAdaptedWeeks = $this->calculateTotalWeeks($adaptedPhases);
        $wasAdapted = $totalAdaptedWeeks > $totalOriginalWeeks;
        
        return [
            'original_plan' => $plan,
            'adapted_phases' => $adaptedPhases,
            'total_weeks' => $totalAdaptedWeeks,
            'original_weeks' => $totalOriginalWeeks,
            'was_adapted' => $wasAdapted,
            'schedule_notes' => $this->generateScheduleNotes($plan, $athlete, $wasAdapted, $totalAdaptedWeeks, $totalOriginalWeeks),
            'performance_warning' => $wasAdapted ? $this->getPerformanceWarning() : null,
        ];
    }
    
    /**
     * Adapt a single phase to the athlete's schedule
     * 
     * @param TrainingPhase $phase
     * @param Athlete $athlete
     * @param Carbon $startDate
     * @return array
     */
    private function adaptPhaseToSchedule(TrainingPhase $phase, Athlete $athlete, Carbon $startDate): array
    {
        $athleteTrainingDays = count($athlete->training_days ?? []);
        $phaseExercises = $phase->settings?->exercises ?? [];
        
        // Calculate how many training days this phase expects
        $expectedTrainingDays = $this->calculateExpectedTrainingDays($phaseExercises);
        
        // If athlete has fewer days, we need to spread the phase
        if ($athleteTrainingDays < $expectedTrainingDays) {
            return $this->spreadPhaseOverWeeks($phase, $athlete, $startDate, $expectedTrainingDays);
        }
        
        // If athlete has enough or more days, use original duration
        return [
            'phase' => $phase,
            'start_date' => $startDate,
            'end_date' => $startDate->copy()->addWeeks($phase->duration_weeks),
            'duration_weeks' => $phase->duration_weeks,
            'training_days_per_week' => $athleteTrainingDays,
            'adapted' => false,
            'notes' => null,
        ];
    }
    
    /**
     * Calculate how many training days a phase expects
     * 
     * @param array $exercises
     * @return int
     */
    private function calculateExpectedTrainingDays(array $exercises): int
    {
        // Group exercises by day based on muscle groups
        $days = [];
        
        foreach ($exercises as $exercise) {
            $muscleGroups = $this->getMuscleGroupsForExercise($exercise['exercise']);
            $dayKey = $this->determineTrainingDay($muscleGroups);
            $days[$dayKey] = true;
        }
        
        return count($days);
    }
    
    /**
     * Get muscle groups for an exercise
     * 
     * @param string $exerciseSlug
     * @return array
     */
    private function getMuscleGroupsForExercise(string $exerciseSlug): array
    {
        // This would ideally come from the Exercise enum, but for now we'll use a mapping
        // Use the Exercise enum's tags() method to get muscle groups
        $muscleGroupMapping = [];
        foreach (Exercise::cases() as $exercise) {
            $muscleGroupMapping[$exercise->value] = $exercise->tags();
        }
        
        return $muscleGroupMapping[$exerciseSlug] ?? ['general'];
    }
    
    /**
     * Determine training day based on muscle groups
     * 
     * @param array $muscleGroups
     * @return string
     */
    private function determineTrainingDay(array $muscleGroups): string
    {
        // Simple logic to group exercises by day
        if (in_array('chest', $muscleGroups) || in_array('triceps', $muscleGroups)) {
            return 'push';
        }
        
        if (in_array('back', $muscleGroups) || in_array('lats', $muscleGroups) || in_array('biceps', $muscleGroups)) {
            return 'pull';
        }
        
        if (in_array('quads', $muscleGroups) || in_array('glutes', $muscleGroups) || in_array('hamstrings', $muscleGroups)) {
            return 'legs';
        }
        
        if (in_array('shoulders', $muscleGroups)) {
            return 'shoulders';
        }
        
        if (in_array('recovery', $muscleGroups)) {
            return 'recovery';
        }
        
        return 'general';
    }
    
    /**
     * Spread a phase over multiple weeks when athlete has fewer training days
     * 
     * @param TrainingPhase $phase
     * @param Athlete $athlete
     * @param Carbon $startDate
     * @param int $expectedDays
     * @return array
     */
    private function spreadPhaseOverWeeks(TrainingPhase $phase, Athlete $athlete, Carbon $startDate, int $expectedDays): array
    {
        $athleteTrainingDays = count($athlete->training_days ?? []);
        $originalWeeks = $phase->duration_weeks;
        
        // Calculate how many weeks we need to spread this over
        $weeksNeeded = ceil(($expectedDays * $originalWeeks) / $athleteTrainingDays);
        
        // Ensure minimum of original duration
        $weeksNeeded = max($weeksNeeded, $originalWeeks);
        
        return [
            'phase' => $phase,
            'start_date' => $startDate,
            'end_date' => $startDate->copy()->addWeeks($weeksNeeded),
            'duration_weeks' => $weeksNeeded,
            'training_days_per_week' => $athleteTrainingDays,
            'adapted' => true,
            'notes' => "Phase adapted from {$originalWeeks} to {$weeksNeeded} weeks to fit your {$athleteTrainingDays}-day schedule",
        ];
    }
    
    /**
     * Calculate total weeks for the adapted plan
     * 
     * @param array $adaptedPhases
     * @return int
     */
    private function calculateTotalWeeks(array $adaptedPhases): int
    {
        return array_sum(array_column($adaptedPhases, 'duration_weeks'));
    }
    
    /**
     * Generate schedule notes for the athlete
     * 
     * @param TrainingPlan $plan
     * @param Athlete $athlete
     * @param bool $wasAdapted
     * @param int $totalAdaptedWeeks
     * @param int $totalOriginalWeeks
     * @return array
     */
    private function generateScheduleNotes(TrainingPlan $plan, Athlete $athlete, bool $wasAdapted, int $totalAdaptedWeeks, int $totalOriginalWeeks): array
    {
        $notes = [];
        $athleteTrainingDays = count($athlete->training_days ?? []);
        
        if ($wasAdapted) {
            $notes[] = "Your {$athleteTrainingDays}-day schedule has been accommodated by extending some phases.";
            $notes[] = "Total program duration: {$totalAdaptedWeeks} weeks (vs {$totalOriginalWeeks} weeks originally).";
        } else {
            $notes[] = "Your schedule fits perfectly with this training plan!";
        }
        
        $notes[] = "Training days: " . implode(', ', $athlete->training_days ?? []);
        $notes[] = "Session duration: {$athlete->session_duration} minutes";
        
        return $notes;
    }
    
    /**
     * Get performance warning for adapted plans
     * 
     * @return string
     */
    private function getPerformanceWarning(): string
    {
        return "⚠️ Note: Spreading training phases over additional weeks may yield less optimal results compared to the original program design. Consider increasing your training frequency if possible for better outcomes.";
    }
    
    /**
     * Get a weekly schedule for a specific phase
     * 
     * @param array $adaptedPhase
     * @param Athlete $athlete
     * @return array
     */
    public function getWeeklySchedule(array $adaptedPhase, Athlete $athlete): array
    {
        $phase = $adaptedPhase['phase'];
        $exercises = $phase->settings?->exercises ?? [];
        $athleteTrainingDays = count($athlete->training_days ?? []);
        
        // Group exercises by training day
        $weeklySchedule = [];
        
        foreach ($exercises as $exercise) {
            $muscleGroups = $this->getMuscleGroupsForExercise($exercise['exercise']);
            $dayKey = $this->determineTrainingDay($muscleGroups);
            
            if (!isset($weeklySchedule[$dayKey])) {
                $weeklySchedule[$dayKey] = [];
            }
            
            $weeklySchedule[$dayKey][] = $exercise;
        }
        
        // Distribute exercises across available training days
        return $this->distributeExercisesAcrossDays($weeklySchedule, $athleteTrainingDays, $athlete->training_days);
    }
    
    /**
     * Distribute exercises across available training days
     * 
     * @param array $weeklySchedule
     * @param int $availableDays
     * @param array $trainingDays
     * @return array
     */
    private function distributeExercisesAcrossDays(array $weeklySchedule, int $availableDays, array $trainingDays): array
    {
        $distributed = [];
        $dayIndex = 0;
        
        foreach ($weeklySchedule as $dayType => $exercises) {
            // If we have more day types than available days, combine some
            if ($dayIndex >= $availableDays) {
                // Add to the last available day
                $lastDay = $trainingDays[$availableDays - 1];
                if (!isset($distributed[$lastDay])) {
                    $distributed[$lastDay] = [];
                }
                $distributed[$lastDay] = array_merge($distributed[$lastDay], $exercises);
            } else {
                $day = $trainingDays[$dayIndex];
                $distributed[$day] = $exercises;
                $dayIndex++;
            }
        }
        
        return $distributed;
    }
} 