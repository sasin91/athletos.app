import { FadeIn } from '@/components/ui/page-transition';

interface DashboardHeaderProps {
  athleteName: string;
  currentDate: Date;
  formattedDate: string;
  isToday: boolean;
  onDateChange: (direction: 'prev' | 'next' | 'today') => void;
}

export default function DashboardHeader({
  athleteName,
  currentDate,
  formattedDate,
  isToday,
  onDateChange
}: DashboardHeaderProps) {
  return (
    <FadeIn className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back, {athleteName || 'Athlete'}
          </p>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onDateChange('prev')}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ←
            </button>

            <span className="text-lg font-medium text-gray-900 dark:text-gray-100 min-w-[120px] text-center">
              {formattedDate}
            </span>

            <button
              onClick={() => onDateChange('next')}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              →
            </button>
          </div>

          {!isToday && (
            <button
              onClick={() => onDateChange('today')}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
            >
              Today
            </button>
          )}
        </div>
      </div>
    </FadeIn>
  );
}