<?php

namespace App\Actions;

use App\Enums\Exercise as ExerciseEnum;
use App\Models\Exercise;
use App\Models\Training;
use Illuminate\Support\Facades\DB;

class CompleteTraining
{
    public function execute(
        Training $training,
        array $exercises,
        ?string $mood,
        ?int $energyLevel,
        ?string $difficulty = null,
        ?int $overallRating = null,
        ?int $difficultyLevel = null,
        ?string $notes = null
    ): void {
        DB::transaction(function () use ($training, $exercises, $mood, $energyLevel, $difficulty, $overallRating, $difficultyLevel, $notes) {
            // Record completed sets directly to the database
            foreach ($exercises as $exerciseSlug => $exerciseData) {
                if (!is_array($exerciseData)) {
                    continue;
                }

                $exerciseEnum = ExerciseEnum::from($exerciseSlug);

                foreach ($exerciseData as $setNumber => $setData) {
                    // Only record if at least reps or weight is provided
                    if (!empty($setData['reps']) || !empty($setData['weight'])) {
                        $training->exercises()->updateOrCreate(
                            [
                                'exercise_enum' => $exerciseEnum,
                                'set_number' => (int) $setNumber,
                            ],
                            [
                                'reps' => $setData['reps'] ?? null,
                                'weight' => $setData['weight'] ?? null,
                                'rpe' => $setData['rpe'] ?? null,
                                'completed_at' => now(),
                                'notes' => $setData['notes'] ?? null,
                            ]
                        );
                    }
                }

                // Record exercise notes if provided
                if (!empty($exerciseData['notes'])) {
                    // Find the first set for this exercise and add notes to it
                    $firstExerciseSet = $training->exercises()
                        ->where('exercise_enum', $exerciseEnum)
                        ->first();
                    
                    if ($firstExerciseSet) {
                        $firstExerciseSet->update(['notes' => $exerciseData['notes']]);
                    } else {
                        // Create a new exercise record for notes only
                        $training->exercises()->create([
                            'exercise_enum' => $exerciseEnum,
                            'set_number' => 1,
                            'notes' => $exerciseData['notes'],
                            'completed_at' => now(),
                        ]);
                    }
                }
            }

            // Update training with mood, energy level, and completion
            // Note: Only saving mood and energy_level for now as other fields don't exist in database yet
            $updateData = [
                'mood' => $mood,
                'energy_level' => $energyLevel,
                'completed_at' => now(),
            ];
            
            // Add notes if provided and if notes field exists
            if ($notes) {
                $updateData['notes'] = $notes;
            }
            
            $training->update($updateData);

        });
    }
} 