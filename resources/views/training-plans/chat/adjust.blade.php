<x-layouts.app>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Adjust Training Plan with AI') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                <div class="p-6 text-gray-900">
                    <div class="mb-6">
                        <h3 class="text-lg font-medium text-gray-900">AI Training Plan Adjustment</h3>
                        <p class="mt-1 text-sm text-gray-600">
                            Chat with our AI coach to adjust the training plan "{{ $trainingPlan->name }}". 
                            Ask for exercise substitutions, intensity changes, scheduling modifications, or complete restructuring.
                        </p>
                    </div>

                    <!-- Current Plan Overview -->
                    <div class="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h4 class="font-medium text-gray-700 mb-2">Current Plan Overview</h4>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <span class="text-gray-500">Goal:</span>
                                <span class="font-medium">{{ $trainingPlan->goal->value }}</span>
                            </div>
                            <div>
                                <span class="text-gray-500">Experience Level:</span>
                                <span class="font-medium">{{ $trainingPlan->experience_level->value }}</span>
                            </div>
                            <div>
                                <span class="text-gray-500">Phases:</span>
                                <span class="font-medium">{{ $trainingPlan->phases->count() }}</span>
                            </div>
                        </div>
                    </div>

                    <livewire:training-plan-chat :base-plan="$trainingPlan" />
                </div>
            </div>
        </div>
    </div>
</x-layouts.app>