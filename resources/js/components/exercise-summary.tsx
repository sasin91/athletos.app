import { useState, useEffect } from 'react';
import trainings from '@/routes/trainings';

interface ExerciseSummaryItem {
  name: string;
  sets: number;
  reps: string;
  weight: string;
}

interface ExerciseSummaryProps {
  athlete: any;
  trainings: any;
  show: boolean;
  date: string | null;
  summary: ExerciseSummaryItem[];
  onHide: () => void;
}

export default function ExerciseSummary({ 
  athlete, 
  trainings, 
  show, 
  date, 
  summary, 
  onHide 
}: ExerciseSummaryProps) {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
  }, [show]);

  const handleClose = () => {
    setIsVisible(false);
    onHide();
  };

  const handleStartTraining = () => {
    window.location.href = trainings.index.url();
  };

  const handleViewTraining = (trainingId: number) => {
    window.location.href = trainings.show.url({ training: trainingId });
  };

  if (!isVisible) return null;

  const parsedDate = date ? new Date(date) : null;
  const isToday = parsedDate?.toDateString() === new Date().toDateString();
  const firstTraining = trainings?.[0];

  return (
    <div className="relative z-10">
      {/* Background backdrop */}
      <div 
        className="fixed inset-0 bg-gray-500/75 transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          {/* Modal panel */}
          <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
            <div>
              <div className="mt-3 text-center sm:mt-5">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Training for {parsedDate?.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
                <div className="mt-2">
                  {summary.length > 0 ? (
                    <div className="space-y-3">
                      {summary.map((exercise, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                              {exercise.name}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {exercise.sets} sets × {exercise.reps} reps
                            </p>
                            {exercise.weight !== 'Body weight' && (
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                {exercise.weight}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      {!athlete.currentPlan 
                        ? 'No training plan configured. Please set up a training plan to see exercises.'
                        : 'No exercises planned for this date.'
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
              {firstTraining?.id ? (
                <button
                  onClick={() => handleViewTraining(firstTraining.id)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  View Training
                </button>
              ) : isToday ? (
                <button
                  onClick={handleStartTraining}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Start Training
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}