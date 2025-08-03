import { Head, Link, useForm } from '@inertiajs/react';
import { ChartBarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import onboarding from '@/routes/onboarding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import OnboardingLayout from '@/components/onboarding-layout';

type StatsData = {
  current_bench: string;
  current_squat: string;
  current_deadlift: string;
};

interface Props {
  user: any;
  athlete: any;
  onboarding: any;
}

export default function Stats({ user, athlete, onboarding }: Props) {
  const { data, setData, post, processing, errors } = useForm<StatsData>({
    current_bench: '',
    current_squat: '',
    current_deadlift: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(onboarding.stats.store.url());
  };

  return (
    <>
      <Head title="Current Stats - Athletos" />
      
      <OnboardingLayout title="Current Stats">
        <div className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl rounded-lg p-8 border border-gray-200/20 dark:border-gray-700/20">
            <div className="text-center mb-8">
              <div className="mx-auto h-16 w-16 bg-gradient-to-r from-pink-100 to-violet-100 dark:from-pink-900/20 dark:to-violet-900/20 rounded-full flex items-center justify-center mb-4">
                <ChartBarIcon className="h-8 w-8 text-pink-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Current Stats</h2>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                Help us track your progress by entering your current lifting stats (optional)
              </p>
            </div>

            <form onSubmit={submit}>
              <div className="space-y-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <span className="font-medium">Optional:</span> These stats help us customize your starting weights and track your progress. You can always add or update them later.
                </p>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="current_bench" className="mb-2">
                      Bench Press (lbs)
                    </Label>
                    <Input
                      type="number"
                      name="current_bench"
                      id="current_bench"
                      min="0"
                      max="1000"
                      step="5"
                      value={data.current_bench}
                      onChange={(e) => setData('current_bench', e.target.value)}
                      placeholder="e.g. 135"
                    />
                    {errors.current_bench && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.current_bench}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="current_squat" className="mb-2">
                      Squat (lbs)
                    </Label>
                    <Input
                      type="number"
                      name="current_squat"
                      id="current_squat"
                      min="0"
                      max="1000"
                      step="5"
                      value={data.current_squat}
                      onChange={(e) => setData('current_squat', e.target.value)}
                      placeholder="e.g. 185"
                    />
                    {errors.current_squat && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.current_squat}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="current_deadlift" className="mb-2">
                      Deadlift (lbs)
                    </Label>
                    <Input
                      type="number"
                      name="current_deadlift"
                      id="current_deadlift"
                      min="0"
                      max="1000"
                      step="5"
                      value={data.current_deadlift}
                      onChange={(e) => setData('current_deadlift', e.target.value)}
                      placeholder="e.g. 225"
                    />
                    {errors.current_deadlift && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.current_deadlift}</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Don't know your max?</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No problem! You can leave these empty and we'll help you find your starting weights during your first few workouts. 
                    We'll track your progress from there.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" asChild>
                  <Link href={onboarding.schedule.url()}>
                    <ChevronLeftIcon className="mr-2 h-4 w-4" />
                    Back
                  </Link>
                </Button>
                <Button
                  type="submit"
                  disabled={processing}
                  className="px-6 py-3"
                >
                  {processing ? 'Saving...' : 'Continue'}
                  <ChevronRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </OnboardingLayout>
    </>
  );
}