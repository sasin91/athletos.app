import React from 'react';

interface DashboardCardSkeletonProps {
    className?: string;
}

export default function DashboardCardSkeleton({ className = "" }: DashboardCardSkeletonProps) {
    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse ${className}`}>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
        </div>
    );
}