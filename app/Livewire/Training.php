<?php

namespace App\Livewire;

use App\Actions\CalculateWeightProgression;
use App\Actions\ComputePlannedExercises;
use App\Actions\ComputeTrainingDay;
use App\Actions\SuggestExercises;
use App\Data\PlannedExercise;
use App\Data\PlannedSet;
use App\Enums\Exercise;
use App\Models\Athlete;
use App\Models\PerformanceIndicator;
use App\Models\Training as TrainingModel;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;

/**
 * @property-read Collection<int, PlannedExercise> $plannedExercises
 * @property-read int $trainingDay
 */
#[Layout('components.layouts.app')]
#[Title('Training Session')]
class Training extends Component
{
    public TrainingModel $training;
    public Athlete $athlete;

    /**
     * @var array<string, array<int, PlannedSet>>
     */
    public array $sets = [];

    public int $totalTimerSeconds = 0;
    public bool $totalTimerStarted = false;

    public bool $isLoading = true;
    public bool $hasError = false;
    public string $errorMessage = '';

    public string $mood = '';
    public int $energyLevel = 0;
    public string $difficulty = '';
    public int $overallRating = 0;
    public int $difficultyLevel = 0;
    public string $notes = '';

    public string $newExerciseToAdd = '';
    public bool $addingExercise = false;

    public function mount(TrainingModel $training): void
    {
        $this->authorize('view', $training);

        $this->training = $training;
        $this->athlete = $training->athlete;

        $this->totalTimerSeconds = 0;
        $this->totalTimerStarted = false;
        $this->isLoading = false;

        // Initialize sets after training is set
        $this->initializeSets();
    }

    private function initializeSets(): void
    {
        if (!empty($this->sets)) {
            return; // Already initialized
        }

        $this->sets = [];

        foreach ($this->plannedExercises as $exercise) {
            $this->sets[$exercise->exerciseSlug] = [];
            for ($i = 1; $i <= $exercise->sets; $i++) {
                $this->sets[$exercise->exerciseSlug][] = new PlannedSet(
                    setNumber: $i,
                    reps: 0,
                    weight: 0,
                    rpe: 0,
                    timeSpent: 0,
                    explosiveness: 0,
                    notes: '',
                    meta: $exercise
                );
            }
        }
    }

    #[Computed()]
    /** @return Collection<int, PlannedExercise> */
    public function plannedExercises(): Collection
    {
        return app(ComputePlannedExercises::class)->execute($this->training, $this->trainingDay);
    }

    #[Computed]
    public function trainingDay(): int
    {
        return app(ComputeTrainingDay::class)->execute($this->training->athlete);
    }

    #[Computed]
    public function availableExercises(): Collection
    {
        $muscleGroups = [];
        $blacklistedExercises = [];
        foreach ($this->plannedExercises as $exercise) {
            $muscleGroups[] = $exercise->exercise->tags();
            $blacklistedExercises[] = $exercise->exercise;
        }
        // Flatten muscleGroups (since tags() returns array)
        $muscleGroups = array_merge(...$muscleGroups);
        return app(SuggestExercises::class)->execute($muscleGroups, $blacklistedExercises);
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

    public function addSet(string $exerciseSlug): void
    {
        $currentCount = count($this->sets[$exerciseSlug] ?? []);
        if ($currentCount < 10) {
            $exercise = $this->sets[$exerciseSlug][0]->meta;
            $this->sets[$exerciseSlug][] = new PlannedSet(
                setNumber: $currentCount + 1,
                reps: $exercise->reps,
                weight: $exercise->weight,
                rpe: 0,
                timeSpent: 0,
                explosiveness: 0,
                notes: $exercise->notes,
                meta: $exercise
            );
        }
    }

    public function removeSet(string $exerciseSlug, int $setNumber): void
    {
        if (isset($this->sets[$exerciseSlug][$setNumber - 1])) {
            array_splice($this->sets[$exerciseSlug], $setNumber - 1, 1);
            // Reindex setNumber
            foreach ($this->sets[$exerciseSlug] as $i => $set) {
                $set->setNumber = $i + 1;
            }
        }
    }

    public function addExercise(string $exerciseSlug): void
    {
        if (isset($this->sets[$exerciseSlug])) {
            return;
        }

        $exercise = Exercise::from($exerciseSlug);

        $planned = new PlannedExercise(
            exercise: $exercise,
            sets: 1,
            exerciseSlug: $exerciseSlug,
            displayName: $exercise->displayName(),
            category: $exercise->category()->value,
            difficulty: $exercise->difficulty()->value,
            tags: $exercise->tags(),
            notes: '',
            cues: [],
            priority: 0,
            restSeconds: 0,
            weight: 0,
            reps: 0,
        );

        $this->sets[$exerciseSlug] = [];
        for ($i = 1; $i <= $planned->sets; $i++) {
            $this->sets[$exerciseSlug][] = new PlannedSet(
                setNumber: $i,
                reps: $planned->reps,
                weight: $planned->weight,
                rpe: 0,
                timeSpent: 0,
                explosiveness: 0,
                notes: $planned->notes,
                meta: $planned
            );
        }
        $this->newExerciseToAdd = '';
        $this->addingExercise = false;

        $this->dispatch('scrollToElement', ['elementId' => "exercise-{$exerciseSlug}"]);
    }

    public function removeExercise(string $exerciseSlug): void
    {
        unset($this->sets[$exerciseSlug]);
    }

    /**
     * Handle updates to completedSets to trigger PR checks
     */
    public function updated(string $propertyName): void
    {
        // Only handle sets updates
        if (!str_starts_with($propertyName, 'sets.')) {
            return;
        }

        // Parse the property name: sets.{exercise}.{set_index}.{field}
        $parts = explode('.', $propertyName);
        if (count($parts) !== 4) {
            return;
        }

        [$prefix, $exerciseSlug, $setIndex, $field] = $parts;

        // Only check for PRs when weight or reps are updated and both have values
        if (!in_array($field, ['weight', 'reps'])) {
            return;
        }

        // Ensure the set data exists and has all required fields before checking for PR
        $set = $this->sets[$exerciseSlug][$setIndex] ?? null;

        if (!$set || !$set->weight || !$set->reps || $set->weight <= 0 || $set->reps <= 0) {
            return;
        }

        // Now we can safely check for PR with validated data
        $this->checkForPersonalRecord($exerciseSlug, $set->weight, $set->reps);
    }

    public function updateTotalTimer(int $seconds): void
    {
        $this->totalTimerSeconds = $seconds;
    }

    public function completeTraining(): void
    {
        $this->validate([
            'mood' => 'required|string|in:terrible,bad,okay,good,excellent',
            'energyLevel' => 'required|integer|between:1,10',
            'difficulty' => 'required|string|in:too_easy,just_right,challenging,too_hard',
            'overallRating' => 'required|integer|between:1,5',
            'difficultyLevel' => 'required|integer|between:1,10',
            'notes' => 'nullable|string|max:1000',
        ]);

        DB::transaction(function () {
            foreach ($this->sets as $exerciseSlug => $exerciseSets) {
                $exerciseEnum = Exercise::from($exerciseSlug);
                foreach ($exerciseSets as $set) {
                    $this->training->exercises()->updateOrCreate(
                        [
                            'exercise_enum' => $exerciseEnum,
                            'set_number' => $set->setNumber,
                        ],
                        [
                            'reps' => $set->reps,
                            'weight' => $set->weight,
                            'rpe' => $set->rpe,
                            'time_spent_seconds' => $set->timeSpent,
                            'explosiveness' => $set->explosiveness,
                            'completed_at' => now(),
                            'notes' => $set->notes,
                        ]
                    );
                }
            }

            $this->training->update([
                'mood' => $this->mood,
                'energy_level' => $this->energyLevel,
                'completed_at' => now(),
                'notes' => $this->notes,
                'total_timer_seconds' => $this->totalTimerSeconds,
            ]);
        });

        session()->flash('success', 'Training completed successfully! Great work!');
        $this->redirect(route('dashboard'), navigate: true);
    }

    public function render(): \Illuminate\View\View
    {
        return view('livewire.training');
    }

    #[\Livewire\Attributes\On('swapExercise')]
    public function swapExercise(string $currentExercise, string $swappedExercise)
    {
        $currentSets = $this->sets[$currentExercise] ?? null;
        if (!$currentSets) {
            return;
        }

        // Find the PlannedExercise for the swapped exercise
        $planned = $this->plannedExercises()->first(fn($ex) => $ex->exerciseSlug === $swappedExercise);
        if (!$planned) {
            return;
        }

        // Update meta for each set to the new exercise
        foreach ($currentSets as $set) {
            $set->meta = $planned;
        }

        // Rebuild $sets, replacing the key in-place
        $newSets = [];
        foreach ($this->sets as $slug => $sets) {
            if ($slug === $currentExercise) {
                $newSets[$swappedExercise] = $currentSets;
            } else {
                $newSets[$slug] = $sets;
            }
        }
        $this->sets = $newSets;
    }
}
