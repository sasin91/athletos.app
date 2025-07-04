<x-layouts.app>
    <main class="mx-auto max-w-4xl" x-data="{ 
        showConfetti: true,
        feedbackSubmitted: false,
        selectedRecovery: null
    }" x-init="
        // Trigger confetti effect
        setTimeout(() => {
            showConfetti = false;
        }, 3000);
    ">
        <!-- Confetti Effect -->
        <div x-show="showConfetti" x-transition:enter="transition ease-out duration-1000" x-transition:enter-start="opacity-0" x-transition:enter-end="opacity-100" x-transition:leave="transition ease-in duration-500" x-transition:leave-start="opacity-100" x-transition:leave-end="opacity-0" class="fixed inset-0 pointer-events-none z-50">
            <div class="absolute inset-0 overflow-hidden">
                <!-- Confetti particles -->
                <div class="absolute top-0 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style="animation-delay: 0s;"></div>
                <div class="absolute top-0 left-1/3 w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.2s;"></div>
                <div class="absolute top-0 left-1/2 w-2 h-2 bg-green-400 rounded-full animate-bounce" style="animation-delay: 0.4s;"></div>
                <div class="absolute top-0 left-2/3 w-2 h-2 bg-red-400 rounded-full animate-bounce" style="animation-delay: 0.6s;"></div>
                <div class="absolute top-0 left-3/4 w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.8s;"></div>
                <div class="absolute top-10 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style="animation-delay: 1s;"></div>
                <div class="absolute top-10 left-1/3 w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 1.2s;"></div>
                <div class="absolute top-10 left-1/2 w-2 h-2 bg-green-400 rounded-full animate-bounce" style="animation-delay: 1.4s;"></div>
                <div class="absolute top-10 left-2/3 w-2 h-2 bg-red-400 rounded-full animate-bounce" style="animation-delay: 1.6s;"></div>
                <div class="absolute top-10 left-3/4 w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 1.8s;"></div>
            </div>
        </div>

        <!-- Success Header -->
        <header class="text-center mb-12">
            <div class="mb-6">
                <div class="mx-auto w-24 h-24 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                    <svg class="w-12 h-12 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 class="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Training Complete!
                </h1>
                <p class="text-xl text-gray-600 dark:text-gray-400">
                    Great work on completing your {{ $training->trainingPlan->name ?? 'training session' }}
                </p>
            </div>

            <!-- Training Summary -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
                @php
                    // Get completed exercises grouped by exercise type
                    $completedExercises = $training->exercises->groupBy('exercise_enum');
                    $totalCompletedSets = $training->exercises->count();
                @endphp
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {{ $completedExercises->count() }}
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">Exercises Completed</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-green-600 dark:text-green-400">
                            {{ $totalCompletedSets }}
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">Sets Completed</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {{ $training->completed_at->format('M j') }}
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">Completed</div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Completed Exercises Summary -->
        <section class="mb-12">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                    Exercises Completed
                </h2>
                
                @if($completedExercises->count() > 0)
                    <div class="space-y-6">
                        @foreach($completedExercises as $exerciseEnum => $sets)
                            @php
                                $exerciseName = \App\Enums\Exercise::from($exerciseEnum)->displayName();
                                $firstSet = $sets->first();
                                $notes = $firstSet->notes;
                            @endphp
                            <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                <div class="flex items-center justify-between mb-3">
                                    <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
                                        {{ $exerciseName }}
                                    </h3>
                                    <span class="text-sm text-gray-500 dark:text-gray-400">
                                        {{ $sets->count() }} sets
                                    </span>
                                </div>
                                
                                @if($notes)
                                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 italic">
                                        "{{ $notes }}"
                                    </p>
                                @endif
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    @foreach($sets->sortBy('set_number') as $set)
                                        <div class="bg-gray-50 dark:bg-gray-700 rounded p-3 text-center">
                                            <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Set {{ $set->set_number }}</div>
                                            <div class="font-medium text-gray-900 dark:text-gray-100">
                                                @if($set->weight)
                                                    {{ $set->weight }}kg × {{ $set->reps }}
                                                @else
                                                    {{ $set->reps }} reps
                                                @endif
                                            </div>
                                            @if($set->rpe)
                                                <div class="text-xs text-gray-500 dark:text-gray-400">
                                                    RPE {{ $set->rpe }}
                                                </div>
                                            @endif
                                        </div>
                                    @endforeach
                                </div>
                            </div>
                        @endforeach
                    </div>
                @else
                    <div class="text-center py-8">
                        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mt-2">No exercises completed</h3>
                        <p class="text-gray-600 dark:text-gray-400">It looks like no exercises were recorded for this training session.</p>
                    </div>
                @endif
            </div>
        </section>

        <!-- Training Feedback Section -->
        <section class="mb-12" x-show="!feedbackSubmitted">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                    How was your training?
                </h2>
                
                <form @submit.prevent="feedbackSubmitted = true" class="space-y-6">
                    <!-- Overall Rating -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Overall Training Experience
                        </label>
                        <div class="flex gap-2">
                            <template x-for="rating in 5" :key="rating">
                                <button type="button" 
                                        class="w-12 h-12 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors flex items-center justify-center">
                                    <svg class="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                </button>
                            </template>
                        </div>
                    </div>

                    <!-- Difficulty Level -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            How challenging was this training?
                        </label>
                        <select class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100">
                            <option value="">Select difficulty...</option>
                            <option value="too_easy">Too Easy</option>
                            <option value="just_right">Just Right</option>
                            <option value="challenging">Challenging</option>
                            <option value="too_hard">Too Hard</option>
                        </select>
                    </div>

                    <!-- Energy Level -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            How do you feel now?
                        </label>
                        <select class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100">
                            <option value="">Select energy level...</option>
                            <option value="exhausted">Exhausted</option>
                            <option value="tired">Tired</option>
                            <option value="good">Good</option>
                            <option value="energized">Energized</option>
                            <option value="pumped">Pumped</option>
                        </select>
                    </div>

                    <!-- Feedback Notes -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Any additional feedback?
                        </label>
                        <textarea rows="3" 
                                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
                                  placeholder="What went well? What could be improved?"></textarea>
                    </div>

                    <div class="flex justify-end">
                        <button type="submit" 
                                class="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Submit Feedback
                        </button>
                    </div>
                </form>
            </div>
        </section>

        <!-- Feedback Submitted Message -->
        <section class="mb-12" x-show="feedbackSubmitted" x-transition>
            <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                <svg class="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 class="text-lg font-medium text-green-800 dark:text-green-200 mb-2">
                    Feedback Submitted!
                </h3>
                <p class="text-green-700 dark:text-green-300">
                    Thank you for your feedback. It helps us improve your training experience.
                </p>
            </div>
        </section>

        <!-- Recovery Suggestions -->
        <section class="mb-12">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                    Recovery Suggestions
                </h2>
                <p class="text-gray-600 dark:text-gray-400 mb-6">
                    Based on your training, here are some recovery exercises to help you feel better:
                </p>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    @foreach($training->recoverySuggestions as $suggestion)
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <div class="flex items-start justify-between mb-3">
                            <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                                {{ $suggestion['name'] }}
                            </h3>
                            <span class="px-2 py-1 text-xs font-medium rounded-full 
                                {{ $suggestion['category'] === 'yoga' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' : 
                                   ($suggestion['category'] === 'mobility' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 
                                   'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300') }}">
                                {{ ucfirst($suggestion['category']) }}
                            </span>
                        </div>
                        
                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {{ $suggestion['description'] }}
                        </p>
                        
                        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>{{ $suggestion['duration'] }}</span>
                            <span class="capitalize">{{ $suggestion['intensity'] }} intensity</span>
                        </div>
                    </div>
                    @endforeach
                </div>
            </div>
        </section>

        <!-- Next Steps -->
        <section class="mb-12">
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    What's Next?
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0">
                            <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">Rest & Recovery</h3>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Take time to rest and let your muscles recover.</p>
                        </div>
                    </div>
                    
                    <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0">
                            <div class="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">Track Progress</h3>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Check your dashboard to see your progress.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="{{ route('dashboard') }}" 
               class="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Back to Dashboard
            </a>
            
            <a href="{{ route('trainings.show', $training) }}" 
               class="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Training Details
            </a>
        </div>
    </main>
</x-layouts.app> 