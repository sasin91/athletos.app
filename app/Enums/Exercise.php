<?php

namespace App\Enums;

use ArchTech\Enums\Values;

enum Exercise: string
{
    use Values;

    // Strength Exercises - Main Lifts
    case BarbellBackSquat = 'barbell-back-squat';
    case BenchPress = 'bench-press';
    case Deadlift = 'deadlift';
    case StandingCalfRaise = 'standing-calf-raise';

    // Bodybuilding Exercises - Chest
    case InclineDumbbellPress = 'incline-dumbbell-press';
    case DeclineDumbbellPress = 'decline-dumbbell-press';
    case FlatBarbellBenchPress = 'flat-barbell-bench-press';
    case CableChestFly = 'cable-chest-fly';

    // Bodybuilding Exercises - Back
    case LatPulldown = 'lat-pulldown';
    case OneArmDumbbellRow = 'one-arm-dumbbell-row';
    case SeatedCableRow = 'seated-cable-row';
    case RomanianDeadlift = 'romanian-deadlift';

    // Bodybuilding Exercises - Shoulders
    case SideLateralRaises = 'side-lateral-raises';

    // Bodybuilding Exercises - Arms
    case DumbbellCurls = 'dumbbell-curls';

    // Bodybuilding Exercises - Legs
    case LegExtensions = 'leg-extensions';
    case SeatedHamstringCurls = 'seated-hamstring-curls';
    case LegPress = 'leg-press';
    case DumbbellLunges = 'dumbbell-lunges';

    // Mobility Exercises
    case BretzelStretch = 'bretzel-stretch';
    case GluteBridge = 'glute-bridge';
    case Plank = 'plank';
    case BirdDog = 'bird-dog';
    case LungeStretch = 'lunge-stretch';

    // Recovery Exercises
    case ChildsPose = 'childs-pose';
    case SeatedForwardFold = 'seated-forward-fold';
    case CobraStretch = 'cobra-stretch';

    // Yoga Exercises
    case DownwardDog = 'downward-dog';
    case PigeonPose = 'pigeon-pose';
    case CatCowStretch = 'cat-cow-stretch';
    case BridgePose = 'bridge-pose';
    case ButterflyPose = 'butterfly-pose';
    case FrogPose = 'frog-pose';
    case HangingStretch = 'hanging-stretch';
    case LizardPose = 'lizard-pose';
    case SphinxPose = 'sphinx-pose';
    case SupineTwist = 'supine-twist';
    case WarriorPose = 'warrior-pose';

    /**
     * Get the display name for the exercise
     */
    public function displayName(): string
    {
        return match($this) {
            self::BarbellBackSquat => 'Barbell Back Squat',
            self::BenchPress => 'Bench Press',
            self::Deadlift => 'Deadlift',
            self::StandingCalfRaise => 'Standing Calf Raise',
            self::InclineDumbbellPress => '45° Incline Dumbbell Press',
            self::DeclineDumbbellPress => 'Decline Dumbbell Press',
            self::FlatBarbellBenchPress => 'Flat Barbell Bench Press',
            self::CableChestFly => 'Low to Mid Cable Chest Fly',
            self::LatPulldown => 'Lat Pulldown',
            self::OneArmDumbbellRow => '1-Arm Dumbbell Row',
            self::SeatedCableRow => 'Seated Cable Row',
            self::RomanianDeadlift => 'Romanian Deadlift',
            self::SideLateralRaises => 'Side Lateral Raises',
            self::DumbbellCurls => 'Dumbbell Curls',
            self::LegExtensions => 'Leg Extensions',
            self::SeatedHamstringCurls => 'Seated Hamstring Curls',
            self::LegPress => 'Leg Press',
            self::DumbbellLunges => 'Dumbbell Lunges',
            self::BretzelStretch => 'Bretzel Stretch',
            self::GluteBridge => 'Glute Bridge',
            self::Plank => 'Plank',
            self::BirdDog => 'Bird Dog',
            self::LungeStretch => 'Lunge Stretch',
            self::ChildsPose => 'Child\'s Pose',
            self::SeatedForwardFold => 'Seated Forward Fold',
            self::CobraStretch => 'Cobra Stretch',
            self::DownwardDog => 'Downward Dog',
            self::PigeonPose => 'Pigeon Pose',
            self::CatCowStretch => 'Cat-Cow Stretch',
            self::BridgePose => 'Bridge Pose',
            self::ButterflyPose => 'Butterfly Pose',
            self::FrogPose => 'Frog Pose',
            self::HangingStretch => 'Hanging Stretch',
            self::LizardPose => 'Lizard Pose',
            self::SphinxPose => 'Sphinx Pose',
            self::SupineTwist => 'Supine Twist',
            self::WarriorPose => 'Warrior Pose',
        };
    }

    /**
     * Get the exercise category
     */
    public function category(): ExerciseCategory
    {
        return match($this) {
            self::BretzelStretch, self::GluteBridge, self::Plank, self::BirdDog, self::LungeStretch => ExerciseCategory::Mobility,
            self::ChildsPose, self::SeatedForwardFold, self::CobraStretch => ExerciseCategory::Recovery,
            self::DownwardDog, self::PigeonPose, self::CatCowStretch, self::BridgePose, 
            self::ButterflyPose, self::FrogPose, self::HangingStretch, self::LizardPose, 
            self::SphinxPose, self::SupineTwist, self::WarriorPose => ExerciseCategory::Yoga,
            default => ExerciseCategory::Strength,
        };
    }

    /**
     * Get the exercise difficulty
     */
    public function difficulty(): ExerciseDifficulty
    {
        return match($this) {
            self::BarbellBackSquat, self::BenchPress, self::InclineDumbbellPress, 
            self::DeclineDumbbellPress, self::FlatBarbellBenchPress, self::RomanianDeadlift,
            self::LegPress, self::DumbbellLunges => ExerciseDifficulty::Intermediate,
            self::Deadlift => ExerciseDifficulty::Advanced,
            self::CableChestFly, self::LatPulldown, self::OneArmDumbbellRow, self::SeatedCableRow,
            self::SideLateralRaises, self::DumbbellCurls, self::LegExtensions, self::SeatedHamstringCurls,
            self::StandingCalfRaise, self::GluteBridge, self::Plank, self::BirdDog, 
            self::LungeStretch, self::ChildsPose, self::SeatedForwardFold, self::CobraStretch,
            self::DownwardDog, self::BridgePose, self::ButterflyPose, self::FrogPose,
            self::HangingStretch, self::LizardPose, self::SphinxPose, self::SupineTwist,
            self::WarriorPose, self::CableChestFly => ExerciseDifficulty::Beginner,
            self::BretzelStretch, self::PigeonPose, self::CatCowStretch => ExerciseDifficulty::Intermediate,
        };
    }

    /**
     * Get all exercise tags
     * 
     * @return array<string, string>
     */
    public function tags(): array
    {
        return match($this) {
            self::BarbellBackSquat => ['quads', 'glutes', 'hamstrings', 'core'],
            self::BenchPress => ['chest', 'triceps', 'shoulders'],
            self::Deadlift => ['hamstrings', 'glutes', 'back', 'core'],
            self::StandingCalfRaise => ['calves', 'ankles', 'balance'],
            self::InclineDumbbellPress => ['chest', 'triceps', 'shoulders', 'upper-chest'],
            self::DeclineDumbbellPress => ['chest', 'triceps', 'lower-chest'],
            self::FlatBarbellBenchPress => ['chest', 'triceps', 'shoulders'],
            self::CableChestFly => ['chest', 'isolation', 'cable'],
            self::LatPulldown => ['back', 'lats', 'biceps', 'cable'],
            self::OneArmDumbbellRow => ['back', 'lats', 'biceps', 'unilateral'],
            self::SeatedCableRow => ['back', 'lats', 'biceps', 'cable'],
            self::RomanianDeadlift => ['hamstrings', 'glutes', 'back'],
            self::SideLateralRaises => ['shoulders', 'deltoids', 'isolation'],
            self::DumbbellCurls => ['biceps', 'arms', 'isolation'],
            self::LegExtensions => ['quads', 'isolation', 'machine'],
            self::SeatedHamstringCurls => ['hamstrings', 'isolation', 'machine'],
            self::LegPress => ['quads', 'glutes', 'hamstrings', 'machine'],
            self::DumbbellLunges => ['quads', 'glutes', 'hamstrings', 'unilateral'],
            self::BretzelStretch => ['quads', 't-spine', 'hip-flexors'],
            self::GluteBridge => ['glutes', 'hamstrings', 'activation'],
            self::Plank => ['core', 'shoulders', 'stability'],
            self::BirdDog => ['core', 'balance', 'back'],
            self::LungeStretch => ['hip-flexors', 'quads', 'mobility'],
            self::ChildsPose => ['spine', 'shoulders', 'restorative'],
            self::SeatedForwardFold => ['hamstrings', 'low-back', 'cooldown'],
            self::CobraStretch => ['spine', 'abs', 'post-deadlift'],
            self::DownwardDog => ['hamstrings', 'calves', 'shoulders', 'post-deadlift'],
            self::PigeonPose => ['glutes', 'hips', 'mobility', 'post-squat'],
            self::CatCowStretch => ['spine', 'warm-up', 'post-deadlift', 'chest', 'shoulders'],
            self::BridgePose => ['glutes', 'back', 'chest'],
            self::ButterflyPose => ['hips', 'groin', 'inner-thighs'],
            self::FrogPose => ['hips', 'groin', 'inner-thighs'],
            self::HangingStretch => ['spine', 'shoulders', 'decompression'],
            self::LizardPose => ['hips', 'hip-flexors', 'quads'],
            self::SphinxPose => ['spine', 'chest', 'shoulders'],
            self::SupineTwist => ['spine', 'obliques', 'hips'],
            self::WarriorPose => ['legs', 'hips', 'balance'],
        };
    }

    /**
     * Check if this exercise is used for 1RM tracking
     */
    public function isOneRepMaxExercise(): bool
    {
        return in_array($this, [
            self::BarbellBackSquat,
            self::BenchPress,
            self::Deadlift,
        ]);
    }

    /**
     * Get the display name for 1RM tracking
     */
    public function oneRepMaxDisplayName(): string
    {
        return match($this) {
            self::BarbellBackSquat => 'Barbell Back Squat',
            self::BenchPress => 'Bench Press',
            self::Deadlift => 'Deadlift',
            default => $this->displayName(),
        };
    }

    /**
     * Get the key for 1RM storage
     */
    public function oneRepMaxKey(): string
    {
        return strtolower(str_replace([' ', '-'], '', $this->oneRepMaxDisplayName()));
    }

    /**
     * Get all main compound lifts for 1RM tracking
     * 
     * @return array<int, self>
     */
    public static function mainLifts(): array
    {
        return [
            self::BarbellBackSquat,
            self::BenchPress,
            self::Deadlift,
        ];
    }

    /**
     * Get all recovery exercises
     * 
     * @return array<Exercise>
     */
    public static function recovery(): array
    {
        return array_filter(self::cases(), fn($exercise) => 
            in_array($exercise->category(), [ExerciseCategory::Recovery, ExerciseCategory::Yoga, ExerciseCategory::Mobility])
        );
    }

    /**
     * Get exercise enum by slug (for backward compatibility)
     * @throws \InvalidArgumentException if slug is not found
     */
    public static function fromSlug(string $slug): self
    {
        foreach (self::cases() as $exercise) {
            if ($exercise->value === $slug) {
                return $exercise;
            }
        }
        
        throw new \InvalidArgumentException("Exercise with slug '{$slug}' not found");
    }

    /**
     * Try to get exercise enum by slug (safe version)
     */
    public static function tryFromSlug(string $slug): ?self
    {
        try {
            return self::fromSlug($slug);
        } catch (\InvalidArgumentException) {
            return null;
        }
    }

    /**
     * Get the description for the exercise
     */
    public function description(): string
    {
        return match($this) {
            // Main Lifts
            self::BarbellBackSquat => 'Compound lower body movement for overall strength',
            self::BenchPress => 'Compound upper body push movement',
            self::Deadlift => 'Compound posterior chain movement',
            self::StandingCalfRaise => 'Gentle calf stretch and activation',
            
            // Bodybuilding Exercises
            self::InclineDumbbellPress => 'Upper chest development with dumbbells',
            self::DeclineDumbbellPress => 'Lower chest development with dumbbells',
            self::FlatBarbellBenchPress => 'Flat bench barbell press for chest development',
            self::CableChestFly => 'Isolation chest exercise with cable resistance',
            self::LatPulldown => 'Back width development with cable machine',
            self::OneArmDumbbellRow => 'Unilateral back exercise for muscle balance',
            self::SeatedCableRow => 'Seated back row with cable machine',
            self::RomanianDeadlift => 'Posterior chain focus with controlled movement',
            self::SideLateralRaises => 'Shoulder isolation for lateral deltoids',
            self::DumbbellCurls => 'Bicep isolation exercise',
            self::LegExtensions => 'Quad isolation with machine',
            self::SeatedHamstringCurls => 'Hamstring isolation with machine',
            self::LegPress => 'Compound leg movement with machine',
            self::DumbbellLunges => 'Unilateral leg exercise for balance',
            
            // Recovery and Mobility
            self::DownwardDog => 'Gentle stretch for hamstrings and shoulders',
            self::ChildsPose => 'Relaxing stretch for back and hips',
            self::CobraStretch => 'Back extension to counter forward movements',
            self::CatCowStretch => 'Gentle spinal mobility',
            self::SupineTwist => 'Spinal rotation and hip mobility',
            self::PigeonPose => 'Deep hip opener',
            self::ButterflyPose => 'Gentle inner thigh and hip stretch',
            self::SeatedForwardFold => 'Hamstring and back stretch',
            self::WarriorPose => 'Gentle standing stretch',
            self::BridgePose => 'Gentle backbend and hip opener',
            self::LizardPose => 'Deep hip flexor stretch',
            self::FrogPose => 'Deep hip opener',
            self::HangingStretch => 'Spinal decompression',
            self::LungeStretch => 'Hip flexor and quad stretch',
            self::BretzelStretch => 'Deep hip and spinal rotation',
            self::BirdDog => 'Core stability and balance',
            self::Plank => 'Core stability',
            self::GluteBridge => 'Gentle glute activation',
            self::SphinxPose => 'Gentle back extension',
            default => 'Strength training exercise',
        };
    }

    /**
     * Get the recovery intensity for the exercise
     */
    public function intensity(): ?int
    {
        return match($this) {
            self::DownwardDog, self::ChildsPose, self::CatCowStretch => 1,
            self::CobraStretch, self::SupineTwist, self::ButterflyPose => 2,
            self::SeatedForwardFold, self::WarriorPose, self::BridgePose => 3,
            self::PigeonPose, self::LizardPose, self::FrogPose => 4,
            self::HangingStretch, self::LungeStretch, self::BretzelStretch => 5,
            self::BirdDog, self::Plank, self::GluteBridge => 6,
            self::StandingCalfRaise, self::SphinxPose => 2,
            default => null,
        };
    }

    /**
     * Get alternative exercises for this exercise
     * 
     * @return array<int, array<string, mixed>>
     */
    public function alternatives(): array
    {
        return match($this) {
            self::BarbellBackSquat => [
                [
                    'exercise' => self::GluteBridge,
                    'conditions' => 'Lower back fatigue or knee issues',
                    'benefits' => 'Reduces spinal loading while maintaining glute activation',
                    'tags' => ['bodyweight', 'glutes', 'activation'],
                ],
            ],
            self::BenchPress => [
                [
                    'exercise' => self::Plank,
                    'conditions' => 'Shoulder discomfort or no bench available',
                    'benefits' => 'Core stability and upper body endurance',
                    'tags' => ['bodyweight', 'core', 'stability'],
                ],
            ],
            self::Deadlift => [
                [
                    'exercise' => self::GluteBridge,
                    'conditions' => 'Lower back issues or fatigue',
                    'benefits' => 'Isolates glutes with minimal spinal loading',
                    'tags' => ['bodyweight', 'glutes', 'activation'],
                ],
                [
                    'exercise' => self::BirdDog,
                    'conditions' => 'Core weakness or lower back pain',
                    'benefits' => 'Core stability and coordination',
                    'tags' => ['bodyweight', 'core', 'balance'],
                ],
            ],
            default => [],
        };
    }

    /**
     * Get progression settings for this exercise
     * 
     * @return array<string, mixed>
     */
    public function progressionSettings(): array
    {
        return match($this) {
            // Main Lifts - Higher progression rates
            self::BarbellBackSquat => [
                'type' => ProgressionType::Static,
                'rate' => 5.0,
                'difficulty_multiplier' => 1.0,
            ],
            self::BenchPress => [
                'type' => ProgressionType::Static,
                'rate' => 2.5,
                'difficulty_multiplier' => 1.0,
            ],
            self::Deadlift => [
                'type' => ProgressionType::Static,
                'rate' => 5.0,
                'difficulty_multiplier' => 1.0,
            ],
            
            // Bodybuilding Exercises - Moderate progression rates
            self::InclineDumbbellPress, self::DeclineDumbbellPress, self::FlatBarbellBenchPress => [
                'type' => ProgressionType::Static,
                'rate' => 2.5,
                'difficulty_multiplier' => 1.0,
            ],
            self::LatPulldown, self::OneArmDumbbellRow, self::SeatedCableRow => [
                'type' => ProgressionType::Static,
                'rate' => 2.0,
                'difficulty_multiplier' => 1.0,
            ],
            self::RomanianDeadlift => [
                'type' => ProgressionType::Static,
                'rate' => 3.0,
                'difficulty_multiplier' => 1.0,
            ],
            self::SideLateralRaises, self::DumbbellCurls => [
                'type' => ProgressionType::Static,
                'rate' => 1.5,
                'difficulty_multiplier' => 1.0,
            ],
            self::LegExtensions, self::SeatedHamstringCurls => [
                'type' => ProgressionType::Static,
                'rate' => 2.0,
                'difficulty_multiplier' => 1.0,
            ],
            self::LegPress => [
                'type' => ProgressionType::Static,
                'rate' => 5.0,
                'difficulty_multiplier' => 1.0,
            ],
            self::DumbbellLunges => [
                'type' => ProgressionType::Static,
                'rate' => 2.0,
                'difficulty_multiplier' => 1.0,
            ],
            self::CableChestFly => [
                'type' => ProgressionType::Static,
                'rate' => 1.5,
                'difficulty_multiplier' => 1.0,
            ],
            
            // Recovery and Mobility - Lower progression rates
            self::Plank => [
                'type' => ProgressionType::Percentage,
                'rate' => 10.0, // 10% time increase
                'difficulty_multiplier' => 0.5, // Easier progression
            ],
            self::GluteBridge => [
                'type' => ProgressionType::Static,
                'rate' => 1.0,
                'difficulty_multiplier' => 0.5,
            ],
            self::StandingCalfRaise => [
                'type' => ProgressionType::Static,
                'rate' => 1.0,
                'difficulty_multiplier' => 0.5,
            ],
            default => [
                'type' => ProgressionType::Static,
                'rate' => 2.5,
                'difficulty_multiplier' => 1.0,
            ],
        };
    }

    /**
     * In the AthletOS domain, some exercises are considered synonyms for tracking (e.g., Flat Barbell Bench Press and Barbell Bench Press).
     * This method returns the canonical synonym for 1RM and progression lookup.
     */
    public function synonym(): self
    {
        return match($this) {
            // Bench press synonyms
            self::FlatBarbellBenchPress, self::BenchPress => self::BenchPress,
            // Squat synonyms (if present)
            // self::BarbellSquat, self::Squat => self::BarbellBackSquat,
            self::BarbellBackSquat => self::BarbellBackSquat,
            // Deadlift has no synonym
            default => $this,
        };
    }

    /**
     * Get default ramping percentages for this exercise based on sets count
     * Returns exercise-specific ramping patterns
     * 
     * @param int $sets Number of sets
     * @return array<int, float> Ramping percentages for each set
     */
    public function rampingPercentages(int $sets): array
    {
        return match($this) {
            // Main Compound Lifts - Conservative ramping for safety
            self::BarbellBackSquat => match($sets) {
                1 => [1.00],
                2 => [0.85, 1.00],
                3 => [0.75, 0.85, 1.00],
                4 => [0.60, 0.70, 0.80, 1.00],
                5 => [0.55, 0.65, 0.75, 0.85, 1.00],
                default => $this->generateLinearRamping($sets, 0.50),
            },
            
            self::BenchPress, self::FlatBarbellBenchPress => match($sets) {
                1 => [1.00],
                2 => [0.85, 1.00],
                3 => [0.80, 0.90, 1.00],
                4 => [0.70, 0.80, 0.90, 1.00],
                5 => [0.60, 0.70, 0.80, 0.90, 1.00],
                default => $this->generateLinearRamping($sets, 0.55),
            },
            
            self::Deadlift => match($sets) {
                1 => [1.00],
                2 => [0.90, 1.00],
                3 => [0.80, 0.90, 1.00],
                4 => [0.70, 0.80, 0.90, 1.00],
                5 => [0.65, 0.75, 0.85, 0.95, 1.00],
                default => $this->generateLinearRamping($sets, 0.60),
            },
            
            // Upper Body Isolation - Moderate ramping
            self::InclineDumbbellPress, self::DeclineDumbbellPress => match($sets) {
                1 => [1.00],
                2 => [0.80, 1.00],
                3 => [0.75, 0.85, 1.00],
                4 => [0.70, 0.80, 0.90, 1.00],
                5 => [0.65, 0.75, 0.85, 0.95, 1.00],
                default => $this->generateLinearRamping($sets, 0.60),
            },
            
            self::DumbbellCurls, self::SideLateralRaises => match($sets) {
                1 => [1.00],
                2 => [0.85, 1.00],
                3 => [0.80, 0.90, 1.00],
                4 => [0.75, 0.85, 0.95, 1.00],
                5 => [0.70, 0.80, 0.90, 0.95, 1.00],
                default => $this->generateLinearRamping($sets, 0.65),
            },
            
            // Cable Exercises - Smooth progression
            self::CableChestFly, self::LatPulldown, self::SeatedCableRow => match($sets) {
                1 => [1.00],
                2 => [0.85, 1.00],
                3 => [0.80, 0.90, 1.00],
                4 => [0.75, 0.85, 0.95, 1.00],
                5 => [0.70, 0.80, 0.90, 0.95, 1.00],
                default => $this->generateLinearRamping($sets, 0.65),
            },
            
            // Machine Exercises - Moderate ramping
            self::LegExtensions, self::SeatedHamstringCurls, self::LegPress => match($sets) {
                1 => [1.00],
                2 => [0.80, 1.00],
                3 => [0.75, 0.90, 1.00],
                4 => [0.70, 0.80, 0.90, 1.00],
                5 => [0.65, 0.75, 0.85, 0.95, 1.00],
                default => $this->generateLinearRamping($sets, 0.60),
            },
            
            // Unilateral Exercises - Progressive ramping
            self::OneArmDumbbellRow, self::DumbbellLunges => match($sets) {
                1 => [1.00],
                2 => [0.85, 1.00],
                3 => [0.80, 0.90, 1.00],
                4 => [0.75, 0.85, 0.95, 1.00],
                5 => [0.70, 0.80, 0.90, 0.95, 1.00],
                default => $this->generateLinearRamping($sets, 0.65),
            },
            
            // Accessory Movements - Moderate ramping
            self::RomanianDeadlift => match($sets) {
                1 => [1.00],
                2 => [0.80, 1.00],
                3 => [0.75, 0.85, 1.00],
                4 => [0.70, 0.80, 0.90, 1.00],
                5 => [0.65, 0.75, 0.85, 0.95, 1.00],
                default => $this->generateLinearRamping($sets, 0.60),
            },
            
            // Bodyweight/Activation - Consistent intensity
            self::GluteBridge, self::Plank, self::BirdDog => array_fill(0, $sets, 1.00),
            
            // Mobility/Yoga - Consistent intensity  
            self::BretzelStretch, self::LungeStretch, self::ChildsPose, self::SeatedForwardFold,
            self::CobraStretch, self::DownwardDog, self::PigeonPose, self::CatCowStretch,
            self::BridgePose, self::ButterflyPose, self::FrogPose, self::HangingStretch,
            self::LizardPose, self::SphinxPose, self::SupineTwist, self::WarriorPose => array_fill(0, $sets, 1.00),
            
            // Calves - Light ramping
            self::StandingCalfRaise => match($sets) {
                1 => [1.00],
                2 => [0.90, 1.00],
                3 => [0.85, 0.95, 1.00],
                4 => [0.80, 0.90, 0.95, 1.00],
                5 => [0.75, 0.85, 0.90, 0.95, 1.00],
                default => $this->generateLinearRamping($sets, 0.70),
            },
            
            // Default pattern for any missed exercises
            default => match($sets) {
                1 => [1.00],
                2 => [0.85, 1.00], 
                3 => [0.80, 0.90, 1.00],
                4 => [0.70, 0.80, 0.90, 1.00],
                5 => [0.60, 0.70, 0.80, 0.90, 1.00],
                default => $this->generateLinearRamping($sets, 0.50),
            },
        };
    }

    /**
     * Get exercise cues and technique tips
     * 
     * @return array<string> List of technique cues and tips
     */
    public function cues(): array
    {
        return match($this) {
            // Main Compound Lifts
            self::BarbellBackSquat => [
                'Keep weight balanced across mid-foot throughout movement',
                'Maintain neutral spine - chest up, core engaged',
                'Control descent - slow and steady down',
                'Drive through floor on ascent with full foot contact',
                'Keep knees tracking over toes, not caving inward',
                'Full depth - hip crease below knee cap if mobility allows',
            ],
            
            self::BenchPress, self::FlatBarbellBenchPress => [
                'Retract shoulder blades and maintain throughout lift',
                'Keep feet firmly planted on floor for stability',
                'Control bar descent to chest with 2-second pause',
                'Explosive press up while maintaining shoulder position',
                'Keep wrists straight and elbows at 45-degree angle',
                'Full range of motion - touch chest to full lockout',
            ],
            
            self::Deadlift => [
                'Start with bar over mid-foot, close to shins',
                'Hinge at hips first, then bend knees to reach bar',
                'Maintain neutral spine throughout entire movement',
                'Drive through heels and engage glutes on ascent',
                'Keep bar close to body - drag it up your legs',
                'Finish with full hip extension, shoulders over bar',
            ],
            
            // Upper Body Isolation
            self::InclineDumbbellPress => [
                'Set bench to 30-45 degree angle for optimal chest activation',
                'Control weight through full range of motion',
                'Focus on squeezing chest muscles at top',
                'Keep core engaged and back flat against bench',
                'Lower weights with control, feel chest stretch',
            ],
            
            self::DeclineDumbbellPress => [
                'Secure feet in foot rests for safety',
                'Focus on lower chest muscle activation',
                'Control negative portion of movement',
                'Squeeze chest muscles at top of movement',
                'Maintain stable shoulder blade position',
            ],
            
            self::LatPulldown => [
                'Pull with back muscles, not just arms',
                'Lean back slightly and pull to upper chest',
                'Squeeze shoulder blades together at bottom',
                'Control the weight on the way up',
                'Keep chest up and core engaged throughout',
            ],
            
            self::OneArmDumbbellRow => [
                'Support body with opposite hand and knee on bench',
                'Keep torso parallel to floor, core engaged',
                'Pull elbow back and up, driving with back muscles',
                'Squeeze shoulder blade at top of movement',
                'Control weight down with muscle tension',
            ],
            
            self::SeatedCableRow => [
                'Sit tall with chest up and shoulders back',
                'Pull cable to lower chest/upper abdomen',
                'Squeeze shoulder blades together at end',
                'Keep elbows close to body during pull',
                'Control the return with muscle tension',
            ],
            
            self::DumbbellCurls => [
                'Keep elbows stationary at your sides',
                'Control weight up and down - no swinging',
                'Squeeze biceps at top of movement',
                'Full range of motion - stretch to contraction',
                'Keep wrists straight and core engaged',
            ],
            
            self::SideLateralRaises => [
                'Start with arms at sides, slight bend in elbows',
                'Raise arms out to sides until parallel to floor',
                'Lead with pinkies, thumbs slightly down',
                'Control weight down slowly for muscle tension',
                'Keep torso upright, avoid using momentum',
            ],
            
            // Lower Body
            self::RomanianDeadlift => [
                'Start standing tall with slight knee bend',
                'Hinge at hips, push hips back behind you',
                'Keep bar close to legs throughout movement',
                'Feel stretch in hamstrings at bottom',
                'Drive hips forward to return to standing',
            ],
            
            self::LegExtensions => [
                'Sit back fully in seat with back supported',
                'Control weight up and squeeze quads at top',
                'Lower weight slowly with muscle control',
                'Keep core engaged and avoid arching back',
                'Full range of motion for maximum muscle activation',
            ],
            
            self::SeatedHamstringCurls => [
                'Sit with back against pad, legs positioned correctly',
                'Curl heels toward glutes with controlled motion',
                'Squeeze hamstrings at bottom of movement',
                'Control weight back up with muscle tension',
                'Keep core engaged throughout movement',
            ],
            
            self::LegPress => [
                'Position feet shoulder-width apart on platform',
                'Lower weight with control until knees reach 90 degrees',
                'Drive through whole foot to press weight up',
                'Keep core engaged and back against pad',
                'Full range of motion for maximum muscle activation',
            ],
            
            self::DumbbellLunges => [
                'Step forward into lunge position with control',
                'Lower back knee toward ground with control',
                'Keep front knee over ankle, not past toes',
                'Drive through front heel to return to start',
                'Maintain upright torso throughout movement',
            ],
            
            // Cable Exercises
            self::CableChestFly => [
                'Set cables at shoulder height or slightly above',
                'Start with arms wide, slight bend in elbows',
                'Squeeze chest muscles to bring arms together',
                'Feel stretch in chest at starting position',
                'Control return to starting position',
            ],
            
            // Mobility and Recovery
            self::GluteBridge => [
                'Lie on back with knees bent, feet flat on floor',
                'Squeeze glutes and lift hips up off ground',
                'Create straight line from knees to shoulders',
                'Hold position briefly and squeeze glutes',
                'Lower with control and repeat',
            ],
            
            self::Plank => [
                'Support body on forearms and toes',
                'Keep body in straight line from head to heels',
                'Engage core muscles and breathe normally',
                'Keep hips level - don\'t let them sag or pike',
                'Hold position with good form over duration',
            ],
            
            self::BirdDog => [
                'Start on hands and knees, core engaged',
                'Extend opposite arm and leg simultaneously',
                'Keep hips level and core stable',
                'Hold position briefly with control',
                'Return to start and switch sides',
            ],
            
            // Stretching and Yoga
            self::ChildsPose => [
                'Kneel on floor and sit back on heels',
                'Reach arms forward and lower chest toward floor',
                'Relax and breathe deeply into the stretch',
                'Hold position and focus on lengthening spine',
                'Feel gentle stretch through back and shoulders',
            ],
            
            self::DownwardDog => [
                'Start on hands and knees, tuck toes under',
                'Lift hips up and back to create inverted V',
                'Keep hands shoulder-width apart, fingers spread',
                'Pedal feet to warm up calves and hamstrings',
                'Breathe deeply and hold position',
            ],
            
            self::CobraStretch => [
                'Lie face down with palms flat under shoulders',
                'Press through hands to lift chest off ground',
                'Keep hips on ground and shoulders away from ears',
                'Feel gentle stretch through front of body',
                'Breathe deeply and hold position',
            ],
            
            self::PigeonPose => [
                'Bring front leg into 90-degree angle',
                'Extend back leg straight behind you',
                'Square hips toward front of mat',
                'Breathe deeply into hip stretch',
                'Hold position and switch sides',
            ],
            
            self::CatCowStretch => [
                'Start on hands and knees in neutral position',
                'Arch back and lift chest for cow position',
                'Round spine and tuck chin for cat position',
                'Move slowly between positions with breath',
                'Feel stretch through entire spine',
            ],
            
            // Default for any exercises not specifically covered
            default => [
                'Maintain proper form throughout the movement',
                'Focus on controlled movement patterns',
                'Breathe consistently during execution',
                'Listen to your body and adjust as needed',
            ],
        };
    }

    /**
     * Generate linear ramping from start percentage to 100%
     * 
     * @param int $sets Total number of sets
     * @param float $startPercentage Starting percentage (0.0 to 1.0)
     * @return array<int, float> Progressive percentages
     */
    private function generateLinearRamping(int $sets, float $startPercentage): array
    {
        if ($sets <= 1) {
            return [1.00];
        }
        
        $percentages = [];
        for ($set = 1; $set <= $sets; $set++) {
            $percentage = $startPercentage + ((1.0 - $startPercentage) * ($set / $sets));
            $percentages[] = round($percentage, 2);
        }
        return $percentages;
    }
} 