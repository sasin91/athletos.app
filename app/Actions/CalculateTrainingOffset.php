<?php

namespace App\Actions;

use Carbon\Carbon;

class CalculateTrainingOffset
{
    /**
     * Parse a training offset string and determine if training should occur on a given date
     * 
     * @param string|null $offsetString The offset string (e.g., "1w", "2w", "3d")
     * @param Carbon $date The date to check
     * @param Carbon $startDate The reference start date (usually plan_start_date)
     * @return bool Whether training should occur on this date
     */
    public function shouldTrainOnDate(?string $offsetString, Carbon $date, Carbon $startDate): bool
    {
        if (!$offsetString) {
            return true; // No offset means train every week
        }

        $offset = $this->parseOffsetString($offsetString);
        if (!$offset) {
            return true; // Invalid offset, default to every week
        }

        $weeksSinceStart = $startDate->diffInWeeks($date, false);
        
        return $weeksSinceStart % $offset === 0;
    }

    /**
     * Parse an offset string into a number of weeks
     * 
     * @param string $offsetString The offset string to parse
     * @return int|null The number of weeks, or null if invalid
     */
    public function parseOffsetString(string $offsetString): ?int
    {
        $offsetString = strtolower(trim($offsetString));
        
        // Match patterns like "1w", "2w", "3w", etc.
        if (preg_match('/^(\d+)w$/', $offsetString, $matches)) {
            $weeks = (int) $matches[1];
            return $weeks > 0 ? $weeks : null;
        }
        
        // Match patterns like "1week", "2weeks", etc.
        if (preg_match('/^(\d+)week(s)?$/', $offsetString, $matches)) {
            $weeks = (int) $matches[1];
            return $weeks > 0 ? $weeks : null;
        }
        
        // Match patterns like "1d", "2d", etc. (convert days to weeks)
        if (preg_match('/^(\d+)d$/', $offsetString, $matches)) {
            $days = (int) $matches[1];
            if ($days > 0 && $days % 7 === 0) {
                return $days / 7;
            }
        }
        
        // Match patterns like "1day", "2days", etc. (convert days to weeks)
        if (preg_match('/^(\d+)day(s)?$/', $offsetString, $matches)) {
            $days = (int) $matches[1];
            if ($days > 0 && $days % 7 === 0) {
                return $days / 7;
            }
        }
        
        return null;
    }

    /**
     * Get a human-readable description of the training offset
     * 
     * @param string|null $offsetString The offset string
     * @return string Human-readable description
     */
    public function getOffsetDescription(?string $offsetString): string
    {
        if (!$offsetString) {
            return 'Every week';
        }

        $offset = $this->parseOffsetString($offsetString);
        if (!$offset) {
            return 'Invalid offset';
        }

        if ($offset === 1) {
            return 'Every week';
        }

        if ($offset === 2) {
            return 'Every other week (1 week on, 1 week off)';
        }

        return "Every {$offset} weeks";
    }

    /**
     * Get the next training week after a given date
     * 
     * @param string|null $offsetString The offset string
     * @param Carbon $date The reference date
     * @param Carbon $startDate The plan start date
     * @return Carbon|null The next training week start date
     */
    public function getNextTrainingWeek(?string $offsetString, Carbon $date, Carbon $startDate): ?Carbon
    {
        if (!$offsetString) {
            return $date->copy()->addWeek();
        }

        $offset = $this->parseOffsetString($offsetString);
        if (!$offset) {
            return $date->copy()->addWeek();
        }

        $weeksSinceStart = $startDate->diffInWeeks($date, false);
        $nextTrainingWeek = ceil(($weeksSinceStart + 1) / $offset) * $offset;
        $weeksToAdd = $nextTrainingWeek - $weeksSinceStart;

        return $date->copy()->addWeeks($weeksToAdd);
    }

    /**
     * Get the previous training week before a given date
     * 
     * @param string|null $offsetString The offset string
     * @param Carbon $date The reference date
     * @param Carbon $startDate The plan start date
     * @return Carbon|null The previous training week start date
     */
    public function getPreviousTrainingWeek(?string $offsetString, Carbon $date, Carbon $startDate): ?Carbon
    {
        if (!$offsetString) {
            return $date->copy()->subWeek();
        }

        $offset = $this->parseOffsetString($offsetString);
        if (!$offset) {
            return $date->copy()->subWeek();
        }

        $weeksSinceStart = $startDate->diffInWeeks($date, false);
        $previousTrainingWeek = floor($weeksSinceStart / $offset) * $offset;
        $weeksToSubtract = $weeksSinceStart - $previousTrainingWeek;

        return $date->copy()->subWeeks($weeksToSubtract);
    }
} 