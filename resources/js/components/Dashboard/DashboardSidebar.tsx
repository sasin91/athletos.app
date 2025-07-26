import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedProgress, CircularProgress } from '@/components/ui/progress';

interface ProgressMetrics {
  completedThisWeek: number;
  weeklyGoal: number;
  phaseWeek: number;
  totalPhaseWeeks: number;
  phaseProgressPercentage: () => number;
}

interface RecoveryExercise {
  name: string;
}

interface DashboardSidebarProps {
  progressMetrics: ProgressMetrics;
  currentPhaseName: string;
  recoveryExercises: RecoveryExercise[];
}

export default function DashboardSidebar({
  progressMetrics,
  currentPhaseName,
  recoveryExercises
}: DashboardSidebarProps) {
  return (
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
              label={`${currentPhaseName} Phase`}
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
  );
}