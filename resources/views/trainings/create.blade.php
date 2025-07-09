<x-layouts.app>
    <div class="py-12">
        <div class="max-w-4xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white dark:bg-gray-800 overflow-hidden shadow-xl sm:rounded-lg">
                <div class="p-6 lg:p-8 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <h1 class="text-2xl font-medium text-gray-900 dark:text-white">
                        Start Your Training
                    </h1>
                    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {{ $date->format('F j, Y') }} • {{ $trainingPlan->name }}
                    </p>
                </div>

                <div class="bg-gray-50 dark:bg-gray-900 bg-opacity-25 p-6 lg:p-8">
                    @if(count($plannedExercises) > 0)
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Planned Exercises
                        </h2>
                        
                        <div class="space-y-4 mb-8">
                            @foreach($plannedExercises as $exercise)
                                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                                                {{ $exercise->displayName }}
                                            </h3>
                                            <p class="text-sm text-gray-600 dark:text-gray-400">
                                                {{ $exercise->sets }} sets × {{ $exercise->reps }} reps
                                                @if($exercise->weight !== 'Body weight')
                                                    • {{ $exercise->weight }}
                                                @endif
                                            </p>
                                            @if($exercise->restSeconds)
                                                <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                    Rest: {{ round($exercise->restSeconds / 60, 1) }} minutes
                                                </p>
                                            @endif
                                        </div>
                                        <div class="flex flex-col items-end">
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                    {{ $exercise->difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : '' }}
                                                    {{ $exercise->difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' : '' }}
                                                    {{ $exercise->difficulty === 'hard' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : '' }}">
                                                {{ ucfirst($exercise->difficulty) }}
                                            </span>
                                            <span class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                {{ ucfirst($exercise->category) }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            @endforeach
                        </div>
                    @else
                        <div class="text-center py-8">
                            <svg class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No exercises planned</h3>
                            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                This training plan doesn't have any exercises configured yet.
                            </p>
                        </div>
                    @endif

                    <div class="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                        <a href="{{ route('dashboard') }}" 
                        class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Dashboard
                        </a>
                        
                        @if(count($plannedExercises) > 0)
                            <form method="POST" action="{{ route('trainings.store') }}">
                                @csrf
                                <input type="hidden" name="training_plan_id" value="{{ $trainingPlan->id }}">
                                <input type="hidden" name="scheduled_at" value="{{ $date->format('Y-m-d H:i:s') }}">
                                
                                <button type="submit" 
                                        class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                    <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Start Training
                                </button>
                            </form>
                        @endif
                    </div>
                </div>
            </div>
        </div>
    </div>
</x-layouts.app>