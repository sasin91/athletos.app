import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import AppLayout from '@/Components/Layout/AppLayout';
import { route } from '@/lib/wayfinder';

interface Exercise {
  exercise: string;
  sets: number;
  reps: string;
  weight: string;
  rest_seconds: number;
  notes?: string;
  day: number;
}

interface TrainingPhase {
  id: number;
  name: string;
  description?: string;
  duration_weeks: number;
  order: number;
  settings?: {
    exercises: Exercise[];
  };
}

interface TrainingPlan {
  id: number;
  name: string;
  description: string;
  goal: {
    value: string;
  };
  experience_level?: {
    value: string;
  };
  default_progression_type: {
    value: string;
  };
  phases: TrainingPhase[];
}

interface Props {
  trainingPlan: TrainingPlan;
  auth: {
    user: {
      athlete?: {
        current_plan_id?: number;
      };
    };
  };
}

export default function Show({ trainingPlan, auth }: Props) {
  const { post, processing } = useForm();

  const isCurrentPlan = auth.user.athlete?.current_plan_id === trainingPlan.id;

  const assignPlan = () => {
    post(route['training-plans.assign']({ trainingPlan: trainingPlan.id }).url);
  };

  const getExerciseDisplayName = (exerciseValue: string): string => {
    // Simple mapping - in a real app this would come from the server
    const exerciseNames: Record<string, string> = {
      'barbell_back_squat': 'Barbell Back Squat',
      'bench_press': 'Bench Press',
      'deadlift': 'Deadlift',
      'overhead_press': 'Overhead Press',
      'barbell_row': 'Barbell Row',
      // Add more mappings as needed
    };
    
    return exerciseNames[exerciseValue] || exerciseValue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <AppLayout>
      <Head title={`${trainingPlan.name} - Training Plan`} />
      
      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6 text-gray-900 dark:text-gray-100">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {trainingPlan.name}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    {trainingPlan.description}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  {auth.user.athlete && !isCurrentPlan ? (
                    <button
                      onClick={assignPlan}
                      disabled={processing}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {processing ? 'Assigning...' : 'Assign This Plan'}
                    </button>
                  ) : (
                    <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
                      Current Plan
                    </span>
                  )}
                </div>
              </div>

              {/* Plan Details */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Goal</h3>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                    {trainingPlan.goal.value}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Experience Level</h3>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                    {trainingPlan.experience_level?.value || 'Any'}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Progression Type</h3>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                    {trainingPlan.default_progression_type.value}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Phases</h3>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {trainingPlan.phases.length}
                  </p>
                </div>
              </div>

              {/* Training Phases */}
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Training Phases</h2>
                
                {trainingPlan.phases.map((phase) => {
                  // Group exercises by day
                  const exercisesByDay = phase.settings?.exercises ? 
                    phase.settings.exercises.reduce((acc, exercise) => {
                      if (!acc[exercise.day]) {
                        acc[exercise.day] = [];
                      }
                      acc[exercise.day].push(exercise);
                      return acc;
                    }, {} as Record<number, Exercise[]>) : {};

                  return (
                    <div key={phase.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            {phase.name}
                          </h3>
                          {phase.description && (
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                              {phase.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                            {phase.duration_weeks} {phase.duration_weeks === 1 ? 'week' : 'weeks'}
                          </span>
                        </div>
                      </div>

                      {Object.keys(exercisesByDay).length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Exercises</h4>
                          
                          {Object.entries(exercisesByDay).map(([day, exercises]) => (
                            <div key={day} className="mb-6">
                              <h5 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">
                                Day {day}
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {exercises.map((exercise, index) => (
                                  <div key={index} className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 p-4">
                                    <h6 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                      {getExerciseDisplayName(exercise.exercise)}
                                    </h6>
                                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                      <p><span className="font-medium">Sets:</span> {exercise.sets}</p>
                                      <p><span className="font-medium">Reps:</span> {exercise.reps}</p>
                                      <p><span className="font-medium">Weight:</span> {exercise.weight}</p>
                                      <p><span className="font-medium">Rest:</span> {exercise.rest_seconds}s</p>
                                      {exercise.notes && (
                                        <p><span className="font-medium">Notes:</span> {exercise.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Back Button */}
              <div className="mt-8">
                <Link
                  href={route.dashboard().url}
                  className="inline-flex items-center px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm font-medium rounded-lg transition-colors"
                >
                  <ChevronLeftIcon className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}