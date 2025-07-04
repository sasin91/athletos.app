<?php

namespace App\Enums;

use ArchTech\Enums\Values;

enum ExerciseDifficulty: string
{
    use Values;

    case Beginner = 'beginner';
    case Intermediate = 'intermediate';
    case Advanced = 'advanced';

    public function label(): string
    {
        return ucfirst($this->value);
    }
} 