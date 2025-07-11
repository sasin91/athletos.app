<?php

namespace App\Livewire;

use App\Actions\CalculateWeightProgression;
use App\Actions\SuggestRecoveryExercises;
use App\Data\CompletedSet;
use App\Data\ExerciseSuggestion;
use App\Data\PlannedExercise;
use App\Data\TrainingSession;
use App\Enums\Exercise;
use App\Models\Athlete;
use App\Models\Exercise as ExerciseModel;
use App\Models\PerformanceIndicator;
use App\Models\Training;
use Illuminate\Support\Collection;
use Livewire\Attributes\Computed;
use Livewire\Component;
use Livewire\Attributes\On;

/**
 * @property-read Athlete $athlete
 */
class TrainingExercises extends Component
{
    public Training $training;

    #[Computed()]
    public function athlete(): Athlete
    {
        return $this->training->athlete;
    }
    
    /** @var Collection<PlannedExercise> */
    public Collection $plannedExercises;
    
    /** @var array<string, array<int, CompletedSet>> */
    public array $completedSets = [];
    
    /** @var array<string, string> */
    public array $exerciseNotes = [];

    /** @var array<string, int> */
    public array $exerciseSetsCount = [];

    public int $totalTimerSeconds = 0;
    public bool $totalTimerStarted = false;

    public bool $isLoading = true;
    public bool $hasError = false;
    public string $errorMessage = '';
    
    /** @var Collection<ExerciseSuggestion> */
    public Collection $recoveryExercises;
    
    public ?string $error = null;

    /**
     * Holds the next suggested weight for each planned exercise.
     *
     * @var array<value-of<\\App\\Enums\\Exercise>, array<int, float>>
     * @phpstan-var array<value-of<\\App\\Enums\\Exercise>, array<int, float>>
     */
    public array $suggestedExerciseWeights = [];

    /**
     * Holds the previous weights for each planned exercise.
     *
     * @var array<value-of<\\App\\Enums\\Exercise>, float[]>
     * @phpstan-var array<value-of<\\App\\Enums\\Exercise>, float[]>
     */
    public array $previousExerciseWeights = [];

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
        $this->totalTimerSeconds = $training->total_timer_seconds ?? 0;
        $this->loadPreviousWeights();
    }

    public function loadExercises()
    {
        try {
            $this->isLoading = true;
            $this->error = null;

            // Determine which training day this is
            $trainingDayNumber = $this->getCurrentTrainingDayNumber();
            
            $this->plannedExercises = $this->training->getPlannedExercises($trainingDayNumber);
            
            // Initialize sets count for each exercise
            $this->exerciseSetsCount = [];
            foreach ($this->plannedExercises as $exercise) {
                $this->exerciseSetsCount[$exercise->exerciseSlug] = $exercise->sets;
            }
            
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
        $allTrainings = $this->athlete->trainings()->orderBy('scheduled_at')->get();
        $index = $allTrainings->search(fn($t) => $t->id === $this->training->id);
        return $index !== false ? $index + 1 : 1;
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
            $this->loadPreviousWeights();
        } catch (\Exception $e) {
            // If exercises don't exist yet, that's fine - no completed data
            $this->completedSets = [];
            $this->exerciseNotes = [];
        }
    }

    private function loadPreviousWeights(): void
    {
        $this->suggestedExerciseWeights = [];
        $this->previousExerciseWeights = [];

        $calculateWeightProgression = app(CalculateWeightProgression::class);
        $allCompletedExercises = $this->athlete->completedExercises;

        foreach ($this->plannedExercises as $exercise) {
            $exerciseEnum = $exercise->exercise;
            $weights = $allCompletedExercises
                ->where('exercise_enum', $exerciseEnum)
                ->pluck('weight')
                ->unique()
                ->take(5)
                ->values()
                ->toArray();

            // Get the number of sets for this exercise
            $numberOfSets = $this->exerciseSetsCount[$exerciseEnum->value] ?? $exercise->sets;
            
            // Get the top set weight suggestion
            $topSetWeight = $calculateWeightProgression->suggestWeight($this->athlete, $exerciseEnum, $weights);
            
            // Get ramping percentages from the exercise config if available in the training phase
            $exerciseConfig = $this->getExerciseConfig($exerciseEnum->value, $numberOfSets);
            $rampingPercentages = $exerciseConfig->getEffectiveRampingPercentages();

            // Calculate progressive weights using the ramping percentages
            $progressiveWeights = [];
            foreach ($rampingPercentages as $percentage) {
                $progressiveWeights[] = round($topSetWeight * $percentage, 1);
            }

            $this->previousExerciseWeights[$exerciseEnum->value] = $weights;
            $this->suggestedExerciseWeights[$exerciseEnum->value] = $progressiveWeights;
        }
    }

    /**
     * Get or create an ExerciseConfig for the given exercise
     */
    private function getExerciseConfig(string $exerciseSlug, int $numberOfSets): \App\Settings\ExerciseConfig
    {
        // Try to find the exercise config in the training phase settings
        if ($this->training->trainingPhase && $this->training->trainingPhase->settings) {
            foreach ($this->training->trainingPhase->settings->exercises as $exerciseConfig) {
                if ($exerciseConfig->exercise === $exerciseSlug) {
                    // Update sets to current count if different
                    if ($exerciseConfig->sets !== $numberOfSets) {
                        $exerciseConfig->sets = $numberOfSets;
                    }
                    return $exerciseConfig;
                }
            }
        }
        
        // Create a temporary ExerciseConfig if not found
        return new \App\Settings\ExerciseConfig(
            exercise: $exerciseSlug,
            sets: $numberOfSets,
            reps: '1', // Dummy value
            weight: '1', // Dummy value
        );
    }

    public function completeSet(string $exerciseValue, int $setNumber): void
    {
        $exerciseEnum = \App\Enums\Exercise::from($exerciseValue);
        $reps = $this->completedSets[$exerciseValue][$setNumber]['reps'] ?? null;
        $weight = $this->completedSets[$exerciseValue][$setNumber]['weight'] ?? null;
        $rpe = $this->completedSets[$exerciseValue][$setNumber]['rpe'] ?? null;
        if (empty($reps) && empty($weight)) {
            return; // Don't record empty sets
        }
        $previousMax = $this->athlete->performanceIndicators
            ->where('type', 'strength')
            ->where('exercise', $exerciseEnum)
            ->max('value');
        $isPR = $weight && ($weight > 0) && ($weight > $previousMax);

        $this->training->exercises()->updateOrCreate(
            [
                'exercise_enum' => $exerciseEnum,
                'set_number' => $setNumber,
            ],
            [
                'reps' => $reps,
                'weight' => $weight,
                'rpe' => $rpe,
                'completed_at' => now(),
            ]
        );
        // $this->loadCompletedData();
        $this->loadPreviousWeights();
        if ($isPR) {
            $this->athlete->performanceIndicators()->create([
                'label' => $exerciseEnum->oneRepMaxDisplayName() . ' 1RM',
                'type' => 'strength',
                'exercise' => $exerciseEnum,
                'value' => $weight,
            ]);

            $this->dispatch('pr-achieved', [
                'exercise' => $exerciseEnum->displayName(),
                'weight' => $weight,
            ]);
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

    public function updateTotalTimer($seconds)
    {
        $this->totalTimerSeconds = $seconds;
        $this->training->total_timer_seconds = $seconds;
        $this->training->save();
    }

    public function startTotalTimer()
    {
        $this->totalTimerStarted = true;
    }

    public function addSet(string $exerciseSlug): void
    {
        if (!isset($this->exerciseSetsCount[$exerciseSlug])) {
            return;
        }
        
        // Maximum of 10 sets for safety
        if ($this->exerciseSetsCount[$exerciseSlug] >= 10) {
            return;
        }
        
        $this->exerciseSetsCount[$exerciseSlug]++;
        
        // Recalculate progressive weights for the new number of sets
        $this->recalculateProgressiveWeights($exerciseSlug);
    }

    public function removeSet(string $exerciseSlug, int $setNumber): void
    {
        if (!isset($this->exerciseSetsCount[$exerciseSlug])) {
            return;
        }
        
        // Minimum of 1 set
        if ($this->exerciseSetsCount[$exerciseSlug] <= 1) {
            return;
        }
        
        // Remove the specific set from completed data
        if (isset($this->completedSets[$exerciseSlug][$setNumber])) {
            unset($this->completedSets[$exerciseSlug][$setNumber]);
        }
        
        // Remove from database if it exists
        $this->training->exercises()
            ->where('exercise_enum', \App\Enums\Exercise::from($exerciseSlug))
            ->where('set_number', $setNumber)
            ->delete();
        
        // Renumber all sets after the removed one
        for ($i = $setNumber + 1; $i <= $this->exerciseSetsCount[$exerciseSlug]; $i++) {
            // Move completed data
            if (isset($this->completedSets[$exerciseSlug][$i])) {
                $this->completedSets[$exerciseSlug][$i - 1] = $this->completedSets[$exerciseSlug][$i];
                unset($this->completedSets[$exerciseSlug][$i]);
            }
            
            // Update database records
            $this->training->exercises()
                ->where('exercise_enum', \App\Enums\Exercise::from($exerciseSlug))
                ->where('set_number', $i)
                ->update(['set_number' => $i - 1]);
        }
        
        // Decrease the total count
        $this->exerciseSetsCount[$exerciseSlug]--;
        
        // Recalculate progressive weights for the new number of sets
        $this->recalculateProgressiveWeights($exerciseSlug);
    }

    /**
     * Recalculate progressive weights for a specific exercise when set count changes
     */
    private function recalculateProgressiveWeights(string $exerciseSlug): void
    {
        $exerciseEnum = \App\Enums\Exercise::from($exerciseSlug);
        $calculateWeightProgression = app(CalculateWeightProgression::class);
        
        $weights = $this->athlete->completedExercises
            ->where('exercise_enum', $exerciseEnum)
            ->pluck('weight')
            ->unique()
            ->take(5)
            ->values()
            ->toArray();

        $numberOfSets = $this->exerciseSetsCount[$exerciseSlug];
        
        // Get the top set weight suggestion
        $topSetWeight = $calculateWeightProgression->suggestWeight($this->athlete, $exerciseEnum, $weights);
        
        // Get ramping percentages from the exercise config
        $exerciseConfig = $this->getExerciseConfig($exerciseSlug, $numberOfSets);
        $rampingPercentages = $exerciseConfig->getEffectiveRampingPercentages();

        // Calculate progressive weights using the ramping percentages
        $progressiveWeights = [];
        foreach ($rampingPercentages as $percentage) {
            $progressiveWeights[] = round($topSetWeight * $percentage, 1);
        }

        $this->suggestedExerciseWeights[$exerciseSlug] = $progressiveWeights;
    }

    public function nextExercise(string $exerciseSlug): void
    {
        // Save all completed sets for this exercise
        if (isset($this->completedSets[$exerciseSlug])) {
            foreach ($this->completedSets[$exerciseSlug] as $setNumber => $setData) {
                $this->completeSet($exerciseSlug, $setNumber);
            }
        }
        
        // Save exercise notes if they exist
        if (isset($this->exerciseNotes[$exerciseSlug]) && !empty($this->exerciseNotes[$exerciseSlug])) {
            $this->addNotes($exerciseSlug, $this->exerciseNotes[$exerciseSlug]);
        }
    }

    #[On('exercise-swapped')]
    public function swapExercise($payload)
    {
        $originalSlug = $payload['originalExercise'] ?? null;
        $alternativeSlug = $payload['alternativeValue'] ?? null;
        if (!$originalSlug || !$alternativeSlug) return;

        // Find the planned exercise index
        $index = $this->plannedExercises->search(fn($ex) => $ex->exerciseSlug === $originalSlug);
        if ($index === false) return;

        // Get the original config (to preserve sets/reps/rest, etc.)
        $original = $this->plannedExercises[$index];
        $altEnum = \App\Enums\Exercise::from($alternativeSlug);
        $this->plannedExercises[$index] = new \App\Data\PlannedExercise(
            exercise: $altEnum,
            exerciseSlug: $alternativeSlug,
            priority: $original->priority,
            sets: $original->sets,
            reps: $original->reps,
            weight: $original->weight,
            restSeconds: $original->restSeconds,
            displayName: $altEnum->displayName(),
            category: $altEnum->category()->value,
            difficulty: $altEnum->difficulty()->value,
            tags: $altEnum->tags(),
            notes: $original->notes,
        );
        // Remove completed sets and notes for the original exercise
        unset($this->completedSets[$originalSlug]);
        unset($this->exerciseNotes[$originalSlug]);
        
        // Reset sets count for the new exercise
        $this->exerciseSetsCount[$alternativeSlug] = $original->sets;
        unset($this->exerciseSetsCount[$originalSlug]);
        
        // Optionally, clear from DB for this session
        \App\Models\Exercise::where('training_id', $this->training->id)
            ->where('exercise_enum', $originalSlug)
            ->delete();
        
        // Recalculate progressive weights for the new exercise
        $this->recalculateProgressiveWeights($alternativeSlug);
        
        $this->loadPreviousWeights();
    }

    public function render()
    {
        return view('livewire.training-exercises');
    }
} 