import { Head, Link, useForm } from '@inertiajs/react';
import { CogIcon, ChevronLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import { route } from '@/lib/wayfinder';

interface Difficulty {
  value: string;
  label: string;
  description: string;
}

interface PreferencesData {
  difficulty_preference: string;  
  notifications: string[];
}

interface Props {
  user: any;
  athlete: any;
  onboarding: any;
  difficulties: Difficulty[];
}

export default function Preferences({ user, athlete, onboarding, difficulties }: Props) {
  const { data, setData, post, processing, errors } = useForm<PreferencesData>({
    difficulty_preference: athlete?.difficulty_preference || '',
    notifications: athlete?.notification_preferences || [],
  });

  const handleNotificationChange = (notification: string, checked: boolean) => {
    if (checked) {
      setData('notifications', [...data.notifications, notification]);
    } else {
      setData('notifications', data.notifications.filter(n => n !== notification));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route['onboarding.preferences.store']().url);
  };

  const notificationOptions = [
    { value: 'workout_reminders', label: 'Workout Reminders' },
    { value: 'progress_updates', label: 'Progress Updates' },
    { value: 'recovery_tips', label: 'Recovery Tips' },
    { value: 'motivational_messages', label: 'Motivational Messages' },
  ];

  return (
    <>
      <Head title="Preferences - Athletos" />
      
      <div className="min-h-full bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8">
            <div className="text-center mb-8">
              <div className="mx-auto h-16 w-16 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-4">
                <CogIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Set Your Preferences</h2>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                Customize your training experience
              </p>
            </div>

            <form onSubmit={submit}>
              <div className="space-y-8">
                {/* Difficulty Preference */}
                <div>
                  <label className="block text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Training Difficulty
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    How challenging do you want your workouts to be?
                  </p>
                  <div className="space-y-3">
                    {difficulties.map((difficulty) => (
                      <label
                        key={difficulty.value}
                        className={`relative flex items-center p-4 rounded-lg border-2 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors ${
                          data.difficulty_preference === difficulty.value
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="difficulty_preference"
                          value={difficulty.value}
                          checked={data.difficulty_preference === difficulty.value}
                          onChange={(e) => setData('difficulty_preference', e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                        />
                        <div className="ml-4">
                          <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                            {difficulty.label}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {difficulty.description}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.difficulty_preference && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.difficulty_preference}</p>
                  )}
                </div>

                {/* Notification Preferences */}
                <div>
                  <label className="block text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Notifications
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Choose what notifications you'd like to receive
                  </p>
                  <div className="space-y-3">
                    {notificationOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`relative flex items-center p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                          data.notifications.includes(option.value)
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={option.value}
                          checked={data.notifications.includes(option.value)}
                          onChange={(e) => handleNotificationChange(option.value, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                        <div className="ml-3">
                          <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                            {option.label}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.notifications && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.notifications}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
                <Link
                  href={route['onboarding.stats']().url}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ChevronLeftIcon className="mr-2 h-4 w-4" />
                  Back
                </Link>
                <button
                  type="submit"
                  disabled={processing}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {processing ? 'Completing...' : 'Complete Setup'}
                  <CheckIcon className="ml-2 h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}