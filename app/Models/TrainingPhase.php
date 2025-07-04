<?php

namespace App\Models;

use App\Enums\Exercise;
use App\Enums\ProgressionType;
use App\Casts\TrainingPhaseSettingsCast;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * 
 *
 * @property int $id
 * @property int $training_plan_id
 * @property string $name
 * @property string|null $description
 * @property int $duration_weeks
 * @property int $order
 * @property ProgressionType|null $progression_type
 * @property numeric|null $progression_rate
 * @property \App\Settings\TrainingPhaseSettings|null $settings
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Data\PlannedExercise> $plannedExercises
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read \App\Models\TrainingPlan $trainingPlan
 * @method static \Database\Factories\TrainingPhaseFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPhase newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPhase newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPhase onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPhase query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPhase whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPhase whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPhase whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPhase whereDurationWeeks($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPhase whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPhase whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPhase whereOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPhase whereProgressionRate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPhase whereProgressionType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPhase whereSettings($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPhase whereTrainingPlanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPhase whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPhase withTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPhase withoutTrashed()
 * @mixin \Eloquent
 */
class TrainingPhase extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'training_plan_id',
        'name',
        'description',
        'duration_weeks',
        'order',
        'progression_type',
        'progression_rate',
        'settings',
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
            'training_plan_id' => 'integer',
            'duration_weeks' => 'integer',
            'order' => 'integer',
            'progression_type' => ProgressionType::class,
            'progression_rate' => 'decimal:2',
            'settings' => TrainingPhaseSettingsCast::class,
        ];
    }

    public function trainingPlan(): BelongsTo
    {
        return $this->belongsTo(TrainingPlan::class);
    }

    /**
     * Get progression settings for a specific exercise (now uses Exercise enum)
     */
    public function getExerciseProgressionSettings(Exercise $exercise): array
    {
        // Get progression settings from the exercise enum
        $progressionSettings = $exercise->progressionSettings();
        
        // Override with phase-specific settings if available
        if ($this->progression_type && $this->progression_rate) {
            return [
                'type' => $this->progression_type,
                'rate' => (float) $this->progression_rate,
                'difficulty_multiplier' => $progressionSettings['difficulty_multiplier'],
            ];
        }
        
        return $progressionSettings;
    }
} 