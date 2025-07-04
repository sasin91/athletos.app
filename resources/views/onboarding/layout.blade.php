<x-layouts.app>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
        <!-- Onboarding Progress Header -->
        @if($onboarding->inProgress())
        <div class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div class="max-w-4xl mx-auto px-4 py-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Complete Your Setup</h2>
                    <span class="text-sm text-gray-600 dark:text-gray-400">
                        {{ $onboarding->percentageCompleted() }}% Complete
                    </span>
                </div>
                
                <!-- Progress Bar -->
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-6">
                    <div class="bg-blue-600 h-3 rounded-full transition-all duration-500" 
                         style="width: {{ $onboarding->percentageCompleted() }}%;">
                    </div>
                </div>
                
                <!-- Step Navigation -->
                <div class="flex flex-wrap gap-3">
                    @foreach($onboarding->steps as $step)
                        <a href="{{ $step->link }}" 
                           class="flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors
                                  {{ $step->complete() 
                                     ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                     : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600' }}">
                            @if($step->complete())
                                <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                            @else
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            @endif
                            {{ $step->title }}
                        </a>
                    @endforeach
                </div>
            </div>
        </div>
        @endif

        <!-- Main Content -->
        <div class="py-8">
            <div class="max-w-7xl mx-auto px-4">
                {{ $slot }}
            </div>
        </div>
    </div>
</x-layouts.app> 