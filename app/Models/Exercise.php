<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Enums\Exercise as ExerciseEnum;

/**
 * 
 *
 * @property int $id
 * @property int $training_id
 * @property ExerciseEnum $exercise_enum
 * @property int $set_number
 * @property int|null $reps
 * @property numeric|null $weight
 * @property numeric|null $rpe
 * @property string|null $notes
 * @property bool $skipped
 * @property string|null $skip_reason
 * @property string|null $swapped_from
 * @property string|null $swap_reason
 * @property \Carbon\CarbonImmutable|null $completed_at
 * @property \Carbon\CarbonImmutable|null $created_at
 * @property \Carbon\CarbonImmutable|null $updated_at
 * @property-read \App\Models\Training $training
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise completed()
 * @method static \Database\Factories\ExerciseFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise forExercise(\App\Enums\Exercise $exercise)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise skipped()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise whereCompletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise whereExerciseEnum($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise whereReps($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise whereRpe($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise whereSetNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise whereSkipReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise whereSkipped($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise whereSwapReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise whereSwappedFrom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise whereTrainingId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Exercise whereWeight($value)
 * @mixin \Eloquent
 */
class Exercise extends Model
{
    use HasFactory;

    protected $fillable = [
        'training_id',
        'exercise_enum',
        'set_number',
        'reps',
        'weight',
        'rpe',
        'notes',
        'skipped',
        'skip_reason',
        'swapped_from',
        'swap_reason',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'exercise_enum' => ExerciseEnum::class,
            'set_number' => 'integer',
            'reps' => 'integer',
            'weight' => 'decimal:2',
            'rpe' => 'decimal:1',
            'skipped' => 'boolean',
            'completed_at' => 'datetime',
        ];
    }

    public function training(): BelongsTo
    {
        return $this->belongsTo(Training::class);
    }

    /**
     * Scope a query to only include completed exercises.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeCompleted($query)
    {
        return $query->whereNotNull('completed_at');
    }

    /**
     * Scope a query to only include skipped exercises.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeSkipped($query)
    {
        return $query->where('skipped', true);
    }

    /**
     * Scope a query to only include exercises for a specific exercise type.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param ExerciseEnum $exercise
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeForExercise($query, ExerciseEnum $exercise)
    {
        return $query->where('exercise_enum', $exercise);
    }
} 