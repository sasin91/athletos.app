import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { ChevronRightIcon, UserIcon } from '@heroicons/react/24/outline';
import { route } from '@/lib/wayfinder';

interface ExperienceLevel {
  value: string;
  label: string;
  description: string;
}

interface TrainingGoal {
  value: string;
  label: string;
  description: string;
}

interface MuscleGroup {
  value: string;
  label: string;
}

interface ProfileData {
  experience_level: string;
  primary_goal: string;
  muscle_groups: string[];
  bio: string;
  top_squat: string;
  top_bench: string;
  top_deadlift: string;
}

interface Props {
  user: any;
  athlete: any;
  onboarding: any;
  experienceLevels: ExperienceLevel[];
  trainingGoals: TrainingGoal[];
  muscleGroups: MuscleGroup[];
}

export default function Profile({ user, athlete, onboarding, experienceLevels, trainingGoals, muscleGroups }: Props) {
  const { data, setData, post, processing, errors } = useForm<ProfileData>({
    experience_level: athlete?.experience_level || '',
    primary_goal: athlete?.primary_goal || '',
    muscle_groups: athlete?.muscle_groups || [],
    bio: athlete?.bio || '',
    top_squat: '',
    top_bench: '',
    top_deadlift: '',
  });

  const handleMuscleGroupChange = (muscleGroupValue: string, checked: boolean) => {
    if (checked) {
      setData('muscle_groups', [...data.muscle_groups, muscleGroupValue]);
    } else {
      setData('muscle_groups', data.muscle_groups.filter(mg => mg !== muscleGroupValue));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route['onboarding.profile.store']().url);
  };

  return (
    <>
      <Head title="Profile Setup - Athletos" />
      
      <div className="min-h-full bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8">
            <div className="text-center mb-8">
              <div className="mx-auto h-16 w-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                <UserIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tell Us About Yourself</h2>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                Help us understand your training background and goals
              </p>
            </div>

            <form onSubmit={submit}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="experience_level" className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">
                      Experience Level
                    </label>
                    <div className="mt-2">
                      <select
                        id="experience_level"
                        name="experience_level"
                        value={data.experience_level}
                        onChange={(e) => setData('experience_level', e.target.value)}
                        className="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                      >
                        <option value="">Select your experience level</option>
                        {experienceLevels.map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.label} - {level.description}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.experience_level && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.experience_level}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="primary_goal" className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">
                      Primary Goal
                    </label>
                    <div className="mt-2">
                      <select
                        id="primary_goal"
                        name="primary_goal"
                        value={data.primary_goal}
                        onChange={(e) => setData('primary_goal', e.target.value)}
                        className="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                      >
                        <option value="">Select your primary goal</option>
                        {trainingGoals.map((goal) => (
                          <option key={goal.value} value={goal.value}>
                            {goal.label} - {goal.description}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.primary_goal && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.primary_goal}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">
                    Muscle Groups to Focus On
                  </label>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Select the muscle groups you'd like to prioritize in your training (optional)
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {muscleGroups.map((muscleGroup) => (
                      <label key={muscleGroup.value} className="relative flex items-start">
                        <div className="flex h-5 items-center">
                          <input
                            type="checkbox"
                            name="muscle_groups[]"
                            value={muscleGroup.value}
                            checked={data.muscle_groups.includes(muscleGroup.value)}
                            onChange={(e) => handleMuscleGroupChange(muscleGroup.value, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {muscleGroup.label}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.muscle_groups && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.muscle_groups}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Past Top Lifts (Optional)
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Share your best lifts to help us track your progress and set appropriate starting weights.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label htmlFor="top_squat" className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">
                        Squat (kg)
                      </label>
                      <div className="mt-2">
                        <input
                          type="number"
                          id="top_squat"
                          name="top_squat"
                          min="0"
                          max="1000"
                          value={data.top_squat}
                          onChange={(e) => setData('top_squat', e.target.value)}
                          className="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                          placeholder="e.g., 143"
                        />
                      </div>
                      {errors.top_squat && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.top_squat}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="top_bench" className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">
                        Bench Press (kg)
                      </label>
                      <div className="mt-2">
                        <input
                          type="number"
                          id="top_bench"
                          name="top_bench"
                          min="0"
                          max="1000"
                          value={data.top_bench}
                          onChange={(e) => setData('top_bench', e.target.value)}
                          className="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                          placeholder="e.g., 102"
                        />
                      </div>
                      {errors.top_bench && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.top_bench}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="top_deadlift" className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">
                        Deadlift (kg)
                      </label>
                      <div className="mt-2">
                        <input
                          type="number"
                          id="top_deadlift"
                          name="top_deadlift"
                          min="0"
                          max="1000"
                          value={data.top_deadlift}
                          onChange={(e) => setData('top_deadlift', e.target.value)}
                          className="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                          placeholder="e.g., 184"
                        />
                      </div>
                      {errors.top_deadlift && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.top_deadlift}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="bio" className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">
                    About Your Training
                  </label>
                  <div className="mt-2">
                    <textarea
                      name="bio"
                      id="bio"
                      rows={4}
                      value={data.bio}
                      onChange={(e) => setData('bio', e.target.value)}
                      className="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                      placeholder="Tell us about your training background, any injuries, or specific goals..."
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    This helps us customize your training plan and exercise suggestions.
                  </p>
                  {errors.bio && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.bio}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
                <a
                  href={route.dashboard().url}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Skip Setup
                </a>
                <button
                  type="submit"
                  disabled={processing}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {processing ? 'Saving...' : 'Continue'}
                  <ChevronRightIcon className="ml-2 h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}