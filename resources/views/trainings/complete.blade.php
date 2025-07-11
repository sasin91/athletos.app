<x-layouts.app>
    <main class="mx-auto max-w-4xl py-4">
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
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {{ $completedExercises->count() }}
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">Exercises</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-green-600 dark:text-green-400">
                            {{ $totalCompletedSets }}
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">Sets</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {{ $training->completed_at->format('M j') }}
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">Date</div>
                    </div>
                    @if($training->mood)
                    <div class="text-center">
                        <div class="text-2xl">
                            @switch($training->mood)
                                @case('terrible') 😫 @break
                                @case('bad') 😔 @break
                                @case('okay') 😐 @break
                                @case('good') 😊 @break
                                @case('excellent') 🤩 @break
                                @default {{ ucfirst($training->mood) }}
                            @endswitch
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">Mood</div>
                    </div>
                    @endif
                    @if($training->energy_level)
                    <div class="text-center">
                        <div class="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {{ $training->energy_level }}/10
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">Energy</div>
                    </div>
                    @endif
                    @if(isset($training->overall_rating))
                    <div class="text-center">
                        <div class="text-2xl">
                            @for($i = 1; $i <= 5; $i++)
                                @if($i <= $training->overall_rating)
                                    ⭐
                                @else
                                    ☆
                                @endif
                            @endfor
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">Rating</div>
                    </div>
                    @endif
                    @if(isset($training->difficulty_level))
                    <div class="text-center">
                        <div class="text-2xl font-bold text-red-600 dark:text-red-400">
                            {{ $training->difficulty_level }}/10
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">Difficulty</div>
                    </div>
                    @endif
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
                    @foreach($training->recoverySuggestions->flatten() as $suggestion)
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <div class="flex items-start justify-between mb-3">
                            <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                                {{ $suggestion->displayName }}
                            </h3>
                            <span class="px-2 py-1 text-xs font-medium rounded-full 
                                {{ $suggestion->category === 'yoga' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' : 
                                   ($suggestion->category === 'mobility' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 
                                   'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300') }}">
                                {{ ucfirst($suggestion->category) }}
                            </span>
                        </div>
                        
                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {{ __('exercises.' . $suggestion->exerciseSlug . '.description') }}
                        </p>
                        
                        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>{{ $suggestion->sets }} set{{ $suggestion->sets > 1 ? 's' : '' }}</span>
                            <span class="capitalize">{{ $suggestion->difficulty }} difficulty</span>
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

<script>
    document.addEventListener('DOMContentLoaded', () => {
        window.confetti({
            particleCount: 200,
            spread: 70,
            origin: { y: 0.6 },
            zIndex: 9999,
        }).then(container => {
            setTimeout(() => {
                container.destroy();
            }, 3000);
        });
    });
</script>
