import { Head, Link, useForm } from '@inertiajs/react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import OnboardingLayout from '@/components/onboarding-layout';
import { Athlete } from '@/types';
import { FormEvent } from 'react';
import { store } from '@/routes/onboarding/schedule';
import { plan } from '@/routes/onboarding';

interface Weekday {
  value: string;
  label: string;
}

interface TrainingTime {
  value: string;
  label: string;
  timeRange: string;
}

type ScheduleData = {
  training_days: string[];
  training_frequency: string;
  preferred_time: string;
  session_duration: string;
};

interface Props {
  athlete: Athlete;
  weekdays: Weekday[];
  trainingTimes: TrainingTime[];
}

export default function Schedule({ athlete, weekdays, trainingTimes }: Props) {
  const { data, setData, post, processing, errors } = useForm<ScheduleData>({
    training_days: athlete?.training_days || [],
    training_frequency: athlete?.training_frequency || '1w',
    preferred_time: athlete?.preferred_time || '',
    session_duration: athlete?.session_duration ? athlete.session_duration.toString() : '',
  });

  const handleTrainingDayChange = (day: string, checked: boolean) => {
    if (checked) {
      setData('training_days', [...data.training_days, day]);
    } else {
      setData('training_days', data.training_days.filter(d => d !== day));
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();

    post(store.url());
  };

  const sessionDurationOptions = [
    { value: '45', label: '45 minutes' },
    { value: '60', label: '1 hour' },
    { value: '75', label: '1 hour 15 minutes' },
    { value: '90', label: '1 hour 30 minutes' },
    { value: '120', label: '2 hours' },
  ];

  const trainingFrequencyOptions = [
    { value: '1w', label: 'Every week' },
    { value: '2w', label: 'Every other week (1 week on, 1 week off)' },
    { value: '3w', label: 'Every 3 weeks (1 week on, 2 weeks off)' },
    { value: '4w', label: 'Every 4 weeks (1 week on, 3 weeks off)' },
  ];

  return (
    <>
      <Head title="Training Schedule - Athletos" />

      <OnboardingLayout title="Set Your Training Schedule">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl rounded-lg p-8 border border-gray-200/20 dark:border-gray-700/20">
            <div className="text-center mb-8">
              <div className="mx-auto h-16 w-16 bg-gradient-to-r from-pink-100 to-violet-100 dark:from-pink-900/20 dark:to-violet-900/20 rounded-full flex items-center justify-center mb-4">
                <CalendarIcon className="h-8 w-8 text-pink-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Set Your Training Schedule</h2>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                When do you prefer to train? This helps us schedule your sessions
              </p>
            </div>

            <form onSubmit={submit}>
              <div className="space-y-8">
                <fieldset>
                  <legend className="text-lg font-semibold text-gray-900 dark:text-gray-100">Training Days</legend>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Select the days you want to train each week
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
                    {weekdays.map((weekday) => (
                      <label
                        key={weekday.value}
                        className={`relative flex flex-col items-center justify-center rounded-lg border-2 bg-white dark:bg-gray-700 p-4 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-all ${
                          data.training_days.includes(weekday.value)
                            ? 'border-pink-600 bg-gradient-to-r from-pink-50 to-violet-50 dark:from-pink-900/20 dark:to-violet-900/20 text-pink-600 dark:text-pink-400'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={weekday.value}
                          checked={data.training_days.includes(weekday.value)}
                          onChange={(e) => handleTrainingDayChange(weekday.value, e.target.checked)}
                          className="sr-only"
                        />
                        <CalendarIcon className="mb-2 h-6 w-6" />
                        {weekday.label}
                      </label>
                    ))}
                  </div>
                  {errors.training_days && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.training_days}</p>
                  )}
                </fieldset>

                <fieldset>
                  <legend className="text-lg font-semibold text-gray-900 dark:text-gray-100">Training Frequency</legend>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    How often do you want to train? This helps us schedule recovery weeks
                  </p>
                  <div className="mt-4">
                    <label htmlFor="training_frequency" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                      Training Pattern
                    </label>
                    <Select value={data.training_frequency} onValueChange={(value) => setData('training_frequency', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select training pattern" />
                      </SelectTrigger>
                      <SelectContent>
                        {trainingFrequencyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Choose a pattern that fits your recovery needs and schedule
                    </p>
                    {errors.training_frequency && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.training_frequency}</p>
                    )}
                  </div>
                </fieldset>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="preferred_time" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                      Preferred Training Time
                    </label>
                    <Select value={data.preferred_time} onValueChange={(value) => setData('preferred_time', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select your preferred time" />
                      </SelectTrigger>
                      <SelectContent>
                        {trainingTimes.map((time) => (
                          <SelectItem key={time.value} value={time.value}>
                            {time.label} ({time.timeRange})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.preferred_time && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.preferred_time}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="session_duration" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                      Session Duration (minutes)
                    </label>
                    <Select value={data.session_duration} onValueChange={(value) => setData('session_duration', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {sessionDurationOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.session_duration && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.session_duration}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" asChild>
                  <Link href={plan.url()} prefetch>
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
