<?php

namespace App\Enums;

use ArchTech\Enums\Values;

enum MuscleGroup: string
{
    use Values;

    case Chest = 'chest';
    case Back = 'back';
    case Shoulders = 'shoulders';
    case Arms = 'arms';
    case Triceps = 'triceps';
    case Biceps = 'biceps';
    case Legs = 'legs';
    case Quads = 'quads';
    case Hamstrings = 'hamstrings';
    case Glutes = 'glutes';
    case Calves = 'calves';
    case Core = 'core';
    case Abs = 'abs';
    case Obliques = 'obliques';
    case HipFlexors = 'hip-flexors';
    case Lats = 'lats';
    case Delts = 'delts';
    case Spine = 'spine';
    case LowBack = 'low-back';
    case TSpine = 't-spine';
    case Ankles = 'ankles';
    case Hips = 'hips';
    case ITBand = 'it-band';

    public function label(): string
    {
        return match($this) {
            self::HipFlexors => 'Hip Flexors',
            self::LowBack => 'Lower Back',
            self::TSpine => 'Thoracic Spine',
            self::ITBand => 'IT Band',
            default => ucfirst($this->value),
        };
    }

    /**
     * Minimal set for onboarding/profile selection
     */
    public static function onboardingOptions(): array
    {
        return [
            self::Chest,
            self::Back,
            self::Legs,
            self::Arms,
            self::Shoulders,
            self::Core,
            self::Glutes,
        ];
    }
} 