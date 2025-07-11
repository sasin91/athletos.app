<?php

namespace App\Livewire;

use App\Actions\CalculateWeightProgression;
use App\Actions\CompleteTraining;
use App\Actions\ComputePlannedExercises;
use App\Actions\SuggestRecoveryExercises;
use App\Data\CompletedSet;
use App\Data\ExerciseSuggestion;
use App\Data\PlannedExercise;
use App\Enums\Exercise;
use App\Models\Athlete;
use App\Models\Exercise as ExerciseModel;
use App\Models\PerformanceIndicator;
use App\Models\Training as TrainingModel;
use Illuminate\Support\Collection;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;
use Carbon\Carbon;

/**
 * @property-read Athlete $athlete
 */
#[Layout('components.layouts.app')]
#[Title('Training Session')]
class Training extends Component
{
    public TrainingModel $training;

    // Exercise tracking
    public array $completedSets = [];
    public array $exerciseNotes = [];
    public array $exerciseSetsCount = [];
    
    // Timer states
    public int $totalTimerSeconds = 0;
    public bool $totalTimerStarted = false;
    
    // Loading states
    public bool $isLoading = true;
    public bool $hasError = false;
    public string $errorMessage = '';
    
    // Training completion form fields
    public string $mood = '';
    public int $energyLevel = 0;
    public string $difficulty = '';
    public int $overallRating = 0;
    public int $difficultyLevel = 0;
    public string $notes = '';

    #[Computed()]
    public function athlete(): Athlete
    {
        return $this->training->athlete;
    }

    public function mount(TrainingModel $training)
    {
        $this->authorize('view', $training);
        
        $this->training = $training;
        $this->loadTrainingData();
    }

    private function loadTrainingData(): void
    {
        try {
            // Load existing completed sets
            $existingExercises = $this->training->exercises()
                ->completed()
                ->get()
                ->groupBy('exercise_enum');

            foreach ($existingExercises as $exerciseSlug => $exerciseRecords) {
                foreach ($exerciseRecords as $exercise) {
                    $this->completedSets[$exerciseSlug][$exercise->set_number] = [
                        'reps' => $exercise->reps,
                        'weight' => $exercise->weight,
                        'rpe' => $exercise->rpe,
                        'notes' => $exercise->notes,
                    ];
                }
            }

            // Load exercise notes
            $exerciseNotesData = $this->training->exercises()
                ->whereNotNull('notes')
                ->pluck('notes', 'exercise_enum')
                ->toArray();
            $this->exerciseNotes = $exerciseNotesData;

            // Initialize sets count (defer to avoid loading dependencies too early)
            // This will be initialized when plannedExercises is first accessed

            // Load timer state
            $this->totalTimerSeconds = $this->training->total_timer_seconds ?? 0;
            $this->totalTimerStarted = $this->training->timer_started ?? false;

            $this->isLoading = false;
        } catch (\Exception $e) {
            $this->hasError = true;
            $this->errorMessage = 'Failed to load training data: ' . $e->getMessage();
            $this->isLoading = false;
        }
    }

    #[Computed()]
    public function plannedExercises(): Collection
    {
        // Skip if athlete not available (during testing)
        if (!$this->training->athlete) {
            return collect();
        }
        
        // Get planned exercises for current training day
        $allTrainings = $this->training->athlete->trainings()->orderBy('scheduled_at')->get();
        $index = $allTrainings->search(fn($t) => $t->id === $this->training->id);
        $trainingDayNumber = $index !== false ? $index + 1 : 1;

        $exercises = app(ComputePlannedExercises::class)->execute($this->training, $trainingDayNumber);
        
        // Initialize sets count if not already done
        $this->initializeExerciseSetsCount($exercises);
        
        return $exercises;
    }
    
    private function initializeExerciseSetsCount(Collection $exercises): void
    {
        foreach ($exercises as $exercise) {
            if (!isset($this->exerciseSetsCount[$exercise->exerciseSlug])) {
                $this->exerciseSetsCount[$exercise->exerciseSlug] = max(
                    $exercise->sets,
                    count($this->completedSets[$exercise->exerciseSlug] ?? [])
                );
            }
        }
    }

    #[Computed()]
    public function suggestedExerciseWeights(): array
    {
        $suggestions = [];
        $calculator = app(CalculateWeightProgression::class);
        
        // Skip if athlete not available (during testing)
        if (!$this->training->athlete) {
            return $suggestions;
        }
        
        foreach ($this->plannedExercises as $exercise) {
            $exerciseEnum = Exercise::from($exercise->exerciseSlug);
            $sets = $this->exerciseSetsCount[$exercise->exerciseSlug] ?? $exercise->sets;
            $previousWeights = $this->previousExerciseWeights[$exercise->exerciseSlug] ?? [];
            
            $suggestions[$exercise->exerciseSlug] = $calculator->suggestProgressiveWeights(
                $this->training->athlete,
                $exerciseEnum,
                $sets,
                $previousWeights
            );
        }
        
        return $suggestions;
    }

    #[Computed()]
    public function previousExerciseWeights(): array
    {
        $weights = [];
        
        // Skip if athlete not available (during testing)
        if (!$this->training->athlete) {
            return $weights;
        }
        
        foreach ($this->plannedExercises as $exercise) {
            $exerciseEnum = Exercise::from($exercise->exerciseSlug);
            
            // Get recent weights from completed trainings
            $recentWeights = $this->training->athlete->trainings()
                ->whereNotNull('completed_at')
                ->where('id', '!=', $this->training->id)
                ->with(['exercises' => function($query) use ($exerciseEnum) {
                    $query->where('exercise_enum', $exerciseEnum)
                          ->whereNotNull('weight')
                          ->where('weight', '>', 0);
                }])
                ->orderBy('completed_at', 'desc')
                ->take(5)
                ->get()
                ->flatMap(fn($training) => $training->exercises)
                ->pluck('weight')
                ->unique()
                ->sort()
                ->values()
                ->toArray();
            
            $weights[$exercise->exerciseSlug] = $recentWeights;
        }
        
        return $weights;
    }

    public function completeSet(string $exerciseSlug, int $setNumber, int $reps, float $weight, ?int $rpe = null): void
    {
        $this->completedSets[$exerciseSlug][$setNumber] = [
            'reps' => $reps,
            'weight' => $weight,
            'rpe' => $rpe,
            'notes' => $this->completedSets[$exerciseSlug][$setNumber]['notes'] ?? '',
        ];

        $this->saveCompletedSet($exerciseSlug, $setNumber);
        $this->checkForPersonalRecord($exerciseSlug, $weight, $reps);
    }

    private function saveCompletedSet(string $exerciseSlug, int $setNumber): void
    {
        $setData = $this->completedSets[$exerciseSlug][$setNumber];
        $exerciseEnum = Exercise::from($exerciseSlug);

        $this->training->exercises()->updateOrCreate(
            [
                'exercise_enum' => $exerciseEnum,
                'set_number' => $setNumber,
            ],
            [
                'reps' => $setData['reps'],
                'weight' => $setData['weight'],
                'rpe' => $setData['rpe'],
                'notes' => $setData['notes'],
                'completed_at' => now(),
            ]
        );
    }

    private function checkForPersonalRecord(string $exerciseSlug, float $weight, int $reps): void
    {
        $exerciseEnum = Exercise::from($exerciseSlug);
        
        // Skip if athlete not available (during testing)
        if (!$this->training->athlete) {
            return;
        }

        // Calculate estimated 1RM
        $estimatedOneRM = $this->calculateEstimatedOneRM($weight, $reps);
        
        // Get current 1RM
        $currentOneRM = PerformanceIndicator::where('athlete_id', $this->training->athlete->id)
            ->where('exercise', $exerciseEnum)
            ->where('type', 'strength')
            ->latest()
            ->value('value') ?? 0;

        if ($estimatedOneRM > $currentOneRM) {
            // Update 1RM
            PerformanceIndicator::updateOrCreate(
                [
                    'athlete_id' => $this->training->athlete->id,
                    'exercise' => $exerciseEnum,
                    'type' => 'strength',
                ],
                [
                    'label' => '1RM',
                    'value' => $estimatedOneRM,
                    'unit' => 'kg',
                ]
            );

            // Dispatch PR achieved event
            $this->dispatch('pr-achieved', [
                'exercise' => $exerciseEnum->displayName(),
                'weight' => $estimatedOneRM,
            ]);
        }
    }

    private function calculateEstimatedOneRM(float $weight, int $reps): float
    {
        if ($reps === 1) {
            return $weight;
        }
        
        // Brzycki formula
        return $weight * (36 / (37 - $reps));
    }

    public function addSet(string $exerciseSlug): void
    {
        $currentCount = $this->exerciseSetsCount[$exerciseSlug] ?? 1;
        if ($currentCount < 10) {
            $this->exerciseSetsCount[$exerciseSlug] = $currentCount + 1;
        }
    }

    public function removeSet(string $exerciseSlug, int $setNumber): void
    {
        // Remove from completed sets
        if (isset($this->completedSets[$exerciseSlug][$setNumber])) {
            unset($this->completedSets[$exerciseSlug][$setNumber]);
        }
        
        // Remove from database
        $exerciseEnum = Exercise::from($exerciseSlug);
        $this->training->exercises()
            ->where('exercise_enum', $exerciseEnum)
            ->where('set_number', $setNumber)
            ->delete();
        
        // Update sets count
        $this->exerciseSetsCount[$exerciseSlug] = max(1, ($this->exerciseSetsCount[$exerciseSlug] ?? 1) - 1);
        
        // Reindex remaining sets
        $this->reindexSets($exerciseSlug);
    }

    private function reindexSets(string $exerciseSlug): void
    {
        $sets = $this->completedSets[$exerciseSlug] ?? [];
        ksort($sets);
        
        $reindexed = [];
        $newIndex = 1;
        
        foreach ($sets as $setData) {
            $reindexed[$newIndex] = $setData;
            $newIndex++;
        }
        
        $this->completedSets[$exerciseSlug] = $reindexed;
        
        // Update database
        $exerciseEnum = Exercise::from($exerciseSlug);
        $this->training->exercises()
            ->where('exercise_enum', $exerciseEnum)
            ->delete();
            
        foreach ($reindexed as $setNumber => $setData) {
            $this->saveCompletedSet($exerciseSlug, $setNumber);
        }
    }

    public function completeExerciseAndMoveNext(string $exerciseSlug): void
    {
        // First, save all completed sets for this exercise and check for PRs
        $completedSets = $this->completedSets[$exerciseSlug] ?? [];
        
        foreach ($completedSets as $setNumber => $setData) {
            // Only process sets that have reps and/or weight data
            if (!empty($setData['reps']) || !empty($setData['weight'])) {
                // Save the set to database
                $this->saveCompletedSet($exerciseSlug, (int) $setNumber);
                
                // Check for PR if both reps and weight are present and valid
                if (!empty($setData['reps']) && !empty($setData['weight']) && $setData['weight'] > 0 && $setData['reps'] > 0) {
                    $this->checkForPersonalRecord($exerciseSlug, (float) $setData['weight'], (int) $setData['reps']);
                }
            }
        }
        
        // Then find the next exercise and scroll to it
        $plannedExercises = $this->plannedExercises;
        $currentIndex = $plannedExercises->search(fn($ex) => $ex->exerciseSlug === $exerciseSlug);
        
        if ($currentIndex !== false && $currentIndex < $plannedExercises->count() - 1) {
            $nextExercise = $plannedExercises[$currentIndex + 1];
            
            // Dispatch a browser event to scroll to the next exercise
            $this->dispatch('scrollToElement', ['elementId' => 'exercise-' . $nextExercise->exerciseSlug]);
        }
    }

    /**
     * Handle updates to completedSets to trigger PR checks
     */
    public function updated($propertyName): void
    {
        // Only handle completedSets updates
        if (!str_starts_with($propertyName, 'completedSets.')) {
            return;
        }

        // Parse the property name: completedSets.{exercise}.{set}.{field}
        $parts = explode('.', $propertyName);
        if (count($parts) !== 4) {
            return;
        }

        [$prefix, $exerciseSlug, $setNumber, $field] = $parts;
        
        // Only check for PRs when weight or reps are updated and both have values
        if (!in_array($field, ['weight', 'reps'])) {
            return;
        }
        
        // Ensure the set data exists and has all required fields before checking for PR
        $setData = $this->completedSets[$exerciseSlug][$setNumber] ?? [];
        
        // Check if we have both weight and reps with valid values
        $weight = $setData['weight'] ?? null;
        $reps = $setData['reps'] ?? null;
        $rpe = $setData['rpe'] ?? null;
        
        if (!$weight || !$reps || $weight <= 0 || $reps <= 0) {
            return;
        }
        
        // Now we can safely check for PR with validated data
        $this->checkForPersonalRecord($exerciseSlug, (float) $weight, (int) $reps);
    }


    public function startTotalTimer(): void
    {
        if (!$this->totalTimerStarted) {
            $this->totalTimerStarted = true;
            $this->training->update(['timer_started' => true]);
        }
    }

    public function updateTotalTimer(int $seconds): void
    {
        $this->totalTimerSeconds = $seconds;
        $this->training->update(['total_timer_seconds' => $seconds]);
    }

    public function completeTraining(): void
    {
        // Validate form fields
        $this->validate([
            'mood' => 'required|string|in:terrible,bad,okay,good,excellent',
            'energyLevel' => 'required|integer|between:1,10',
            'difficulty' => 'required|string|in:too_easy,just_right,challenging,too_hard',
            'overallRating' => 'required|integer|between:1,5',
            'difficultyLevel' => 'required|integer|between:1,10',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            // Save exercise notes
            foreach ($this->exerciseNotes as $exerciseSlug => $notes) {
                if (!empty($notes)) {
                    $exerciseEnum = Exercise::from($exerciseSlug);
                    $firstSet = $this->training->exercises()
                        ->where('exercise_enum', $exerciseEnum)
                        ->first();
                    
                    if ($firstSet) {
                        $firstSet->update(['notes' => $notes]);
                    }
                }
            }

            // Complete the training
            app(CompleteTraining::class)->execute(
                training: $this->training,
                exercises: $this->completedSets,
                mood: $this->mood,
                energyLevel: $this->energyLevel,
                difficulty: $this->difficulty,
                overallRating: $this->overallRating,
                difficultyLevel: $this->difficultyLevel,
                notes: $this->notes
            );

            // Show success message and redirect
            session()->flash('success', 'Training completed successfully! Great work!');
            $this->redirect(route('dashboard'), navigate: true);
            
        } catch (\Exception $e) {
            $this->dispatch('notify', [
                'type' => 'error',
                'title' => 'Error',
                'message' => 'Failed to complete training: ' . $e->getMessage()
            ]);
        }
    }

    public function render()
    {
        return view('livewire.training');
    }
} 