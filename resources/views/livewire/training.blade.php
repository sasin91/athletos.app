<div class="mx-auto max-w-4xl">
    <!-- Training Header -->
    <header class="mb-8">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {{ $training->trainingPlan->name ?? 'Training Session' }}
                </h1>
                <p class="text-lg text-gray-600 dark:text-gray-400 mt-2">
                    {{ $training->scheduled_at->format('l, F j, Y') }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {{ $training->trainingPhase->name }}
                </p>
            </div>
            <div class="text-right">
                <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {{ round($training->progress) }}%
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">Complete</div>
            </div>
        </div>

        <!-- Progress Bar -->
        <div class="mt-4">
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div class="bg-blue-600 dark:bg-blue-400 h-3 rounded-full transition-all duration-300"
                    x-bind:style="`width: {{ $training->progress }}%`"
                    role="progressbar"
                    aria-valuenow="{{ $training->progress }}"
                    aria-valuemin="0" aria-valuemax="100">
                </div>
            </div>
        </div>
    </header>

        <!-- Training Content -->
        <div class="relative">
            @if(count($this->plannedExercises) > 0)
            <!-- Exercise Navigation -->
            @if(count($this->plannedExercises) > 1)
            <nav class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-8">
                <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Jump to Exercise:</h3>
                <div class="flex flex-wrap gap-2">
                    @foreach($this->plannedExercises as $index => $exercise)
                    <a href="#exercise-{{ $exercise->exerciseSlug }}"
                        class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
                        {{ $index + 1 }}. {{ $exercise->displayName }}
                    </a>
                    @endforeach
                </div>
            </nav>
            @endif

            <!-- Exercises -->
            @foreach($this->plannedExercises as $exercise)
            <fieldset id="exercise-{{ $exercise->exerciseSlug }}" class="exercise-fieldset bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
                <legend class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3">
                    <span class="inline-flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                        {{ $loop->iteration }}
                    </span>
                    {{ $exercise->displayName }}
                </legend>

                @if(!empty($exercise->notes))
                <div class="mb-6">
                    <div class="flex items-start gap-2 px-4 py-3 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 text-sm border-l-4 border-blue-400">
                        <svg class="w-5 h-5 mt-0.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{{ $exercise->notes }}</span>
                    </div>
                </div>
                @endif

                <!-- Exercise Cues -->
                @php
                    $cues = $exercise->getEffectiveCues();
                    $hasCustomCues = !empty($exercise->cues);
                @endphp
                @if(!empty($cues))
                <div class="mb-6" x-data="{ showCues: false }">
                    <button @click="showCues = !showCues" 
                        class="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                        <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': showCues }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                        <span>{{ $hasCustomCues ? 'Phase-Specific' : 'General' }} Technique Tips</span>
                    </button>
                    <div x-show="showCues" x-collapse class="mt-3">
                        <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                            @if($hasCustomCues)
                            <div class="mb-3 text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wide">
                                {{ $this->training->trainingPhase->name ?? 'Current Phase' }} Focus
                            </div>
                            @endif
                            <ul class="space-y-2 text-sm text-green-800 dark:text-green-200">
                                @foreach($cues as $cue)
                                <li class="flex items-start gap-2">
                                    <svg class="w-4 h-4 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4"></path>
                                    </svg>
                                    <span>{{ $cue }}</span>
                                </li>
                                @endforeach
                            </ul>
                        </div>
                    </div>
                </div>
                @endif

                <!-- Exercise Details -->
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
                                <!-- Enhanced Set & Rest Timer -->
                                <div x-data="{
                                mode: 'set', // 'set' or 'rest'
                                running: false,
                                seconds: 0,
                                restSeconds: 120, // 2 minutes default rest
                                interval: null,
                                isResting: false,
                                
                                start() {
                                    if (!this.running) {
                                        this.running = true;
                                        this.interval = setInterval(() => { 
                                            if (this.isResting) {
                                                this.restSeconds--;
                                                if (this.restSeconds <= 0) {
                                                    this.completeRest();
                                                }
                                            } else {
                                                this.seconds++;
                                            }
                                        }, 1000);
                                        
                                        // Ensure total timer starts when first set timer starts
                                        if (!window.totalTimerStarted) {
                                            $wire.startTotalTimer();
                                            window.totalTimerStarted = true;
                                        }
                                        
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
                                
                                reset() { 
                                    this.pause(); 
                                    this.seconds = 0; 
                                    this.restSeconds = 120;
                                    this.isResting = false;
                                    this.mode = 'set';
                                },
                                
                                startRest() {
                                    this.isResting = true;
                                    this.mode = 'rest';
                                    this.restSeconds = 120; // Reset to 2 minutes
                                    this.start();
                                },
                                
                                completeRest() {
                                    this.pause();
                                    this.isResting = false;
                                    this.mode = 'set';
                                    this.seconds = 0;
                                    // Optional: Play sound or vibration
                                    if (navigator.vibrate) {
                                        navigator.vibrate([200, 100, 200]);
                                    }
                                },
                                
                                skipRest() {
                                    this.completeRest();
                                }
                            }" class="flex items-center gap-2 px-3 py-2 rounded-lg"
                            :class="isResting ? 'bg-green-50 dark:bg-green-900/30' : 'bg-blue-50 dark:bg-blue-900/30'">
                                    
                                    <span class="text-xs font-medium" 
                                        :class="isResting ? 'text-green-700 dark:text-green-200' : 'text-blue-700 dark:text-blue-200'"
                                        x-text="isResting ? 'Rest' : 'Set'"></span>
                                    
                                    <span class="font-mono text-xs" 
                                        :class="isResting ? 'text-green-700 dark:text-green-200' : 'text-blue-700 dark:text-blue-200'"
                                        x-text="isResting 
                                            ? `${String(Math.floor(restSeconds/60)).padStart(2, '0')}:${String(restSeconds%60).padStart(2, '0')}`
                                            : `${String(Math.floor(seconds/60)).padStart(2, '0')}:${String(seconds%60).padStart(2, '0')}`"></span>
                                    
                                    <!-- Set Timer Controls -->
                                    <div x-show="!isResting" class="flex items-center gap-1">
                                        <button type="button" @click="start()" x-show="!running" class="px-2 py-1 text-xs rounded bg-blue-600 text-white">▶</button>
                                        <button type="button" @click="pause()" x-show="running" class="px-2 py-1 text-xs rounded bg-yellow-500 text-white">⏸</button>
                                        <button type="button" @click="startRest()" x-show="!running && seconds > 0" class="px-2 py-1 text-xs rounded bg-green-600 text-white">Rest</button>
                                        <button type="button" @click="reset()" class="px-2 py-1 text-xs rounded bg-gray-400 text-white">⟲</button>
                                    </div>
                                    
                                    <!-- Rest Timer Controls -->
                                    <div x-show="isResting" class="flex items-center gap-1">
                                        <button type="button" @click="pause()" x-show="running" class="px-2 py-1 text-xs rounded bg-yellow-500 text-white">⏸</button>
                                        <button type="button" @click="start()" x-show="!running" class="px-2 py-1 text-xs rounded bg-green-600 text-white">▶</button>
                                        <button type="button" @click="skipRest()" class="px-2 py-1 text-xs rounded bg-blue-600 text-white">Skip</button>
                                    </div>
                                </div>
                            </div>

                            <!-- Input Fields -->
                            <div class="space-y-4">
                                <div>
                                    <div class="flex items-center justify-between mb-2">
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Reps</label>
                                        @php
                                            $suggestedReps = $this->suggestedReps[$exercise->exerciseSlug][$set] ?? null;
                                        @endphp
                                        @if($suggestedReps)
                                            <span class="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                                Suggested: {{ $suggestedReps }}
                                            </span>
                                        @endif
                                    </div>
                                    <input type="number"
                                        wire:model.live.debounce.500ms="completedSets.{{ $exercise->exerciseSlug }}.{{ $set }}.reps"
                                        min="0"
                                        max="50"
                                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
                                        placeholder="{{ $suggestedReps ?? '0' }}">
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
                                        @foreach($this->previousExerciseWeights[$exercise->exerciseSlug] ?? [] as $weight)
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
                                    $setIndex = $set - 1;
                                    $suggestedWeight = isset($this->suggestedExerciseWeights[$exercise->exerciseSlug][$setIndex]) 
                                        ? $this->suggestedExerciseWeights[$exercise->exerciseSlug][$setIndex] 
                                        : null;
                                @endphp
                                <x-exercise-weight-suggestion 
                                    :suggested="$suggestedWeight" 
                                    :hasHistory="!empty($this->previousExerciseWeights[$exercise->exerciseSlug] ?? [])" />
                            </div>
                        </div>
                    @endfor

                    <!-- Notes Section -->
                    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Exercise Notes</label>
                        <textarea wire:model.blur="exerciseNotes.{{ $exercise->exerciseSlug }}"
                            rows="3"
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
                            placeholder="How did this exercise feel? Any adjustments needed?"></textarea>
                    </div>

                    <!-- Action Buttons -->
                    <div class="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-600">
                        <div class="flex justify-center gap-4">
                            @if(($exerciseSetsCount[$exercise->exerciseSlug] ?? $exercise->sets) < 10)
                                <button type="button" 
                                    wire:click="addSet('{{ $exercise->exerciseSlug }}')"
                                    class="inline-flex items-center px-6 py-3 text-sm font-medium text-green-600 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                    </svg>
                                    Add Set
                                </button>
                            @endif
                            
                            @if(!$loop->last)
                                <!-- Next Exercise Button -->
                                <button type="button" 
                                    wire:click="completeExerciseAndMoveNext('{{ $exercise->exerciseSlug }}')"
                                    class="inline-flex items-center px-6 py-3 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5-5 5M6 12h12"></path>
                                    </svg>
                                    Next Exercise
                                </button>
                            @endif
                        </div>
                    </div>
                </div>
            </fieldset>
            @endforeach

            <!-- Training Feedback Section (standalone) -->
            @if(count($this->plannedExercises) > 0)
            <fieldset id="training-feedback" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-8">
                <legend class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3">
                    <span class="inline-flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full text-sm font-medium">
                        ✓
                    </span>
                    Training Session Feedback
                </legend>
                
                <div class="space-y-6">
                    <!-- Overall Rating -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Overall Training Rating <span class="text-red-500">*</span>
                        </label>
                        <div class="flex justify-center space-x-2">
                            @for($rating = 1; $rating <= 5; $rating++)
                                <button type="button"
                                wire:click="$set('overallRating', {{ $rating }})"
                                class="flex items-center justify-center w-12 h-12 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-yellow-300 dark:hover:border-yellow-600 transition-colors @if($overallRating >= $rating) border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 @endif">
                                <svg class="w-8 h-8 @if($overallRating >= $rating) text-yellow-500 @else text-gray-300 @endif"
                                    fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                </button>
                                @endfor
                        </div>
                        <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                            <span>Poor</span>
                            <span>Excellent</span>
                        </div>
                    </div>

                    <!-- Mood Selection -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            How are you feeling? <span class="text-red-500">*</span>
                        </label>
                        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                            @foreach(['terrible', 'bad', 'okay', 'good', 'excellent'] as $moodOption)
                            <button type="button"
                                wire:click="$set('mood', '{{ $moodOption }}')"
                                class="flex flex-col items-center p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors @if($mood === $moodOption) border-blue-600 bg-blue-50 dark:bg-blue-900/20 @endif">
                                <span class="text-2xl mb-1">
                                    @switch($moodOption)
                                    @case('terrible') 😫 @break
                                    @case('bad') 😔 @break
                                    @case('okay') 😐 @break
                                    @case('good') 😊 @break
                                    @case('excellent') 🤩 @break
                                    @endswitch
                                </span>
                                <span class="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{{ $moodOption }}</span>
                            </button>
                            @endforeach
                        </div>
                    </div>

                    <!-- Energy Level -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Energy Level (1-10) <span class="text-red-500">*</span>
                        </label>
                        <div class="grid grid-cols-5 md:grid-cols-10 gap-2">
                            @for($level = 1; $level <= 10; $level++)
                                <button type="button"
                                wire:click="$set('energyLevel', {{ $level }})"
                                class="flex items-center justify-center h-12 w-12 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors @if($energyLevel == $level) border-blue-600 bg-blue-600 text-white @endif">
                                <span class="font-semibold">{{ $level }}</span>
                                </button>
                                @endfor
                        </div>
                        <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                            <span>Exhausted</span>
                            <span>Energized</span>
                        </div>
                    </div>

                    <!-- Training Difficulty -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            How challenging was this training? <span class="text-red-500">*</span>
                        </label>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                            @foreach(['too_easy', 'just_right', 'challenging', 'too_hard'] as $diffOption)
                            <button type="button"
                                wire:click="$set('difficulty', '{{ $diffOption }}')"
                                class="flex flex-col items-center p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors @if($difficulty === $diffOption) border-blue-600 bg-blue-50 dark:bg-blue-900/20 @endif">
                                <span class="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
                                    @switch($diffOption)
                                    @case('too_easy') Too Easy @break
                                    @case('just_right') Just Right @break
                                    @case('challenging') Challenging @break
                                    @case('too_hard') Too Hard @break
                                    @endswitch
                                </span>
                            </button>
                            @endforeach
                        </div>
                    </div>

                    <!-- Difficulty Level -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Difficulty Level (1-10) <span class="text-red-500">*</span>
                        </label>
                        <div class="grid grid-cols-5 md:grid-cols-10 gap-2">
                            @for($level = 1; $level <= 10; $level++)
                                <button type="button"
                                wire:click="$set('difficultyLevel', {{ $level }})"
                                class="flex items-center justify-center h-12 w-12 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-red-300 dark:hover:border-red-600 transition-colors @if($difficultyLevel == $level) border-red-600 bg-red-600 text-white @endif">
                                <span class="font-semibold">{{ $level }}</span>
                                </button>
                                @endfor
                        </div>
                        <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                            <span>Very Easy</span>
                            <span>Very Hard</span>
                        </div>
                    </div>

                    <!-- Additional Notes -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Additional Notes (Optional)
                        </label>
                        <textarea wire:model.blur="notes"
                            rows="3"
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
                            placeholder="How did the training feel? Any adjustments needed for next time?"></textarea>
                    </div>

                    <!-- Complete Training Button -->
                    <div class="pt-6 border-t border-gray-200 dark:border-gray-600">
                        <button type="button"
                            wire:click="completeTraining"
                            class="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                            <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Complete Training
                        </button>
                    </div>
                </div>
            </fieldset>
            @endif

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

            <!-- Total Timer Footer -->
            <div
                x-data="{
                    running: false,
                    seconds: $wire.entangle('totalTimerSeconds'),
                    started: $wire.entangle('totalTimerStarted'),
                    interval: null,
                    lastUpdateTime: null,
                    wakeLock: null,
                    debounceTimeout: null,
                    
                    async start() { 
                        if (!this.running) { 
                            this.running = true; 
                            this.lastUpdateTime = Date.now();
                            this.interval = setInterval(() => { 
                                this.tick();
                            }, 1000); 
                            
                            // Try to acquire wake lock to prevent screen sleep
                            try {
                                if ('wakeLock' in navigator) {
                                    this.wakeLock = await navigator.wakeLock.request('screen');
                                }
                            } catch (err) {
                                console.log('Wake lock failed:', err);
                            }
                        } 
                    },
                    
                    tick() {
                        const now = Date.now();
                        const expectedTime = this.lastUpdateTime + 1000;
                        const drift = now - expectedTime;
                        
                        // If significant drift (more than 2 seconds), adjust for time lost
                        if (Math.abs(drift) > 2000) {
                            const missedSeconds = Math.floor(drift / 1000);
                            this.seconds += missedSeconds;
                        }
                        
                        this.seconds++;
                        this.lastUpdateTime = now;
                        this.debouncedSync();
                    },
                    
                    pause() {
                        if (this.running) {
                            this.running = false;
                            clearInterval(this.interval);
                            
                            // Release wake lock
                            if (this.wakeLock) {
                                this.wakeLock.release();
                                this.wakeLock = null;
                            }
                        }
                    },
                    
                    debouncedSync() {
                        clearTimeout(this.debounceTimeout);
                        this.debounceTimeout = setTimeout(() => { 
                            $wire.updateTotalTimer(this.seconds); 
                        }, 3000);
                    },
                    
                    handleVisibilityChange() {
                        if (document.hidden) {
                            // Page became hidden - store current time
                            localStorage.setItem('timerHiddenTime', Date.now().toString());
                        } else {
                            // Page became visible - check for time passed
                            const hiddenTime = localStorage.getItem('timerHiddenTime');
                            if (hiddenTime && this.running) {
                                const timePassed = Math.floor((Date.now() - parseInt(hiddenTime)) / 1000);
                                if (timePassed > 0) {
                                    this.seconds += timePassed;
                                    this.debouncedSync();
                                }
                            }
                            localStorage.removeItem('timerHiddenTime');
                        }
                    },
                    
                    init() {
                        window.totalTimerStarted = this.started;
                        
                        if (this.started && !this.running) { 
                            this.start(); 
                        }
                        
                        this.$watch('started', value => { 
                            window.totalTimerStarted = value;
                            if (value && !this.running) this.start(); 
                        });
                        
                        window.addEventListener('pause-total-timer', () => { this.pause(); });
                        
                        // Handle page visibility changes to maintain timer accuracy
                        document.addEventListener('visibilitychange', () => {
                            this.handleVisibilityChange();
                        });
                        
                        // Handle page unload
                        window.addEventListener('beforeunload', () => {
                            if (this.running) {
                                localStorage.setItem('timerSeconds', this.seconds.toString());
                                localStorage.setItem('timerRunning', 'true');
                            }
                        });
                        
                        // Restore timer state on reload
                        const savedSeconds = localStorage.getItem('timerSeconds');
                        const wasRunning = localStorage.getItem('timerRunning');
                        if (savedSeconds && wasRunning === 'true' && this.started) {
                            this.seconds = parseInt(savedSeconds);
                            localStorage.removeItem('timerSeconds');
                            localStorage.removeItem('timerRunning');
                        }
                    }
                }"
                x-init="init()"
                class="fixed bottom-0 left-0 w-full z-50 flex items-center justify-center bg-gray-900/95 text-white py-3 shadow-lg">
                <span class="font-medium mr-2">Total Timer:</span>
                <span class="font-mono text-lg" x-text="`${String(Math.floor(seconds/60)).padStart(2, '0')}:${String(seconds%60).padStart(2, '0')}`"></span>
            </div>
        </div>

    <!-- Back to Dashboard Button -->
    <div class="flex justify-between items-center pt-6 mt-8 border-t border-gray-200 dark:border-gray-600">
        <a href="{{ route('dashboard') }}"
            class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
        </a>
    </div>

    @script
    <script>
        $wire.on('pr-achieved', ([{
            exercise,
            weight,
            reps,
            type
        }]) => {
            const message = reps === 1 ? 
                `New ${type}! ${exercise}: ${weight} kg` : 
                `New ${type}! ${exercise}: ${weight} kg for ${reps} reps`;
                
            Livewire.dispatch('notify', {
                type: 'success',
                title: 'Personal Record!',
                message: message
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

        $wire.on('scrollToElement', ([{elementId}]) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    </script>
    @endscript
</div> 