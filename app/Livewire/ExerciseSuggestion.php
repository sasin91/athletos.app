<?php

namespace App\Livewire;

use App\Data\ExerciseSuggestion as ExerciseSuggestionData;
use App\Models\Exercise as ExerciseModel;
use App\Models\Gym;
use App\Models\Training;
use App\Enums\ExerciseCategory;
use App\Enums\ExerciseDifficulty;
use App\Enums\MuscleGroup;
use App\Enums\ExerciseTag;
use App\Enums\Exercise;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;
use Livewire\Component;

class ExerciseSuggestion extends Component
{
    public ?string $currentExercise = null;
    public ?int $gymId = null;
    public ?string $mood = null;
    public ?int $energyLevel = null;
    public string $category = '';
    public string $difficulty = '';
    public array $muscleGroups = [];
    public bool $showAlternatives = false;
    public ?int $trainingId = null;
    
    // Filter properties
    public array $availableCategories = [];
    public array $availableDifficulties = [];
    public array $availableMuscleGroups = [];
    
    protected $queryString = [
        'category' => ['except' => ''],
        'difficulty' => ['except' => ''],
        'muscleGroups' => ['except' => []],
        'showAlternatives' => ['except' => false],
    ];

    public function mount(?string $currentExercise = null, ?int $gymId = null, ?int $trainingId = null): void
    {
        $this->currentExercise = $currentExercise;
        $this->gymId = $gymId;
        $this->trainingId = $trainingId;
        
        // Load training context if available
        if ($this->trainingId) {
            $training = Training::find($this->trainingId);
            if ($training) {
                $this->mood = $training->mood;
                $this->energyLevel = $training->energy_level;
            }
        }
        
        $this->initializeFilterOptions();
    }

    public function initializeFilterOptions(): void
    {
        $this->availableCategories = ExerciseCategory::values();
            
        $this->availableDifficulties = ExerciseDifficulty::values();
            
        $this->availableMuscleGroups = MuscleGroup::values();
    }

    public function getExercisesProperty(): SupportCollection
    {
        $exercises = collect(Exercise::cases());

        // Apply category filter
        if ($this->category) {
            $exercises = $exercises->filter(fn($exercise) => $exercise->category()->value === $this->category);
        }

        // Apply difficulty filter
        if ($this->difficulty) {
            $exercises = $exercises->filter(fn($exercise) => $exercise->difficulty()->value === $this->difficulty);
        }

        // Apply muscle group filter
        if (!empty($this->muscleGroups)) {
            $exercises = $exercises->filter(function ($exercise) {
                $tags = $exercise->tags();
                foreach ($this->muscleGroups as $muscleGroup) {
                    if (in_array($muscleGroup, $tags)) {
                        return true;
                    }
                }
                return false;
            });
        }

        // Sort by energy level and mood context, then limit results
        $exercises = $this->applySorting($exercises);

        // Return as ExerciseSuggestionData objects
        return $exercises->take(12)->map(function ($exercise) {
            $score = $this->getExerciseScore($exercise);
            return ExerciseSuggestionData::fromExercise($exercise, score: $score);
        });
    }

    public function getAlternativesProperty(): SupportCollection
    {
        if (!$this->currentExercise || !$this->showAlternatives) {
            return collect();
        }
        
        $currentExerciseEnum = Exercise::from($this->currentExercise);
        $alternatives = $currentExerciseEnum->alternatives();
        
        // Filter alternatives by gym equipment
        if ($this->gymId) {
            $gym = Gym::with('equipment')->find($this->gymId);
            if ($gym) {
                $availableEquipmentTags = $gym->equipment
                    ->pluck('name')
                    ->map(fn($name) => strtolower($name))
                    ->filter(fn($name) => collect(ExerciseTag::cases())->contains(fn($tag) => $tag->value === $name))
                    ->toArray();
                    
                $alternatives = array_filter($alternatives, function ($alternative) use ($availableEquipmentTags) {
                    $altTags = $alternative['tags'] ?? [];
                    
                    // Always allow bodyweight exercises
                    if (in_array('bodyweight', $altTags)) {
                        return true;
                    }
                    
                    // Check if any required equipment is available
                    return !empty(array_intersect($altTags, $availableEquipmentTags));
                });
            }
        }
        
        // Sort alternatives by energy level and mood
        $sorted = collect($alternatives)->sortBy(function ($alternative) {
            return $this->getAlternativeScore($alternative['exercise']);
        })->take(6);
        
        // Transform to ExerciseSuggestionData objects
        return $sorted->map(function ($alternative) {
            $score = $this->getAlternativeScore($alternative['exercise']);
            return ExerciseSuggestionData::fromExercise(
                $alternative['exercise'],
                conditions: $alternative['conditions'],
                benefits: $alternative['benefits'],
                score: $score
            );
        })->values();
    }

    private function applySorting($exercises): SupportCollection
    {
        // Sort based on energy level and mood
        if ($this->energyLevel !== null || $this->mood !== null) {
            $sorted = $exercises->sortBy(function ($exercise) {
                return $this->getExerciseScore($exercise);
            });
            return collect($sorted->values()->all());
        }
        // Default sorting
        return $exercises->sortBy(fn($exercise) => $exercise->difficulty()->value)->values();
    }

    private function getExerciseScore($exercise): int
    {
        $score = 0;
        // Energy level based scoring (stub)
        // Mood based scoring (stub)
        return $score;
    }

    private function getAlternativeScore(\App\Enums\Exercise $alternative): int
    {
        return $this->getExerciseScore($alternative);
    }

    public function toggleAlternatives(): void
    {
        $this->showAlternatives = !$this->showAlternatives;
    }

    public function selectExercise(string $exercise): void
    {
        $this->dispatch('exercise-selected', $exercise);
    }

    public function swapExercise(string $alternativeValue): void
    {
        $this->dispatch('exercise-swapped', [
            'originalExercise' => $this->currentExercise,
            'alternativeValue' => $alternativeValue
        ]);
    }

    public function addMuscleGroup(string $muscleGroup): void
    {
        if (!in_array($muscleGroup, $this->muscleGroups)) {
            $this->muscleGroups[] = $muscleGroup;
        }
    }

    public function removeMuscleGroup(string $muscleGroup): void
    {
        $this->muscleGroups = array_filter($this->muscleGroups, fn($group) => $group !== $muscleGroup);
    }

    public function clearFilters(): void
    {
        $this->category = '';
        $this->difficulty = '';
        $this->muscleGroups = [];
    }

    public function render(): \Illuminate\View\View
    {
        return view('livewire.exercise-suggestion', [
            'exercises' => $this->getExercisesProperty(),
            'alternatives' => $this->getAlternativesProperty(),
        ]);
    }
}
