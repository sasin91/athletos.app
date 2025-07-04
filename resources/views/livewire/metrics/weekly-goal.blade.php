<div class="space-y-3">
    <h3 class="text-lg font-medium text-white flex items-center gap-2">
        <svg class="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Weekly Goal
    </h3>
    
    <div class="space-y-3">
        <div class="flex justify-between text-sm">
            <span class="text-gray-400">Trainings This Week</span>
            <span class="text-white">{{ $progressMetrics['completedThisWeek'] }}/{{ $progressMetrics['weeklyGoal'] }}</span>
        </div>
        
        <div class="w-full bg-gray-700 rounded-full h-2" role="progressbar" aria-valuenow="{{ $this->weeklyProgress }}" aria-valuemin="0" aria-valuemax="100">
            <div class="bg-green-600 h-2 rounded-full transition-all duration-300"
                 style="width: {{ $this->weeklyProgress }}%"></div>
        </div>
        
        <p class="text-xs text-gray-400">
            {{ $this->goalMessage }}
        </p>
    </div>
</div> 