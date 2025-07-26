import { useMemo } from 'react';

export default function WeeklyGoal({ progressMetrics }) {
    const weeklyProgress = useMemo(() => {
        return progressMetrics.weeklyGoal > 0 
            ? (progressMetrics.completedThisWeek / progressMetrics.weeklyGoal) * 100 
            : 0;
    }, [progressMetrics.completedThisWeek, progressMetrics.weeklyGoal]);

    const goalMessage = useMemo(() => {
        const remaining = progressMetrics.weeklyGoal - progressMetrics.completedThisWeek;
        return progressMetrics.completedThisWeek >= progressMetrics.weeklyGoal
            ? 'Goal achieved! Great work!'
            : `${remaining} more training${remaining > 1 ? 's' : ''} to reach your goal`;
    }, [progressMetrics.completedThisWeek, progressMetrics.weeklyGoal]);

    return (
        <div className="space-y-3">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Weekly Goal
            </h3>
            
            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Trainings This Week</span>
                    <span className="text-white">
                        {progressMetrics.completedThisWeek}/{progressMetrics.weeklyGoal}
                    </span>
                </div>
                
                <div 
                    className="w-full bg-gray-700 rounded-full h-2" 
                    role="progressbar" 
                    aria-valuenow={weeklyProgress} 
                    aria-valuemin="0" 
                    aria-valuemax="100"
                >
                    <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${weeklyProgress}%` }}
                    />
                </div>
                
                <p className="text-xs text-gray-400">
                    {goalMessage}
                </p>
            </div>
        </div>
    );
}