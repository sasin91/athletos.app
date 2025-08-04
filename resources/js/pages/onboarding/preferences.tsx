import { Head, Link, useForm } from '@inertiajs/react';
import { CogIcon, ChevronLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import onboarding from '@/routes/onboarding';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import OnboardingLayout from '@/components/onboarding-layout';

interface Difficulty {
  value: string;
  label: string;
  description: string;
}

type PreferencesData = {
  difficulty_preference: string;  
  notifications: string[];
};

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
    post(onboarding.preferences.store.url());
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
      
      <OnboardingLayout title="Training Preferences">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl rounded-lg p-8 border border-gray-200/20 dark:border-gray-700/20">
            <div className="text-center mb-8">
              <div className="mx-auto h-16 w-16 bg-gradient-to-r from-pink-100 to-violet-100 dark:from-pink-900/20 dark:to-violet-900/20 rounded-full flex items-center justify-center mb-4">
                <CogIcon className="h-8 w-8 text-pink-500" />
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
                        className={`relative flex items-center p-4 rounded-lg border-2 hover:border-pink-300 dark:hover:border-pink-600 cursor-pointer transition-colors ${
                          data.difficulty_preference === difficulty.value
                            ? 'border-pink-600 bg-gradient-to-r from-pink-50 to-violet-50 dark:from-pink-900/20 dark:to-violet-900/20'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="difficulty_preference"
                          value={difficulty.value}
                          checked={data.difficulty_preference === difficulty.value}
                          onChange={(e) => setData('difficulty_preference', e.target.value)}
                          className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 dark:border-gray-600"
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
                            ? 'bg-gradient-to-r from-pink-50 to-violet-50 dark:from-pink-900/20 dark:to-violet-900/20 border-pink-300 dark:border-pink-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={option.value}
                          checked={data.notifications.includes(option.value)}
                          onChange={(e) => handleNotificationChange(option.value, e.target.checked)}
                          className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 dark:border-gray-600 rounded"
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
                <Button variant="outline" asChild>
                  <Link href={onboarding.stats.url()}>
                    <ChevronLeftIcon className="mr-2 h-4 w-4" />
                    Back
                  </Link>
                </Button>
                <Button
                  type="submit"
                  disabled={processing}
                  className="px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
                >
                  {processing ? 'Completing...' : 'Complete Setup'}
                  <CheckIcon className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </OnboardingLayout>
    </>
  );
}