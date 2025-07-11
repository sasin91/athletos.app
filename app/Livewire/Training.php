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
 * @property-read Collection<int, PlannedExercise> $plannedExercises
 * @property-read array<string, array<int, float>> $suggestedExerciseWeights Exercise slug => [set index => weight]
 * @property-read array<string, array<int, float>> $previousExerciseWeights Exercise slug => [historical weights]
 * @property-read array<string, array<int, int>> $suggestedReps Exercise slug => [set number => reps]
 * @property-read array<string, array<int, array<string, mixed>>> $completedSets Exercise slug => [set number => [field => value]]
 * @property-read array<string, string> $exerciseNotes Exercise slug => notes
 * @property-read array<string, int> $exerciseSetsCount Exercise slug => count
 * @property-read int $totalTimerSeconds
 */
#[Layout('components.layouts.app')]
#[Title('Training Session')]
class Training extends Component
{
    public TrainingModel $training;

    // Exercise tracking
    /** @var array<string, array<int, array<string, mixed>>> Exercise slug => [set number => [field => value]] */
    public array $completedSets = [];
    
    /** @var array<string, string> Exercise slug => notes */
    public array $exerciseNotes = [];
    
    /** @var array<string, int> Exercise slug => count */
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

    public function mount(TrainingModel $training): void
    {
        $this->authorize('view', $training);
        
        $this->training = $training;
        $this->loadTrainingData();
    }

    private function loadTrainingData(): void
    {
        try {
            // Load existing completed sets
            /** @phpstan-ignore-next-line */
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
    /** @return Collection<int, PlannedExercise> */
    /** @phpstan-ignore-next-line */
    public function plannedExercises(): Collection
    {
        // Skip if athlete not available (during testing)
        if (!$this->training->athlete) {
            return collect();
        }
        
        // Get planned exercises for current training day
        $allTrainings = $this->training->athlete->trainings()->orderBy('scheduled_at')->get();
        $trainingId = $this->training->getKey();
        $index = $allTrainings->search(fn($t) => $t->getKey() === $trainingId);
        $trainingDayNumber = $index !== false ? $index + 1 : 1;

        $exercises = app(ComputePlannedExercises::class)->execute($this->training, $trainingDayNumber);
        
        // Initialize sets count if not already done
        $this->initializeExerciseSetsCount($exercises);
        
        return $exercises;
    }
    
    /** @param Collection<int|string, PlannedExercise> $exercises */
    private function initializeExerciseSetsCount(Collection $exercises): void
    {
        foreach ($exercises as $exercise) {
            if (!isset($this->exerciseSetsCount[$exercise->exerciseSlug])) {
                $exerciseEnum = Exercise::from($exercise->exerciseSlug);
                $canonicalExercise = $exerciseEnum->synonym();
                
                // Check for user's preferred set count for this exercise (check both current and canonical)
                $preferredSets = $this->training->athlete->performanceIndicators()
                    ->whereIn('exercise', [$exerciseEnum, $canonicalExercise])
                    ->where('type', 'preference')
                    ->where('label', 'preferred_sets')
                    ->latest()
                    ->value('value');
                
                $this->exerciseSetsCount[$exercise->exerciseSlug] = max(
                    $exercise->sets,
                    (int) $preferredSets ?: $exercise->sets,
                    count($this->completedSets[$exercise->exerciseSlug] ?? [])
                );
            }
        }
    }

    #[Computed()]
    /** @return array<string, array<int, float>> */
    /** @phpstan-ignore-next-line */
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
            $currentSets = $this->exerciseSetsCount[$exercise->exerciseSlug] ?? $exercise->sets;
            $originalSets = $exercise->sets;
            $previousWeights = $this->previousExerciseWeights[$exercise->exerciseSlug] ?? [];
            
            // Calculate base weights for original planned sets first
            $baseWeights = $calculator->suggestProgressiveWeights(
                $this->training->athlete,
                $exerciseEnum,
                $originalSets,
                $previousWeights
            );
            
            // If sets were added, extend the pattern intelligently
            if ($currentSets > $originalSets) {
                $suggestions[$exercise->exerciseSlug] = $this->extendWeightSuggestions(
                    $baseWeights, 
                    $currentSets, 
                    $exerciseEnum
                );
            } else {
                $suggestions[$exercise->exerciseSlug] = array_slice($baseWeights, 0, $currentSets);
            }
        }
        
        return $suggestions;
    }

    #[Computed()]
    /** @return array<string, array<int, float>> */
    /** @phpstan-ignore-next-line */
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
                /** @phpstan-ignore-next-line */
                ->flatMap(function($training) {
                    /** @phpstan-ignore-next-line */
                    return $training->exercises;
                })
                ->pluck('weight')
                ->unique()
                ->sort()
                ->values()
                ->toArray();
            
            $weights[$exercise->exerciseSlug] = $recentWeights;
        }
        
        return $weights;
    }

    #[Computed()]
    /** @return array<string, array<int, int>> */
    /** @phpstan-ignore-next-line */
    public function suggestedReps(): array
    {
        $suggestions = [];
        
        // Skip if athlete not available (during testing)
        if (!$this->training->athlete) {
            return $suggestions;
        }
        
        foreach ($this->plannedExercises as $exercise) {
            $exerciseSlug = $exercise->exerciseSlug;
            $plannedReps = $this->extractRepsFromString($exercise->reps);
            $currentSets = $this->exerciseSetsCount[$exerciseSlug] ?? $exercise->sets;
            
            $exerciseSuggestions = [];
            
            for ($set = 1; $set <= $currentSets; $set++) {
                $exerciseSuggestions[$set] = $this->calculateRepSuggestion(
                    $exerciseSlug, 
                    $set, 
                    $plannedReps,
                    $exercise
                );
            }
            
            $suggestions[$exerciseSlug] = $exerciseSuggestions;
        }
        
        return $suggestions;
    }

    private function extractRepsFromString(string $reps): int
    {
        // Handle different rep formats: "8-12", "10", "3x5", etc.
        if (preg_match('/(\d+)-(\d+)/', $reps, $matches)) {
            // Range format like "8-12" - use the middle value
            return intval(($matches[1] + $matches[2]) / 2);
        } elseif (preg_match('/(\d+)x(\d+)/', $reps, $matches)) {
            // Format like "3x5" - use the second number (reps)
            return intval($matches[2]);
        } elseif (preg_match('/(\d+)/', $reps, $matches)) {
            // Simple number
            return intval($matches[1]);
        }
        
        return 8; // Default fallback
    }

    private function calculateRepSuggestion(string $exerciseSlug, int $setNumber, int $plannedReps, PlannedExercise $exercise): int
    {
        // Start with planned reps
        $suggestedReps = $plannedReps;
        
        // Adjust based on previous sets in this session
        $completedSets = $this->completedSets[$exerciseSlug] ?? [];
        $previousSets = array_filter($completedSets, fn($set, $key) => $key < $setNumber, ARRAY_FILTER_USE_BOTH);
        
        if (!empty($previousSets)) {
            $lastSet = end($previousSets);
            $lastRpe = $lastSet['rpe'] ?? null;
            $lastReps = $lastSet['reps'] ?? null;
            
            if ($lastRpe && $lastReps) {
                // Adjust based on RPE from last set
                if ($lastRpe <= 6) {
                    // Easy - could do more
                    $suggestedReps = min($lastReps + 1, $plannedReps + 2);
                } elseif ($lastRpe >= 9) {
                    // Very hard - should reduce
                    $suggestedReps = max($lastReps - 2, max(1, $plannedReps - 3));
                } elseif ($lastRpe >= 8) {
                    // Hard - reduce slightly
                    $suggestedReps = max($lastReps - 1, max(1, $plannedReps - 1));
                } else {
                    // Moderate (7-8) - keep similar
                    $suggestedReps = $lastReps;
                }
            }
        }
        
        // For later sets, typically reduce reps slightly due to fatigue
        if ($setNumber > 2) {
            $fatigueReduction = min(2, $setNumber - 2);
            $suggestedReps = max(1, $suggestedReps - $fatigueReduction);
        }
        
        return $suggestedReps;
    }

    public function completeSet(string $exerciseSlug, int $setNumber, int $reps, float $weight, ?int $rpe = null, ?int $timeSpent = null): void
    {
        $explosiveness = null;
        if ($timeSpent && $timeSpent > 0 && $reps > 0) {
            // Calculate explosiveness as reps per second (higher = more explosive)
            $explosiveness = round($reps / $timeSpent, 3);
        }
        
        $this->completedSets[$exerciseSlug][$setNumber] = [
            'reps' => $reps,
            'weight' => $weight,
            'rpe' => $rpe,
            'time_spent' => $timeSpent,
            'explosiveness' => $explosiveness,
            'notes' => $this->completedSets[$exerciseSlug][$setNumber]['notes'] ?? '',
        ];

        $this->saveCompletedSet($exerciseSlug, $setNumber);
        $this->checkForPersonalRecord($exerciseSlug, $weight, $reps);
        
        // Track explosiveness if available
        if ($explosiveness) {
            $this->trackExplosiveness($exerciseSlug, $explosiveness);
        }
    }
    
    /**
     * Track explosiveness data for performance analysis
     */
    private function trackExplosiveness(string $exerciseSlug, float $explosiveness): void
    {
        if (!$this->training->athlete) {
            return;
        }
        
        $exerciseEnum = Exercise::from($exerciseSlug);
        $canonicalExercise = $exerciseEnum->synonym();
        
        // Store explosiveness as a performance indicator using canonical exercise
        PerformanceIndicator::create([
            'athlete_id' => $this->training->athlete->id,
            'exercise' => $canonicalExercise,
            'type' => 'power',
            'label' => 'explosiveness',
            'value' => $explosiveness,
            'unit' => 'reps/sec',
        ]);
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
                'reps' => $setData['reps'] ?? null,
                'weight' => $setData['weight'] ?? null,
                'rpe' => $setData['rpe'] ?? null,
                'time_spent_seconds' => $setData['time_spent'] ?? null,
                'explosiveness' => $setData['explosiveness'] ?? null,
                'notes' => $setData['notes'] ?? null,
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

        // Check for rep-specific PR (actual weight for this rep count)
        $repLabel = $reps === 1 ? '1RM' : $reps . 'RM';
        $this->checkRepSpecificPR($exerciseEnum, $weight, $reps, $repLabel);
        
        // Also update estimated 1RM if this is a new record
        if ($reps > 1) {
            $estimatedOneRM = $this->calculateEstimatedOneRM($weight, $reps);
            $this->updateEstimated1RM($exerciseEnum, $estimatedOneRM);
        }
    }

    private function checkRepSpecificPR(Exercise $exerciseEnum, float $weight, int $reps, string $repLabel): void
    {
        // Always use the canonical exercise for consistency
        $canonicalExercise = $exerciseEnum->synonym();
        
        // Get current PR for this specific rep count (check both current and synonym)
        $currentPR = PerformanceIndicator::where('athlete_id', $this->training->athlete->id)
            ->whereIn('exercise', [$exerciseEnum, $canonicalExercise])
            ->where('label', $repLabel)
            ->where('type', 'strength')
            ->latest()
            ->value('value') ?? 0;

        if ($weight > $currentPR) {
            // Always create/update using the canonical exercise
            PerformanceIndicator::updateOrCreate(
                [
                    'athlete_id' => $this->training->athlete->id,
                    'exercise' => $canonicalExercise,
                    'label' => $repLabel,
                    'type' => 'strength',
                ],
                [
                    'value' => $weight,
                    'unit' => 'kg',
                ]
            );

            // Dispatch PR achieved event
            $this->dispatch('pr-achieved', [
                'exercise' => $exerciseEnum->displayName(),
                'weight' => $weight,
                'reps' => $reps,
                'type' => $repLabel,
            ]);
        }
    }

    private function updateEstimated1RM(Exercise $exerciseEnum, float $estimatedOneRM): void
    {
        // Always use the canonical exercise for consistency
        $canonicalExercise = $exerciseEnum->synonym();
        
        // Get current 1RM (check both current and synonym)
        $current1RM = PerformanceIndicator::where('athlete_id', $this->training->athlete->id)
            ->whereIn('exercise', [$exerciseEnum, $canonicalExercise])
            ->where('label', '1RM')
            ->where('type', 'strength')
            ->latest()
            ->value('value') ?? 0;

        if ($estimatedOneRM > $current1RM) {
            // Always create/update using the canonical exercise
            PerformanceIndicator::updateOrCreate(
                [
                    'athlete_id' => $this->training->athlete->id,
                    'exercise' => $canonicalExercise,
                    'label' => '1RM',
                    'type' => 'strength',
                ],
                [
                    'value' => $estimatedOneRM,
                    'unit' => 'kg',
                ]
            );
        }
    }

    private function calculateEstimatedOneRM(float $weight, int $reps): float
    {
        if ($reps === 1) {
            return $weight;
        }
        
        // Brzycki formula with rounding to nearest whole number
        $estimatedOneRM = $weight * (36 / (37 - $reps));
        return round($estimatedOneRM);
    }

    /**
     * Extend weight suggestions when sets are added without affecting original pattern
     */
    /** 
     * @param array<int, float> $baseWeights
     * @return array<int, float>
     */
    private function extendWeightSuggestions(array $baseWeights, int $targetSets, Exercise $exerciseEnum): array
    {
        if (count($baseWeights) >= $targetSets) {
            return array_slice($baseWeights, 0, $targetSets);
        }
        
        $extended = $baseWeights;
        $lastWeight = end($baseWeights) ?: 0.0;
        $minimumWeight = $this->getMinimumWeight($exerciseEnum);
        
        // For additional sets, suggest same weight as the last set or slightly reduced
        for ($i = count($baseWeights); $i < $targetSets; $i++) {
            // For strength exercises, use same weight or reduce by 5-10%
            if ($exerciseEnum->category()->value === 'strength') {
                $additionalWeight = max($minimumWeight, round($lastWeight * 0.95));
            } else {
                // For other exercises, keep same weight
                $additionalWeight = $lastWeight;
            }
            $extended[] = $additionalWeight;
        }
        
        return $extended;
    }

    /**
     * Get minimum weight for an exercise (same logic as CalculateWeightProgression)
     */
    private function getMinimumWeight(Exercise $exerciseEnum): float
    {
        return match($exerciseEnum) {
            Exercise::BarbellBackSquat,
            Exercise::FlatBarbellBenchPress,
            Exercise::BenchPress,
            Exercise::Deadlift,
            Exercise::RomanianDeadlift => 20.0,
            default => 0.0,
        };
    }

    public function addSet(string $exerciseSlug): void
    {
        $currentCount = $this->exerciseSetsCount[$exerciseSlug] ?? 1;
        if ($currentCount < 10) {
            $this->exerciseSetsCount[$exerciseSlug] = $currentCount + 1;
            
            // Track set addition preference for future suggestions
            $this->trackSetAddition($exerciseSlug, $currentCount + 1);
        }
    }
    
    /**
     * Track when user adds sets for future training suggestions
     */
    private function trackSetAddition(string $exerciseSlug, int $newSetCount): void
    {
        if (!$this->training->athlete) {
            return;
        }
        
        $exerciseEnum = Exercise::from($exerciseSlug);
        $canonicalExercise = $exerciseEnum->synonym();
        $originalSets = null;
        
        // Find the original planned sets for this exercise
        foreach ($this->plannedExercises as $exercise) {
            if ($exercise->exerciseSlug === $exerciseSlug) {
                $originalSets = $exercise->sets;
                break;
            }
        }
        
        if ($originalSets && $newSetCount > $originalSets) {
            // Store the preference as a performance indicator using canonical exercise
            PerformanceIndicator::updateOrCreate(
                [
                    'athlete_id' => $this->training->athlete->id,
                    'exercise' => $canonicalExercise,
                    'type' => 'preference',
                    'label' => 'preferred_sets',
                ],
                [
                    'value' => $newSetCount,
                    'unit' => 'sets',
                ]
            );
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
    public function updated(string $propertyName): void
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

    public function render(): \Illuminate\View\View
    {
        return view('livewire.training');
    }
} 