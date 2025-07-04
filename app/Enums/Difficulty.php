<?php

namespace App\Enums;

use ArchTech\Enums\Values;

enum Difficulty: string
{
    use Values;

    case Moderate = 'moderate';
    case Challenging = 'challenging';
    case Intense = 'intense';

    public function getLabel(): string
    {
        return match($this) {
            self::Moderate => 'Moderate',
            self::Challenging => 'Challenging',
            self::Intense => 'Intense',
        };
    }

    public function getDescription(): string
    {
        return match($this) {
            self::Moderate => 'Conservative progression, focus on form and consistency',
            self::Challenging => 'Balanced progression, moderate challenge',
            self::Intense => 'Aggressive progression, maximum challenge',
        };
    }

    public function getMultiplier(): float
    {
        return match($this) {
            self::Moderate => 0.7,
            self::Challenging => 1.0,
            self::Intense => 1.3,
        };
    }
} 