import React from 'react';

export default function OneRepMaxesSkeleton() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-6 animate-pulse"></div>
            
            <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                            <div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12 mb-1 animate-pulse"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8 animate-pulse"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}