<x-layouts.app>
    <main class="mx-auto max-w-4xl">
        <!-- Training Header -->
        <header class="mb-8">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {{ $training->trainingPlan->name ?? 'Training Session' }}
                    </h1>
                    <p class="text-lg text-gray-600 dark:text-gray-400 mt-2">
                        {{ $training->scheduled_at->format('l, F j, Y') }}
                    </p>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {{ $training->trainingPhase->name }}
                    </p>
                </div>
                <div class="text-right">
                    <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {{ round($training->progress) }}%
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">Complete</div>
                </div>
            </div>
            
            <!-- Progress Bar -->
            <div class="mt-4">
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div class="bg-blue-600 dark:bg-blue-400 h-3 rounded-full transition-all duration-300"
                         style="width: {{ $training->progress }}%"
                         role="progressbar"
                         aria-valuenow="{{ $training->progress }}"
                         aria-valuemin="0" aria-valuemax="100">
                    </div>
                </div>
            </div>
        </header>

        <!-- Training Form -->
        <form method="POST" action="{{ route('trainings.complete', $training) }}" class="space-y-8">
            @csrf
            
            <!-- Exercise Container - Livewire Component -->
            <livewire:training-exercises :training="$training" />

            <!-- Training Session Feedback -->
            <fieldset class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <legend class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Training Session Feedback</legend>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">How are you feeling today?</label>
                        <select name="mood" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100">
                            <option value="">Select mood...</option>
                            <option value="great">Great</option>
                            <option value="good">Good</option>
                            <option value="okay">Okay</option>
                            <option value="tired">Tired</option>
                            <option value="sick">Sick</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Energy Level (1-10)</label>
                        <select name="energy_level" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100">
                            <option value="">Select energy level...</option>
                            @for($energy = 1; $energy <= 10; $energy++)
                            <option value="{{ $energy }}">{{ $energy }}</option>
                            @endfor
                        </select>
                    </div>
                </div>
            </fieldset>

            <!-- Form Actions -->
            <div class="flex justify-between items-center pt-6">
                <a href="{{ route('dashboard') }}" 
                   class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Dashboard
                </a>
                
                <button type="submit" 
                        class="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Complete Training
                </button>
            </div>
        </form>
    </main>

    <script>
        function toggleExerciseSuggestions(exerciseId, event) {
            event.preventDefault();
            event.stopPropagation();
            
            const suggestionsDiv = document.getElementById(`exercise-suggestions-${exerciseId}`);
            const button = event.target;
            
            if (suggestionsDiv.classList.contains('hidden')) {
                suggestionsDiv.classList.remove('hidden');
                button.textContent = 'Hide Alternatives';
            } else {
                suggestionsDiv.classList.add('hidden');
                button.textContent = 'Show Alternatives';
            }
        }

        // Listen for exercise swap events from Livewire
        document.addEventListener('livewire:init', () => {
            Livewire.on('exercise-swapped', (data) => {
                // Handle exercise swap - could show notification or update UI
                console.log('Exercise swapped:', data);
                // You could add a toast notification here
            });
        });
    </script>

    <style>
    /* Smooth scrolling for all scroll behavior */
    html {
        scroll-behavior: smooth;
    }

    /* Offset for fixed headers when scrolling to anchors */
    .exercise-fieldset {
        scroll-margin-top: 2rem;
    }
    </style>

    <script>
    document.addEventListener('DOMContentLoaded', function() {
        // Wait for Livewire to load the exercise fieldsets
        function initScrollTracking() {
            const fieldsets = document.querySelectorAll('.exercise-fieldset');
            if (fieldsets.length === 0) {
                // Retry after a short delay if fieldsets aren't loaded yet
                setTimeout(initScrollTracking, 100);
                return;
            }
            
            let ticking = false;
            
            // 1. Track scroll and find current section
            function updateHashOnScroll() {
                if (ticking) return;
                
                ticking = true;
                requestAnimationFrame(() => {
                    const scrollPosition = window.scrollY + (window.innerHeight / 3);
                    let currentSection = null;
                    
                    fieldsets.forEach(fieldset => {
                        const rect = fieldset.getBoundingClientRect();
                        const top = rect.top + window.scrollY;
                        const bottom = top + rect.height;
                        
                        if (scrollPosition >= top && scrollPosition <= bottom) {
                            currentSection = fieldset;
                        }
                    });
                    
                    // 2. Set URL hash to ID on intersect
                    if (currentSection) {
                        const newHash = `#${currentSection.id}`;
                        if (window.location.hash !== newHash) {
                            history.replaceState(null, null, newHash);
                        }
                    }
                    
                    ticking = false;
                });
            }
            
            // Listen for scroll events
            window.addEventListener('scroll', updateHashOnScroll, { passive: true });
            
            // Handle initial hash on page load
            if (window.location.hash) {
                const target = document.querySelector(window.location.hash);
                if (target) {
                    setTimeout(() => {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                }
            }
            
            // Handle navigation clicks
            document.addEventListener('click', function(e) {
                const link = e.target.closest('a[href^="#exercise-"]');
                if (link) {
                    e.preventDefault();
                    const target = document.querySelector(link.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            });
        }
        
        // Initialize scroll tracking
        initScrollTracking();
        
        // Also listen for Livewire updates in case exercises are dynamically loaded
        document.addEventListener('livewire:navigated', initScrollTracking);
        document.addEventListener('livewire:load', initScrollTracking);
    });
    </script>
</x-layouts.app> 