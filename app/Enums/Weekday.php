<?php

declare(strict_types=1);

namespace App\Enums;

enum Weekday: string
{
    case Monday = 'monday';
    case Tuesday = 'tuesday';
    case Wednesday = 'wednesday';
    case Thursday = 'thursday';
    case Friday = 'friday';
    case Saturday = 'saturday';
    case Sunday = 'sunday';

    /**
     * Get the localized label for the weekday.
     *
     * @param string $locale 'en' or 'da'
     * @return string
     */
    public function label(string $locale = 'en'): string
    {
        $labels = [
            'en' => [
                self::Monday->value => 'Monday',
                self::Tuesday->value => 'Tuesday',
                self::Wednesday->value => 'Wednesday',
                self::Thursday->value => 'Thursday',
                self::Friday->value => 'Friday',
                self::Saturday->value => 'Saturday',
                self::Sunday->value => 'Sunday',
            ],
            'da' => [
                self::Monday->value => 'Mandag',
                self::Tuesday->value => 'Tirsdag',
                self::Wednesday->value => 'Onsdag',
                self::Thursday->value => 'Torsdag',
                self::Friday->value => 'Fredag',
                self::Saturday->value => 'Lørdag',
                self::Sunday->value => 'Søndag',
            ],
        ];
        return $labels[$locale][$this->value] ?? $this->value;
    }
} 