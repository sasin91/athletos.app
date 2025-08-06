import React from 'react';

export default function WeightProgressionSkeleton() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
                <div className="flex gap-2">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                </div>
            </div>
            
            {/* Chart skeleton */}
            <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-4"></div>
            
            {/* Exercise buttons skeleton */}
            <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-9 bg-gray-200 dark:bg-gray-700 rounded-full w-24 animate-pulse"></div>
                ))}
            </div>
        </div>
    );
}