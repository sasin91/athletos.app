import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { ChevronRightIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { route } from '@/lib/wayfinder';
import { Button } from '@/components/ui/button';
import OnboardingLayout from '@/components/onboarding-layout';

interface TrainingPlan {
  id: number;
  name: string;
  description: string;
  phases?: any[];
}

type PlanData = {
  selected_plan_id: string;
};

interface Props {
  user: any;
  athlete: any;
  onboarding: any;
  trainingPlans: TrainingPlan[];
}

export default function Plan({ user, athlete, onboarding, trainingPlans }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  
  const { data, setData, post, processing, errors } = useForm<PlanData>({
    selected_plan_id: '',
  });

  const handlePlanSelection = (plan: TrainingPlan) => {
    setSelectedPlan(plan);
    setData('selected_plan_id', plan.id.toString());
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.selected_plan_id) {
      return;
    }
    post(route['onboarding.plan.store']().url);
  };

  return (
    <>
      <Head title="Choose Training Plan - Athletos" />
      
      <OnboardingLayout title="Choose Your Training Plan">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl rounded-lg p-8 border border-gray-200/20 dark:border-gray-700/20">
            <div className="text-center mb-8">
              <div className="mx-auto h-16 w-16 bg-gradient-to-r from-pink-100 to-violet-100 dark:from-pink-900/20 dark:to-violet-900/20 rounded-full flex items-center justify-center mb-4">
                <ClipboardDocumentListIcon className="h-8 w-8 text-pink-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Choose Your Training Plan</h2>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                Select a training program that matches your goals and experience level
              </p>
            </div>

            <form onSubmit={submit}>
              <div className="space-y-4 mb-8">
                {trainingPlans.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-400">
                      No suitable training plans found for your profile. Please contact support.
                    </p>
                  </div>
                ) : (
                  trainingPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all ${
                        selectedPlan?.id === plan.id
                          ? 'border-pink-500 bg-gradient-to-r from-pink-50 to-violet-50 dark:from-pink-900/20 dark:to-violet-900/20 shadow-md'
                          : 'border-gray-200 dark:border-gray-600 hover:border-pink-300 dark:hover:border-pink-500 hover:shadow-md'
                      }`}
                      onClick={() => handlePlanSelection(plan)}
                    >
                      <div className="flex items-start">
                        <div className="flex h-5 items-center">
                          <input
                            type="radio"
                            name="selected_plan_id"
                            value={plan.id}
                            checked={selectedPlan?.id === plan.id}
                            onChange={() => handlePlanSelection(plan)}
                            className="h-4 w-4 border-gray-300 text-pink-600 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                              {plan.name}
                            </h3>
                          </div>
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {plan.description}
                          </p>
                          {plan.phases && plan.phases.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Phases: {plan.phases.length}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {errors.selected_plan_id && (
                <p className="mb-4 text-sm text-red-600 dark:text-red-400">{errors.selected_plan_id}</p>
              )}

              <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  asChild
                >
                  <a href={route['onboarding.profile']().url}>
                    Back
                  </a>
                </Button>
                <Button
                  type="submit"
                  disabled={processing || !selectedPlan}
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