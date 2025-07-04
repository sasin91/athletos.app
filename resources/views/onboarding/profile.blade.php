<x-onboarding.layout :onboarding="$onboarding">
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-8">
        <div class="text-center mb-8">
            <div
                class="mx-auto h-16 w-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                <svg class="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Tell Us About Yourself</h2>
            <p class="mt-2 text-lg text-gray-600 dark:text-gray-400">Help us understand your training background and
                goals</p>
        </div>

        <form action="{{ route('onboarding.profile.store') }}" method="POST">
            @csrf

            <div class="space-y-6">
                <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                        <label for="experience_level" class="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">Experience Level</label>
                        <div class="mt-2">
                            <select id="experience_level" name="experience_level"
                                class="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6">
                                <option value="">Select your experience level</option>
                                @foreach (\App\Enums\ExperienceLevel::cases() as $level)
                                    <option value="{{ $level->value }}"
                                        {{ old('experience_level', $athlete?->experience_level?->value) == $level->value ? 'selected' : '' }}>
                                        {{ $level->getLabel() }} - {{ $level->getDescription() }}
                                    </option>
                                @endforeach
                            </select>
                        </div>
                        @error('experience_level')
                            <p class="mt-2 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                        @enderror
                    </div>

                    <div>
                        <label for="primary_goal" class="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">Primary Goal</label>
                        <div class="mt-2">
                            <select id="primary_goal" name="primary_goal"
                                class="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6">
                                <option value="">Select your primary goal</option>
                                @foreach (\App\Enums\TrainingGoal::cases() as $goal)
                                    <option value="{{ $goal->value }}"
                                        {{ old('primary_goal', $athlete?->primary_goal?->value) == $goal->value ? 'selected' : '' }}>
                                        {{ $goal->getLabel() }} - {{ $goal->getDescription() }}
                                    </option>
                                @endforeach
                            </select>
                        </div>
                        @error('primary_goal')
                            <p class="mt-2 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                        @enderror
                    </div>
                </div>

                <div>
                    <label for="muscle_groups" class="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">Muscle
                        Groups to Focus On</label>
                    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400 mb-3">Select the muscle groups you'd like to
                        prioritize in your training (optional)</p>
                    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        @foreach (\App\Enums\MuscleGroup::onboardingOptions() as $muscleGroup)
                            <label class="relative flex items-start">
                                <div class="flex h-5 items-center">
                                    <input type="checkbox" name="muscle_groups[]" value="{{ $muscleGroup->value }}"
                                        {{ in_array($muscleGroup->value, old('muscle_groups', $athlete?->muscle_groups ?? [])) ? 'checked' : '' }}
                                        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700">
                                </div>
                                <div class="ml-3 text-sm">
                                    <span
                                        class="font-medium text-gray-900 dark:text-gray-100">{{ $muscleGroup->label() }}</span>
                                </div>
                            </label>
                        @endforeach
                    </div>
                    @error('muscle_groups')
                        <p class="mt-2 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                    @enderror
                </div>

                
                <div>
                    <label class="block text-sm/6 font-medium text-gray-900 dark:text-gray-100 mb-3">Past Top Lifts (Optional)</label>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Share your best lifts to help us track your progress and set appropriate starting weights.</p>
                    
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label for="top_squat" class="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">
                                Squat (kg)
                            </label>
                            <div class="mt-2">
                                <input type="number" id="top_squat" name="top_squat" min="0" max="1000"
                                    value="{{ old('top_squat') }}"
                                    class="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                                    placeholder="e.g., 143">
                            </div>
                            @error('top_squat')
                                <p class="mt-1 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                            @enderror
                        </div>

                        <div>
                            <label for="top_bench" class="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">
                                Bench Press (kg)
                            </label>
                            <div class="mt-2">
                                <input type="number" id="top_bench" name="top_bench" min="0" max="1000"
                                    value="{{ old('top_bench') }}"
                                    class="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                                    placeholder="e.g., 102">
                            </div>
                            @error('top_bench')
                                <p class="mt-1 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                            @enderror
                        </div>

                        <div>
                            <label for="top_deadlift" class="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">
                                Deadlift (kg)
                            </label>
                            <div class="mt-2">
                                <input type="number" id="top_deadlift" name="top_deadlift" min="0" max="1000"
                                    value="{{ old('top_deadlift') }}"
                                    class="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                                    placeholder="e.g., 184">
                            </div>
                            @error('top_deadlift')
                                <p class="mt-1 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                            @enderror
                        </div>
                    </div>
                </div>

                <div>
                    <label for="bio" class="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">About Your
                        Training</label>
                    <div class="mt-2">
                        <textarea name="bio" id="bio" rows="4"
                            class="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                            placeholder="Tell us about your training background, any injuries, or specific goals...">{{ old('bio', $athlete?->bio) }}</textarea>
                    </div>
                    <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">This helps us customize your training plan
                        and exercise suggestions.</p>
                    @error('bio')
                        <p class="mt-2 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                    @enderror
                </div>
            </div>

            <div class="flex items-center justify-between pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
                <a href="{{ route('dashboard') }}"
                    class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Skip Setup
                </a>
                <button type="submit"
                    class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Continue
                    <svg class="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </form>
    </div>
</x-onboarding.layout>
