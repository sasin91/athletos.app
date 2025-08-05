import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import dashboardRoutes from '@/routes/dashboard';
import WeightProgressionChart from '@/components/weight-progression-chart';
import ExerciseSummary from '@/components/exercise-summary';
import DashboardHeader from '@/components/dashboard/dashboard-header';
import DashboardStats from '@/components/dashboard/dashboard-stats';
import TodaysTraining from '@/components/dashboard/todays-training';
import DashboardSidebar from '@/components/dashboard/dashboard-sidebar';
import PageTransition from '@/components/ui/page-transition';

interface DashboardPageProps {
  athlete: any;
  metrics: {
    totalWorkouts: number;
    currentStreak: number;
    completedThisWeek: number;
    weeklyGoal: number;
    phaseProgress: number;
    currentPhaseName: string;
    currentPhaseWeek: number;
    totalPhaseWeeks: number;
    lastWorkoutDate: string | null;
    nextWorkoutDate: string | null;
  };
  weightProgressions: any;
  plannedExercises: any[];
  recoveryExercises: any[];
  date: string;
  formattedDate: string;
}

export default function DashboardPage({
  athlete,
  metrics,
  weightProgressions,
  plannedExercises,
  recoveryExercises,
  date,
  formattedDate
}: DashboardPageProps) {
  const [currentDate, setCurrentDate] = useState(new Date(date));
  const [showExerciseSummary, setShowExerciseSummary] = useState(false);
  const [exerciseSummaryDate] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(
    weightProgressions?.progressions?.[0]?.exercise?.value || null
  );
  const [timeframe, setTimeframe] = useState('12');
  const [isNavigating, setIsNavigating] = useState(false);

  const progressMetrics = useMemo(() => ({
    completedThisWeek: metrics.completedThisWeek,
    weeklyGoal: metrics.weeklyGoal,
    phaseWeek: metrics.currentPhaseWeek,
    totalPhaseWeeks: metrics.totalPhaseWeeks,
    phaseProgressPercentage: () => metrics.phaseProgress,
  }), [metrics]);

  const handleDateChange = (direction: 'prev' | 'next' | 'today') => {
    let newDate = new Date(currentDate);

    switch (direction) {
      case 'prev':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'next':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'today':
        newDate = new Date();
        break;
    }

    setCurrentDate(newDate);
    setIsNavigating(true);

    router.visit(dashboard.url({
      query: { date: newDate.toISOString().split('T')[0] }
    }), {
      preserveState: true,
      preserveScroll: true,
      onFinish: () => setIsNavigating(false),
    });
  };

  const handleStartTraining = () => {
    router.post(dashboardRoutes.startTraining.url(), {
      date: currentDate.toISOString().split('T')[0]
    });
  };



  const handleSelectExercise = (exercise: string) => {
    setSelectedExercise(exercise);
  };

  const handleSetTimeframe = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
    router.visit(dashboard.url(), {
      data: { timeframe: newTimeframe },
      preserveState: true,
      preserveScroll: true,
      only: ['weightProgressions']
    });
  };

  const isToday = currentDate.toDateString() === new Date().toDateString();

  return (
    <AppLayout>
      <Head title="Dashboard" />
      <PageTransition>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <DashboardHeader
              athleteName={athlete.name}
              currentDate={currentDate}
              formattedDate={formattedDate}
              isToday={isToday}
              onDateChange={handleDateChange}
            />

            <DashboardStats
              isNavigating={isNavigating}
              metrics={metrics}
            />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 space-y-8">
                <TodaysTraining
                  isToday={isToday}
                  formattedDate={formattedDate}
                  plannedExercises={plannedExercises}
                  currentStreak={metrics.currentStreak}
                  onStartTraining={handleStartTraining}
                />

                <WeightProgressionChart
                  athlete={athlete}
                  weightProgressions={weightProgressions}
                  selectedExercise={selectedExercise}
                  timeframe={timeframe}
                  onSelectExercise={handleSelectExercise}
                  onSetTimeframe={handleSetTimeframe}
                />
              </div>

              <DashboardSidebar
                progressMetrics={progressMetrics}
                currentPhaseName={metrics.currentPhaseName}
                recoveryExercises={recoveryExercises}
              />
            </div>
          </div>

        </div>
      </PageTransition>

      <ExerciseSummary
        athlete={athlete}
        trainings={[]}
        show={showExerciseSummary}
        date={exerciseSummaryDate}
        summary={[]}
        onHide={() => setShowExerciseSummary(false)}
      />
    </AppLayout>
  );
}