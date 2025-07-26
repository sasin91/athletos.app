import { useMemo } from 'react';

interface PhaseProgressProps {
  progressMetrics: {
    phaseWeek: number;
    totalPhaseWeeks: number;
    phaseProgressPercentage: () => number;
  };
}

export default function PhaseProgress({ progressMetrics }: PhaseProgressProps) {
  const phaseProgressPercentage = useMemo(() => {
    return progressMetrics.phaseProgressPercentage();
  }, [progressMetrics]);

  const remainingWeeks = progressMetrics.totalPhaseWeeks - progressMetrics.phaseWeek;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium text-white flex items-center gap-2">
        <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        Phase Progress
      </h3>
      
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Current Phase</span>
          <span className="text-white">{phaseProgressPercentage}%</span>
        </div>
        
        <div 
          className="w-full bg-gray-700 rounded-full h-2" 
          role="progressbar" 
          aria-valuenow={phaseProgressPercentage} 
          aria-valuemin={0} 
          aria-valuemax={100}
        >
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${phaseProgressPercentage}%` }}
          />
        </div>
        
        <p className="text-xs text-gray-400">
          {progressMetrics.totalPhaseWeeks > 0 ? (
            <>
              Week {progressMetrics.phaseWeek} of {progressMetrics.totalPhaseWeeks} •{' '}
              {remainingWeeks} weeks remaining
            </>
          ) : (
            'No training plan configured'
          )}
        </p>
      </div>
    </div>
  );
}