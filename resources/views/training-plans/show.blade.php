<x-layouts.app>
    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                <div class="p-6 text-gray-900 dark:text-gray-100">
                    <!-- Header -->
                    <div class="flex items-center justify-between mb-8">
                        <div>
                            <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{{ $trainingPlan->name }}</h1>
                            <p class="text-gray-600 dark:text-gray-400 mt-2">{{ $trainingPlan->description }}</p>
                        </div>
                        <div class="flex items-center space-x-3">
                            @if(Auth::user()->athlete && Auth::user()->athlete->current_plan_id !== $trainingPlan->id)
                                <form method="POST" action="{{ route('training-plans.assign', $trainingPlan) }}">
                                    @csrf
                                    <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                        Assign This Plan
                                    </button>
                                </form>
                            @else
                                <span class="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
                                    Current Plan
                                </span>
                            @endif
                        </div>
                    </div>

                    <!-- Plan Details -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Goal</h3>
                            <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ ucfirst($trainingPlan->goal->value) }}</p>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Experience Level</h3>
                            <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ ucfirst($trainingPlan->experience_level->value ?? 'Any') }}</p>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Progression Type</h3>
                            <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ ucfirst($trainingPlan->default_progression_type->value) }}</p>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Phases</h3>
                            <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ $trainingPlan->phases->count() }}</p>
                        </div>
                    </div>

                    <!-- Training Phases -->
                    <div class="space-y-8">
                        <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Training Phases</h2>
                        
                        @foreach($trainingPlan->phases as $phase)
                            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                                <div class="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">{{ $phase->name }}</h3>
                                        @if($phase->description)
                                            <p class="text-gray-600 dark:text-gray-400 mt-1">{{ $phase->description }}</p>
                                        @endif
                                    </div>
                                    <div class="text-right">
                                        <span class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                                            {{ $phase->duration_weeks }} {{ $phase->duration_weeks === 1 ? 'week' : 'weeks' }}
                                        </span>
                                    </div>
                                </div>

                                @if($phase->settings && $phase->settings->exercises)
                                    <div class="space-y-4">
                                        <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100">Exercises</h4>
                                        
                                        @php
                                            $exercisesByDay = collect($phase->settings->exercises)->groupBy('day');
                                        @endphp
                                        
                                        @foreach($exercisesByDay as $day => $exercises)
                                            <div class="mb-6">
                                                <h5 class="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">Day {{ $day }}</h5>
                                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    @foreach($exercises as $exercise)
                                                        <div class="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 p-4">
                                                            <h6 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                                                {{ \App\Enums\Exercise::from($exercise->exercise)->displayName() }}
                                                            </h6>
                                                            <div class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                                                <p><span class="font-medium">Sets:</span> {{ $exercise->sets }}</p>
                                                                <p><span class="font-medium">Reps:</span> {{ $exercise->reps }}</p>
                                                                <p><span class="font-medium">Weight:</span> {{ $exercise->weight }}</p>
                                                                <p><span class="font-medium">Rest:</span> {{ $exercise->rest_seconds }}s</p>
                                                                @if($exercise->notes)
                                                                    <p><span class="font-medium">Notes:</span> {{ $exercise->notes }}</p>
                                                                @endif
                                                            </div>
                                                        </div>
                                                    @endforeach
                                                </div>
                                            </div>
                                        @endforeach
                                    </div>
                                @endif
                            </div>
                        @endforeach
                    </div>

                    <!-- Back Button -->
                    <div class="mt-8">
                        <a href="{{ route('dashboard') }}" class="inline-flex items-center px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm font-medium rounded-lg transition-colors">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                            </svg>
                            Back to Dashboard
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</x-layouts.app> 