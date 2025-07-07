<div class="bg-slate-50 dark:bg-gray-900 text-gray-900 dark:text-white py-6 sm:py-8 rounded-md">
    <div class="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8">
        <h2 class="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Training Dashboard</h2>
        <p class="mt-2 max-w-lg text-2xl font-semibold tracking-tight text-pretty text-gray-900 dark:text-white sm:text-4xl">
            Training Calendar
        </p>

        <!-- Training Dashboard Widget (Full Width) -->
        <div class="mt-6 sm:mt-10">
            <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl dark:shadow-none p-4 sm:p-6 relative">
                <!-- Header row -->
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
                    <div class="flex items-center gap-2 sm:gap-3">
                        <img src="/images/logo.png" alt="AthletOS" class="h-7 w-auto sm:h-8" />
                        <span class="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">Training Dashboard</span>
                    </div>
                    <div class="flex items-center gap-1 sm:gap-2">
                        <button wire:click="subDay" class="rounded bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900 p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none" title="Previous Day">
                            <svg class="h-5 w-5" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button wire:click="today" class="rounded bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900 px-3 py-2 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none">Today</button>
                        <button wire:click="addDay" class="rounded bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900 p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none" title="Next Day">
                            <svg class="h-5 w-5" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
                <!-- Exercises list -->
                <div class="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                    @forelse($this->plannedExercises as $exercise)
                    <div class="h-10 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center px-3 sm:px-4">
                        <div class="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mr-2 sm:mr-3"></div>
                        <span class="text-sm sm:text-base text-gray-700 dark:text-gray-200">{{ $exercise->exercise->displayName() }}</span>
                        <span class="ml-auto text-xs sm:text-sm text-gray-500 dark:text-gray-400">{{ $exercise->sets }} sets × {{ $exercise->reps }} reps</span>
                    </div>
                    @empty
                    <div class="h-10 bg-gray-100 dark:bg-gray-700 rounded flex items-center px-3 sm:px-4 text-gray-400 dark:text-gray-500 text-sm">No exercises scheduled for today.</div>
                    @endforelse
                </div>
                <!-- Bottom row -->
                <div class="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mt-4 sm:mt-6">
                    <div class="flex flex-col gap-1">
                        <span class="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Week {{ $this->selectedDateWeek ?? '—' }} - Day {{ $this->dayNumber ?? '—' }}</span>
                        <span class="text-gray-400 dark:text-gray-500 text-xs">{{ $this->formattedDate }}</span>
                    </div>
                    <a href="{{ route('trainings.create') }}" class="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded text-sm font-semibold shadow hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none text-center">Start Training</a>
                </div>
            </div>
        </div>

        <div class="mt-6 grid grid-cols-1 gap-4 sm:mt-10 lg:grid-cols-6">

            <!-- Second Row: Progress Metrics and Phase Progress -->
            @if($this->metrics)
            <div class="flex p-px lg:col-span-3">
                <div class="w-full overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-lg shadow-gray-200/50 dark:shadow-none border border-gray-200/50 dark:border-white/15">
                    <div class="p-4 sm:p-6">
                        <h3 class="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3 sm:mb-4">
                            <svg class="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Progress Overview
                        </h3>

                        <div class="space-y-3 sm:space-y-4">
                            <div class="flex items-center gap-2 px-2 py-2 sm:px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                                <div class="p-1 bg-orange-100 dark:bg-orange-900 rounded">
                                    <svg class="h-4 w-4 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                                    </svg>
                                </div>
                                <div>
                                    <p class="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{{ $this->metrics->currentStreak }}</p>
                                    <p class="text-xs text-gray-600 dark:text-gray-400">Day Streak</p>
                                </div>
                            </div>

                            <div class="flex items-center gap-2 px-2 py-2 sm:px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                                <div class="p-1 bg-blue-100 dark:bg-blue-900 rounded">
                                    <svg class="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p class="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{{ $this->metrics->totalWorkouts }}</p>
                                    <p class="text-xs text-gray-600 dark:text-gray-400">Total Trainings</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex p-px lg:col-span-3">
                <div class="w-full overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-lg shadow-gray-200/50 dark:shadow-none border border-gray-200/50 dark:border-white/15">
                    <div class="p-4 sm:p-6">
                        <div class="space-y-2 sm:space-y-3">
                            <h3 class="text-base sm:text-lg font-medium text-white flex items-center gap-2">
                                <svg class="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                Phase Progress
                            </h3>

                            <div class="space-y-2 sm:space-y-3">
                                <div class="flex justify-between text-xs sm:text-sm">
                                    <span class="text-gray-400">Current Phase</span>
                                    <span class="text-white">{{ $this->metrics->getPhaseProgressPercentage() }}%</span>
                                </div>

                                <div class="w-full bg-gray-700 rounded-full h-2" role="progressbar" aria-valuenow="{{ $this->metrics->getPhaseProgressPercentage() }}" aria-valuemin="0" aria-valuemax="100">
                                    <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: {{ $this->metrics->getPhaseProgressPercentage() }}%"></div>
                                </div>

                                <p class="text-xs text-gray-400">
                                    @if($this->metrics->totalPhaseWeeks > 0)
                                    Week {{ $this->metrics->currentPhaseWeek }} of {{ $this->metrics->totalPhaseWeeks }} •
                                    {{ $this->metrics->totalPhaseWeeks - $this->metrics->currentPhaseWeek }} weeks remaining
                                    @else
                                    No training plan configured
                                    @endif
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            @endif

            <!-- Third Row: 1RM Stats (full width) -->
            <div class="flex p-px lg:col-span-6">
                <div class="w-full overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-lg shadow-gray-200/50 dark:shadow-none border border-gray-200/50 dark:border-white/15">
                    <div class="p-4 sm:p-6">
                        <h3 class="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3 sm:mb-4">
                            <svg class="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            Estimated One Rep Max
                        </h3>
                        <div class="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-3">
                            @if($this->oneRepMaxes && $this->oneRepMaxes->isNotEmpty())
                            @foreach($this->oneRepMaxes->toArray() as $oneRepMax)
                            <div class="text-center p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                                <p class="text-lg sm:text-2xl font-bold text-gray-900 dark:text-blue-400">{{ $oneRepMax->current > 0 ? $oneRepMax->current . ' kg' : 'Not set' }}</p>
                                <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{{ $oneRepMax->exercise->oneRepMaxDisplayName() }}</p>
                                @if($oneRepMax->current > 0 && $oneRepMax->change != 0)
                                <p class="text-xs mt-1 {{ $oneRepMax->getChangeColorClass() }}">
                                    {{ $oneRepMax->getChangeDisplay() }} from last month
                                </p>
                                @endif
                            </div>
                            @endforeach
                            @else
                            <div class="text-center p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                                <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">No 1RM data available</p>
                                <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">Complete training sessions to see your estimated 1RM</p>
                            </div>
                            @endif
                        </div>
                    </div>
                </div>
            </div>

            <!-- Fourth Row: Weight Progression Chart (full width) -->
            <div class="flex p-px lg:col-span-6">
                <div class="w-full overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-lg shadow-gray-200/50 dark:shadow-none border border-gray-200/50 dark:border-white/15">
                    <div class="p-4 sm:p-6">
                        <livewire:weight-progression-chart :athlete="$athlete" />
                    </div>
                </div>
            </div>

            <livewire:exercise-summary :athlete="$athlete" :trainings="$this->training" />
        </div>
    </div>
</div>