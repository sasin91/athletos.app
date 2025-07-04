<?php

namespace App\Enums;

use ArchTech\Enums\Values;

enum TrainingTime: string
{
    use Values;

    case Morning = 'morning';
    case Afternoon = 'afternoon';
    case Evening = 'evening';
    case Night = 'night';

    public function getLabel(): string
    {
        return match($this) {
            self::Morning => 'Morning',
            self::Afternoon => 'Afternoon',
            self::Evening => 'Evening',
            self::Night => 'Night',
        };
    }

    public function getDescription(): string
    {
        return match($this) {
            self::Morning => 'Before 12:00 PM',
            self::Afternoon => '12:00 PM - 5:00 PM',
            self::Evening => '5:00 PM - 9:00 PM',
            self::Night => 'After 9:00 PM',
        };
    }

    public function getTimeRange(): string
    {
        return match($this) {
            self::Morning => '6:00 AM - 12:00 PM',
            self::Afternoon => '12:00 PM - 5:00 PM',
            self::Evening => '5:00 PM - 9:00 PM',
            self::Night => '9:00 PM - 12:00 AM',
        };
    }
} 