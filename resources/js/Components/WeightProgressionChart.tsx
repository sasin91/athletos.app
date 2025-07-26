import { useState, useEffect, useRef } from 'react';

interface WeightProgression {
  exercise: {
    value: string;
    displayName: () => string;
  };
  currentWeight: number | null;
  expectedWeight: number | null;
  isAhead: () => boolean;
  isBehind: () => boolean;
  isOnTrack: () => boolean;
  getProgressPercentage: () => number;
  getChartData: () => {
    series: any[];
    categories: string[];
  };
  dataPoints: any[];
}

interface WeightProgressionChartProps {
  athlete: any;
  weightProgressions: {
    hasData: () => boolean;
    progressions: WeightProgression[];
  };
  selectedExercise: string | null;
  timeframe: string;
  onSelectExercise: (exercise: string) => void;
  onSetTimeframe: (timeframe: string) => void;
}

export default function WeightProgressionChart({
  athlete,
  weightProgressions,
  selectedExercise,
  timeframe,
  onSelectExercise,
  onSetTimeframe
}: WeightProgressionChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<any>(null);

  const selectedProgression = weightProgressions?.progressions?.find(
    p => p.exercise.value === selectedExercise
  );

  const getStatusClass = (progression: WeightProgression) => {
    if (progression.isAhead()) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    } else if (progression.isBehind()) {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    } else if (progression.isOnTrack()) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const getStatusIcon = (progression: WeightProgression) => {
    if (progression.isAhead()) return '↑';
    if (progression.isBehind()) return '↓';
    return '→';
  };

  useEffect(() => {
    if (selectedProgression && selectedProgression.dataPoints.length > 0 && chartRef.current) {
      // Load ApexCharts and render
      if (window.ApexCharts) {
        if (chart) {
          chart.destroy();
        }

        const chartData = selectedProgression.getChartData();
        
        const options = {
          series: chartData.series,
          chart: {
            type: 'line',
            height: 320,
            toolbar: { show: false },
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
            labels: { style: { colors: '#9CA3AF' } },
            axisBorder: { color: '#374151' }
          },
          yaxis: {
            title: {
              text: 'Weight (kg)',
              style: { color: '#9CA3AF' }
            },
            labels: { style: { colors: '#9CA3AF' } }
          },
          legend: {
            position: 'top',
            horizontalAlign: 'right',
            labels: { colors: '#9CA3AF' }
          },
          tooltip: {
            theme: 'dark',
            y: {
              formatter: function (val: number) {
                return val + ' kg';
              }
            }
          },
          markers: {
            size: 6,
            hover: { size: 8 }
          }
        };
        
        const newChart = new window.ApexCharts(chartRef.current, options);
        newChart.render();
        setChart(newChart);
      }
    }

    // Cleanup
    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  }, [selectedProgression]);

  if (!weightProgressions?.hasData()) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No weight progression data</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Complete training sessions with weight logging to see your progression charts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Weight Progression
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track your progress against expected weight increases
          </p>
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Timeframe:</span>
          <select 
            value={timeframe}
            onChange={(e) => onSetTimeframe(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="4">4 weeks</option>
            <option value="8">8 weeks</option>
            <option value="12">12 weeks</option>
            <option value="16">16 weeks</option>
          </select>
        </div>
      </div>

      {/* Exercise Selector */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {weightProgressions.progressions.map((progression) => {
            const isSelected = selectedExercise === progression.exercise.value;
            const statusClass = getStatusClass(progression);
            
            return (
              <button
                key={progression.exercise.value}
                onClick={() => onSelectExercise(progression.exercise.value)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                } ${statusClass}`}
              >
                {progression.exercise.displayName()}
                <span className="ml-1">{getStatusIcon(progression)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedProgression ? (
        <>
          {/* Chart Container */}
          <div className="mb-6">
            <div ref={chartRef} className="w-full h-80"></div>
          </div>

          {/* Progress Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Weight</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {selectedProgression.currentWeight 
                  ? `${selectedProgression.currentWeight.toFixed(1)} kg` 
                  : 'N/A'
                }
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Expected Weight</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {selectedProgression.expectedWeight 
                  ? `${selectedProgression.expectedWeight.toFixed(1)} kg` 
                  : 'N/A'
                }
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Progress</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {Math.round(selectedProgression.getProgressPercentage())}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedProgression.isAhead() ? (
                  <span className="text-green-600 dark:text-green-400">Ahead of schedule</span>
                ) : selectedProgression.isBehind() ? (
                  <span className="text-red-600 dark:text-red-400">Behind schedule</span>
                ) : (
                  <span className="text-blue-600 dark:text-blue-400">On track</span>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No data available</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Complete some training sessions to see your weight progression.</p>
        </div>
      )}
    </div>
  );
}