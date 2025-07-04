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
                @livewire('training-plan', ['currentPlanId' => old('selected_plan_id', $athlete?->current_plan_id)])
                
                @error('selected_plan_id')
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
        document.addEventListener('livewire:init', () => {
            // Listen for plan selection to enable/disable continue button
            Livewire.on('plan-selected', (event) => {
                const continueBtn = document.getElementById('continueBtn');
                continueBtn.disabled = !event[0]?.planId; // Livewire v3 event structure
            });
            
            // Check initial state
            updateContinueButton();
        });

        // Function to update continue button state
        function updateContinueButton() {
            const continueBtn = document.getElementById('continueBtn');
            const hiddenInput = document.querySelector('input[name="selected_plan_id"]');
            continueBtn.disabled = !hiddenInput || !hiddenInput.value;
        }

        // Also listen for DOM changes to catch when the hidden input is added/updated
        const observer = new MutationObserver(updateContinueButton);
        observer.observe(document.body, { childList: true, subtree: true });
    </script>
</x-onboarding.layout> 