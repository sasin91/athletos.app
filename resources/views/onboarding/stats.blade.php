<x-onboarding.layout :onboarding="$onboarding">
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-8">
        <div class="text-center mb-8">
            <div class="mx-auto h-16 w-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
                <svg class="h-8 w-8 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Current Stats</h2>
            <p class="mt-2 text-lg text-gray-600 dark:text-gray-400">Help us track your progress by entering your current lifting stats (optional)</p>
        </div>

        <form action="{{ route('onboarding.stats.store') }}" method="POST">
            @csrf
            
            <div class="space-y-6">
                <p class="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <span class="font-medium">Optional:</span> These stats help us customize your starting weights and track your progress. You can always add or update them later.
                </p>

                <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div>
                        <label for="current_bench" class="block text-sm font-medium text-gray-900 dark:text-gray-100">Bench Press (lbs)</label>
                        <div class="mt-2">
                            <input type="number" name="current_bench" id="current_bench" min="0" max="1000" step="5"
                                value="{{ old('current_bench') }}"
                                class="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-base text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                placeholder="e.g. 135">
                        </div>
                        @error('current_bench')
                            <p class="mt-2 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                        @enderror
                    </div>

                    <div>
                        <label for="current_squat" class="block text-sm font-medium text-gray-900 dark:text-gray-100">Squat (lbs)</label>
                        <div class="mt-2">
                            <input type="number" name="current_squat" id="current_squat" min="0" max="1000" step="5"
                                value="{{ old('current_squat') }}"
                                class="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-base text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                placeholder="e.g. 185">
                        </div>
                        @error('current_squat')
                            <p class="mt-2 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                        @enderror
                    </div>

                    <div>
                        <label for="current_deadlift" class="block text-sm font-medium text-gray-900 dark:text-gray-100">Deadlift (lbs)</label>
                        <div class="mt-2">
                            <input type="number" name="current_deadlift" id="current_deadlift" min="0" max="1000" step="5"
                                value="{{ old('current_deadlift') }}"
                                class="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-base text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                placeholder="e.g. 225">
                        </div>
                        @error('current_deadlift')
                            <p class="mt-2 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                        @enderror
                    </div>
                </div>

                <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Don't know your max?</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        No problem! You can leave these empty and we'll help you find your starting weights during your first few workouts. 
                        We'll track your progress from there.
                    </p>
                </div>
            </div>

            <div class="flex items-center justify-between pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
                <a href="{{ route('onboarding.schedule') }}" class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </a>
                <button type="submit" class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Continue
                    <svg class="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </form>
    </div>
</x-onboarding.layout> 