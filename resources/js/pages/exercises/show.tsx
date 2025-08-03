import { Head, Link } from '@inertiajs/react';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import AppLayout from '@/layouts/app-layout';

interface Exercise {
  value: string;
  displayName: string;
  description: string;
  category: string;
  difficulty: string;
  tags: string[];
  cues: string[];
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
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {exercise.displayName}
                </h1>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm rounded-md capitalize">
                    {exercise.category}
                  </span>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm rounded-md capitalize">
                    {exercise.difficulty}
                  </span>
                </div>
              </div>

              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                {exercise.description}
              </p>

              {/* Tags */}
              {exercise.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Targeted Areas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {exercise.tags.map((tag) => (
                      <span 
                        key={tag}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-md capitalize"
                      >
                        {tag.replace('-', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Exercise Cues */}
              {exercise.cues.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Form & Technique Tips
                  </h3>
                  <ul className="space-y-2">
                    {exercise.cues.map((cue, index) => (
                      <li key={index} className="flex items-start">
                        <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></span>
                        <span className="text-gray-600 dark:text-gray-400">{cue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Language-based description fallback */}
              {exerciseData.description && exerciseData.description !== exercise.description && (
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Additional Notes
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {exerciseData.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}