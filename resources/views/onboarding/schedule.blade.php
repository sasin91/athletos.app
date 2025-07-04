<x-onboarding.layout :onboarding="$onboarding">
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-8">
        <div class="text-center mb-8">
            <div class="mx-auto h-16 w-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-4">
                <svg class="h-8 w-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Set Your Training Schedule</h2>
            <p class="mt-2 text-lg text-gray-600 dark:text-gray-400">When do you prefer to train? This helps us schedule your sessions</p>
        </div>

        <form action="{{ route('onboarding.schedule.store') }}" method="POST">
            @csrf
            
            <div class="space-y-8">
                <fieldset>
                    <legend class="text-lg font-semibold text-gray-900 dark:text-gray-100">Training Days</legend>
                    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Select the days you want to train each week</p>
                    <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
                        @foreach(\App\Enums\Weekday::cases() as $weekday)
                            <label for="{{ $weekday->value }}" class="relative flex flex-col items-center justify-center rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-4 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-all has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20 has-[:checked]:text-blue-600 dark:has-[:checked]:text-blue-400">
                                <input id="{{ $weekday->value }}" name="training_days[]" value="{{ $weekday->value }}" type="checkbox" 
                                    {{ in_array($weekday->value, old('training_days', $athlete?->training_days ?? [])) ? 'checked' : '' }}
                                    class="sr-only">
                                <svg class="mb-2 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {{ $weekday->label('en') }}
                            </label>
                        @endforeach
                    </div>
                    @error('training_days')
                        <p class="mt-2 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                    @enderror
                </fieldset>

                <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                        <label for="preferred_time" class="block text-sm font-medium text-gray-900 dark:text-gray-100">Preferred Training Time</label>
                        <select id="preferred_time" name="preferred_time" class="mt-2 w-full rounded-md bg-white dark:bg-gray-700 py-2 px-3 text-base text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:border-blue-600 focus:ring-1 focus:ring-blue-600">
                            <option value="">Select your preferred time</option>
                            @foreach(\App\Enums\TrainingTime::cases() as $time)
                                <option value="{{ $time->value }}" {{ old('preferred_time', $athlete?->preferred_time?->value) == $time->value ? 'selected' : '' }}>
                                    {{ $time->getLabel() }} ({{ $time->getTimeRange() }})
                                </option>
                            @endforeach
                        </select>
                        @error('preferred_time')
                            <p class="mt-2 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                        @enderror
                    </div>

                    <div>
                        <label for="session_duration" class="block text-sm font-medium text-gray-900 dark:text-gray-100">Session Duration (minutes)</label>
                        <select id="session_duration" name="session_duration" class="mt-2 w-full rounded-md bg-white dark:bg-gray-700 py-2 px-3 text-base text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:border-blue-600 focus:ring-1 focus:ring-blue-600">
                            <option value="">Select duration</option>
                            <option value="45" {{ old('session_duration', $athlete?->session_duration) == 45 ? 'selected' : '' }}>45 minutes</option>
                            <option value="60" {{ old('session_duration', $athlete?->session_duration) == 60 ? 'selected' : '' }}>1 hour</option>
                            <option value="75" {{ old('session_duration', $athlete?->session_duration) == 75 ? 'selected' : '' }}>1 hour 15 minutes</option>
                            <option value="90" {{ old('session_duration', $athlete?->session_duration) == 90 ? 'selected' : '' }}>1 hour 30 minutes</option>
                            <option value="120" {{ old('session_duration', $athlete?->session_duration) == 120 ? 'selected' : '' }}>2 hours</option>
                        </select>
                        @error('session_duration')
                            <p class="mt-2 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                        @enderror
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
                <a href="{{ route('onboarding.plan') }}" class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
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