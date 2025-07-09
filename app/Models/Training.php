<?php

namespace App\Models;

use App\Actions\ComputePlannedExercises;
use App\Actions\SuggestRecoveryExercises;
use App\Policies\TrainingPolicy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Casts\Attribute;
use App\Enums\ExerciseCategory;

/**
 * 
 *
 * @property int $id
 * @property int $athlete_id
 * @property int $training_plan_id
 * @property \Illuminate\Support\Carbon $scheduled_at
 * @property bool $postponed
 * @property string|null $reschedule_reason
 * @property string|null $mood
 * @property int|null $energy_level
 * @property int|null $completed_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property string|null $notes
 * @property-read \App\Models\Athlete $athlete
 * @property-read mixed $current_phase
 * @property-read mixed $is_completed
 * @property-read mixed $progress
 * @property-read mixed $recovery_suggestions
 * @property-read \App\Models\TrainingPlan $trainingPlan
 * @property-read \App\Models\TrainingPhase $trainingPhase
 * @method static \Database\Factories\TrainingFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training whereAthleteId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training whereCompletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training whereEnergyLevel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training whereMood($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training wherePostponed($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training whereRescheduleReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training whereScheduledAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training whereTrainingPlanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training withTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training withoutTrashed()
 * @method \Illuminate\Database\Eloquent\Relations\HasMany exercises()
 * @method \Illuminate\Database\Eloquent\Relations\HasMany|\App\Models\Exercise exercises()
 * @property int $training_phase_id
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Exercise> $exercises
 * @property-read int|null $exercises_count
 * @property-read mixed $planned_exercises
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Training whereTrainingPhaseId($value)
 * @mixin \Eloquent
 */
class Training extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Get the policy for the model.
     */
    protected static function policy(): string
    {
        return TrainingPolicy::class;
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'athlete_id',
        'training_plan_id',
        'training_phase_id',
        'scheduled_at',
        'postponed',
        'reschedule_reason',
        'mood',
        'energy_level',
        'completed_at',
        'notes',
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
            'training_plan_id' => 'integer',
            'scheduled_at' => 'datetime',
            'postponed' => 'boolean',
            'completed_at' => 'datetime',
        ];
    }

    public function athlete(): BelongsTo
    {
        return $this->belongsTo(Athlete::class);
    }

    public function trainingPlan(): BelongsTo
    {
        return $this->belongsTo(TrainingPlan::class);
    }

    /**
     * Get exercises for this training
     */
    public function exercises(): HasMany
    {
        return $this->hasMany(Exercise::class);
    }

    public function trainingPhase(): BelongsTo
    {
        return $this->belongsTo(TrainingPhase::class);
    }

    
    public function plannedExercises(): Attribute
    {
        return Attribute::get(
            function () {
                return $this->getPlannedExercises();
            }
        );
    }

    /**
     * Get planned exercises for a specific day
     */
    public function getPlannedExercises(?int $day = null): \Illuminate\Support\Collection
    {
        return app(ComputePlannedExercises::class)->execute($this, $day);
    }

    /**
     * Get the completion progress percentage
     */
    public function progress(): Attribute
    {
        return Attribute::get(function () {
            try {
                $plannedExercises = $this->plannedExercises;
                
                if (empty($plannedExercises)) {
                    return 0;
                }
                
                $completedCount = 0;
                
                foreach ($plannedExercises as $exercise) {
                    $completedSets = $this->exercises()
                        ->forExercise($exercise->exercise)
                        ->completed()
                        ->count();
                    $plannedSets = $exercise->sets;
                    
                    if ($completedSets >= $plannedSets) {
                        $completedCount++;
                    }
                }
                
                return ($completedCount / count($plannedExercises)) * 100;
            } catch (\Exception $e) {
                return 0;
            }
        });
    }

    /**
     * Check if the training is completed
     */
    public function isCompleted(): Attribute
    {
        return Attribute::get(function () {
            return !is_null($this->completed_at);
        });
    }

    /**
     * Get recovery suggestions based on the exercises performed in the training
     */
    public function recoverySuggestions(): Attribute
    {
        return Attribute::get(function () {
            return app(SuggestRecoveryExercises::class)->execute($this);
        });
    }
}
