import { ReactNode } from 'react';
import { Calendar, Target, Dumbbell, TrendingUp, Users, FileText } from 'lucide-react';

interface EmptyStateProps {
  icon?: 'calendar' | 'target' | 'dumbbell' | 'chart' | 'users' | 'document' | ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
}

export default function EmptyState({ 
  icon = 'document', 
  title, 
  description, 
  action,
  className = ''
}: EmptyStateProps) {
  const icons = {
    calendar: Calendar,
    target: Target,
    dumbbell: Dumbbell,
    chart: TrendingUp,
    users: Users,
    document: FileText,
  };

  const IconComponent = typeof icon === 'string' ? icons[icon] : null;

  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="mx-auto flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
        {IconComponent ? (
          <IconComponent className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        ) : (
          icon
        )}
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
        {description}
      </p>
      
      {action && (
        <button
          onClick={action.onClick}
          className={`
            inline-flex items-center px-4 py-2 rounded-md font-medium transition-colors
            ${action.variant === 'secondary' 
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600' 
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }
          `}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Preset empty states for common scenarios
export function NoTrainingData() {
  return (
    <EmptyState
      icon="dumbbell"
      title="No training data yet"
      description="Start your fitness journey by logging your first workout. Your progress will appear here as you train."
      action={{
        label: "Start Training",
        onClick: () => {/* Handle start training */}
      }}
    />
  );
}

export function NoProgressData() {
  return (
    <EmptyState
      icon="chart"
      title="No progress data available"
      description="Complete more workouts to see your strength and progress trends over time."
    />
  );
}

export function NoUpcomingWorkouts({ onCreateWorkout }: { onCreateWorkout?: () => void }) {
  return (
    <EmptyState
      icon="calendar"
      title="No upcoming workouts"
      description="You're all caught up! Schedule your next training session to continue your progress."
      action={onCreateWorkout ? {
        label: "Schedule Workout",
        onClick: onCreateWorkout
      } : undefined}
    />
  );
}

export function NoSearchResults({ searchTerm }: { searchTerm: string }) {
  return (
    <EmptyState
      icon="document"
      title="No results found"
      description={`We couldn't find anything matching "${searchTerm}". Try adjusting your search terms.`}
    />
  );
}