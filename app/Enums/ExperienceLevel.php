<?php

namespace App\Enums;

use ArchTech\Enums\Values;

enum ExperienceLevel: string
{
    use Values;

    case Beginner = 'beginner';
    case Intermediate = 'intermediate';
    case Advanced = 'advanced';

    public function getLabel(): string
    {
        return match($this) {
            self::Beginner => 'Beginner',
            self::Intermediate => 'Intermediate',
            self::Advanced => 'Advanced',
        };
    }

    public function getDescription(): string
    {
        return match($this) {
            self::Beginner => 'New to strength training or returning after a long break',
            self::Intermediate => 'Consistent training for 6+ months with good form',
            self::Advanced => 'Experienced lifter with 2+ years of consistent training',
        };
    }

    public function getProgressionMultiplier(): float
    {
        return match($this) {
            self::Beginner => 1.0,
            self::Intermediate => 0.7,
            self::Advanced => 0.5,
        };
    }
} 