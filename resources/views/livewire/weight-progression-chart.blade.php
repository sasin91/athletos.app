<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <div class="flex items-center justify-between mb-6">
        <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <svg class="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Weight Progression
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Track your progress against expected weight increases
            </p>
        </div>
        
        <!-- Timeframe Selector -->
        <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600 dark:text-gray-400">Timeframe:</span>
            <select wire:model.live="timeframe" 
                    wire:change="setTimeframe($event.target.value)"
                    class="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="4">4 weeks</option>
                <option value="8">8 weeks</option>
                <option value="12">12 weeks</option>
                <option value="16">16 weeks</option>
            </select>
        </div>
    </div>

    @if($weightProgressions->hasData())
        <!-- Exercise Selector -->
        <div class="mb-6">
            <div class="flex flex-wrap gap-2">
                @foreach($this->exercisesWithData as $progression)
                    @php
                        $isSelected = $selectedExercise === $progression->exercise->value;
                        $statusClass = match(true) {
                            $progression->isAhead() => 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                            $progression->isBehind() => 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
                            $progression->isOnTrack() => 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                            default => 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        };
                    @endphp
                    <button wire:click="selectExercise('{{ $progression->exercise->value }}')"
                            class="px-3 py-1 rounded-full text-sm font-medium transition-colors {{ $isSelected ? 'ring-2 ring-blue-500' : '' }} {{ $statusClass }}">
                        {{ $progression->exercise->displayName() }}
                        @if($progression->isAhead())
                            <span class="ml-1">↑</span>
                        @elseif($progression->isBehind())
                            <span class="ml-1">↓</span>
                        @else
                            <span class="ml-1">→</span>
                        @endif
                    </button>
                @endforeach
            </div>
        </div>

        @if($this->selectedProgression)
            <!-- Chart Container -->
            <div class="mb-6">
                <div id="weight-progression-chart" class="w-full h-80"></div>
            </div>

            <!-- Progress Summary -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Current Weight</div>
                    <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {{ $this->selectedProgression->currentWeight ? number_format($this->selectedProgression->currentWeight, 1) . ' kg' : 'N/A' }}
                    </div>
                </div>
                
                <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Expected Weight</div>
                    <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {{ $this->selectedProgression->expectedWeight ? number_format($this->selectedProgression->expectedWeight, 1) . ' kg' : 'N/A' }}
                    </div>
                </div>
                
                <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Progress</div>
                    <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {{ round($this->selectedProgression->getProgressPercentage()) }}%
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        @if($this->selectedProgression->isAhead())
                            <span class="text-green-600 dark:text-green-400">Ahead of schedule</span>
                        @elseif($this->selectedProgression->isBehind())
                            <span class="text-red-600 dark:text-red-400">Behind schedule</span>
                        @else
                            <span class="text-blue-600 dark:text-blue-400">On track</span>
                        @endif
                    </div>
                </div>
            </div>
        @else
            <div class="text-center py-8">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No data available</h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Complete some training sessions to see your weight progression.</p>
            </div>
        @endif
    @else
        <!-- No Data State -->
        <div class="text-center py-8">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No weight progression data</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Complete training sessions with weight logging to see your progression charts.</p>
        </div>
    @endif
</div>

@if($this->selectedProgression && !empty($this->selectedProgression->dataPoints))
<script>
document.addEventListener('livewire:init', () => {
    let chart = null;
    
    Livewire.on('renderChart', (data) => {
        if (chart) {
            chart.destroy();
        }
        
        const chartData = @json($this->selectedProgression->getChartData());
        
        const options = {
            series: chartData.series,
            chart: {
                type: 'line',
                height: 320,
                toolbar: {
                    show: false
                },
                background: 'transparent'
            },
            colors: ['#3B82F6', '#10B981'],
            stroke: {
                curve: 'smooth',
                width: 3
            },
            grid: {
                borderColor: '#374151',
                strokeDashArray: 4,
            },
            xaxis: {
                categories: chartData.categories,
                labels: {
                    style: {
                        colors: '#9CA3AF'
                    }
                },
                axisBorder: {
                    color: '#374151'
                }
            },
            yaxis: {
                title: {
                    text: 'Weight (kg)',
                    style: {
                        color: '#9CA3AF'
                    }
                },
                labels: {
                    style: {
                        colors: '#9CA3AF'
                    }
                }
            },
            legend: {
                position: 'top',
                horizontalAlign: 'right',
                labels: {
                    colors: '#9CA3AF'
                }
            },
            tooltip: {
                theme: 'dark',
                y: {
                    formatter: function (val) {
                        return val + ' kg';
                    }
                }
            },
            markers: {
                size: 6,
                hover: {
                    size: 8
                }
            }
        };
        
        chart = new ApexCharts(document.querySelector("#weight-progression-chart"), options);
        chart.render();
    });
    
    // Initial chart render
    Livewire.dispatch('renderChart');
});
</script>
@endif 