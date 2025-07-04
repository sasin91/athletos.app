<div class="space-y-3">
    <h3 class="text-lg font-medium text-white flex items-center gap-2">
        <svg class="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        Phase Progress
    </h3>
    
    <div class="space-y-3">
        <div class="flex justify-between text-sm">
            <span class="text-gray-400">Current Phase</span>
            <span class="text-white">{{ $progressMetrics->phaseProgressPercentage() }}%</span>
        </div>
        
        <div class="w-full bg-gray-700 rounded-full h-2" role="progressbar" aria-valuenow="{{ $progressMetrics->phaseProgressPercentage() }}" aria-valuemin="0" aria-valuemax="100">
            <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                 style="width: {{ $progressMetrics->phaseProgressPercentage() }}%"></div>
        </div>
        
        <p class="text-xs text-gray-400">
            @if($progressMetrics->totalPhaseWeeks > 0)
                Week {{ $progressMetrics->phaseWeek }} of {{ $progressMetrics->totalPhaseWeeks }} •
                {{ $progressMetrics->totalPhaseWeeks - $progressMetrics->phaseWeek }} weeks remaining
            @else
                No training plan configured
            @endif
        </p>
    </div>
</div> 