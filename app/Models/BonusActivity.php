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
 * @property \Illuminate\Support\Carbon $scheduled_at
 * @property int $scheduled_by
 * @property int|null $completed_at
 * @property string|null $notes
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Athlete $athlete
 * @property-read \App\Models\User|null $scheduledBy
 * @property-read \App\Models\User|null $user
 * @method static \Database\Factories\BonusActivityFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BonusActivity newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BonusActivity newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BonusActivity query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BonusActivity whereAthleteId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BonusActivity whereCompletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BonusActivity whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BonusActivity whereExercise($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BonusActivity whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BonusActivity whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BonusActivity whereScheduledAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BonusActivity whereScheduledBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BonusActivity whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class BonusActivity extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'athlete_id',
        'exercise',
        'scheduled_at',
        'scheduled_by',
        'completed_at',
        'notes',
        'user_id',
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
            'scheduled_at' => 'date',
            'scheduled_by' => 'integer',
            'completed_at' => 'timestamp',
            'user_id' => 'integer',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scheduledBy(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
