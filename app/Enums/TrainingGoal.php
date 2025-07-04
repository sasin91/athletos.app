<?php

namespace App\Enums;

use ArchTech\Enums\Values;

enum TrainingGoal: string
{
    use Values;

    case Strength = 'strength';
    case Hypertrophy = 'hypertrophy';
    case Power = 'power';
    case Endurance = 'endurance';
    case GeneralFitness = 'general_fitness';
    case WeightLoss = 'weight_loss';

    public function getLabel(): string
    {
        return match($this) {
            self::Strength => 'Strength',
            self::Hypertrophy => 'Muscle Building',
            self::Power => 'Power',
            self::Endurance => 'Endurance',
            self::GeneralFitness => 'General Fitness',
            self::WeightLoss => 'Weight Loss',
        };
    }

    public function getDescription(): string
    {
        return match($this) {
            self::Strength => 'Focus on increasing maximum weight lifted',
            self::Hypertrophy => 'Focus on muscle growth and size',
            self::Power => 'Focus on explosive movements and speed',
            self::Endurance => 'Focus on muscular endurance and stamina',
            self::GeneralFitness => 'Balanced approach to overall fitness',
            self::WeightLoss => 'Focus on fat loss and body composition',
        };
    }
} 