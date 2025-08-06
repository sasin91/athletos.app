import DashboardHeader from '@/components/dashboard/dashboard-header';
import DashboardStats from '@/components/dashboard/dashboard-stats';
import TodaysTraining from '@/components/dashboard/todays-training';
import PageTransition from '@/components/ui/page-transition';
import WeightProgressionChart from '@/components/weight-progression-chart';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import dashboardRoutes from '@/routes/dashboard';
import { Deferred, Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

import type { Athlete, DashboardMetrics, OneRepMaxes, PlannedExercise, RecoveryExercise, TrainingPlan, WeightProgressions } from '@/types';
import WeightProgressionSkeleton from '@/components/ui/weight-progression-skeleton';
import OneRepMaxesSkeleton from '@/components/ui/one-rep-maxes-skeleton';
import RecoveryExercisesSkeleton from '@/components/ui/recovery-exercises-skeleton';

interface DashboardPageProps {
    athlete: Athlete;
    currentPlan: TrainingPlan;
    metrics: DashboardMetrics;
    weightProgressions?: WeightProgressions;
    oneRepMaxes?: OneRepMaxes;
    plannedExercises: PlannedExercise[];
    recoveryExercises?: RecoveryExercise[];
    date: string;
    formattedDate: string;
}

export default function DashboardPage({
    athlete,
    currentPlan,
    metrics,
    weightProgressions,
    oneRepMaxes,
    plannedExercises,
    recoveryExercises,
    date,
    formattedDate,
}: DashboardPageProps) {
    const [currentDate, setCurrentDate] = useState(new Date(date));
    const [selectedExercise, setSelectedExercise] = useState<string | null>(weightProgressions?.progressions?.[0]?.exercise?.value || null);
    const [timeframe, setTimeframe] = useState('12');
    const [isNavigating, setIsNavigating] = useState(false);

    const progressMetrics = useMemo(
        () => ({
            completedThisWeek: metrics.completedThisWeek,
            weeklyGoal: metrics.weeklyGoal,
            phaseWeek: metrics.currentPhaseWeek,
            totalPhaseWeeks: metrics.totalPhaseWeeks,
            phaseProgressPercentage: () => metrics.phaseProgress,
        }),
        [metrics],
    );

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

        router.visit(
            dashboard.url({
                query: { date: newDate.toISOString().split('T')[0] },
            }),
            {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setIsNavigating(false),
            },
        );
    };

    const handleStartTraining = () => {
        router.post(dashboardRoutes.startTraining.url(), {
            date: currentDate.toISOString().split('T')[0],
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
            only: ['weightProgressions'],
        });
    };

    const isToday = currentDate.toDateString() === new Date().toDateString();

    return (
        <AppLayout>
            <Head title="Dashboard" />
            <PageTransition>
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                        <DashboardHeader
                            athleteName={athlete.name}
                            currentDate={currentDate}
                            formattedDate={formattedDate}
                            isToday={isToday}
                            onDateChange={handleDateChange}
                        />

                        <DashboardStats isNavigating={isNavigating} metrics={metrics} />

                        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                            <div className="space-y-8 xl:col-span-2">
                                <TodaysTraining
                                    trainingPlan={currentPlan}
                                    isToday={isToday}
                                    formattedDate={formattedDate}
                                    plannedExercises={plannedExercises}
                                    currentStreak={metrics.currentStreak}
                                    onStartTraining={handleStartTraining}
                                />

                                {/* Weight Progression with Deferred Loading */}
                                <Deferred data="weightProgressions" fallback={<WeightProgressionSkeleton />}>
                                    <WeightProgressionChart
                                        weightProgressions={weightProgressions}
                                        selectedExercise={selectedExercise}
                                        timeframe={timeframe}
                                        onSelectExercise={handleSelectExercise}
                                        onSetTimeframe={handleSetTimeframe}
                                    />
                                </Deferred>

                                {/* One Rep Maxes with Deferred Loading */}
                                <Deferred data="oneRepMaxes" fallback={<OneRepMaxesSkeleton />}>
                                    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                                        <h3 className="mb-4 text-lg font-semibold">One Rep Maxes</h3>
                                        <div className="space-y-3">
                                            {oneRepMaxes?.oneRepMaxes.map((orm) => (
                                                <div
                                                    key={`oneRepMax-${orm.exercise.value}`}
                                                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700"
                                                >
                                                    <span className="font-medium">{orm.exercise.displayName}</span>
                                                    <div className="text-right">
                                                        <span className="text-lg font-bold">{orm.current}kg</span>
                                                        {orm.change !== 0 && (
                                                            <span className={`ml-2 text-sm ${orm.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {orm.change > 0 ? '+' : ''}
                                                                {orm.change}kg
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )) || []}
                                        </div>
                                    </div>
                                </Deferred>
                            </div>

                            {/* Sidebar with Deferred Recovery Exercises */}
                            <div className="space-y-6">
                                {/* Progress Metrics - Always visible */}
                                <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                                    <h3 className="mb-4 text-lg font-semibold">{metrics.currentPhaseName}</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="mb-1 flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                                <span>Week Progress</span>
                                                <span>
                                                    {progressMetrics.completedThisWeek}/{progressMetrics.weeklyGoal}
                                                </span>
                                            </div>
                                            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                                                <div
                                                    className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                                                    style={{
                                                        width: `${Math.min(100, (progressMetrics.completedThisWeek / progressMetrics.weeklyGoal) * 100)}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="mb-1 flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                                <span>Phase Progress</span>
                                                <span>
                                                    {progressMetrics.phaseWeek}/{progressMetrics.totalPhaseWeeks}
                                                </span>
                                            </div>
                                            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                                                <div
                                                    className="h-2 rounded-full bg-green-600 transition-all duration-300"
                                                    style={{ width: `${progressMetrics.phaseProgressPercentage()}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recovery Exercises with Deferred Loading */}
                                <Deferred data="recoveryExercises" fallback={<RecoveryExercisesSkeleton />}>
                                    {recoveryExercises && recoveryExercises.length > 0 ? (
                                        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
                                            <h3 className="mb-4 text-lg font-semibold">Recovery Exercises</h3>
                                            <div className="space-y-2">
                                                {recoveryExercises?.map((exercise) => (
                                                    <div key={`recoveryExercise-${exercise.name}`} className="flex items-center space-x-2 text-sm">
                                                        <span className="text-blue-500">•</span>
                                                        <span>{exercise.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <></>
                                    )}
                                </Deferred>
                            </div>
                        </div>
                    </div>
                </div>
            </PageTransition>
        </AppLayout>
    );
}
