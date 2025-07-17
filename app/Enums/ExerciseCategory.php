<?php

namespace App\Enums;

use ArchTech\Enums\Values;

enum ExerciseCategory: string
{
    use Values;

    case Strength = 'strength';
    case Mobility = 'mobility';
    case Yoga = 'yoga';
    case Cardio = 'cardio';
    case Recovery = 'recovery';
    case Hypertrophy = 'hypertrophy';
    case Endurance = 'endurance';
}