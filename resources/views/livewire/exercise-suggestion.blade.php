<div class="exercise-suggestion-container" x-data="{ 
    showFilters: false,
    selectedCategory: @entangle('category'),
    selectedDifficulty: @entangle('difficulty'),
    selectedMuscleGroups: @entangle('muscleGroups'),
    showAlternatives: @entangle('showAlternatives')
}">
    <!-- Header Section -->
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                @if($currentExercise)
                    Exercise Alternatives
                @else
                    Exercise Suggestions
                @endif
            </h1>
            @if($mood || $energyLevel)
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Tailored for your 
                    @if($mood) <span class="font-medium">{{ ucfirst($mood) }}</span> mood @endif
                    @if($mood && $energyLevel) and @endif
                    @if($energyLevel) <span class="font-medium">{{ $energyLevel }}/10</span> energy level @endif
                </p>
            @endif
        </div>
        
        <!-- Action Buttons -->
        <div class="flex gap-3">
            @if($currentExercise)
                <button 
                    type="button"
                    wire:click="toggleAlternatives"
                    class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200">
                    @if($showAlternatives)
                        <x-heroicon-o-eye-slash class="w-4 h-4 mr-2" />
                        Hide Alternatives
                    @else
                        <x-heroicon-o-eye class="w-4 h-4 mr-2" />
                        Show Alternatives
                    @endif
                </button>
            @endif
            
            <button 
                type="button"
                @click="showFilters = !showFilters"
                class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                <x-heroicon-o-funnel class="w-4 h-4 mr-2" />
                Filters
            </button>
        </div>
    </div>

    <!-- Filters Section -->
    <div x-show="showFilters" x-transition:enter="transition ease-out duration-300" x-transition:enter-start="opacity-0 transform -translate-y-2" x-transition:enter-end="opacity-100 transform translate-y-0" x-transition:leave="transition ease-in duration-200" x-transition:leave-start="opacity-100 transform translate-y-0" x-transition:leave-end="opacity-0 transform -translate-y-2" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Category Filter -->
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                </label>
                <select wire:model.live="category" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    <option value="">All Categories</option>
                    @foreach($availableCategories as $cat)
                        <option value="{{ $cat }}">{{ ucfirst($cat) }}</option>
                    @endforeach
                </select>
            </div>

            <!-- Difficulty Filter -->
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Difficulty
                </label>
                <select wire:model.live="difficulty" class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    <option value="">All Levels</option>
                    @foreach($availableDifficulties as $diff)
                        <option value="{{ $diff }}">{{ ucfirst($diff) }}</option>
                    @endforeach
                </select>
            </div>

            <!-- Muscle Groups Filter -->
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Muscle Groups
                </label>
                <div class="space-y-2 max-h-32 overflow-y-auto">
                    @foreach($availableMuscleGroups as $muscleGroup)
                        <label class="flex items-center">
                            <input 
                                type="checkbox" 
                                value="{{ $muscleGroup }}"
                                wire:model.live="muscleGroups"
                                class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                            >
                            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                {{ \App\Enums\MuscleGroup::from($muscleGroup)->label() }}
                            </span>
                        </label>
                    @endforeach
                </div>
            </div>
        </div>

        <!-- Selected Muscle Groups Tags -->
        @if(!empty($muscleGroups))
            <div class="mt-4">
                <div class="flex flex-wrap gap-2">
                    @foreach($muscleGroups as $muscleGroup)
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            {{ \App\Enums\MuscleGroup::from($muscleGroup)->label() }}
                            <button 
                                type="button"
                                wire:click="removeMuscleGroup('{{ $muscleGroup }}')"
                                class="ml-2 hover:text-blue-600 dark:hover:text-blue-200">
                                <x-heroicon-o-x-mark class="w-3 h-3" />
                            </button>
                        </span>
                    @endforeach
                </div>
                
                <button 
                    type="button"
                    wire:click="clearFilters"
                    class="mt-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline">
                    Clear all filters
                </button>
            </div>
        @endif
    </div>

    <!-- Alternatives Section (when showing alternatives for current exercise) -->
    @if($showAlternatives && $alternatives->count() > 0)
        <div class="mb-8">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Alternative Exercises
                <span class="text-sm font-normal text-gray-600 dark:text-gray-400">
                    ({{ $alternatives->count() }} found)
                </span>
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                @foreach($alternatives as $alternative)
                    <div class="exercise-card bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow duration-200">
                        <div class="flex justify-between items-start mb-3">
                            <h3 class="font-semibold text-lg text-gray-900 dark:text-white">
                                {{ __('exercises.' . $alternative->exercise->value . '.name') }}
                            </h3>
                            <span class="px-2 py-1 text-xs font-medium rounded-full bg-{{ $alternative->category->value === 'strength' ? 'red' : ($alternative->category->value === 'yoga' ? 'purple' : 'green') }}-100 text-{{ $alternative->category->value === 'strength' ? 'red' : ($alternative->category->value === 'yoga' ? 'purple' : 'green') }}-800 dark:bg-{{ $alternative->category->value === 'strength' ? 'red' : ($alternative->category->value === 'yoga' ? 'purple' : 'green') }}-900 dark:text-{{ $alternative->category->value === 'strength' ? 'red' : ($alternative->category->value === 'yoga' ? 'purple' : 'green') }}-300">
                                {{ ucfirst($alternative->category->value) }}
                            </span>
                        </div>

                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {{ __('exercises.' . $alternative->exercise->value . '.description') }}
                        </p>

                        <div class="mb-4">
                            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                                <span>Difficulty: {{ ucfirst($alternative->difficulty->value) }}</span>
                            </div>
                            
                            @if($alternative->tags)
                                <div class="flex flex-wrap gap-1">
                                    @foreach(array_slice($alternative->tags, 0, 3) as $tag)
                                        <span class="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                            {{ $tag }}
                                        </span>
                                    @endforeach
                                </div>
                            @endif
                        </div>

                        @if($alternative->benefits)
                            <div class="mb-4">
                                <p class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Benefits:</p>
                                <p class="text-xs text-gray-600 dark:text-gray-400">{{ $alternative->benefits }}</p>
                            </div>
                        @endif

                        <div class="flex gap-2">
                            <button 
                                type="button"
                                wire:click="swapExercise({{ $alternative->exercise->value }})"
                                class="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors duration-200">
                                <x-heroicon-o-arrow-path class="w-4 h-4 mr-1" />
                                Swap Exercise
                            </button>
                            <a 
                                href="/exercises/{{ $alternative->exercise->value }}" 
                                class="bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors duration-200">
                                <x-heroicon-o-eye class="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                @endforeach
            </div>
        </div>
    @endif

    <!-- Main Exercises Grid -->
    <div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            @if($currentExercise && !$showAlternatives)
                Related Exercises
            @else
                Suggested Exercises
            @endif
            <span class="text-sm font-normal text-gray-600 dark:text-gray-400">
                ({{ $exercises->count() }} found)
            </span>
        </h2>

        @if($exercises->count() > 0)
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                @foreach($exercises as $exercise)
                    <div class="exercise-card bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow duration-200">
                        <div class="flex justify-between items-start mb-3">
                            <h3 class="font-semibold text-lg text-gray-900 dark:text-white">
                                {{ __('exercises.' . $exercise->exercise->value . '.name') }}
                            </h3>
                            <span class="px-2 py-1 text-xs font-medium rounded-full bg-{{ $exercise->category->value === 'strength' ? 'red' : ($exercise->category->value === 'yoga' ? 'purple' : 'green') }}-100 text-{{ $exercise->category->value === 'strength' ? 'red' : ($exercise->category->value === 'yoga' ? 'purple' : 'green') }}-800 dark:bg-{{ $exercise->category->value === 'strength' ? 'red' : ($exercise->category->value === 'yoga' ? 'purple' : 'green') }}-900 dark:text-{{ $exercise->category->value === 'strength' ? 'red' : ($exercise->category->value === 'yoga' ? 'purple' : 'green') }}-300">
                                {{ ucfirst($exercise->category->value) }}
                            </span>
                        </div>

                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {{ __('exercises.' . $exercise->exercise->value . '.description') }}
                        </p>

                        <div class="mb-4">
                            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                                <span>Difficulty: {{ ucfirst($exercise->difficulty->value) }}</span>
                            </div>
                            
                            @if($exercise->tags)
                                <div class="flex flex-wrap gap-1">
                                    @foreach(array_slice($exercise->tags, 0, 3) as $tag)
                                        <span class="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                            {{ $tag }}
                                        </span>
                                    @endforeach
                                </div>
                            @endif
                        </div>

                        <div class="flex gap-2">
                            <button 
                                type="button"
                                wire:click="selectExercise('{{ $exercise->exercise->value }}')"
                                class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors duration-200">
                                <x-heroicon-o-plus class="w-4 h-4 mr-1" />
                                Select
                            </button>
                            <a 
                                href="/exercises/{{ $exercise->exercise->value }}" 
                                class="bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors duration-200">
                                <x-heroicon-o-eye class="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                @endforeach
            </div>
        @else
            <div class="text-center py-12">
                <x-heroicon-o-magnifying-glass class="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No exercises found</h3>
                <p class="text-gray-600 dark:text-gray-400 mb-4">
                    Try adjusting your filters or check if your gym has the required equipment.
                </p>
                <button 
                    type="button"
                    wire:click="clearFilters"
                    class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200">
                    <x-heroicon-o-x-mark class="w-4 h-4 mr-2" />
                    Clear Filters
                </button>
            </div>
        @endif
    </div>

    <!-- Loading State -->
    <div wire:loading class="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
            <div class="flex items-center">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                <span class="text-gray-900 dark:text-white">Loading exercises...</span>
            </div>
        </div>
    </div>
</div>

<script>
// Listen for Livewire events and handle them
document.addEventListener('livewire:init', () => {
    Livewire.on('exercise-selected', (exerciseId) => {
        // Handle exercise selection - could dispatch to parent component or show notification
        console.log('Exercise selected:', exerciseId);
        // You can add custom logic here for handling exercise selection
    });

    Livewire.on('exercise-swapped', (data) => {
        // Handle exercise swap
        console.log('Exercise swapped:', data);
        // You can add custom logic here for handling exercise swaps
    });
});
</script>
