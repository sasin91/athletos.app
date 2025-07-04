<?php

namespace App\Casts;

use App\Settings\TrainingPhaseSettings;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

class TrainingPhaseSettingsCast implements CastsAttributes
{
    /**
     * Cast the given value.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): TrainingPhaseSettings
    {
        if (is_string($value)) {
            $value = json_decode($value, true);
        }

        if (is_array($value)) {
            return TrainingPhaseSettings::fromArray($value);
        }

        return new TrainingPhaseSettings();
    }

    /**
     * Prepare the given value for storage.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): string
    {
        if ($value instanceof TrainingPhaseSettings) {
            return json_encode($value->toArray());
        }

        if (is_array($value)) {
            return json_encode($value);
        }

        return json_encode([]);
    }
} 