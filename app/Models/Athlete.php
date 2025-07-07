<?php

namespace App\Models;

use App\Enums\TrainingTime;
use App\Enums\Difficulty;
use App\Enums\ExperienceLevel;
use App\Enums\TrainingGoal;
use App\Models\PerformanceIndicator;
use App\Actions\CalculateTrainingOffset;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Casts\Attribute;

/**
 * 
 *
 * @property int $id
 * @property int $user_id
 * @property int|null $current_plan_id
 * @property int|null $training_plan_id
 * @property array<array-key, mixed>|null $training_days
 * @property ExperienceLevel $experience_level
 * @property TrainingGoal $primary_goal
 * @property string|null $bio
 * @property TrainingTime $preferred_time
 * @property int $session_duration
 * @property array<array-key, mixed>|null $notification_preferences
 * @property Difficulty $difficulty_preference
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\BonusActivity> $bonusActivities
 * @property-read int|null $bonus_activities_count
 * @property-read \App\Models\TrainingPlan|null $currentPlan
 * @property-read \Illuminate\Database\Eloquent\Collection<int, PerformanceIndicator> $performanceIndicators
 * @property-read int|null $performance_indicators_count
 * @property-read mixed $progression_rate
 * @property-read \App\Models\Training|null $training
 * @property-read \App\Models\TrainingPlan|null $trainingPlan
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Training> $trainings
 * @property-read int|null $trainings_count
 * @property-read \App\Models\User $user
 * @method static \Database\Factories\AthleteFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete whereBio($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete whereCurrentPlanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete whereDifficultyPreference($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete whereExperienceLevel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete whereNotificationPreferences($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete wherePreferredTime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete wherePrimaryGoal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete whereSessionDuration($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete whereTrainingDays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete whereTrainingPlanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete withTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete withoutTrashed()
 * @property \Carbon\CarbonImmutable|null $plan_start_date
 * @property array<array-key, mixed>|null $muscle_groups
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete whereMuscleGroups($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Athlete wherePlanStartDate($value)
 * @mixin \Eloquent
 */
class Athlete extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'user_id',
        'current_plan_id',
        'training_days',
        'training_frequency',
        'training_plan_id',
        'experience_level',
        'primary_goal',
        'bio',
        'muscle_groups',
        'preferred_time',
        'session_duration',
        'notification_preferences',
        'difficulty_preference',
        'plan_start_date',
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
            'user_id' => 'integer',
            'current_plan_id' => 'integer',
            'training_days' => 'array',
            'training_plan_id' => 'integer',
            'session_duration' => 'integer',
            'notification_preferences' => 'array',
            'muscle_groups' => 'array',
            'experience_level' => ExperienceLevel::class,
            'primary_goal' => TrainingGoal::class,
            'preferred_time' => TrainingTime::class,
            'difficulty_preference' => Difficulty::class,
            'plan_start_date' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function trainingPlan(): BelongsTo
    {
        return $this->belongsTo(TrainingPlan::class);
    }

    public function currentPlan(): BelongsTo
    {
        return $this->belongsTo(TrainingPlan::class, 'current_plan_id');
    }

    public function trainings(): HasMany
    {
        return $this->hasMany(Training::class);
    }

    public function training(): HasOne
    {
        return $this->hasOne(Training::class)->latestOfMany();
    }

    public function bonusActivities(): HasMany
    {
        return $this->hasMany(BonusActivity::class);
    }

    public function performanceIndicators(): HasMany
    {
        return $this->hasMany(PerformanceIndicator::class);
    }

    /**
     * Get the default progression rate based on difficulty preference and experience level
     */
    public function progressionRate(): Attribute
    {
        return Attribute::get(function () {
            // Default base rate of 2.5 (standard progression rate)
            $baseRate = 2.5;
            return $baseRate * $this->difficulty_preference->getMultiplier() * $this->experience_level->getProgressionMultiplier();
        });
    }

    /**
     * Get the progression rate based on difficulty preference
     * @deprecated Use progressionRate attribute instead
     */
    public function getProgressionRate(float $baseRate): float
    {
        return $baseRate * $this->difficulty_preference->getMultiplier() * $this->experience_level->getProgressionMultiplier();
    }

    /**
     * Check if training should occur on a given date based on training offset
     */
    public function shouldTrainOnDate(Carbon $date): bool
    {
        $startDate = $this->plan_start_date ? \Carbon\Carbon::instance($this->plan_start_date) : Carbon::now();
        return app(CalculateTrainingOffset::class)->shouldTrainOnDate($this->training_frequency, $date, $startDate);
    }

    /**
     * Get the human-readable description of the training offset
     */
    public function getTrainingOffsetDescription(): string
    {
        return app(CalculateTrainingOffset::class)->getOffsetDescription($this->training_frequency);
    }

    /**
     * Get the next training week after a given date
     */
    public function getNextTrainingWeek(Carbon $date): ?Carbon
    {
        $startDate = $this->plan_start_date ? \Carbon\Carbon::instance($this->plan_start_date) : Carbon::now();
        return app(CalculateTrainingOffset::class)->getNextTrainingWeek($this->training_frequency, $date, $startDate);
    }

    /**
     * Get the previous training week before a given date
     */
    public function getPreviousTrainingWeek(Carbon $date): ?Carbon
    {
        $startDate = $this->plan_start_date ? \Carbon\Carbon::instance($this->plan_start_date) : Carbon::now();
        return app(CalculateTrainingOffset::class)->getPreviousTrainingWeek($this->training_frequency, $date, $startDate);
    }
}
