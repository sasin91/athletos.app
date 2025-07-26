import { Head, Link } from '@inertiajs/react';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import AppLayout from '@/Components/Layout/AppLayout';
import { route } from '@/lib/wayfinder';

interface Exercise {
  value: string;
  displayName: () => string;
}

interface Props {
  exercise: Exercise;
  exerciseData: {
    name: string;
    description: string;
  };
}

export default function Show({ exercise, exerciseData }: Props) {
  return (
    <AppLayout>
      <Head title={`${exerciseData.name} - Exercise`} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            {/* Back Button */}
            <div className="mb-6">
              <Link
                href={route.dashboard().url}
                className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ChevronLeftIcon className="w-4 h-4 mr-1" />
                Back to Dashboard
              </Link>
            </div>

            {/* Exercise Content */}
            <div className="space-y-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {exerciseData.name}
              </h1>
              
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                {exerciseData.description}
              </p>

              {/* Placeholder for future enhancements */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-blue-800 dark:text-blue-200 text-sm">
                  <strong>Coming Soon:</strong> Video demonstrations, step-by-step instructions, and form tips will be added to exercise pages.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}