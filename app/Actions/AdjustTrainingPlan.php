<?php

namespace App\Actions;

use App\Models\TrainingPlan;
use App\Models\Athlete;
use App\Models\Training;
use Illuminate\Support\Facades\DB;

class AdjustTrainingPlan
{
    public function execute(int $athleteId, array $adjustments, string $adjustmentReason): array
    {
        return DB::transaction(function () use ($athleteId, $adjustments, $adjustmentReason) {
            $athlete = Athlete::findOrFail($athleteId);
            $currentPlan = $athlete->currentPlan;
            
            if (!$currentPlan) {
                throw new \Exception('Athlete does not have a current training plan to adjust');
            }

            // Create a duplicate of the current plan
            $adjustedPlan = $this->duplicateTrainingPlan($currentPlan, $adjustments);
            
            // Update athlete's current plan
            $athlete->update(['current_plan_id' => $adjustedPlan->id]);
            
            // Find any unfinished training sessions and update them to the new plan
            $unfinishedTrainings = Training::where('athlete_id', $athleteId)
                ->where('training_plan_id', $currentPlan->id)
                ->whereNull('completed_at')
                ->get();
                
            foreach ($unfinishedTrainings as $training) {
                // Find corresponding phase in the new plan
                $correspondingPhase = $adjustedPlan->phases()
                    ->where('order', $training->trainingPhase->order)
                    ->first();
                    
                if ($correspondingPhase) {
                    $training->update([
                        'training_plan_id' => $adjustedPlan->id,
                        'training_phase_id' => $correspondingPhase->id,
                    ]);
                }
            }

            return [
                'success' => true,
                'original_plan_id' => $currentPlan->id,
                'new_plan_id' => $adjustedPlan->id,
                'plan_name' => $adjustedPlan->name,
                'adjustments_made' => $adjustments,
                'adjustment_reason' => $adjustmentReason,
                'unfinished_trainings_updated' => $unfinishedTrainings->count(),
                'message' => "Successfully adjusted training plan. Created '{$adjustedPlan->name}' with your requested modifications."
            ];
        });
    }

    private function duplicateTrainingPlan(TrainingPlan $originalPlan, array $adjustments): TrainingPlan
    {
        // Create new plan with adjustments - only use fillable attributes
        $newPlanData = $originalPlan->only($originalPlan->getFillable());
        unset($newPlanData['id'], $newPlanData['created_at'], $newPlanData['updated_at']);
        
        // Apply name adjustment
        $newPlanData['name'] = $originalPlan->name . ' (Adjusted - ' . now()->format('M j') . ')';
        
        // Apply any direct plan adjustments - only allow fillable fields
        $allowedFields = ['name', 'description', 'goal', 'experience_level'];
        foreach ($allowedFields as $field) {
            if (isset($adjustments[$field])) {
                $newPlanData[$field] = $adjustments[$field];
            }
        }

        $newPlan = TrainingPlan::create($newPlanData);

        // Duplicate all phases with adjustments
        foreach ($originalPlan->phases as $phase) {
            $newPhaseData = $phase->only($phase->getFillable());
            unset($newPhaseData['id'], $newPhaseData['created_at'], $newPhaseData['updated_at']);
            $newPhaseData['training_plan_id'] = $newPlan->id;
            
            // Apply phase-specific adjustments if provided
            if (isset($adjustments['phases'][$phase->order])) {
                $phaseAdjustments = $adjustments['phases'][$phase->order];
                foreach ($phaseAdjustments as $key => $value) {
                    if (in_array($key, ['name', 'description', 'duration_weeks', 'settings'])) {
                        $newPhaseData[$key] = $value;
                    } elseif ($key === 'exercises') {
                        // Handle exercise modifications by updating the settings
                        $currentSettings = $phase->settings ?? new \App\Settings\TrainingPhaseSettings();
                        $newSettings = new \App\Settings\TrainingPhaseSettings(
                            exercises: $value,
                            notes: $currentSettings->notes,
                            metadata: $currentSettings->metadata
                        );
                        $newPhaseData['settings'] = $newSettings;
                    }
                }
            }
            
            $newPlan->phases()->create($newPhaseData);
        }

        return $newPlan->fresh(['phases']);
    }
}