import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'default' | 'rounded' | 'circular';
  width?: string;
  height?: string;
  lines?: number;
}

export default function LoadingSkeleton({ 
  className, 
  variant = 'default',
  width,
  height,
  lines = 1
}: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';
  
  const variantClasses = {
    default: 'rounded',
    rounded: 'rounded-lg',
    circular: 'rounded-full'
  };

  const skeletonClasses = cn(
    baseClasses,
    variantClasses[variant],
    className
  );

  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(
              skeletonClasses,
              i === lines - 1 ? 'w-3/4' : 'w-full'
            )}
            style={{ 
              width: i === lines - 1 ? '75%' : width,
              height: height || '1rem'
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div 
      className={skeletonClasses}
      style={{ width, height }}
    />
  );
}

// Preset skeleton components for common use cases
export function CardSkeleton() {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <LoadingSkeleton className="h-6 w-1/3 mb-4" />
      <LoadingSkeleton lines={3} height="1rem" />
      <div className="flex justify-between items-center mt-4">
        <LoadingSkeleton className="h-4 w-16" />
        <LoadingSkeleton className="h-8 w-20" variant="rounded" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-gray-200 dark:border-gray-700">
      {Array.from({ length: columns }, (_, i) => (
        <td key={i} className="px-6 py-4">
          <LoadingSkeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function AvatarSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  return (
    <LoadingSkeleton 
      className={sizeClasses[size]} 
      variant="circular" 
    />
  );
}

export function ButtonSkeleton() {
  return (
    <LoadingSkeleton 
      className="h-10 w-24" 
      variant="rounded" 
    />
  );
}