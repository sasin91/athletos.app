<?php

namespace App\Data;

use App\Enums\CalendarDayType;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class CalendarDay
{
    public function __construct(
        public Carbon $date,
        public CalendarDayType $dayType,
        public Collection $trainings,
        public bool $isCurrentMonth,
        public bool $isSelected,
        public bool $isToday,
        public bool $isPast,
        public bool $isFuture,
        public string $trainingIntensity,
        public bool $isStreak,
        public ?string $currentPhase = null,
    ) {
        $this->currentPhase = $this->trainings->first()?->trainingPhase->name ?? '';
    }

    public function hasTrainings(): bool
    {
        return $this->trainings->isNotEmpty();
    }

    public function getFirstTraining()
    {
        return $this->trainings->first();
    }

    public function isCompleted(): bool
    {
        return $this->hasTrainings() && $this->getFirstTraining()?->id;
    }

    public function getStatusBadgeClasses(): string
    {
        if ($this->isCompleted()) {
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        }

        if (!$this->isToday) {
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        }

        return '';
    }

    public function getStatusIcon(): string
    {
        if ($this->isCompleted()) {
            return '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />';
        }

        return '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />';
    }

    public function getStatusText(): string
    {
        if ($this->isCompleted()) {
            return 'Completed';
        }

        if (!$this->isToday) {
            return 'Planned';
        }

        return 'Scheduled';
    }

    public function getTrainingAction(): array
    {
        if ($this->isPast) {
            if ($this->isCompleted()) {
                return [
                    'text' => 'View',
                    'url' => route('trainings.show', $this->getFirstTraining()),
                    'classes' => 'text-xs text-blue-600 dark:text-blue-400 hover:underline'
                ];
            }
            return [
                'text' => 'Skipped',
                'url' => null,
                'classes' => 'text-xs text-gray-400 dark:text-gray-500'
            ];
        }

        if ($this->isToday) {
            if ($this->isCompleted()) {
                return [
                    'text' => 'Continue',
                    'url' => route('trainings.show', $this->getFirstTraining()),
                    'classes' => 'text-xs text-blue-600 dark:text-blue-400 hover:underline'
                ];
            }
            return [
                'text' => 'Start',
                'url' => route('trainings.create'),
                'classes' => 'text-xs text-green-600 dark:text-green-400 hover:underline'
            ];
        }

        return [
            'text' => 'Scheduled',
            'url' => null,
            'classes' => 'text-xs text-gray-400 dark:text-gray-500'
        ];
    }

    public function getDayClasses(): string
    {
        $classes = "relative px-3 py-2 w-full text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 {$this->dayType->getClasses()}";

        if ($this->trainingIntensity === 'intense') {
            $classes .= ' ring-2 ring-red-200 dark:ring-red-800';
        } elseif ($this->trainingIntensity === 'moderate') {
            $classes .= ' ring-1 ring-orange-200 dark:ring-orange-800';
        }

        if ($this->isPast) {
            $classes .= ' opacity-60';
        } elseif ($this->isFuture) {
            $classes .= ' opacity-40';
        }

        return $classes;
    }

    public function getTimeClasses(): string
    {
        return ($this->dayType === CalendarDayType::Today || 
                $this->dayType === CalendarDayType::TodayWithWorkout || 
                $this->dayType === CalendarDayType::SelectedDate) 
            ? 'flex h-6 w-6 items-center justify-center rounded-full font-semibold' 
            : '';
    }
} 