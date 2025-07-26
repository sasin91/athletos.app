import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import EmptyState, { NoUpcomingWorkouts } from '@/components/ui/empty-state';

interface Exercise {
  name: string;
  sets: number;
  reps: number;
}

interface TodaysTrainingProps {
  isToday: boolean;
  formattedDate: string;
  plannedExercises: Exercise[];
  currentStreak: number;
  onStartTraining: () => void;
}

export default function TodaysTraining({
  isToday,
  formattedDate,
  plannedExercises,
  currentStreak,
  onStartTraining
}: TodaysTrainingProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {isToday ? "Today's Training" : `Training for ${formattedDate}`}
          </CardTitle>
          {currentStreak > 0 && (
            <Badge variant="secondary">
              🔥 {currentStreak} day streak
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
                onClick={onStartTraining}
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
              <NoUpcomingWorkouts onCreateWorkout={onStartTraining} />
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
  );
}