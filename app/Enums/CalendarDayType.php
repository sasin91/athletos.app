<?php

namespace App\Enums;

enum CalendarDayType: string
{
    case CurrentMonth = 'current-month';
    case OtherMonth = 'other-month';
    case Today = 'today';
    case WorkoutDay = 'workout-day';
    case TodayWithWorkout = 'today-with-workout';
    case SelectedDate = 'selected-date';

    public function getClasses(): string
    {
        return match($this) {
            self::Today => 'bg-blue-600 text-white',
            self::TodayWithWorkout => 'bg-blue-600 text-white',
            self::SelectedDate => 'bg-indigo-600 text-white ring-2 ring-indigo-300 dark:ring-indigo-700',
            self::WorkoutDay => 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            self::CurrentMonth => 'text-gray-700 dark:text-gray-300',
            self::OtherMonth => 'text-gray-400 dark:text-gray-600',
        };
    }
} 