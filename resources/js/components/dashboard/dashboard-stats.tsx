import { Card, CardContent, CardDescription } from '@/components/ui/card';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import { StaggeredAnimation } from '@/components/ui/page-transition';
import type { DashboardMetrics } from '@/types';

interface DashboardStatsProps {
  isNavigating: boolean;
  metrics: DashboardMetrics;
}

export default function DashboardStats({ isNavigating, metrics }: DashboardStatsProps) {
  const stats = [
    {
      label: 'Total Workouts',
      value: metrics.totalWorkouts
    },
    {
      label: 'Current Streak',
      value: metrics.currentStreak
    },
    {
      label: 'This Week',
      value: `${metrics.completedThisWeek}/${metrics.weeklyGoal}`
    },
    {
      label: 'Phase Progress',
      value: `${metrics.phaseProgress}%`
    }
  ];

  if (isNavigating) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <LoadingSkeleton className="h-4 w-20 mb-2" />
            <LoadingSkeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <StaggeredAnimation
      delay={150}
      className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
    >
      {stats.map((stat, index) => (
        <Card key={index} className="transition-all duration-300 hover:shadow-md hover:scale-105">
          <CardContent className="p-6">
            <CardDescription className="text-sm font-medium">{stat.label}</CardDescription>
            <div className="text-2xl font-bold transition-all duration-500">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </StaggeredAnimation>
  );
}