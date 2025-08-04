import { Head, useForm } from '@inertiajs/react';
import SettingsLayout from '@/layouts/settings-layout';
import settings from '@/routes/settings';

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

interface TrainingTime {
  value: string;
  label: string;
}

interface Difficulty {
  value: string;
  label: string;
  description: string;
}

interface AthleteProfileData {
  experience_level: string;
  primary_goal: string;
  bio: string;
  muscle_groups: string[];
  training_days: string[];
  training_frequency: string;
  preferred_time: string;
  session_duration: string;
  difficulty_preference: string;
  top_squat: string;
  top_bench: string;
  top_deadlift: string;
}

interface Props {
  athlete: any;
  experienceLevels: ExperienceLevel[];
  trainingGoals: TrainingGoal[];
  muscleGroups: MuscleGroup[];
  trainingTimes: TrainingTime[];
  difficulties: Difficulty[];
}

export default function AthleteProfile({
  athlete,
  experienceLevels,
  trainingGoals,
  muscleGroups,
  trainingTimes,
  difficulties
}: Props) {
  const { data, setData, put, processing, errors } = useForm<AthleteProfileData>({
    experience_level: athlete?.experience_level || '',
    primary_goal: athlete?.primary_goal || '',
    bio: athlete?.bio || '',
    muscle_groups: athlete?.muscle_groups || [],
    training_days: athlete?.training_days || [],
    training_frequency: athlete?.training_frequency || '',
    preferred_time: athlete?.preferred_time || '',
    session_duration: athlete?.session_duration ? athlete.session_duration.toString() : '',
    difficulty_preference: athlete?.difficulty_preference || '',
    top_squat: athlete?.top_squat || '',
    top_bench: athlete?.top_bench || '',
    top_deadlift: athlete?.top_deadlift || '',
  });

  const handleMuscleGroupChange = (muscleGroupValue: string, checked: boolean) => {
    if (checked) {
      setData('muscle_groups', [...data.muscle_groups, muscleGroupValue]);
    } else {
      setData('muscle_groups', data.muscle_groups.filter(mg => mg !== muscleGroupValue));
    }
  };

  const handleTrainingDayChange = (day: string, checked: boolean) => {
    if (checked) {
      setData('training_days', [...data.training_days, day]);
    } else {
      setData('training_days', data.training_days.filter(d => d !== day));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    put(settings.athleteProfile.update.url());
  };

  const weekdays = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' },
  ];

  const sessionDurations = [
    { value: 45, label: '45 minutes' },
    { value: 60, label: '60 minutes' },
    { value: 75, label: '75 minutes' },
    { value: 90, label: '90 minutes' },
    { value: 120, label: '120 minutes' },
  ];

  const trainingFrequencyOptions = [
    { value: '', label: 'Every week (standard)' },
    { value: '2w', label: 'Every other week (1 week on, 1 week off)' },
    { value: '3w', label: 'Every 3 weeks (1 week on, 2 weeks off)' },
    { value: '4w', label: 'Every 4 weeks (1 week on, 3 weeks off)' },
  ];

  return (
    <SettingsLayout>
      <Head title="Athlete Profile Settings - Athletos" />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Athlete Profile</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Update your athlete profile and training preferences
            </p>
          </div>

          <form onSubmit={submit}>
            <div className="space-y-6">
              {/* Experience Level */}
              <div>
                <label htmlFor="experience_level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Experience Level
                </label>
                <select
                  id="experience_level"
                  name="experience_level"
                  value={data.experience_level}
                  onChange={(e) => setData('experience_level', e.target.value)}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select experience level</option>
                  {experienceLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label} - {level.description}
                    </option>
                  ))}
                </select>
                {errors.experience_level && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.experience_level}</p>
                )}
              </div>

              {/* Primary Goal */}
              <div>
                <label htmlFor="primary_goal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Primary Training Goal
                </label>
                <select
                  id="primary_goal"
                  name="primary_goal"
                  value={data.primary_goal}
                  onChange={(e) => setData('primary_goal', e.target.value)}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select primary goal</option>
                  {trainingGoals.map((goal) => (
                    <option key={goal.value} value={goal.value}>
                      {goal.label}
                    </option>
                  ))}
                </select>
                {errors.primary_goal && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.primary_goal}</p>
                )}
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  About Your Training
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  value={data.bio}
                  onChange={(e) => setData('bio', e.target.value)}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Tell us about your training background, any injuries, or specific goals..."
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  This helps us customize your training plan and exercise suggestions.
                </p>
                {errors.bio && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.bio}</p>
                )}
              </div>

              {/* Muscle Groups */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Muscle Groups to Focus On
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Select the muscle groups you'd like to prioritize in your training (optional)
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {muscleGroups.map((muscleGroup) => (
                    <label key={muscleGroup.value} className="relative flex items-start">
                      <div className="flex h-5 items-center">
                        <input
                          type="checkbox"
                          value={muscleGroup.value}
                          checked={data.muscle_groups.includes(muscleGroup.value)}
                          onChange={(e) => handleMuscleGroupChange(muscleGroup.value, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
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
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.muscle_groups}</p>
                )}
              </div>

              {/* Training Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Training Days
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {weekdays.map((day) => (
                    <label key={day.value} className="flex items-center">
                      <input
                        type="checkbox"
                        value={day.value}
                        checked={data.training_days.includes(day.value)}
                        onChange={(e) => handleTrainingDayChange(day.value, e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        {day.label}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.training_days && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.training_days}</p>
                )}
              </div>

              {/* Training Frequency */}
              <div>
                <label htmlFor="training_frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Training Frequency
                </label>
                <select
                  id="training_frequency"
                  name="training_frequency"
                  value={data.training_frequency}
                  onChange={(e) => setData('training_frequency', e.target.value)}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                >
                  {trainingFrequencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Choose a pattern that fits your recovery needs and schedule
                </p>
                {errors.training_frequency && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.training_frequency}</p>
                )}
              </div>

              {/* Preferred Time */}
              <div>
                <label htmlFor="preferred_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Preferred Training Time
                </label>
                <select
                  id="preferred_time"
                  name="preferred_time"
                  value={data.preferred_time}
                  onChange={(e) => setData('preferred_time', e.target.value)}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select preferred time</option>
                  {trainingTimes.map((time) => (
                    <option key={time.value} value={time.value}>
                      {time.label}
                    </option>
                  ))}
                </select>
                {errors.preferred_time && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.preferred_time}</p>
                )}
              </div>

              {/* Session Duration */}
              <div>
                <label htmlFor="session_duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Session Duration (minutes)
                </label>
                <select
                  id="session_duration"
                  name="session_duration"
                  value={data.session_duration}
                  onChange={(e) => setData('session_duration', e.target.value)}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select duration</option>
                  {sessionDurations.map((duration) => (
                    <option key={duration.value} value={duration.value.toString()}>
                      {duration.label}
                    </option>
                  ))}
                </select>
                {errors.session_duration && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.session_duration}</p>
                )}
              </div>

              {/* Difficulty Preference */}
              <div>
                <label htmlFor="difficulty_preference" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Difficulty Preference
                </label>
                <select
                  id="difficulty_preference"
                  name="difficulty_preference"
                  value={data.difficulty_preference}
                  onChange={(e) => setData('difficulty_preference', e.target.value)}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select difficulty</option>
                  {difficulties.map((difficulty) => (
                    <option key={difficulty.value} value={difficulty.value}>
                      {difficulty.label}
                    </option>
                  ))}
                </select>
                {errors.difficulty_preference && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.difficulty_preference}</p>
                )}
              </div>

              {/* Top Lifts */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Past Top Lifts
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Share your best lifts to help us track your progress and set appropriate starting weights.
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="top_squat" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Squat (lbs)
                    </label>
                    <input
                      type="number"
                      id="top_squat"
                      name="top_squat"
                      min="0"
                      max="2000"
                      value={data.top_squat}
                      onChange={(e) => setData('top_squat', e.target.value)}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="e.g., 315"
                    />
                    {errors.top_squat && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.top_squat}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="top_bench" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Bench Press (lbs)
                    </label>
                    <input
                      type="number"
                      id="top_bench"
                      name="top_bench"
                      min="0"
                      max="2000"
                      value={data.top_bench}
                      onChange={(e) => setData('top_bench', e.target.value)}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="e.g., 225"
                    />
                    {errors.top_bench && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.top_bench}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="top_deadlift" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Deadlift (lbs)
                    </label>
                    <input
                      type="number"
                      id="top_deadlift"
                      name="top_deadlift"
                      min="0"
                      max="2000"
                      value={data.top_deadlift}
                      onChange={(e) => setData('top_deadlift', e.target.value)}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="e.g., 405"
                    />
                    {errors.top_deadlift && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.top_deadlift}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={processing}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                {processing ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SettingsLayout>
  );
}