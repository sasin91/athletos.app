@php
$exerciseOptions = [];
if (isset($this) && isset($this->availableExercises)) {
foreach ($this->availableExercises as $e) {
$exerciseOptions[] = [
'value' => $e->exercise->value,
'label' => $e->displayName,
];
}
}
@endphp
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
            <div class="flex flex-wrap gap-2 mb-4">
                @foreach($this->plannedExercises as $index => $exercise)
                <a href="#exercise-{{ $exercise->exerciseSlug }}"
                    class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
                    {{ $index + 1 }}. {{ $exercise->displayName }}
                </a>
                @endforeach
            </div>
        </nav>
        @endif

        {{-- Exercise Sets --}}
        @foreach($sets as $exerciseSlug => $exerciseSets)
        <fieldset id="exercise-{{ $exerciseSlug }}" class="mb-8 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <legend class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3">
                <span class="inline-flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                    {{ $loop->iteration }}
                </span>
                {{ $exerciseSets[0]->meta->displayName ?? $exerciseSlug }}
            </legend>

            @foreach($exerciseSets as $set)
            <div x-data="{ focused: false }"
                :class="focused ? 'bg-blue-50 dark:bg-blue-900/30 shadow-lg ring-2 ring-blue-400' : 'bg-white dark:bg-gray-800 shadow-sm'"
                class="mb-4 flex items-center gap-4 rounded-lg transition-all duration-200 p-4">
                <div class="w-16 text-gray-700 dark:text-gray-300">Set {{ $set->setNumber }}</div>
                <div class="flex-1 grid grid-cols-3 gap-2">
                    <div class="relative">
                        <label for="reps-{{ $exerciseSlug }}-{{ $set->setNumber }}" class="absolute -top-2 left-2 inline-block rounded-lg bg-white dark:bg-gray-800 px-1 text-xs font-medium text-gray-900 dark:text-gray-100">Reps</label>
                        <input type="number" name="reps-{{ $exerciseSlug }}-{{ $set->setNumber }}" id="reps-{{ $exerciseSlug }}-{{ $set->setNumber }}"
                            class="block w-full rounded-md bg-white dark:bg-gray-900 px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-700 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                            placeholder="Reps"
                            @focus="focused = true" @blur="focused = false"
                            wire:model.defer="sets.{{ $exerciseSlug }}.{{ $loop->index }}.reps" value="{{ $set->reps }}" />
                    </div>
                    <div class="relative">
                        <label for="weight-{{ $exerciseSlug }}-{{ $set->setNumber }}" class="absolute -top-2 left-2 inline-block rounded-lg bg-white dark:bg-gray-800 px-1 text-xs font-medium text-gray-900 dark:text-gray-100">Weight</label>
                        <input type="text" name="weight-{{ $exerciseSlug }}-{{ $set->setNumber }}" id="weight-{{ $exerciseSlug }}-{{ $set->setNumber }}"
                            class="block w-full rounded-md bg-white dark:bg-gray-900 px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-700 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                            placeholder="Weight"
                            @focus="focused = true" @blur="focused = false"
                            wire:model.defer="sets.{{ $exerciseSlug }}.{{ $loop->index }}.weight" value="{{ $set->weight }}" />
                    </div>
                    <div class="relative">
                        <label for="rpe-{{ $exerciseSlug }}-{{ $set->setNumber }}" class="absolute -top-2 left-2 inline-block rounded-lg bg-white dark:bg-gray-800 px-1 text-xs font-medium text-gray-900 dark:text-gray-100">RPE</label>
                        <input type="number" name="rpe-{{ $exerciseSlug }}-{{ $set->setNumber }}" id="rpe-{{ $exerciseSlug }}-{{ $set->setNumber }}"
                            class="block w-full rounded-md bg-white dark:bg-gray-900 px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-700 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                            placeholder="RPE"
                            @focus="focused = true" @blur="focused = false"
                            wire:model.defer="sets.{{ $exerciseSlug }}.{{ $loop->index }}.rpe" value="{{ $set->rpe }}" />
                    </div>
                </div>
                <button type="button"
                    wire:click="removeSet('{{ $exerciseSlug }}', {{ $set->setNumber }})"
                    class="ml-2 text-red-500 hover:text-red-700">Remove</button>
            </div>
            @endforeach
            <button type="button"
                wire:click="addSet('{{ $exerciseSlug }}')"
                class="mt-2 px-3 py-1 bg-blue-500 text-white rounded">Add Set</button>
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

        {{-- Add Exercise Drawer --}}
        <div x-data="{ addingExercise: $wire.entangle('addingExercise') }">
            <!-- Backdrop (fades in/out) -->
            <div
                x-show="addingExercise"
                x-transition:enter="transition-opacity ease-linear duration-300"
                x-transition:enter-start="opacity-0"
                x-transition:enter-end="opacity-100"
                x-transition:leave="transition-opacity ease-linear duration-200"
                x-transition:leave-start="opacity-100"
                x-transition:leave-end="opacity-0"
                class="fixed inset-0 z-40 bg-gray-500/75"
                aria-hidden="true"
                wire:click="$set('addingExercise', false)"
                style="display: none;"></div>
            <!-- Drawer (slides in/out) -->
            <div
                x-show="addingExercise"
                x-transition:enter="transform transition ease-in-out duration-500 sm:duration-700"
                x-transition:enter-start="translate-x-full"
                x-transition:enter-end="translate-x-0"
                x-transition:leave="transform transition ease-in-out duration-500 sm:duration-700"
                x-transition:leave-start="translate-x-0"
                x-transition:leave-end="translate-x-full"
                class="fixed inset-y-0 right-0 z-50 flex max-w-full pl-10 sm:pl-16"
                style="display: none;">
                <div class="pointer-events-auto w-screen max-w-md">
                    <div class="flex h-full flex-col overflow-y-auto bg-white dark:bg-gray-900 shadow-xl">
                        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div class="flex items-start justify-between">
                                <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100" id="drawer-title">Add Exercise</h2>
                                <div class="ml-3 flex h-7 items-center">
                                    <button type="button" wire:click="$set('addingExercise', false)" class="relative rounded-md bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-500 focus-visible:ring-2 focus-visible:ring-indigo-500">
                                        <span class="sr-only">Close panel</span>
                                        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <ul role="list" class="flex-1 divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto px-6">
                            @foreach($this->availableExercises as $exercise)
                            <li class="flex justify-between gap-x-6 py-5">
                                <div class="flex min-w-0 gap-x-4">
                                    <img class="size-12 flex-none rounded bg-gray-50 object-cover" src="{{ $exercise->image ?? '/images/exercise-placeholder.png' }}" alt="{{ $exercise->displayName }}" />
                                    <div class="min-w-0 flex-auto">
                                        <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ $exercise->displayName }}</p>
                                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ $exercise->summary ?? '' }}</p>
                                        <div class="mt-1 flex flex-wrap gap-1">
                                            @foreach($exercise->tags ?? [] as $tag)
                                            <span class="inline-block bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded px-2 py-0.5 text-xs">{{ $tag }}</span>
                                            @endforeach
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center">
                                    <button type="button" wire:click="addExercise('{{ $exercise->exercise->value }}')" class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Add</button>
                                </div>
                            </li>
                            @endforeach
                        </ul>
                        <div class="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                            <button type="button" wire:click="$set('addingExercise', false)" class="inline-flex items-center rounded-md bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
            </div}
                </div>

            {{-- Static 3-column Footer --}}
            <div class="fixed bottom-0 left-0 w-full z-50 bg-gray-900/95 text-white py-3 shadow-lg">
                <div class="max-w-4xl mx-auto flex items-center justify-between px-4">
                    <!-- Back to Dashboard -->
                    <div>
                        <a href="{{ route('dashboard') }}"
                            class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-100 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Dashboard
                        </a>
                    </div>
                    <!-- Total Timer -->
                    <div
                        x-data="totalTimer()"
                        x-init="init()"
                        class="flex flex-col items-center">
                        <span class="font-medium">Total Timer:</span>
                        <span class="font-mono text-lg" x-text="`${String(Math.floor(seconds/60)).padStart(2, '0')}:${String(seconds%60).padStart(2, '0')}`"></span>
                    </div>
                    <!-- Add Exercise -->
                    <div>
                        <button type="button" wire:click="$set('addingExercise', true)" class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                            <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Exercise
                        </button>
                    </div>
                </div>
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
                        origin: {
                            x: 0.5,
                            y: 0.5
                        },
                        zIndex: 9999,
                    }).then(container => {
                        console.log(container);
                        const confettiTimeout = setTimeout(() => {
                            container.destroy();
                            clearTimeout(confettiTimeout);
                        }, 1200);
                    });
                });

                $wire.on('scrollToElement', ([{
                    elementId
                }]) => {
                    requestAnimationFrame(() => {
                        const element = document.getElementById(elementId);
                        if (element) {
                            element.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start'
                            });
                        }
                    });
                });

                window.totalTimer = function() {
                    return {
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
                                localStorage.setItem('timerHiddenTime', Date.now().toString());
                            } else {
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
                            if (this.started && !this.running) this.start();
                            this.$watch('started', value => {
                                window.totalTimerStarted = value;
                                if (value && !this.running) this.start();
                            });
                            window.addEventListener('pause-total-timer', () => {
                                this.pause();
                            });
                            document.addEventListener('visibilitychange', () => {
                                this.handleVisibilityChange();
                            });
                            window.addEventListener('beforeunload', () => {
                                if (this.running) {
                                    localStorage.setItem('timerSeconds', this.seconds.toString());
                                    localStorage.setItem('timerRunning', 'true');
                                }
                            });
                            const savedSeconds = localStorage.getItem('timerSeconds');
                            const wasRunning = localStorage.getItem('timerRunning');
                            if (savedSeconds && wasRunning === 'true' && this.started) {
                                this.seconds = parseInt(savedSeconds);
                                localStorage.removeItem('timerSeconds');
                                localStorage.removeItem('timerRunning');
                            }
                        }
                    };
                };
            </script>
            @endscript
        </div>