<x-onboarding.layout :onboarding="$onboarding">
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-8">
        <div class="text-center mb-8">
            <div class="mx-auto h-16 w-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                <svg class="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Choose Your Training Plan</h2>
            <p class="mt-2 text-lg text-gray-600 dark:text-gray-400">Select a plan that matches your goals and experience level</p>
        </div>

        <form action="{{ route('onboarding.plan.store') }}" method="POST" id="planForm">
            @csrf
            
            <div class="space-y-6">
                <div class="grid gap-6 md:grid-cols-2">
                    @foreach($availablePlans as $plan)
                        <div class="relative">
                            <input type="radio" id="plan_{{ $plan['type'] }}" name="selected_plan_type" value="{{ $plan['type'] }}" 
                                   class="peer sr-only" {{ old('selected_plan_type', $athlete?->current_plan) === $plan['type'] ? 'checked' : '' }}>
                            <label for="plan_{{ $plan['type'] }}" class="flex cursor-pointer flex-col rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-6 hover:bg-gray-50 dark:hover:bg-gray-600 peer-checked:border-blue-600 peer-checked:ring-2 peer-checked:ring-blue-600">
                                <div class="flex items-center justify-between">
                                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ $plan['name'] }}</h3>
                                    @if($plan['suitable'])
                                        <span class="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/20 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-400">
                                            Recommended
                                        </span>
                                    @endif
                                </div>
                                <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">{{ $plan['description'] }}</p>
                                <div class="mt-4">
                                    <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Training Phases:</h4>
                                    <ul class="space-y-1">
                                        @foreach($plan['phases'] as $phase)
                                            <li class="text-xs text-gray-600 dark:text-gray-400">
                                                • {{ $phase['name'] }} ({{ $phase['duration_weeks'] }} weeks)
                                            </li>
                                        @endforeach
                                    </ul>
                                </div>
                            </label>
                        </div>
                    @endforeach
                </div>
                
                @error('selected_plan_type')
                    <p class="text-sm text-red-600 dark:text-red-400">{{ $message }}</p>
                @enderror
            </div>

            <div class="flex items-center justify-between pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
                <a href="{{ route('onboarding.profile') }}" class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </a>
                <button type="submit" class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" id="continueBtn">
                    Continue
                    <svg class="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </form>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const continueBtn = document.getElementById('continueBtn');
            const planRadios = document.querySelectorAll('input[name="selected_plan_type"]');
            
            // Function to update continue button state
            function updateContinueButton() {
                const selectedPlan = document.querySelector('input[name="selected_plan_type"]:checked');
                continueBtn.disabled = !selectedPlan;
            }
            
            // Listen for plan selection changes
            planRadios.forEach(radio => {
                radio.addEventListener('change', updateContinueButton);
            });
            
            // Check initial state
            updateContinueButton();
        });
    </script>
</x-onboarding.layout> 