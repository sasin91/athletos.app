import { useState } from 'react';
import { Head } from '@inertiajs/react';
import { route } from '@/lib/wayfinder';
import AppLayout from '@/layouts/app-layout';

interface Exercise {
  id: number;
  exercise_enum: string;
  sets: number;
  reps: number;
  weight: number | null;
  completed: boolean;
  created_at: string;
}

interface TrainingProps {
  training: {
    id: number;
    scheduled_at: string;
    completed_at: string | null;
    notes: string | null;
    trainingPlan: {
      name: string;
      description?: string;
    } | null;
    trainingPhase: {
      name: string;
    } | null;
    exercises: Exercise[];
  };
  athlete: {
    id: number;
    name: string;
  };
}

export default function Training({ training, athlete }: TrainingProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [notes, setNotes] = useState(training.notes || '');

  const handleCompleteTraining = async () => {
    setIsCompleting(true);

    try {
      // Use Wayfinder route for training completion
      const { url } = route['trainings.complete']({ training: training.id });
      const { router } = await import('@inertiajs/react');
      router.post(url, { notes });
    } catch (error) {
      console.error('Failed to complete training:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleAddExercise = () => {
    // This would open a modal or navigate to add exercise page
    console.log('Add exercise functionality would go here');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isCompleted = !!training.completed_at;
  const completedExercises = training.exercises.filter(ex => ex.completed).length;
  const totalExercises = training.exercises.length;
  const progressPercentage = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

  return (
    <AppLayout>
      <Head title={`Training - ${formatDate(training.scheduled_at)}`} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {training.trainingPlan?.name || 'Training Session'}
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                  {formatDate(training.scheduled_at)}
                </p>
                {training.trainingPhase && (
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Phase: {training.trainingPhase.name}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-4">
                {isCompleted ? (
                  <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Completed
                  </span>
                ) : (
                  <button
                    onClick={handleCompleteTraining}
                    disabled={isCompleting}
                    className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {isCompleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Completing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Complete Training
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Progress</span>
                <span>{completedExercises}/{totalExercises} exercises completed</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Exercises */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Exercises</h2>
              {!isCompleted && (
                <button
                  onClick={handleAddExercise}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Add Exercise
                </button>
              )}
            </div>

            {training.exercises.length > 0 ? (
              <div className="grid gap-4">
                {training.exercises.map((exercise) => (
                  <div
                    key={exercise.id}
                    className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-6 transition-colors ${exercise.completed
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          {exercise.exercise_enum.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h3>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <span>{exercise.sets} sets</span>
                          <span>•</span>
                          <span>{exercise.reps} reps</span>
                          {exercise.weight && (
                            <>
                              <span>•</span>
                              <span>{exercise.weight} kg</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center">
                        {exercise.completed ? (
                          <div className="flex items-center text-green-600 dark:text-green-400">
                            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium">Completed</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">Pending</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No exercises yet</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Add exercises to get started with your training.
                </p>
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="mt-8">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Training Notes
            </label>
            <textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isCompleted}
              placeholder="Add notes about your training session..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}