<div class="relative z-10"
    x-data="{ show: @entangle('show')}" x-cloak
    x-show="show" 
    x-on:keydown.escape.window="show = false"
    x-on:click.outside="show = false"
    aria-labelledby="modal-title"
    role="dialog"
    aria-modal="true"
    wire:keydown.escape="hide">

    <!-- Background backdrop -->
    <div class="fixed inset-0 bg-gray-500/75 transition-opacity"
        wire:click="hide"
        aria-hidden="true"></div>

    <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <!-- Modal panel -->
            <div class="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div>
                    <div class="mt-3 text-center sm:mt-5">
                        <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100" id="modal-title">
                            Training for {{ $this->date?->format('l, F j, Y') }}
                        </h3>
                        <div class="mt-2">
                            @if(count($this->summary) > 0)
                            <div class="space-y-3">
                                @foreach($this->summary as $exercise)
                                <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div class="flex-1">
                                        <h4 class="font-medium text-gray-900 dark:text-gray-100">
                                            {{ $exercise->name }}
                                        </h4>
                                        <p class="text-sm text-gray-600 dark:text-gray-400">
                                            {{ $exercise->sets }} sets × {{ $exercise->reps }} reps
                                        </p>
                                        @if($exercise->weight !== 'Body weight')
                                        <p class="text-xs text-gray-500 dark:text-gray-500">
                                            {{ $exercise->weight }}
                                        </p>
                                        @endif
                                    </div>
                                </div>
                                @endforeach
                            </div>
                            @else
                            <p class="text-gray-500 dark:text-gray-400">
                                @if(!$this->athlete->currentPlan)
                                No training plan configured. Please set up a training plan to see exercises.
                                @else
                                No exercises planned for this date.
                                @endif
                            </p>
                            @endif
                        </div>
                    </div>
                </div>
                <div class="mt-5 sm:mt-6 flex justify-end space-x-3">
                    @if($this->trainings->first() && $this->trainings->first()->id)
                    <a href="{{ route('trainings.show', $this->trainings->first()) }}"
                        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        View Training
                    </a>
                    @elseif($this->date?->isToday())
                    <a href="{{ route('trainings.create') }}"
                        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        Start Training
                    </a>
                    @endif
                    <button type="button"
                        wire:click="hide"
                        class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        Close
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>