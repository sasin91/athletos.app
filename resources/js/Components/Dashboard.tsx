import { useState, useMemo } from 'react';
import { routes } from '@/lib/wayfinder';
import WeeklyGoal from './WeeklyGoal';
import PhaseProgress from './PhaseProgress';
import WeightProgressionChart from './WeightProgressionChart';
import ExerciseSummary from './ExerciseSummary';
import LoadingSkeleton, { CardSkeleton } from '@/Components/UI/LoadingSkeleton';
import EmptyState, { NoUpcomingWorkouts } from '@/Components/UI/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EnhancedProgress, CircularProgress } from '@/components/ui/progress';
import { CommandPalette, Command } from '@/components/ui/command-palette';
import { QuickActionButton } from '@/components/ui/action-sheet';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import PageTransition, { StaggeredAnimation, FadeIn } from '@/Components/UI/PageTransition';
import { Calendar, Dumbbell, Target, TrendingUp, Plus, Search } from 'lucide-react';

interface DashboardProps {
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
  oneRepMaxes: any;
  recoveryExercises: any[];
  date: string;
  formattedDate: string;
}

export default function Dashboard({
  athlete,
  metrics,
  weightProgressions,
  plannedExercises,
  oneRepMaxes,
  recoveryExercises,
  date,
  formattedDate
}: DashboardProps) {
  const [currentDate, setCurrentDate] = useState(new Date(date));
  const [showExerciseSummary, setShowExerciseSummary] = useState(false);
  const [exerciseSummaryDate, setExerciseSummaryDate] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(
    weightProgressions?.progressions?.[0]?.exercise?.value || null
  );
  const [timeframe, setTimeframe] = useState('12');
  const [isNavigating, setIsNavigating] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

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
    
    // Update the URL and fetch new data
    routes.dashboard({
      date: newDate.toISOString().split('T')[0]
    }, {
      preserveState: true,
      preserveScroll: true,
      onFinish: () => setIsNavigating(false),
    });
  };

  const handleStartTraining = () => {
    routes.startTraining({
      date: currentDate.toISOString().split('T')[0]
    });
  };

  const showExerciseSummaryModal = (date: string) => {
    setExerciseSummaryDate(date);
    setShowExerciseSummary(true);
  };

  const handleSelectExercise = (exercise: string) => {
    setSelectedExercise(exercise);
  };

  const handleSetTimeframe = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
    // Trigger a request to update weight progressions
    routes.dashboard({}, {
      data: { timeframe: newTimeframe },
      preserveState: true,
      preserveScroll: true,
      only: ['weightProgressions']
    });
  };

  const isToday = currentDate.toDateString() === new Date().toDateString();
  const hasTodaysWorkout = Boolean(metrics.nextWorkoutDate && 
    new Date(metrics.nextWorkoutDate).toDateString() === currentDate.toDateString());

  // Command palette commands
  const commands: Command[] = [
    {
      id: 'start-training',
      label: 'Start Training',
      description: 'Begin today\'s workout session',
      icon: <Dumbbell className="w-4 h-4" />,
      category: 'Training',
      action: handleStartTraining,
      shortcut: '⌘ T'
    },
    {
      id: 'view-progress',
      label: 'View Progress',
      description: 'See your fitness progress over time',
      icon: <TrendingUp className="w-4 h-4" />,
      category: 'Analytics',
      action: () => routes.progress(),
      shortcut: '⌘ P'
    },
    {
      id: 'chat-ai',
      label: 'Chat with AI Coach',
      description: 'Get personalized training advice',
      icon: <Search className="w-4 h-4" />,
      category: 'AI',
      action: () => routes.chat(),
      shortcut: '⌘ /',
      favorite: true
    },
    {
      id: 'view-calendar',
      label: 'Training Calendar',
      description: 'View your training schedule',
      icon: <Calendar className="w-4 h-4" />,
      category: 'Planning',
      action: () => routes.calendar()
    }
  ];

  // Quick actions for floating button
  const quickActions = [
    {
      id: 'quick-start',
      label: 'Start Training',
      icon: <Dumbbell className="w-4 h-4" />,
      onClick: handleStartTraining
    },
    {
      id: 'quick-chat',
      label: 'Ask AI Coach',
      icon: <Search className="w-4 h-4" />,
      onClick: () => routes.chat()
    },
    {
      id: 'quick-progress',
      label: 'View Progress',
      icon: <TrendingUp className="w-4 h-4" />,
      onClick: () => routes.progress()
    }
  ];

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'k',
        metaKey: true,
        action: () => setShowCommandPalette(true),
        description: 'Open command palette'
      },
      {
        key: 't',
        metaKey: true,
        action: handleStartTraining,
        description: 'Start training'
      },
      {
        key: '/',
        metaKey: true,
        action: () => routes.chat(),
        description: 'Open AI chat'
      }
    ]
  });

  return (
    <>
      <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <FadeIn className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome back, {athlete.name || 'Athlete'}
              </p>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDateChange('prev')}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ←
                </button>
                
                <span className="text-lg font-medium text-gray-900 dark:text-gray-100 min-w-[120px] text-center">
                  {formattedDate}
                </span>
                
                <button
                  onClick={() => handleDateChange('next')}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  →
                </button>
              </div>

              {!isToday && (
                <button
                  onClick={() => handleDateChange('today')}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                >
                  Today
                </button>
              )}
            </div>
          </div>
        </FadeIn>

        {/* Quick Stats */}
        {isNavigating ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <LoadingSkeleton className="h-4 w-20 mb-2" />
                <LoadingSkeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <StaggeredAnimation 
            delay={150}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          >
            {[
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
            ].map((stat, index) => (
              <Card key={index} className="transition-all duration-300 hover:shadow-md hover:scale-105">
                <CardContent className="p-6">
                  <CardDescription className="text-sm font-medium">{stat.label}</CardDescription>
                  <div className="text-2xl font-bold transition-all duration-500">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </StaggeredAnimation>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="xl:col-span-2 space-y-8">
            {/* Training Action */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {isToday ? "Today's Training" : `Training for ${formattedDate}`}
                  </CardTitle>
                  {metrics.currentStreak > 0 && (
                    <Badge variant="secondary">
                      🔥 {metrics.currentStreak} day streak
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
              
              {plannedExercises.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {plannedExercises.slice(0, 3).map((exercise, index) => (
                      <div key={index} className="flex items-center justify-between py-2">
                        <span className="text-gray-700 dark:text-gray-300">{exercise.name}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {exercise.sets} sets × {exercise.reps} reps
                        </span>
                      </div>
                    ))}
                    {plannedExercises.length > 3 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        +{plannedExercises.length - 3} more exercises
                      </div>
                    )}
                  </div>
                  
                  {isToday && (
                    <Button
                      onClick={handleStartTraining}
                      className="w-full"
                      size="lg"
                    >
                      Start Training
                    </Button>
                  )}
                </div>
              ) : (
                <div className="py-4">
                  {isToday ? (
                    <NoUpcomingWorkouts onCreateWorkout={handleStartTraining} />
                  ) : (
                    <EmptyState
                      icon="calendar"
                      title="No training scheduled"
                      description={`No workout is planned for ${formattedDate}. Check your training schedule or create a custom session.`}
                    />
                  )}
                </div>
              )}
            </CardContent>
            </Card>

            {/* Weight Progression Chart */}
            <WeightProgressionChart
              athlete={athlete}
              weightProgressions={weightProgressions}
              selectedExercise={selectedExercise}
              timeframe={timeframe}
              onSelectExercise={handleSelectExercise}
              onSetTimeframe={handleSetTimeframe}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Weekly Goal */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weekly Goal</CardTitle>
                <CardDescription>
                  {progressMetrics.completedThisWeek} of {progressMetrics.weeklyGoal} workouts completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <EnhancedProgress
                    value={progressMetrics.completedThisWeek}
                    max={progressMetrics.weeklyGoal}
                    showValue
                    variant={progressMetrics.completedThisWeek >= progressMetrics.weeklyGoal ? 'success' : 'default'}
                  />
                  <div className="flex justify-center">
                    <CircularProgress
                      value={progressMetrics.completedThisWeek}
                      max={progressMetrics.weeklyGoal}
                      size={100}
                      variant={progressMetrics.completedThisWeek >= progressMetrics.weeklyGoal ? 'success' : 'default'}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Phase Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Phase Progress</CardTitle>
                <CardDescription>
                  Week {progressMetrics.phaseWeek} of {progressMetrics.totalPhaseWeeks} in current phase
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <EnhancedProgress
                    value={progressMetrics.phaseWeek}
                    max={progressMetrics.totalPhaseWeeks}
                    label={`${metrics.currentPhaseName} Phase`}
                    showValue
                    variant="default"
                  />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {Math.round((progressMetrics.phaseWeek / progressMetrics.totalPhaseWeeks) * 100)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Complete</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recovery Exercises */}
            {recoveryExercises.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recovery & Mobility</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recoveryExercises.slice(0, 5).map((exercise, index) => (
                      <div key={index} className="text-sm">
                        • {exercise.name}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
        
      {/* Command Palette */}
      <CommandPalette
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
        commands={commands}
      />
      
      {/* Quick Action Button */}
      <QuickActionButton actions={quickActions} />
      </div>
      </PageTransition>

      {/* Exercise Summary Modal */}
      <ExerciseSummary
        athlete={athlete}
        trainings={[]} // This would need to be passed from the backend
        show={showExerciseSummary}
        date={exerciseSummaryDate}
        summary={[]} // This would need to be computed
        onHide={() => setShowExerciseSummary(false)}
      />
    </>
  );
}