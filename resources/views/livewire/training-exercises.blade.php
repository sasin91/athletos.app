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
        <fieldset id="exercise-{{ $exercise->exerciseSlug }}" class="exercise-fieldset bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <legend class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-3">
                <span class="inline-flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                    {{ $loop->iteration }}
                </span>
                {{ $exercise->displayName }}
            </legend>

            @if(!empty($exercise->notes))
            <div class="mb-4">
                <div class="flex items-start gap-2 px-4 py-2 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 text-sm border-l-4 border-blue-400">
                    <x-heroicon-o-information-circle class="w-5 h-5 mt-0.5 text-blue-400" />
                    <span>{{ $exercise->notes }}</span>
                </div>
            </div>
            @endif

            <!-- Exercise Details -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Planned Sets</div>
                    <div class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ $exercise->sets }}</div>
                </div>
                <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Planned Reps</div>
                    <div class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ $exercise->reps }}</div>
                </div>
                <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Planned Weight</div>
                    <div class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ $exercise->weight }}</div>
                </div>
            </div>

            <!-- Exercise Swap Section -->
            <div class="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="text-sm font-medium text-yellow-800 dark:text-yellow-200">Need to swap this exercise?</h4>
                    <button type="button" 
                            onclick="toggleExerciseSuggestions('{{ $exercise->exerciseSlug }}', event)"
                            class="text-sm text-yellow-700 dark:text-yellow-300 hover:text-yellow-800 dark:hover:text-yellow-200 font-medium">
                        Show Alternatives
                    </button>
                </div>
                
                <div id="exercise-suggestions-{{ $exercise->exerciseSlug }}" class="hidden">
                    <livewire:exercise-suggestion 
                        :currentExercise="$exercise->exerciseSlug"
                        :gymId="$training->athlete->gym_id ?? null"
                        :trainingId="$training->id"
                        :key="'exercise-suggestions-' . $exercise->exerciseSlug" />
                </div>
            </div>

            <!-- Exercise Entries -->
            <div class="space-y-4">
                <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100">Log Your Sets</h4>
                
                @for($set = 1; $set <= $exercise->sets; $set++)
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div class="flex flex-col items-start md:items-center">
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Set {{ $set }}</span>
                        <!-- Set Timer (below label) -->
                        <div class="w-full mt-1">
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
                            }" class="flex flex-row items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                                <span class="text-xs text-blue-700 dark:text-blue-200">Set Timer</span>
                                <span class="font-mono text-xs" x-text="`${String(Math.floor(seconds/60)).padStart(2, '0')}:${String(seconds%60).padStart(2, '0')}`"></span>
                                <button type="button" @click="start()" x-show="!running" class="px-2 py-1 text-xs rounded bg-blue-600 text-white">▶</button>
                                <button type="button" @click="pause()" x-show="running" class="px-2 py-1 text-xs rounded bg-yellow-500 text-white">⏸</button>
                                <button type="button" @click="reset()" class="px-2 py-1 text-xs rounded bg-gray-400 text-white">⟲</button>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reps</label>
                        <input type="number" 
                               wire:model.live="completedSets.{{ $exercise->exerciseSlug }}.{{ $set }}.reps"
                               wire:change="completeSet('{{ $exercise->exerciseSlug }}', {{ $set }}, $event.target.value, {{ $completedSets[$exercise->exerciseSlug][$set]['weight'] ?? 'null' }}, {{ $completedSets[$exercise->exerciseSlug][$set]['rpe'] ?? 'null' }})"
                               min="0" 
                               max="50"
                               class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
                               placeholder="0">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Weight (lbs)</label>
                        <input type="number" 
                               wire:model.live="completedSets.{{ $exercise->exerciseSlug }}.{{ $set }}.weight"
                               wire:change="completeSet('{{ $exercise->exerciseSlug }}', {{ $set }}, {{ $completedSets[$exercise->exerciseSlug][$set]['reps'] ?? 'null' }}, $event.target.value, {{ $completedSets[$exercise->exerciseSlug][$set]['rpe'] ?? 'null' }})"
                               min="0" 
                               step="0.5"
                               class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
                               placeholder="0">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">RPE</label>
                        <select wire:model.live="completedSets.{{ $exercise->exerciseSlug }}.{{ $set }}.rpe"
                                wire:change="completeSet('{{ $exercise->exerciseSlug }}', {{ $set }}, {{ $completedSets[$exercise->exerciseSlug][$set]['reps'] ?? 'null' }}, {{ $completedSets[$exercise->exerciseSlug][$set]['weight'] ?? 'null' }}, $event.target.value)"
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100">
                            <option value="">-</option>
                            @for($rpe = 1; $rpe <= 10; $rpe++)
                            <option value="{{ $rpe }}">{{ $rpe }}</option>
                            @endfor
                        </select>
                    </div>
                </div>
                @endfor
                
                <!-- Notes -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                    <textarea wire:model.live="exerciseNotes.{{ $exercise->exerciseSlug }}"
                              wire:change="addNotes('{{ $exercise->exerciseSlug }}', $event.target.value)"
                              rows="2"
                              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
                              placeholder="How did this exercise feel? Any adjustments needed?"></textarea>
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
        class="fixed bottom-0 left-0 w-full z-50 flex items-center justify-center bg-gray-900/95 text-white py-3 shadow-lg"
    >
        <span class="font-medium mr-2">Total Timer:</span>
        <span class="font-mono text-lg" x-text="`${String(Math.floor(seconds/60)).padStart(2, '0')}:${String(seconds%60).padStart(2, '0')}`"></span>
    </div>
</div> 