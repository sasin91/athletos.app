<x-onboarding.layout :onboarding="$onboarding">
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-8">
        <div class="text-center mb-8">
            <div class="mx-auto h-16 w-16 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-4">
                <svg class="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Set Your Preferences</h2>
            <p class="mt-2 text-lg text-gray-600 dark:text-gray-400">Customize your training experience</p>
        </div>

        <form action="{{ route('onboarding.preferences.store') }}" method="POST">
            @csrf
            
            <div class="space-y-8">
                <!-- Difficulty Preference -->
                <div>
                    <label class="block text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Training Difficulty</label>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">How challenging do you want your workouts to be?</p>
                    <div class="space-y-3">
                        @foreach(\App\Enums\Difficulty::cases() as $difficulty)
                            <label for="difficulty_{{ $difficulty->value }}" class="relative flex items-center p-4 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20">
                                <input id="difficulty_{{ $difficulty->value }}" name="difficulty_preference" value="{{ $difficulty->value }}" type="radio" 
                                    {{ old('difficulty_preference', $athlete?->difficulty_preference?->value) == $difficulty->value ? 'checked' : '' }}
                                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600">
                                <div class="ml-4">
                                    <div class="text-base font-medium text-gray-900 dark:text-gray-100">{{ $difficulty->getLabel() }}</div>
                                    <div class="text-sm text-gray-600 dark:text-gray-400">{{ $difficulty->getDescription() }}</div>
                                </div>
                            </label>
                        @endforeach
                    </div>
                    @error('difficulty_preference')
                        <p class="mt-2 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                    @enderror
                </div>

                <!-- Notification Preferences -->
                <div>
                    <label class="block text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Notifications</label>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Choose what notifications you'd like to receive</p>
                    <div class="space-y-3">
                        @php
                            $notificationOptions = [
                                'workout_reminders' => 'Workout Reminders',
                                'progress_updates' => 'Progress Updates',
                                'recovery_tips' => 'Recovery Tips',
                                'motivational_messages' => 'Motivational Messages'
                            ];
                            $selectedNotifications = old('notifications', $athlete?->notification_preferences ?? []);
                        @endphp
                        
                        @foreach($notificationOptions as $value => $label)
                            <label for="notification_{{ $value }}" class="relative flex items-center p-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors has-[:checked]:bg-blue-50 dark:has-[:checked]:bg-blue-900/20 has-[:checked]:border-blue-300 dark:has-[:checked]:border-blue-600">
                                <input id="notification_{{ $value }}" name="notifications[]" value="{{ $value }}" type="checkbox" 
                                    {{ in_array($value, $selectedNotifications) ? 'checked' : '' }}
                                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded">
                                <div class="ml-3">
                                    <div class="text-base font-medium text-gray-900 dark:text-gray-100">{{ $label }}</div>
                                </div>
                            </label>
                        @endforeach
                    </div>
                    @error('notifications')
                        <p class="mt-2 text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                    @enderror
                </div>
            </div>

            <div class="flex items-center justify-between pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
                <a href="{{ route('onboarding.stats') }}" class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </a>
                <button type="submit" class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                    Complete Setup
                    <svg class="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </button>
            </div>
        </form>
    </div>
</x-onboarding.layout> 