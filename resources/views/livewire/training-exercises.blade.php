<div class="relative">
    @if(count($plannedExercises) > 0)
    <!-- Exercise Navigation -->
    @if(count($plannedExercises) > 1)
    <nav class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Jump to Exercise:</h3>
        <div class="flex flex-wrap gap-2">
            @foreach($plannedExercises as $index => $exercise)
            <a href="#exercise-{{ $exercise->exerciseSlug }}"
                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
                {{ $index + 1 }}. {{ $exercise->displayName }}
            </a>
            @endforeach
        </div>
    </nav>
    @endif

    <!-- Exercises -->
    @foreach($plannedExercises as $exercise)
    <fieldset id="exercise-{{ $exercise->exerciseSlug }}" class="exercise-fieldset bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8" x-data="{ showAlternatives: false }">
        <legend class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3">
            <span class="inline-flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                {{ $loop->iteration }}
            </span>
            {{ $exercise->displayName }}
        </legend>

        @if(!empty($exercise->notes))
        <div class="mb-6">
            <div class="flex items-start gap-2 px-4 py-3 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 text-sm border-l-4 border-blue-400">
                <x-heroicon-o-information-circle class="w-5 h-5 mt-0.5 text-blue-400" />
                <span>{{ $exercise->notes }}</span>
            </div>
        </div>
        @endif

        <!-- Exercise Details - Row Layout -->
        <div class="space-y-4 mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div class="mb-2 sm:mb-0">
                    <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Planned Sets</div>
                    <div class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ $exercise->sets }}</div>
                </div>
                <div class="mb-2 sm:mb-0">
                    <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Planned Reps</div>
                    <div class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ $exercise->reps }}</div>
                </div>
                <div>
                    <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Planned Weight</div>
                    <div class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ $exercise->weight }}</div>
                </div>
            </div>
        </div>

        <!-- Exercise Swap Section -->
        <div class="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-medium text-yellow-800 dark:text-yellow-200">Need to swap this exercise?</h4>
                <button type="button"
                    @click="showAlternatives = !showAlternatives"
                    class="text-sm text-yellow-700 dark:text-yellow-300 hover:text-yellow-800 dark:hover:text-yellow-200 font-medium">
                    <span x-show="!showAlternatives">Show Alternatives</span>
                    <span x-show="showAlternatives">Hide Alternatives</span>
                </button>
            </div>
            <div x-show="showAlternatives" x-transition class="mt-2">
                <livewire:exercise-suggestion
                    :currentExercise="$exercise->exerciseSlug"
                    :gymId="$training->athlete->gym_id ?? null"
                    :trainingId="$training->id"
                    :key="'exercise-suggestions-' . $exercise->exerciseSlug"
                    wire:listen="exercise-swapped" />
            </div>
        </div>

        <!-- Exercise Entries -->
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100">Log Your Sets</h4>
                <span class="text-sm text-gray-600 dark:text-gray-400">
                    {{ $exerciseSetsCount[$exercise->exerciseSlug] ?? $exercise->sets }} sets
                </span>
            </div>

            @for($set = 1; $set <= ($exerciseSetsCount[$exercise->exerciseSlug] ?? $exercise->sets); $set++)
                <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                    <!-- Set Header with Timer and Remove Button -->
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Set {{ $set }}</span>
                            @if(($exerciseSetsCount[$exercise->exerciseSlug] ?? $exercise->sets) > 1)
                                <button type="button" 
                                    wire:click="removeSet('{{ $exercise->exerciseSlug }}', {{ $set }})"
                                    class="inline-flex items-center justify-center w-6 h-6 text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                    title="Remove this set">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                                    </svg>
                                </button>
                            @endif
                        </div>
                        <!-- Set Timer -->
                        <div x-data="{
                        running: false,
                        seconds: 0,
                        interval: null,
                        start() {
                            if (!this.running) {
                                this.running = true;
                                this.interval = setInterval(() => { this.seconds++ }, 1000);
                                $wire.startTotalTimer();
                                window.activeSetTimers = (window.activeSetTimers || 0) + 1;
                            }
                        },
                        pause() {
                            if (this.running) {
                                this.running = false;
                                clearInterval(this.interval);
                                window.activeSetTimers = (window.activeSetTimers || 1) - 1;
                                if (window.activeSetTimers <= 0) {
                                    window.activeSetTimers = 0;
                                    window.dispatchEvent(new CustomEvent('pause-total-timer'));
                                }
                            }
                        },
                        reset() { this.pause(); this.seconds = 0; }
                    }" class="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-lg">
                            <span class="text-xs text-blue-700 dark:text-blue-200">Timer</span>
                            <span class="font-mono text-xs" x-text="`${String(Math.floor(seconds/60)).padStart(2, '0')}:${String(seconds%60).padStart(2, '0')}`"></span>
                            <button type="button" @click="start()" x-show="!running" class="px-2 py-1 text-xs rounded bg-blue-600 text-white">▶</button>
                            <button type="button" @click="pause()" x-show="running" class="px-2 py-1 text-xs rounded bg-yellow-500 text-white">⏸</button>
                            <button type="button" @click="reset()" class="px-2 py-1 text-xs rounded bg-gray-400 text-white">⟲</button>
                        </div>
                    </div>

                    <!-- Input Fields - Stacked Rows -->
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reps</label>
                            <input type="number"
                                wire:model.live.debounce.500ms="completedSets.{{ $exercise->exerciseSlug }}.{{ $set }}.reps"
                                min="0"
                                max="50"
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
                                placeholder="0">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Weight (kg)</label>
                            <input type="number"
                                wire:model.live.debounce.500ms="completedSets.{{ $exercise->exerciseSlug }}.{{ $set }}.weight"
                                min="0"
                                step="0.5"
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
                                placeholder="0"
                                list="weight-options-{{ $exercise->exerciseSlug }}">
                            <datalist id="weight-options-{{ $exercise->exerciseSlug }}">
                                @foreach($previousExerciseWeights[$exercise->exerciseSlug] ?? [] as $weight)
                                <option value="{{ $weight }}">{{ $weight }}</option>
                                @endforeach
                            </datalist>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">RPE</label>
                            <select wire:model.live.debounce.500ms="completedSets.{{ $exercise->exerciseSlug }}.{{ $set }}.rpe"
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100">
                                <option value="">-</option>
                                @for($rpe = 1; $rpe <= 10; $rpe++)
                                    <option value="{{ $rpe }}">{{ $rpe }}</option>
                                    @endfor
                            </select>
                        </div>
                    </div>

                    <!-- Weight Suggestion -->
                    <div class="mt-3">
                        @php
                            $setIndex = $set - 1; // Convert to 0-based index
                            $suggestedWeight = isset($suggestedExerciseWeights[$exercise->exerciseSlug][$setIndex]) 
                                ? $suggestedExerciseWeights[$exercise->exerciseSlug][$setIndex] 
                                : null;
                        @endphp
                        <x-exercise-weight-suggestion 
                            :suggested="$suggestedWeight" 
                            :hasHistory="!empty($previousExerciseWeights[$exercise->exerciseSlug] ?? [])" />
                    </div>
                </div>
                @endfor

                <!-- Notes Section -->
                <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Exercise Notes</label>
                    <textarea wire:model.live="exerciseNotes.{{ $exercise->exerciseSlug }}"
                        rows="3"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
                        placeholder="How did this exercise feel? Any adjustments needed?"></textarea>
                </div>

                <!-- Action Buttons -->
                <div class="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-600">
                    @if(($exerciseSetsCount[$exercise->exerciseSlug] ?? $exercise->sets) < 10)
                        <div class="flex justify-center">
                            <button type="button" 
                                wire:click="addSet('{{ $exercise->exerciseSlug }}')"
                                class="inline-flex items-center px-6 py-3 text-sm font-medium text-green-600 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                </svg>
                                Add Set
                            </button>
                        </div>
                    @endif
                    
                    <!-- Next Button with extra spacing -->
                    <div class="flex justify-center pt-4">
                        @if(!$loop->last)
                        <button type="button" 
                            @click="nextExercise('{{ $exercise->exerciseSlug }}', {{ $loop->index + 1 }})"
                            class="inline-flex items-center px-8 py-4 text-base font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                            </svg>
                            Next Exercise
                        </button>
                        @endif
                    </div>
                </div>
        </div>
    </fieldset>
    @endforeach

    @elseif($isLoading)
    <!-- Loading State -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Loading Exercises...</h3>
        <p class="text-gray-500 dark:text-gray-400">Generating your training plan exercises</p>
    </div>

    @elseif($hasError)
    <!-- Error State -->
    <div class="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-8 text-center">
        <h3 class="text-lg font-medium text-red-800 dark:text-red-200 mb-2">Error Loading Exercises</h3>
        <p class="text-red-600 dark:text-red-300 mb-4">{{ $errorMessage }}</p>
    </div>

    @else
    <!-- No Exercises State -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div class="mb-4">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Exercises Planned</h3>
        <p class="text-gray-500 dark:text-gray-400">This training session doesn't have any exercises planned yet.</p>
    </div>
    @endif
    <!-- Total Timer Footer (single Alpine store, only passive display) -->
    <div
        x-data="{
            running: false,
            seconds: $wire.entangle('totalTimerSeconds'),
            started: $wire.entangle('totalTimerStarted'),
            interval: null,
            debounceTimeout: null,
            start() { 
                if (!this.running) { 
                    this.running = true; 
                    this.interval = setInterval(() => { 
                        this.seconds++; 
                        this.debouncedSync(); 
                    }, 1000); 
                } 
            },
            pause() {
                if (this.running) {
                    this.running = false;
                    clearInterval(this.interval);
                }
            },
            debouncedSync() {
                clearTimeout(this.debounceTimeout);
                this.debounceTimeout = setTimeout(() => { $wire.updateTotalTimer(this.seconds); }, 2000);
            },
            init() {
                if (this.started && !this.interval) { this.start(); }
                this.$watch('started', value => { if (value) this.start(); });
                window.addEventListener('pause-total-timer', () => { this.pause(); });
            }
        }"
        x-init="init()"
        class="fixed bottom-0 left-0 w-full z-50 flex items-center justify-center bg-gray-900/95 text-white py-3 shadow-lg">
        <span class="font-medium mr-2">Total Timer:</span>
        <span class="font-mono text-lg" x-text="`${String(Math.floor(seconds/60)).padStart(2, '0')}:${String(seconds%60).padStart(2, '0')}`"></span>
    </div>
</div>
@script
<script>
    $wire.on('pr-achieved', ([{
        exercise,
        weight
    }]) => {
        Livewire.dispatch('notify', {
            type: 'success',
            title: 'New PR!',
            message: `New PR! ${exercise}: ${weight} kg`
        });

        window.confetti({
            particleCount: 150,
            spread: 360,
            origin: { x: 0.5, y: 0.5 },
            zIndex: 9999,
        }).then(container => {
            console.log(container);
            const confettiTimeout = setTimeout(() => {
                container.destroy();
                clearTimeout(confettiTimeout);
            }, 1200);
        });
        
    });

    // Handle next exercise with proper scrolling - make globally accessible
    window.nextExercise = function(currentExercise, nextIndex) {
        // First, save the current exercise data
        $wire.nextExercise(currentExercise);
        
        // Then scroll to next exercise after a brief delay to allow saving
        setTimeout(() => {
            scrollToNextExercise(nextIndex);
        }, 100);
    };

    // Smooth scroll to next exercise - make globally accessible
    window.scrollToNextExercise = function(nextIndex) {
        const exercises = document.querySelectorAll('.exercise-fieldset');
        if (nextIndex < exercises.length) {
            exercises[nextIndex].scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest' 
            });
        } else {
            // If it's the last exercise, scroll to top or show completion message
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
</script>
@endscript