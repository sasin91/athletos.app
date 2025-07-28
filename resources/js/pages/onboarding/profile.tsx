import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { ChevronRightIcon, UserIcon } from '@heroicons/react/24/outline';
import { route } from '@/lib/wayfinder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
      
      <div className="relative min-h-full bg-white dark:bg-gray-900">
        {/* Background gradients */}
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
        </div>
        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]" aria-hidden="true">
          <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
        </div>

        <div className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8">
            <div className="text-center mb-8">
              <div className="mx-auto h-16 w-16 bg-gradient-to-r from-pink-100 to-violet-100 dark:from-pink-900/20 dark:to-violet-900/20 rounded-full flex items-center justify-center mb-4">
                <UserIcon className="h-8 w-8 bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent" />
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
                    <Label htmlFor="experience_level" className="block mb-2">
                      Experience Level
                    </Label>
                    <Select value={data.experience_level} onValueChange={(value) => setData('experience_level', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        {experienceLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label} - {level.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.experience_level && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.experience_level}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="primary_goal" className="block mb-2">
                      Primary Goal
                    </Label>
                    <Select value={data.primary_goal} onValueChange={(value) => setData('primary_goal', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your primary goal" />
                      </SelectTrigger>
                      <SelectContent>
                        {trainingGoals.map((goal) => (
                          <SelectItem key={goal.value} value={goal.value}>
                            {goal.label} - {goal.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.primary_goal && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.primary_goal}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="block mb-2">
                    Muscle Groups to Focus On
                  </Label>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Select the muscle groups you'd like to prioritize in your training (optional)
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {muscleGroups.map((muscleGroup) => (
                      <Label key={muscleGroup.value} className="flex items-center space-x-2">
                        <Checkbox
                          name="muscle_groups[]"
                          value={muscleGroup.value}
                          checked={data.muscle_groups.includes(muscleGroup.value)}
                          onCheckedChange={(checked) => handleMuscleGroupChange(muscleGroup.value, checked as boolean)}
                        />
                        <span className="text-sm font-medium">
                          {muscleGroup.label}
                        </span>
                      </Label>
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
                      <Label htmlFor="top_squat" className="mb-2">
                        Squat (kg)
                      </Label>
                      <Input
                        type="number"
                        id="top_squat"
                        name="top_squat"
                        min="0"
                        max="1000"
                        value={data.top_squat}
                        onChange={(e) => setData('top_squat', e.target.value)}
                        placeholder="e.g., 143"
                      />
                      {errors.top_squat && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.top_squat}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="top_bench" className="mb-2">
                        Bench Press (kg)
                      </Label>
                      <Input
                        type="number"
                        id="top_bench"
                        name="top_bench"
                        min="0"
                        max="1000"
                        value={data.top_bench}
                        onChange={(e) => setData('top_bench', e.target.value)}
                        placeholder="e.g., 102"
                      />
                      {errors.top_bench && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.top_bench}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="top_deadlift" className="mb-2">
                        Deadlift (kg)
                      </Label>
                      <Input
                        type="number"
                        id="top_deadlift"
                        name="top_deadlift"
                        min="0"
                        max="1000"
                        value={data.top_deadlift}
                        onChange={(e) => setData('top_deadlift', e.target.value)}
                        placeholder="e.g., 184"
                      />
                      {errors.top_deadlift && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.top_deadlift}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="bio" className="mb-2">
                    About Your Training
                  </Label>
                  <Textarea
                    name="bio"
                    id="bio"
                    rows={4}
                    value={data.bio}
                    onChange={(e) => setData('bio', e.target.value)}
                    placeholder="Tell us about your training background, any injuries, or specific goals..."
                  />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    This helps us customize your training plan and exercise suggestions.
                  </p>
                  {errors.bio && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.bio}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  asChild
                >
                  <a href={route.dashboard().url}>
                    Skip Setup
                  </a>
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
      </div>
    </>
  );
}