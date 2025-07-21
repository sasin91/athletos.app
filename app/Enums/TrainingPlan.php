<?php

namespace App\Enums;

use App\TrainingPlan\PeriodizedHypertrophy;
use App\TrainingPlan\Powerlifting;

enum TrainingPlan: string
{
    case HYPERTROPHY = 'hypertrophy';
    case POWERLIFTING = 'powerlifting';

    /**
     * Get the human-readable name of the training plan
     */
    public function getName(): string
    {
        return match ($this) {
            self::HYPERTROPHY => 'Periodized Hypertrophy',
            self::POWERLIFTING => 'Powerlifting',
        };
    }

    /**
     * Get the description of the training plan
     */
    public function getDescription(): string
    {
        return match ($this) {
            self::HYPERTROPHY => 'A progressive muscle-building program focused on hypertrophy through periodized volume and intensity.',
            self::POWERLIFTING => 'A strength-focused program targeting the three powerlifting movements: squat, bench press, and deadlift.',
        };
    }

    /**
     * Get the training plan implementation class
     */
    public function getImplementation(): PeriodizedHypertrophy|Powerlifting
    {
        return match ($this) {
            self::HYPERTROPHY => new PeriodizedHypertrophy(),
            self::POWERLIFTING => new Powerlifting(),
        };
    }

    /**
     * Get the phases for this training plan
     */
    public function getPhases(): array
    {
        return $this->getImplementation()->getPhases();
    }

    /**
     * Check if this plan is suitable for the given athlete
     */
    public function isSuitableForAthlete(\App\Models\Athlete $athlete): bool
    {
        return match ($this) {
            self::HYPERTROPHY => in_array($athlete->primary_goal, ['muscle_gain', 'general_fitness']),
            self::POWERLIFTING => in_array($athlete->primary_goal, ['strength', 'powerlifting']),
        };
    }

    /**
     * Get all available training plans
     */
    public static function all(): array
    {
        return self::cases();
    }

    /**
     * Get the values for validation rules
     */
    public static function values(): array
    {
        return array_map(fn($case) => $case->value, self::cases());
    }

    /**
     * Get validation rule string for Laravel validation
     */
    public static function validationRule(): string
    {
        return 'in:' . implode(',', self::values());
    }
}