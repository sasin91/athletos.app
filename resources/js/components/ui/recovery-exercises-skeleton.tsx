import React from 'react';

export default function RecoveryExercisesSkeleton() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4 animate-pulse"></div>
            
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full animate-pulse"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32 animate-pulse"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}