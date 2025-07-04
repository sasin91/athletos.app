<?php

namespace App\Models;

use App\Enums\Exercise as ExerciseEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * 
 *
 * @property int $id
 * @property int $athlete_id
 * @property ExerciseEnum $exercise
 * @property string $label
 * @property numeric $value
 * @property string|null $unit
 * @property string $type
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Athlete $athlete
 * @method static \Database\Factories\PerformanceIndicatorFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PerformanceIndicator newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PerformanceIndicator newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PerformanceIndicator query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PerformanceIndicator whereAthleteId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PerformanceIndicator whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PerformanceIndicator whereExercise($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PerformanceIndicator whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PerformanceIndicator whereLabel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PerformanceIndicator whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PerformanceIndicator whereUnit($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PerformanceIndicator whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PerformanceIndicator whereValue($value)
 * @mixin \Eloquent
 */
class PerformanceIndicator extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'performance_indicators';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'athlete_id',
        'exercise',
        'label',
        'value',
        'unit',
        'type',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'integer',
            'athlete_id' => 'integer',
            'exercise' => ExerciseEnum::class,
            'value' => 'decimal:2',
            'recorded_at' => 'datetime',
        ];
    }

    public function athlete(): BelongsTo
    {
        return $this->belongsTo(Athlete::class);
    }

    /**
     * Get the exercise enum
     */
    public function exercise(): ExerciseEnum
    {
        return $this->exercise;
    }
}
