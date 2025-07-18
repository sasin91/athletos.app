<?php

namespace App\Enums;

enum WeightType: string
{
    case Static = 'static';
    case Percentage = 'percentage';

    /**
     * Calculate the working weight based on type.
     *
     * @param  float  $baseWeight  The base weight (e.g. 1RM or static value)
     * @param  float  $value  The value stored in ExerciseConfig (either absolute or percent)
     */
    public function calculate(float $baseWeight, float $value): float
    {
        return match ($this) {
            self::Static => $value,
            self::Percentage => $baseWeight * ($value / 100.0),
        };
    }
}
