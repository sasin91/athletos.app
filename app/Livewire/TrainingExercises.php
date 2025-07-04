<?php

namespace App\Livewire;

use App\Actions\SuggestRecoveryExercises;
use App\Data\CompletedSet;
use App\Data\ExerciseSuggestion;
use App\Data\PlannedExercise;
use App\Data\TrainingSession;
use App\Models\Exercise as ExerciseModel;
use App\Models\Training;
use Illuminate\Support\Collection;
use Livewire\Component;

class TrainingExercises extends Component
{
    public Training $training;
    
    /** @var Collection<PlannedExercise> */
    public Collection $plannedExercises;
    
    /** @var array<string, array<int, CompletedSet>> */
    public array $completedSets = [];
    
    /** @var array<string, string> */
    public array $exerciseNotes = [];
    
    public bool $isLoading = true;
    public bool $hasError = false;
    public string $errorMessage = '';
    
    /** @var Collection<ExerciseSuggestion> */
    public Collection $recoveryExercises;
    
    public ?string $error = null;

    public function mount(Training $training)
    {
        $this->training = $training;
        
        // Initialize collections
        $this->plannedExercises = collect();
        $this->recoveryExercises = collect();
        
        // Load the training with relationships
        $this->training->load([
            'trainingPlan',
            'athlete.user'
        ]);

        $this->loadExercises();
        
        // Load completed sets from events
        $this->loadCompletedData();
    }

    public function loadExercises()
    {
        try {
            $this->isLoading = true;
            $this->error = null;

            // Determine which training day this is
            $trainingDayNumber = $this->getCurrentTrainingDayNumber();
            
            $this->plannedExercises = $this->training->getPlannedExercises($trainingDayNumber);
            
            // Load recovery exercises if training is completed
            if ($this->training->completed_at) {
                $suggestAction = app(SuggestRecoveryExercises::class);
                $recoveryExercisesArray = $suggestAction->execute($this->training);
                $this->recoveryExercises = collect($recoveryExercisesArray);
            }

        } catch (\Exception $e) {
            $this->error = 'Failed to load exercises: ' . $e->getMessage();
        } finally {
            $this->isLoading = false;
        }
    }

    /**
     * Determine which training day number this session represents
     */
    private function getCurrentTrainingDayNumber(): int
    {
        $athlete = $this->training->athlete;
        $trainingDays = $athlete->training_days ?? [];
        
        if (empty($trainingDays)) {
            return 1; // Default to day 1 if no training days set
        }
        
        $dayOfWeek = strtolower($this->training->scheduled_at->format('l')); // 'monday', 'tuesday', etc.
        
        // Find the index of this day in the training days array
        $dayIndex = array_search($dayOfWeek, $trainingDays);
        
        // Return 1-based index (day 1, day 2, etc.) or default to 1
        return $dayIndex !== false ? $dayIndex + 1 : 1;
    }

    private function loadCompletedData(): void
    {
        try {
            $exercises = $this->training->exercises()->completed()->get();
            
            $this->completedSets = [];
            $this->exerciseNotes = [];
            
            foreach ($exercises as $exercise) {
                $exerciseSlug = $exercise->exercise_enum->value;
                
                if (!isset($this->completedSets[$exerciseSlug])) {
                    $this->completedSets[$exerciseSlug] = [];
                }
                
                $this->completedSets[$exerciseSlug][$exercise->set_number] = [
                    'reps' => $exercise->reps,
                    'weight' => $exercise->weight,
                    'rpe' => $exercise->rpe,
                ];
                
                if ($exercise->notes) {
                    $this->exerciseNotes[$exerciseSlug] = $exercise->notes;
                }
            }
        } catch (\Exception $e) {
            // If exercises don't exist yet, that's fine - no completed data
            $this->completedSets = [];
            $this->exerciseNotes = [];
        }
    }

    public function completeSet(string $exerciseSlug, int $setNumber, ?int $reps, ?float $weight, ?float $rpe): void
    {
        if (empty($reps) && empty($weight)) {
            return; // Don't record empty sets
        }

        try {
            ExerciseModel::updateOrCreate(
                [
                    'training_id' => $this->training->id,
                    'exercise_enum' => \App\Enums\Exercise::from($exerciseSlug),
                    'set_number' => $setNumber,
                ],
                [
                    'reps' => $reps,
                    'weight' => $weight,
                    'rpe' => $rpe,
                    'completed_at' => now(),
                ]
            );

            // Reload completed data
            $this->loadCompletedData();

        } catch (\Exception $e) {
            $this->hasError = true;
            $this->errorMessage = 'Failed to save set data. Please try again.';
        }
    }

    public function addNotes(string $exerciseSlug, string $notes): void
    {
        if (empty($notes)) {
            return;
        }

        try {
            // Find the first set for this exercise and add notes to it
            $firstExerciseSet = ExerciseModel::where('training_id', $this->training->id)
                ->where('exercise_enum', \App\Enums\Exercise::from($exerciseSlug))
                ->first();
            
            if ($firstExerciseSet) {
                $firstExerciseSet->update(['notes' => $notes]);
            } else {
                // Create a new exercise record for notes only
                ExerciseModel::create([
                    'training_id' => $this->training->id,
                    'exercise_enum' => \App\Enums\Exercise::from($exerciseSlug),
                    'set_number' => 1,
                    'notes' => $notes,
                    'completed_at' => now(),
                ]);
            }

            // Reload completed data
            $this->loadCompletedData();

        } catch (\Exception $e) {
            $this->hasError = true;
            $this->errorMessage = 'Failed to save notes. Please try again.';
        }
    }

    public function getCompletedSetsForExercise(string $exerciseSlug): array
    {
        return $this->completedSets[$exerciseSlug] ?? [];
    }

    public function getNotesForExercise(string $exerciseSlug): ?string
    {
        return $this->exerciseNotes[$exerciseSlug] ?? null;
    }

    public function getCompletedSetsCount(string $exerciseSlug): int
    {
        return count($this->completedSets[$exerciseSlug] ?? []);
    }

    public function render()
    {
        return view('livewire.training-exercises');
    }
} 