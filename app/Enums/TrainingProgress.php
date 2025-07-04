<?php

declare(strict_types=1);

namespace App\Enums;

enum TrainingProgress: string
{
    case NotStarted = 'not_started';
    case InProgress = 'in_progress';
    case Completed = 'completed';

    /**
     * Get the display label for the training progress.
     */
    public function getLabel(): string
    {
        return match($this) {
            self::NotStarted => 'Not Started',
            self::InProgress => 'In Progress',
            self::Completed => 'Completed',
        };
    }

    /**
     * Get the CSS classes for styling the progress badge.
     */
    public function getClasses(): string
    {
        return match($this) {
            self::NotStarted => 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
            self::InProgress => 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            self::Completed => 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        };
    }

    /**
     * Get progress from percentage value.
     */
    public static function fromPercentage(int|float $percentage): self
    {
        return match(true) {
            $percentage == 0 => self::NotStarted,
            $percentage >= 100 => self::Completed,
            default => self::InProgress,
        };
    }
} 