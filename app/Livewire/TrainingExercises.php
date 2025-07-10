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
use Livewire\Component;
use Livewire\Attributes\On;

class TrainingExercises extends Component
{
    public Training $training;
    public Athlete $athlete;
    
    /** @var Collection<PlannedExercise> */
    public Collection $plannedExercises;
    
    /** @var array<string, array<int, CompletedSet>> */
    public array $completedSets = [];
    
    /** @var array<string, string> */
    public array $exerciseNotes = [];

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
     * @var array<value-of<\\App\\Enums\\Exercise>, float>
     * @phpstan-var array<value-of<\\App\\Enums\\Exercise>, float>
     */
    public array $suggestedExerciseWeights = [];

    /**
     * Holds the previous weights for each planned exercise.
     *
     * @var array<value-of<\\App\\Enums\\Exercise>, float[]>
     * @phpstan-var array<value-of<\\App\\Enums\\Exercise>, float[]>
     */
    public array $previousExerciseWeights = [];

    public function mount(Training $training, ?Athlete $athlete = null)
    {
        $this->training = $training;
        $this->athlete = $athlete ?? $training->athlete;
        
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
        $allTrainings = $athlete->trainings()->orderBy('scheduled_at')->get();
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

            $suggested = $calculateWeightProgression->suggestWeight($this->athlete, $exerciseEnum, $weights);

            $this->previousExerciseWeights[$exerciseEnum->value] = $weights;
            $this->suggestedExerciseWeights[$exerciseEnum->value] = $suggested;
        }
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
        // Optionally, clear from DB for this session
        \App\Models\Exercise::where('training_id', $this->training->id)
            ->where('exercise_enum', $originalSlug)
            ->delete();
        $this->loadPreviousWeights();
    }

    public function render()
    {
        return view('livewire.training-exercises');
    }
} 