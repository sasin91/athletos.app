<div>
    <!-- Filter Section -->
    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-6 mb-8">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Filter Training Plans</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Goal Filter -->
            <div>
                <label for="goal-filter" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filter by Goal
                </label>
                <select wire:model.live="goal" id="goal-filter" class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500">
                    <option value="">All Goals</option>
                    @foreach($this->goals as $value => $goal)
                        <option value="{{ $value }}">{{ $goal['label'] }}</option>
                    @endforeach
                </select>
            </div>

            <!-- Experience Level Filter -->
            <div>
                <label for="experience-filter" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filter by Experience Level
                </label>
                <select wire:model.live="experience" id="experience-filter" class="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500">
                    <option value="">All Levels</option>
                    @foreach($this->experienceLevels as $value => $level)
                        <option value="{{ $value }}">{{ $level['label'] }}</option>
                    @endforeach
                </select>
            </div>
        </div>
    </div>

    <!-- Training Plans Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        @foreach($plans as $plan)
            <label class="cursor-pointer">
                <input type="radio" 
                       wire:model.live="selectedPlanId" 
                       name="selected_plan_id" 
                       value="{{ $plan->id }}" 
                       class="sr-only peer">
                
                <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 border-gray-200 dark:border-gray-700 p-6 transition-all duration-200 hover:shadow-md
                    peer-checked:border-4 peer-checked:border-blue-600
                    peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/30
                    peer-checked:shadow-2xl peer-checked:shadow-blue-300/40 dark:peer-checked:shadow-blue-900/60">
                    <!-- Selection Indicator -->
                    <div class="absolute top-3 right-3 hidden peer-checked:block">
                        <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                        </div>
                    </div>

                    <!-- Plan Header -->
                    <div class="mb-4">
                        <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ $plan->name }}</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{{ $plan->description }}</p>
                    </div>

                    <!-- Plan Details -->
                    <div class="space-y-3">
                        <!-- Goal and Experience Level -->
                        <div class="flex flex-wrap gap-2">
                            @if($plan->goal)
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                    {{ $plan->goal->getLabel() }}
                                </span>
                            @endif
                            @if($plan->experience_level)
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                    {{ $plan->experience_level->getLabel() }}
                                </span>
                            @endif
                        </div>

                        <!-- Plan Stats -->
                        <div class="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                            <div class="flex items-center space-x-4">
                                <span class="flex items-center">
                                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    {{ $plan->phases->count() }} {{ Str::plural('phase', $plan->phases->count()) }}
                                </span>
                                <span class="flex items-center">
                                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {{ $plan->phases->sum('duration_weeks') }} {{ Str::plural('week', $plan->phases->sum('duration_weeks')) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </label>
        @endforeach
    </div>

    <!-- Selected Plan Details -->
    @if($selectedPlan)
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Selected Plan Details</h3>
            
            <div>
                <h4 class="text-xl font-semibold text-gray-900 dark:text-gray-100">{{ $selectedPlan->name }}</h4>
                <p class="text-gray-600 dark:text-gray-400 mt-1">{{ $selectedPlan->description }}</p>
                
                <div class="flex flex-wrap gap-2 mt-3">
                    @if($selectedPlan->goal)
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            {{ $selectedPlan->goal->getLabel() }}
                        </span>
                    @endif
                    @if($selectedPlan->experience_level)
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                            {{ $selectedPlan->experience_level->getLabel() }}
                        </span>
                    @endif
                </div>
                
                <div class="flex items-center space-x-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                    <span class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {{ $selectedPlan->phases->count() }} {{ Str::plural('phase', $selectedPlan->phases->count()) }}
                    </span>
                    <span class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z" />
                        </svg>
                        {{ $selectedPlan->phases->sum('duration_weeks') }} {{ Str::plural('week', $selectedPlan->phases->sum('duration_weeks')) }}
                    </span>
                </div>
                
                @if($selectedPlan->phases->count() > 0)
                    <div class="mt-4">
                        <h5 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Training Phases</h5>
                        <div class="space-y-2">
                            @foreach($selectedPlan->phases as $phase)
                                <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div>
                                        <div class="font-medium text-gray-900 dark:text-gray-100">{{ $phase->name }}</div>
                                        @if($phase->description)
                                            <div class="text-sm text-gray-600 dark:text-gray-400">{{ $phase->description }}</div>
                                        @endif
                                    </div>
                                    <div class="text-sm text-gray-500 dark:text-gray-400">
                                        {{ $phase->duration_weeks }} {{ Str::plural('week', $phase->duration_weeks) }}
                                    </div>
                                </div>
                            @endforeach
                        </div>
                    </div>
                @endif
            </div>
        </div>
    @endif

    <!-- Hidden input for form submission -->
    @if($selectedPlanId)
        <input type="hidden" name="selected_plan_id" value="{{ $selectedPlanId }}">
    @endif
</div> 