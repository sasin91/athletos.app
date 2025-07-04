<?php

namespace App\Enums;

enum ProgressionType: string
{
    case Static = 'static';
    case Percentage = 'percentage';

    public function getLabel(): string
    {
        return match($this) {
            self::Static => 'Static Increase',
            self::Percentage => 'Percentage Increase',
        };
    }

    public function getDescription(): string
    {
        return match($this) {
            self::Static => 'Fixed weight increase (e.g., +5 lbs per week)',
            self::Percentage => 'Percentage-based increase (e.g., +2.5% per week)',
        };
    }
} 