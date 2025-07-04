<x-layouts.app>
    <!-- Breadcrumbs -->
    <div class="mb-6 flex items-center text-sm">
        <a href="{{ route('dashboard') }}"
            class="text-blue-600 dark:text-blue-400 hover:underline">{{ __('Dashboard') }}</a>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mx-2 text-gray-400" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <a href="{{ route('settings.profile.edit') }}"
           class="text-blue-600 dark:text-blue-400 hover:underline">{{ __('Profile') }}</a>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mx-2 text-gray-400" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <span class="text-gray-500 dark:text-gray-400">{{ __('Athlete Profile') }}</span>
    </div>

    <!-- Page Title -->
    <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ __('Athlete Profile') }}</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
            {{ __('Update your athlete profile and training preferences') }}
        </p>
    </div>

    <div class="p-6">
        <div class="flex flex-col md:flex-row gap-6">
            <!-- Sidebar Navigation -->
            @include('settings.partials.navigation')

            <!-- Athlete Profile Content -->
            <div class="flex-1">
                <div
                    class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
                    <div class="p-6">
                        <form method="POST" action="{{ route('settings.athlete-profile.update') }}">
                            @csrf
                            @method('PUT')

                            <div class="space-y-6">
                                <!-- Experience Level -->
                                <div>
                                    <label for="experience_level" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {{ __('Experience Level') }}
                                    </label>
                                    <select id="experience_level" name="experience_level" 
                                            class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500">
                                        @foreach(\App\Enums\ExperienceLevel::cases() as $level)
                                            <option value="{{ $level->value }}" {{ old('experience_level', $athlete->experience_level?->value) == $level->value ? 'selected' : '' }}>
                                                {{ $level->getLabel() }} - {{ $level->getDescription() }}
                                            </option>
                                        @endforeach
                                    </select>
                                    @error('experience_level')
                                        <p class="mt-1 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                                    @enderror
                                </div>

                                <!-- Primary Goal -->
                                <div>
                                    <label for="primary_goal" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {{ __('Primary Training Goal') }}
                                    </label>
                                    <select id="primary_goal" name="primary_goal" 
                                            class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500">
                                        @foreach(\App\Enums\TrainingGoal::cases() as $goal)
                                            <option value="{{ $goal->value }}" {{ old('primary_goal', $athlete->primary_goal?->value) == $goal->value ? 'selected' : '' }}>
                                                {{ $goal->getLabel() }}
                                            </option>
                                        @endforeach
                                    </select>
                                    @error('primary_goal')
                                        <p class="mt-1 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                                    @enderror
                                </div>

                                <!-- Bio -->
                                <div>
                                    <label for="bio" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {{ __('About Your Training') }}
                                    </label>
                                    <textarea id="bio" name="bio" rows="4" 
                                              class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                                              placeholder="{{ __('Tell us about your training background, any injuries, or specific goals...') }}">{{ old('bio', $athlete->bio) }}</textarea>
                                    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        {{ __('This helps us customize your training plan and exercise suggestions.') }}
                                    </p>
                                    @error('bio')
                                        <p class="mt-1 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                                    @enderror
                                </div>

                                <!-- Muscle Groups -->
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {{ __('Muscle Groups to Focus On') }}
                                    </label>
                                    <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                        {{ __('Select the muscle groups you\'d like to prioritize in your training (optional)') }}
                                    </p>
                                    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                        @php
                                            $muscleGroups = old('muscle_groups', $athlete->muscle_groups ?? []);
                                        @endphp
                                        @foreach(\App\Enums\MuscleGroup::onboardingOptions() as $muscleGroup)
                                            <label class="relative flex items-start">
                                                <div class="flex h-5 items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        name="muscle_groups[]" 
                                                        value="{{ $muscleGroup->value }}"
                                                        {{ in_array($muscleGroup->value, $muscleGroups) ? 'checked' : '' }}
                                                        class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                                                    >
                                                </div>
                                                <div class="ml-3 text-sm">
                                                    <span class="font-medium text-gray-900 dark:text-gray-100">{{ $muscleGroup->label() }}</span>
                                                </div>
                                            </label>
                                        @endforeach
                                    </div>
                                    @error('muscle_groups')
                                        <p class="mt-1 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                                    @enderror
                                </div>

                                <!-- Training Days -->
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {{ __('Training Days') }}
                                    </label>
                                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        @php
                                            $trainingDays = old('training_days', $athlete->training_days ?? []);
                                        @endphp
                                        @foreach(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as $day)
                                            <label class="flex items-center">
                                                <input type="checkbox" name="training_days[]" value="{{ $day }}"
                                                       {{ in_array($day, $trainingDays) ? 'checked' : '' }}
                                                       class="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-blue-600 focus:ring-blue-500">
                                                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">{{ __(ucfirst($day)) }}</span>
                                            </label>
                                        @endforeach
                                    </div>
                                    @error('training_days')
                                        <p class="mt-1 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                                    @enderror
                                </div>

                                <!-- Preferred Time -->
                                <div>
                                    <label for="preferred_time" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {{ __('Preferred Training Time') }}
                                    </label>
                                    <select id="preferred_time" name="preferred_time" 
                                            class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500">
                                        @foreach(\App\Enums\TrainingTime::cases() as $time)
                                            <option value="{{ $time->value }}" {{ old('preferred_time', $athlete->preferred_time?->value) == $time->value ? 'selected' : '' }}>
                                                {{ $time->getLabel() }}
                                            </option>
                                        @endforeach
                                    </select>
                                    @error('preferred_time')
                                        <p class="mt-1 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                                    @enderror
                                </div>

                                <!-- Session Duration -->
                                <div>
                                    <label for="session_duration" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {{ __('Session Duration (minutes)') }}
                                    </label>
                                    <select id="session_duration" name="session_duration" 
                                            class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500">
                                        @foreach([45, 60, 75, 90, 120] as $duration)
                                            <option value="{{ $duration }}" {{ old('session_duration', $athlete->session_duration) == $duration ? 'selected' : '' }}>
                                                {{ $duration }} {{ __('minutes') }}
                                            </option>
                                        @endforeach
                                    </select>
                                    @error('session_duration')
                                        <p class="mt-1 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                                    @enderror
                                </div>

                                <!-- Difficulty Preference -->
                                <div>
                                    <label for="difficulty_preference" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {{ __('Difficulty Preference') }}
                                    </label>
                                    <select id="difficulty_preference" name="difficulty_preference" 
                                            class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500">
                                        @foreach(\App\Enums\Difficulty::cases() as $difficulty)
                                            <option value="{{ $difficulty->value }}" {{ old('difficulty_preference', $athlete->difficulty_preference?->value) == $difficulty->value ? 'selected' : '' }}>
                                                {{ $difficulty->getLabel() }}
                                            </option>
                                        @endforeach
                                    </select>
                                    @error('difficulty_preference')
                                        <p class="mt-1 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                                    @enderror
                                </div>

                                <!-- Top Lifts -->
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        {{ __('Past Top Lifts') }}
                                    </label>
                                    <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                        {{ __('Share your best lifts to help us track your progress and set appropriate starting weights.') }}
                                    </p>
                                    
                                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        <div>
                                            <label for="top_squat" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {{ __('Squat (lbs)') }}
                                            </label>
                                            <input type="number" id="top_squat" name="top_squat" min="0" max="2000"
                                                value="{{ old('top_squat', $athlete->performanceIndicators->where('exercise', \App\Enums\Exercise::BarbellBackSquat)->first()?->value) }}"
                                                class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                                                placeholder="e.g., 315">
                                            @error('top_squat')
                                                <p class="mt-1 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                                            @enderror
                                        </div>

                                        <div>
                                            <label for="top_bench" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {{ __('Bench Press (lbs)') }}
                                            </label>
                                            <input type="number" id="top_bench" name="top_bench" min="0" max="2000"
                                                value="{{ old('top_bench', $athlete->performanceIndicators->where('exercise', \App\Enums\Exercise::BenchPress)->first()?->value) }}"
                                                class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                                                placeholder="e.g., 225">
                                            @error('top_bench')
                                                <p class="mt-1 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                                            @enderror
                                        </div>

                                        <div>
                                            <label for="top_deadlift" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {{ __('Deadlift (lbs)') }}
                                            </label>
                                            <input type="number" id="top_deadlift" name="top_deadlift" min="0" max="2000"
                                                value="{{ old('top_deadlift', $athlete->performanceIndicators->where('exercise', \App\Enums\Exercise::Deadlift)->first()?->value) }}"
                                                class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                                                placeholder="e.g., 405">
                                            @error('top_deadlift')
                                                <p class="mt-1 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                                            @enderror
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Submit Button -->
                            <div class="mt-8 flex justify-end">
                                <button type="submit" 
                                        class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200">
                                    {{ __('Update Profile') }}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</x-layouts.app> 