<?php

namespace App\Models;

use App\Data\PlannedExercise;
use App\Enums\Exercise;
use App\Enums\ExperienceLevel;
use App\Enums\TrainingGoal;
use App\Enums\ProgressionType;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * 
 *
 * @property int $id
 * @property string $name
 * @property string $description
 * @property TrainingGoal $goal
 * @property \Illuminate\Database\Eloquent\Collection<int, \App\Models\TrainingPhase> $phases
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property ExperienceLevel|null $experience_level
 * @property ProgressionType $default_progression_type
 * @property numeric $default_progression_rate
 * @property numeric|null $easy_progression_rate
 * @property numeric|null $medium_progression_rate
 * @property numeric|null $hard_progression_rate
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Athlete> $athletes
 * @property-read int|null $athletes_count
 * @property-read mixed $default_progression_settings
 * @property-read mixed $is_advanced_only
 * @property-read mixed $is_beginner_friendly
 * @property-read int|null $phases_count
 * @property-read mixed $progression_rates
 * @property-read mixed $synonym
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Training> $trainings
 * @property-read int|null $trainings_count
 * @property-read mixed $settings
 * @method static \Database\Factories\TrainingPlanFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan whereDefaultProgressionRate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan whereDefaultProgressionType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan whereEasyProgressionRate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan whereExperienceLevel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan whereGoal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan whereHardProgressionRate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan whereMediumProgressionRate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan wherePhases($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan withTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TrainingPlan withoutTrashed()
 * @method mixed getExerciseProgressionSettings()
 * @property-read mixed $planned_exercises
 * @mixin \Eloquent
 */
class TrainingPlan extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name',
        'description',
        'goal',
        'experience_level',
        'default_progression_type',
        'default_progression_rate',
        'easy_progression_rate',
        'medium_progression_rate',
        'hard_progression_rate',
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
            'experience_level' => ExperienceLevel::class,
            'goal' => TrainingGoal::class,
            'default_progression_type' => ProgressionType::class,
            'default_progression_rate' => 'decimal:2',
            'easy_progression_rate' => 'decimal:2',
            'medium_progression_rate' => 'decimal:2',
            'hard_progression_rate' => 'decimal:2',
        ];
    }

    public function trainings(): HasMany
    {
        return $this->hasMany(Training::class);
    }

    public function athletes(): HasMany
    {
        return $this->hasMany(Athlete::class);
    }

    public function phases(): HasMany
    {
        return $this->hasMany(TrainingPhase::class)->orderBy('order');
    }

    /**
     * Override to prioritize the relationship over the JSON column
     */
    public function getAttribute($key)
    {
        if ($key === 'phases') {
            // If relationship is already loaded, return it
            if ($this->relationLoaded('phases')) {
                return $this->getRelation('phases');
            }
            // Otherwise, load and return the relationship
            return $this->phases()->get();
        }

        return parent::getAttribute($key);
    }

    /**
     * Get the synonym attribute (short version of training plan name)
     */
    public function synonym(): Attribute
    {
        return Attribute::get(function () {
            $name = strtolower($this->name);

            // Common training plan synonyms
            $synonyms = [
                'hypertrophy' => 'HT',
                'strength' => 'STR',
                'power' => 'PWR',
                'endurance' => 'END',
                'cardio' => 'CARD',
                'recovery' => 'REC',
                'mobility' => 'MOB',
                'flexibility' => 'FLEX',
                'chest' => 'CH',
                'back' => 'BK',
                'legs' => 'LG',
                'shoulders' => 'SH',
                'arms' => 'ARM',
                'core' => 'CR',
                'full body' => 'FB',
                'upper body' => 'UB',
                'lower body' => 'LB',
                'push' => 'PUSH',
                'pull' => 'PULL',
            ];

            foreach ($synonyms as $keyword => $abbreviation) {
                if (str_contains($name, $keyword)) {
                    return $abbreviation;
                }
            }

            // Fallback: return first letter of each word
            return strtoupper(implode('', array_map(fn($word) => substr($word, 0, 1), explode(' ', $this->name))));
        });
    }

    /**
     * Get the default progression settings attribute
     */
    public function defaultProgressionSettings(): Attribute
    {
        return Attribute::get(function () {
            return [
                'type' => $this->default_progression_type,
                'rate' => $this->default_progression_rate,
            ];
        });
    }

    /**
     * Get the progression rates attribute
     */
    public function progressionRates(): Attribute
    {
        return Attribute::get(function () {
            return [
                'easy' => $this->easy_progression_rate,
                'medium' => $this->medium_progression_rate,
                'hard' => $this->hard_progression_rate,
                'default' => $this->default_progression_rate,
            ];
        });
    }

    /**
     * Get the is beginner friendly attribute
     */
    public function isBeginnerFriendly(): Attribute
    {
        return Attribute::get(function () {
            return $this->experience_level === ExperienceLevel::Beginner;
        });
    }

    /**
     * Get the is advanced only attribute
     */
    public function isAdvancedOnly(): Attribute
    {
        return Attribute::get(function () {
            return $this->experience_level === ExperienceLevel::Advanced;
        });
    }

    /**
     * Get exercise configuration from plan phases for a specific exercise
     */
    public function getExerciseConfig(Exercise $exercise): ?\App\Settings\ExerciseConfig
    {
        $phases = $this->phases()->get();

        foreach ($phases as $phase) {
            $config = $phase->settings->getExerciseConfig($exercise);
            if ($config) {
                return $config;
            }
        }

        return null;
    }

    /**
     * Get progression settings for a specific phase and exercise
     */
    public function getProgressionSettings(int $phaseIndex, Exercise $exercise): array
    {
        $defaultSettings = [
            'type' => $this->default_progression_type,
            'rate' => $this->default_progression_rate,
        ];

        // Get the specific phase
        $phases = $this->phases()->get();
        $phase = $phases->get($phaseIndex);
        if ($phase) {
            $progressionSettings = $phase->getExerciseProgressionSettings($exercise);
            return [
                'type' => $progressionSettings['type'],
                'rate' => $progressionSettings['rate'],
            ];
        }

        return $defaultSettings;
    }

    /**
     * Get progression rate for a specific difficulty level
     */
    public function progressionRateForDifficulty(string $difficulty): ?float
    {
        return match ($difficulty) {
            'easy' => $this->easy_progression_rate,
            'medium' => $this->medium_progression_rate,
            'hard' => $this->hard_progression_rate,
            default => $this->default_progression_rate,
        };
    }

    /**
     * Check if this plan is suitable for the given athlete
     */
    public function isSuitableForAthlete(Athlete $athlete): bool
    {
        // Check experience level compatibility
        if ($this->experience_level && $athlete->experience_level) {
            $experienceCompatibility = match ($this->experience_level) {
                ExperienceLevel::Beginner => true, // Beginner plans work for everyone
                ExperienceLevel::Intermediate => in_array($athlete->experience_level, [ExperienceLevel::Intermediate, ExperienceLevel::Advanced]),
                ExperienceLevel::Advanced => $athlete->experience_level === ExperienceLevel::Advanced,
            };

            if (!$experienceCompatibility) {
                return false;
            }
        }

        // Check goal compatibility
        if ($this->goal && $athlete->primary_goal) {
            // Some goals are compatible with each other
            $goalCompatibility = match ($this->goal) {
                TrainingGoal::Strength => in_array($athlete->primary_goal, [TrainingGoal::Strength, TrainingGoal::Power]),
                TrainingGoal::Hypertrophy => in_array($athlete->primary_goal, [TrainingGoal::Hypertrophy, TrainingGoal::GeneralFitness]),
                TrainingGoal::Power => in_array($athlete->primary_goal, [TrainingGoal::Power, TrainingGoal::Strength]),
                TrainingGoal::Endurance => in_array($athlete->primary_goal, [TrainingGoal::Endurance, TrainingGoal::GeneralFitness]),
                TrainingGoal::GeneralFitness => true, // General fitness plans work for most goals
                TrainingGoal::WeightLoss => in_array($athlete->primary_goal, [TrainingGoal::WeightLoss, TrainingGoal::GeneralFitness]),
            };

            if (!$goalCompatibility) {
                return false;
            }
        }

        // Check muscle group compatibility if athlete has specified preferences
        if ($athlete->muscle_groups && !empty($athlete->muscle_groups)) {
            $planMuscleGroups = $this->getPlanMuscleGroups();
            $athleteMuscleGroups = $athlete->muscle_groups;

            // Check if there's any overlap between athlete's preferred muscle groups and plan's muscle groups
            $overlap = array_intersect($athleteMuscleGroups, $planMuscleGroups);

            // If no overlap, the plan might not be suitable for the athlete's muscle group preferences
            if (empty($overlap)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get muscle groups targeted by this training plan
     */
    public function getPlanMuscleGroups(): array
    {
        $muscleGroups = [];

        foreach ($this->phases as $phase) {
            /** @var array<int, \App\Settings\ExerciseConfig> $exercises */
            $exercises = $phase->settings?->exercises ?? [];

            foreach ($exercises as $exerciseData) {
                if (!isset($exerciseData->exercise) && !isset($exerciseData->exercise_slug) && !isset($exerciseData->exercise_id)) {
                    continue;
                }

                $exercise = Exercise::from($exerciseData->exercise);

                $exerciseMuscleGroups = $exercise->tags();
                $muscleGroups = array_merge($muscleGroups, $exerciseMuscleGroups);
            }
        }

        // Remove duplicates and return unique muscle groups
        return array_unique($muscleGroups);
    }

    /**
     * Get planned exercises for this training plan
     */
    public function plannedExercises(): Attribute
    {
        return Attribute::get(function () {
            return $this->getPlannedExercises();
        });
    }

    /**
     * Get planned exercises for a specific day
     */
    public function getPlannedExercises(?int $day = null): \Illuminate\Support\Collection
    {
        return $this->phases
            ->map(fn(TrainingPhase $phase) => $phase->getPlannedExercises($day))
            ->flatten();
    }

    /**
     * Get the settings attribute
     */
    public function getSettingsAttribute()
    {
        return $this->progression_settings ?? [];
    }

    /**
     * Get exercise progression settings
     */
    public function getExerciseProgressionSettings()
    {
        return $this->settings;
    }

    /**
     * Get schedule compatibility information for this plan and athlete
     */
    public function getScheduleCompatibility(Athlete $athlete): array
    {
        $athleteTrainingDays = count($athlete->training_days ?? []);
        $totalOriginalWeeks = $this->phases->sum('duration_weeks');

        // Calculate expected training days for this plan
        $expectedTrainingDays = 0;
        foreach ($this->phases as $phase) {
            $exercises = $phase->settings?->exercises ?? [];
            $phaseDays = $this->calculateExpectedTrainingDays($exercises);
            $expectedTrainingDays = max($expectedTrainingDays, $phaseDays);
        }

        $compatibility = [
            'athlete_training_days' => $athleteTrainingDays,
            'expected_training_days' => $expectedTrainingDays,
            'compatible' => $athleteTrainingDays >= $expectedTrainingDays,
            'original_weeks' => $totalOriginalWeeks,
        ];

        if (!$compatibility['compatible']) {
            // Calculate adapted duration
            $adaptedWeeks = ceil(($expectedTrainingDays * $totalOriginalWeeks) / $athleteTrainingDays);
            $compatibility['adapted_weeks'] = $adaptedWeeks;
            $compatibility['weeks_difference'] = $adaptedWeeks - $totalOriginalWeeks;
            $compatibility['performance_warning'] = "⚠️ Note: Spreading training phases over additional weeks may yield less optimal results compared to the original program design. Consider increasing your training frequency if possible for better outcomes.";
        }

        return $compatibility;
    }

    /**
     * Calculate expected training days for a set of exercises
     */
    private function calculateExpectedTrainingDays(array $exercises): int
    {
        // Group exercises by muscle groups to determine training days
        $days = [];

        foreach ($exercises as $exercise) {
            $muscleGroups = $this->getMuscleGroupsForExercise($exercise['exercise']);
            $dayKey = $this->determineTrainingDay($muscleGroups);
            $days[$dayKey] = true;
        }

        return count($days);
    }

    /**
     * Get muscle groups for an exercise
     */
    private function getMuscleGroupsForExercise(string $exerciseSlug): array
    {
        // Use the Exercise enum's tags() method to get muscle groups
        $exercise = Exercise::tryFromSlug($exerciseSlug);
        return $exercise ? $exercise->tags() : ['general'];
    }

    /**
     * Determine training day based on muscle groups
     */
    private function determineTrainingDay(array $muscleGroups): string
    {
        if (in_array('chest', $muscleGroups) || in_array('triceps', $muscleGroups)) {
            return 'push';
        }

        if (in_array('back', $muscleGroups) || in_array('lats', $muscleGroups) || in_array('biceps', $muscleGroups)) {
            return 'pull';
        }

        if (in_array('quads', $muscleGroups) || in_array('glutes', $muscleGroups) || in_array('hamstrings', $muscleGroups)) {
            return 'legs';
        }

        if (in_array('shoulders', $muscleGroups)) {
            return 'shoulders';
        }

        if (in_array('recovery', $muscleGroups)) {
            return 'recovery';
        }

        return 'general';
    }
}
