@props(['day'])

<div class="{{ $day->getDayClasses() }}" 
     wire:click="$dispatchTo('exercise-summary', 'show', { date: '{{ $day->date->toDateString() }}' })">

    <!-- Streak indicator -->
    @if($day->isStreak && $day->hasTrainings())
        <div class="absolute top-1 right-1">
            <span class="inline-flex h-2 w-2 rounded-full bg-blue-400"></span>
        </div>
    @endif

    <!-- Date -->
    <time datetime="{{ $day->date->toDateString() }}" class="{{ $day->getTimeClasses() }}">
        {{ $day->date->day }}
    </time>

    @if($day->hasTrainings())
        <!-- Current Phase -->
        <div class="mt-1">
            <div class="text-xs text-gray-600 dark:text-gray-400 truncate font-medium">
                {{ $day->currentPhase }}
            </div>
        </div>

        <!-- Training Status Indicator -->
        @if($day->isCompleted())
            <div class="mt-1">
                <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium {{ $day->getStatusBadgeClasses() }}">
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        {!! $day->getStatusIcon() !!}
                    </svg>
                    {{ $day->getStatusText() }}
                </span>
            </div>
        @elseif(!$day->isToday)
            <div class="mt-1">
                <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium {{ $day->getStatusBadgeClasses() }}">
                    <svg class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {!! $day->getStatusIcon() !!}
                    </svg>
                    {{ $day->getStatusText() }}
                </span>
            </div>
        @endif

        <!-- Training Action -->
        <div class="mt-1 flex items-center gap-1">
            @php $action = $day->getTrainingAction(); @endphp
            @if($action['url'])
                <a href="{{ $action['url'] }}" class="{{ $action['classes'] }}">
                    {{ $action['text'] }}
                </a>
            @else
                <span class="{{ $action['classes'] }}">{{ $action['text'] }}</span>
            @endif

            @if($day->isCompleted())
                <svg class="h-3 w-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
            @endif
        </div>
    @endif
</div> 