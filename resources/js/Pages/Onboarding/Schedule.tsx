import { Head, Link, useForm } from '@inertiajs/react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { route } from '@/lib/wayfinder';

interface Weekday {
  value: string;
  label: string;
}

interface TrainingTime {
  value: string;
  label: string;
  timeRange: string;
}

interface ScheduleData {
  training_days: string[];
  training_frequency: string;
  preferred_time: string;
  session_duration: string;
}

interface Props {
  user: any;
  athlete: any;
  onboarding: any;
  weekdays: Weekday[];
  trainingTimes: TrainingTime[];
}

export default function Schedule({ user, athlete, onboarding, weekdays, trainingTimes }: Props) {
  const { data, setData, post, processing, errors } = useForm<ScheduleData>({
    training_days: athlete?.training_days || [],
    training_frequency: athlete?.training_frequency || '',
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route['onboarding.schedule.store']().url);
  };

  const sessionDurationOptions = [
    { value: '45', label: '45 minutes' },
    { value: '60', label: '1 hour' },
    { value: '75', label: '1 hour 15 minutes' },
    { value: '90', label: '1 hour 30 minutes' },
    { value: '120', label: '2 hours' },
  ];

  const trainingFrequencyOptions = [
    { value: '', label: 'Every week (standard)' },
    { value: '2w', label: 'Every other week (1 week on, 1 week off)' },
    { value: '3w', label: 'Every 3 weeks (1 week on, 2 weeks off)' },
    { value: '4w', label: 'Every 4 weeks (1 week on, 3 weeks off)' },
  ];

  return (
    <>
      <Head title="Training Schedule - Athletos" />
      
      <div className="min-h-full bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8">
            <div className="text-center mb-8">
              <div className="mx-auto h-16 w-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-4">
                <CalendarIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
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
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
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
                    <select
                      id="training_frequency"
                      name="training_frequency"
                      value={data.training_frequency}
                      onChange={(e) => setData('training_frequency', e.target.value)}
                      className="mt-2 w-full rounded-md bg-white dark:bg-gray-700 py-2 px-3 text-base text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    >
                      {trainingFrequencyOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
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
                    <select
                      id="preferred_time"
                      name="preferred_time"
                      value={data.preferred_time}
                      onChange={(e) => setData('preferred_time', e.target.value)}
                      className="mt-2 w-full rounded-md bg-white dark:bg-gray-700 py-2 px-3 text-base text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="">Select your preferred time</option>
                      {trainingTimes.map((time) => (
                        <option key={time.value} value={time.value}>
                          {time.label} ({time.timeRange})
                        </option>
                      ))}
                    </select>
                    {errors.preferred_time && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.preferred_time}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="session_duration" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                      Session Duration (minutes)
                    </label>
                    <select
                      id="session_duration"
                      name="session_duration"
                      value={data.session_duration}
                      onChange={(e) => setData('session_duration', e.target.value)}
                      className="mt-2 w-full rounded-md bg-white dark:bg-gray-700 py-2 px-3 text-base text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="">Select duration</option>
                      {sessionDurationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.session_duration && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.session_duration}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
                <Link
                  href={route['onboarding.plan']().url}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ChevronLeftIcon className="mr-2 h-4 w-4" />
                  Back
                </Link>
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