<x-layouts.app>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Create Training Plan with AI') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                <div class="p-6 text-gray-900">
                    <div class="mb-6">
                        <h3 class="text-lg font-medium text-gray-900">AI Training Plan Generator</h3>
                        <p class="mt-1 text-sm text-gray-600">
                            Chat with our AI coach to create a personalized training plan. Be specific about your goals, experience level, available equipment, and time constraints.
                        </p>
                    </div>

                    <livewire:training-plan-chat />
                </div>
            </div>
        </div>
    </div>
</x-layouts.app>