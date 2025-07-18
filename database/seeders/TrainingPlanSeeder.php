<?php

namespace Database\Seeders;

use App\Enums\Exercise;
use App\Enums\ExperienceLevel;
use App\Enums\ProgressionType;
use App\Enums\TrainingGoal;
use App\Enums\WeightType;
use App\Models\TrainingPhase;
use App\Models\TrainingPlan;
use App\Settings\ExerciseConfig;
use App\Settings\TrainingPhaseSettings;
use Illuminate\Database\Seeder;

class TrainingPlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->createIntelligentPlan();

        // Create additional specialized plans for variety
        $this->createPowerliftingPlan();
    }

    private function createIntelligentPlan(): void
    {
        // Create intelligent periodization training plan
        $intelligentPlan = TrainingPlan::create([
            'name' => 'Intelligent Periodization',
            'description' => 'Smart periodization alternating between hypertrophy and strength phases for optimal muscle growth and strength development',
            'goal' => TrainingGoal::Hypertrophy, // Primary goal is hypertrophy with strength integration
            'experience_level' => ExperienceLevel::Intermediate,
            'default_progression_type' => ProgressionType::Percentage,
            'default_progression_rate' => 2.5,
            'easy_progression_rate' => 1.5,
            'medium_progression_rate' => 2.5,
            'hard_progression_rate' => 3.5,
        ]);

        // Phase 1: Muscle Priming (3 weeks) - Bodybuilder Style Split
        // Focus on muscle activation, proper form, and preparing the nervous system
        $primingSettings = new TrainingPhaseSettings(
            exercises: [
                // Day 1: Chest & Back
                $this->createExerciseConfigWithDefaults(
                    exercise: Exercise::InclineDumbbellPress->value,
                    sets: 4,
                    reps: 12,
                    weight: 70,
                    rest_seconds: 90,
                    notes: 'Focus on perfect form, feel the chest working',
                    day: 1,
                    customRampingPercentages: null,
                    cues: [
                        'Set bench to 45-degree angle',
                        'Focus on muscle-mind connection',
                        'Slow controlled movements',
                        'Feel the chest stretch and contraction',
                        'Light weight, perfect form',
                    ],
                    weight_type: WeightType::Static
                ),
                $this->createExerciseConfigWithDefaults(
                    Exercise::CableChestFly->value,
                    3,
                    18, // average of 15-20
                    65, // average of 60-70% 1RM, now as float/int
                    60,
                    'Low to mid cable position, feel chest stretch',
                    1,
                    null,
                    ['Start with arms wide, feel chest stretch', 'Focus on squeezing pecs together', 'Controlled movement, no swinging', 'Mind-muscle connection is key'],
                    weight_type: WeightType::Percentage
                ),
                new ExerciseConfig(
                    exercise: Exercise::Deadlift->value,
                    sets: 3,
                    reps: 11, // average of 10-12
                    weight: 72.5, // average of 70-75% 1RM
                    rest_seconds: 120,
                    notes: 'Perfect form, feel hamstrings and glutes',
                    day: 1,
                    weight_type: WeightType::Percentage
                ),
                new ExerciseConfig(
                    exercise: Exercise::LatPulldown->value,
                    sets: 3,
                    reps: 13, // average of 12-15
                    weight: 72.5, // average of 70-75% 1RM
                    rest_seconds: 90,
                    notes: 'Focus on lat activation, controlled movement',
                    day: 1,
                    weight_type: WeightType::Percentage
                ),
                new ExerciseConfig(
                    exercise: Exercise::DumbbellCurls->value,
                    sets: 3,
                    reps: 13, // average of 12-15
                    weight: 72.5, // average of 70-75% 1RM
                    rest_seconds: 60,
                    notes: 'Strict form, feel biceps working',
                    day: 1,
                    rampingPercentages: Exercise::DumbbellCurls->rampingPercentages(3), // Copy defaults from enum
                    weight_type: WeightType::Percentage
                ),

                // Day 2: Legs
                new ExerciseConfig(
                    exercise: Exercise::BarbellBackSquat->value,
                    sets: 4,
                    reps: 13, // average of 12-15
                    weight: 72.5, // average of 70-75% 1RM
                    rest_seconds: 120,
                    notes: 'Focus on perfect form, feel the muscle working',
                    day: 2,
                    rampingPercentages: Exercise::BarbellBackSquat->rampingPercentages(4),
                    cues: [
                        'Light weight focus - build movement pattern',
                        'Find focus point ahead, keep eyes there',
                        'Feel weight balanced across mid-foot',
                        'Slow descent, feel quads and glutes working',
                        'Drive through floor on way up',
                        'Perfect form over heavy weight',
                    ],
                    weight_type: WeightType::Percentage
                ),
                new ExerciseConfig(
                    exercise: Exercise::RomanianDeadlift->value,
                    sets: 3,
                    reps: 13, // average of 12-15
                    weight: 72.5, // average of 70-75% 1RM
                    rest_seconds: 90,
                    notes: 'Feel hamstrings stretch and contract',
                    day: 2,
                    weight_type: WeightType::Percentage
                ),
                new ExerciseConfig(
                    exercise: Exercise::LegExtensions->value,
                    sets: 3,
                    reps: 18, // average of 15-20
                    weight: 65, // average of 60-70% 1RM
                    rest_seconds: 60,
                    notes: 'Quad isolation, feel the burn',
                    day: 2,
                    weight_type: WeightType::Percentage
                ),
                new ExerciseConfig(
                    exercise: Exercise::SeatedHamstringCurls->value,
                    sets: 3,
                    reps: 18, // average of 15-20
                    weight: 65, // average of 60-70% 1RM
                    rest_seconds: 60,
                    notes: 'Hamstring isolation, controlled movement',
                    day: 2,
                    weight_type: WeightType::Percentage
                ),

                // Day 3: Chest & Back
                new ExerciseConfig(
                    exercise: Exercise::FlatBarbellBenchPress->value,
                    sets: 4,
                    reps: '12-15',
                    weight: '70-75% 1RM',
                    rest_seconds: 90,
                    notes: 'Control the descent, explosive concentric',
                    day: 3
                ),
                new ExerciseConfig(
                    exercise: Exercise::DeclineDumbbellPress->value,
                    sets: 3,
                    reps: '12-15',
                    weight: '70-75% 1RM',
                    rest_seconds: 90,
                    notes: 'Lower chest focus, feel the muscle',
                    day: 3
                ),
                new ExerciseConfig(
                    exercise: Exercise::OneArmDumbbellRow->value,
                    sets: 3,
                    reps: '12-15 each side',
                    weight: '70-75% 1RM',
                    rest_seconds: 90,
                    notes: 'Unilateral work, focus on lat activation',
                    day: 3
                ),
                new ExerciseConfig(
                    exercise: Exercise::SeatedCableRow->value,
                    sets: 3,
                    reps: '12-15',
                    weight: '70-75% 1RM',
                    rest_seconds: 90,
                    notes: 'Handle below sternum, feel mid-back',
                    day: 3
                ),
                new ExerciseConfig(
                    exercise: Exercise::SideLateralRaises->value,
                    sets: 3,
                    reps: '15-20',
                    weight: '60-70% 1RM',
                    rest_seconds: 60,
                    notes: 'Shoulder isolation, controlled movement',
                    day: 3
                ),

                // Day 4: Legs
                new ExerciseConfig(
                    exercise: Exercise::LegPress->value,
                    sets: 4,
                    reps: '15-20',
                    weight: '70-75% 1RM',
                    rest_seconds: 90,
                    notes: 'Full range of motion, feel quads',
                    day: 4
                ),
                new ExerciseConfig(
                    exercise: Exercise::GluteBridge->value,
                    sets: 3,
                    reps: '15-20',
                    weight: 'Bodyweight',
                    rest_seconds: 60,
                    notes: 'Pre-activate glutes, perfect form',
                    day: 4
                ),
                new ExerciseConfig(
                    exercise: Exercise::DumbbellLunges->value,
                    sets: 3,
                    reps: '12-15 each leg',
                    weight: '70-75% 1RM',
                    rest_seconds: 90,
                    notes: 'Unilateral work, balance and stability',
                    day: 4
                ),
            ]
        );

        TrainingPhase::create([
            'training_plan_id' => $intelligentPlan->id,
            'name' => 'Muscle Priming Phase',
            'description' => 'Prepare muscles and nervous system with bodybuilder-style splits. Focus on muscle-mind connection and proper activation patterns.',
            'duration_weeks' => 3,
            'order' => 0,
            'progression_type' => ProgressionType::Percentage,
            'progression_rate' => 2.0,
            'settings' => $primingSettings,
        ]);

        // Phase 2: Technical Hypertrophy (3 weeks) - Bodybuilder Style Split
        // Emphasize proper execution with moderate weights and controlled tempo
        $technicalHypertrophySettings = new TrainingPhaseSettings(
            exercises: [
                // Day 1: Chest & Back
                new ExerciseConfig(
                    exercise: Exercise::InclineDumbbellPress->value,
                    sets: 5,
                    reps: '8-10',
                    weight: '75-80% 1RM',
                    rest_seconds: 120,
                    notes: '2-1-2 tempo, feel chest activation',
                    day: 1
                ),
                new ExerciseConfig(
                    exercise: Exercise::CableChestFly->value,
                    sets: 4,
                    reps: '12-15',
                    weight: '70-75% 1RM',
                    rest_seconds: 90,
                    notes: 'Controlled movement, feel chest stretch',
                    day: 1
                ),
                new ExerciseConfig(
                    exercise: Exercise::Deadlift->value,
                    sets: 4,
                    reps: '8-10',
                    weight: '75-80% 1RM',
                    rest_seconds: 180,
                    notes: 'Perfect form, controlled descent',
                    day: 1
                ),
                new ExerciseConfig(
                    exercise: Exercise::LatPulldown->value,
                    sets: 4,
                    reps: '10-12',
                    weight: '75-80% 1RM',
                    rest_seconds: 120,
                    notes: 'Focus on lat activation, controlled movement',
                    day: 1
                ),
                new ExerciseConfig(
                    exercise: Exercise::DumbbellCurls->value,
                    sets: 4,
                    reps: '10-12',
                    weight: '75-80% 1RM',
                    rest_seconds: 90,
                    notes: 'Strict form, feel biceps working',
                    day: 1
                ),

                // Day 2: Legs
                new ExerciseConfig(
                    exercise: Exercise::BarbellBackSquat->value,
                    sets: 5,
                    reps: '8-10',
                    weight: '75-80% 1RM',
                    rest_seconds: 150,
                    notes: '3-1-3 tempo: 3s down, 1s pause, 3s up',
                    day: 2,
                    rampingPercentages: Exercise::BarbellBackSquat->rampingPercentages(5),
                    cues: [
                        'Tempo focus - control the weight',
                        '3 seconds down - count in your head',
                        '1 second pause at bottom - stay tight',
                        '3 seconds up - controlled power',
                        'Keep tension throughout range of motion',
                        'Feel muscles working under tension',
                    ]
                ),
                new ExerciseConfig(
                    exercise: Exercise::RomanianDeadlift->value,
                    sets: 4,
                    reps: '10-12',
                    weight: '75-80% 1RM',
                    rest_seconds: 120,
                    notes: 'Feel hamstrings stretch and contract',
                    day: 2
                ),
                new ExerciseConfig(
                    exercise: Exercise::LegExtensions->value,
                    sets: 4,
                    reps: '12-15',
                    weight: '70-75% 1RM',
                    rest_seconds: 90,
                    notes: 'Quad isolation, feel the burn',
                    day: 2
                ),
                new ExerciseConfig(
                    exercise: Exercise::SeatedHamstringCurls->value,
                    sets: 4,
                    reps: '12-15',
                    weight: '70-75% 1RM',
                    rest_seconds: 90,
                    notes: 'Hamstring isolation, controlled movement',
                    day: 2
                ),

                // Day 3: Chest & Back
                new ExerciseConfig(
                    exercise: Exercise::FlatBarbellBenchPress->value,
                    sets: 5,
                    reps: '8-10',
                    weight: '75-80% 1RM',
                    rest_seconds: 150,
                    notes: '2-1-2 tempo, feel chest activation',
                    day: 3
                ),
                new ExerciseConfig(
                    exercise: Exercise::DeclineDumbbellPress->value,
                    sets: 4,
                    reps: '10-12',
                    weight: '75-80% 1RM',
                    rest_seconds: 120,
                    notes: 'Lower chest focus, feel the muscle',
                    day: 3
                ),
                new ExerciseConfig(
                    exercise: Exercise::OneArmDumbbellRow->value,
                    sets: 4,
                    reps: '10-12 each side',
                    weight: '75-80% 1RM',
                    rest_seconds: 120,
                    notes: 'Unilateral work, focus on lat activation',
                    day: 3
                ),
                new ExerciseConfig(
                    exercise: Exercise::SeatedCableRow->value,
                    sets: 4,
                    reps: '10-12',
                    weight: '75-80% 1RM',
                    rest_seconds: 120,
                    notes: 'Handle below sternum, feel mid-back',
                    day: 3
                ),
                new ExerciseConfig(
                    exercise: Exercise::SideLateralRaises->value,
                    sets: 4,
                    reps: '12-15',
                    weight: '70-75% 1RM',
                    rest_seconds: 90,
                    notes: 'Shoulder isolation, controlled movement',
                    day: 3
                ),

                // Day 4: Legs
                new ExerciseConfig(
                    exercise: Exercise::LegPress->value,
                    sets: 5,
                    reps: '12-15',
                    weight: '75-80% 1RM',
                    rest_seconds: 120,
                    notes: 'Full range of motion, feel quads',
                    day: 4
                ),
                new ExerciseConfig(
                    exercise: Exercise::GluteBridge->value,
                    sets: 4,
                    reps: '15-20',
                    weight: 'Bodyweight',
                    rest_seconds: 90,
                    notes: 'Pre-activate glutes, perfect form',
                    day: 4
                ),
                new ExerciseConfig(
                    exercise: Exercise::DumbbellLunges->value,
                    sets: 4,
                    reps: '10-12 each leg',
                    weight: '75-80% 1RM',
                    rest_seconds: 120,
                    notes: 'Unilateral work, balance and stability',
                    day: 4
                ),
            ]
        );

        TrainingPhase::create([
            'training_plan_id' => $intelligentPlan->id,
            'name' => 'Technical Hypertrophy Phase',
            'description' => 'Perfect execution with controlled tempo. Build muscle while ingraining proper movement patterns with bodybuilder-style splits.',
            'duration_weeks' => 3,
            'order' => 1,
            'progression_type' => ProgressionType::Percentage,
            'progression_rate' => 2.5,
            'settings' => $technicalHypertrophySettings,
        ]);

        // Phase 3: Heavy Hypertrophy (3 weeks) - Bodybuilder Style Split
        // Higher intensity with strength focus while maintaining hypertrophy stimulus
        $heavyHypertrophySettings = new TrainingPhaseSettings(
            exercises: [
                // Day 1: Chest & Back
                new ExerciseConfig(
                    exercise: Exercise::InclineDumbbellPress->value,
                    sets: 4,
                    reps: '6-8',
                    weight: '80-85% 1RM',
                    rest_seconds: 150,
                    notes: 'Heavy but controlled, maintain form',
                    day: 1
                ),
                new ExerciseConfig(
                    exercise: Exercise::CableChestFly->value,
                    sets: 3,
                    reps: '10-12',
                    weight: '75-80% 1RM',
                    rest_seconds: 90,
                    notes: 'Controlled movement, feel chest stretch',
                    day: 1
                ),
                new ExerciseConfig(
                    exercise: Exercise::Deadlift->value,
                    sets: 3,
                    reps: '6-8',
                    weight: '80-85% 1RM',
                    rest_seconds: 240,
                    notes: 'Heavy but perfect form',
                    day: 1
                ),
                new ExerciseConfig(
                    exercise: Exercise::LatPulldown->value,
                    sets: 3,
                    reps: '8-10',
                    weight: '80-85% 1RM',
                    rest_seconds: 120,
                    notes: 'Focus on lat activation, controlled movement',
                    day: 1
                ),
                new ExerciseConfig(
                    exercise: Exercise::DumbbellCurls->value,
                    sets: 3,
                    reps: '8-10',
                    weight: '80-85% 1RM',
                    rest_seconds: 90,
                    notes: 'Strict form, feel biceps working',
                    day: 1
                ),

                // Day 2: Legs
                new ExerciseConfig(
                    exercise: Exercise::BarbellBackSquat->value,
                    sets: 4,
                    reps: '6-8',
                    weight: '80-85% 1RM',
                    rest_seconds: 180,
                    notes: 'Heavy but controlled, maintain form',
                    day: 2
                ),
                new ExerciseConfig(
                    exercise: Exercise::RomanianDeadlift->value,
                    sets: 3,
                    reps: '8-10',
                    weight: '80-85% 1RM',
                    rest_seconds: 150,
                    notes: 'Feel hamstrings stretch and contract',
                    day: 2
                ),
                new ExerciseConfig(
                    exercise: Exercise::LegExtensions->value,
                    sets: 3,
                    reps: '10-12',
                    weight: '75-80% 1RM',
                    rest_seconds: 90,
                    notes: 'Quad isolation, feel the burn',
                    day: 2
                ),
                new ExerciseConfig(
                    exercise: Exercise::SeatedHamstringCurls->value,
                    sets: 3,
                    reps: '10-12',
                    weight: '75-80% 1RM',
                    rest_seconds: 90,
                    notes: 'Hamstring isolation, controlled movement',
                    day: 2
                ),

                // Day 3: Chest & Back
                new ExerciseConfig(
                    exercise: Exercise::FlatBarbellBenchPress->value,
                    sets: 4,
                    reps: '6-8',
                    weight: '80-85% 1RM',
                    rest_seconds: 180,
                    notes: 'Progressive overload focus',
                    day: 3,
                    rampingPercentages: Exercise::FlatBarbellBenchPress->rampingPercentages(4), // Copy defaults from enum
                ),
                new ExerciseConfig(
                    exercise: Exercise::DeclineDumbbellPress->value,
                    sets: 3,
                    reps: '8-10',
                    weight: '80-85% 1RM',
                    rest_seconds: 120,
                    notes: 'Lower chest focus, feel the muscle',
                    day: 3
                ),
                new ExerciseConfig(
                    exercise: Exercise::OneArmDumbbellRow->value,
                    sets: 3,
                    reps: '8-10 each side',
                    weight: '80-85% 1RM',
                    rest_seconds: 120,
                    notes: 'Unilateral work, focus on lat activation',
                    day: 3
                ),
                new ExerciseConfig(
                    exercise: Exercise::SeatedCableRow->value,
                    sets: 3,
                    reps: '8-10',
                    weight: '80-85% 1RM',
                    rest_seconds: 120,
                    notes: 'Handle below sternum, feel mid-back',
                    day: 3
                ),
                new ExerciseConfig(
                    exercise: Exercise::SideLateralRaises->value,
                    sets: 3,
                    reps: '10-12',
                    weight: '75-80% 1RM',
                    rest_seconds: 90,
                    notes: 'Shoulder isolation, controlled movement',
                    day: 3
                ),

                // Day 4: Legs
                new ExerciseConfig(
                    exercise: Exercise::LegPress->value,
                    sets: 4,
                    reps: '10-12',
                    weight: '80-85% 1RM',
                    rest_seconds: 150,
                    notes: 'Full range of motion, feel quads',
                    day: 4
                ),
                new ExerciseConfig(
                    exercise: Exercise::GluteBridge->value,
                    sets: 3,
                    reps: '12-15',
                    weight: 'Bodyweight',
                    rest_seconds: 90,
                    notes: 'Pre-activate glutes, perfect form',
                    day: 4
                ),
                new ExerciseConfig(
                    exercise: Exercise::DumbbellLunges->value,
                    sets: 3,
                    reps: '8-10 each leg',
                    weight: '80-85% 1RM',
                    rest_seconds: 120,
                    notes: 'Unilateral work, balance and stability',
                    day: 4
                ),
            ]
        );

        TrainingPhase::create([
            'training_plan_id' => $intelligentPlan->id,
            'name' => 'Heavy Hypertrophy Phase',
            'description' => 'Higher intensity training that bridges hypertrophy and strength. Build muscle while increasing neural efficiency with bodybuilder-style splits.',
            'duration_weeks' => 3,
            'order' => 2,
            'progression_type' => ProgressionType::Percentage,
            'progression_rate' => 3.0,
            'settings' => $heavyHypertrophySettings,
        ]);

        // Phase 4: Strength Build-up (3 weeks) - Focus on Main Lifts
        // Prepare nervous system with more reps but lighter loads, then transition to strength
        $strengthBuildUpSettings = new TrainingPhaseSettings(
            exercises: [
                new ExerciseConfig(
                    exercise: Exercise::BarbellBackSquat->value,
                    sets: 5,
                    reps: '5',
                    weight: '85-90% 1RM',
                    rest_seconds: 180,
                    notes: 'Focus on speed and power',
                    day: 1,
                    rampingPercentages: Exercise::BarbellBackSquat->rampingPercentages(5),
                    cues: [
                        'Heavy weight - neural efficiency focus',
                        'Controlled descent, explosive ascent',
                        'Drive through floor with maximum force',
                        'Stay tight throughout core',
                        'Speed and power on the way up',
                        'Rest fully between sets for power',
                    ]
                ),
                new ExerciseConfig(
                    exercise: Exercise::BenchPress->value,
                    sets: 5,
                    reps: '5',
                    weight: '85-90% 1RM',
                    rest_seconds: 180,
                    notes: 'Explosive concentric, controlled eccentric',
                    day: 2
                ),
                new ExerciseConfig(
                    exercise: Exercise::Deadlift->value,
                    sets: 3,
                    reps: '3-5',
                    weight: '90-95% 1RM',
                    rest_seconds: 300,
                    notes: 'Maximal effort, perfect form',
                    day: 3
                ),
                new ExerciseConfig(
                    exercise: Exercise::StandingCalfRaise->value,
                    sets: 4,
                    reps: '12-15',
                    weight: 'Bodyweight',
                    rest_seconds: 60,
                    notes: 'Recovery and mobility work',
                    day: 4
                ),
            ]
        );

        TrainingPhase::create([
            'training_plan_id' => $intelligentPlan->id,
            'name' => 'Strength Build-up Phase',
            'description' => 'Prepare nervous system for maximal strength. Higher intensity with lower volume to build neural efficiency. Focus on main lifts.',
            'duration_weeks' => 3,
            'order' => 3,
            'progression_type' => ProgressionType::Static,
            'progression_rate' => 2.5,
            'settings' => $strengthBuildUpSettings,
        ]);

        // Phase 5: Peak Strength (3 weeks) - Focus on Main Lifts
        // Maximal strength focus with lower volume and higher intensity
        $peakStrengthSettings = new TrainingPhaseSettings(
            exercises: [
                new ExerciseConfig(
                    exercise: Exercise::BarbellBackSquat->value,
                    sets: 3,
                    reps: '3',
                    weight: '90-95% 1RM',
                    rest_seconds: 240,
                    notes: 'Maximal effort, perfect form',
                    day: 1,
                    rampingPercentages: Exercise::BarbellBackSquat->rampingPercentages(3),
                    cues: [
                        'Maximal strength - near personal limits',
                        'Perfect setup is critical with heavy weight',
                        'Big breath, hold throughout rep',
                        'Controlled descent, maintain tightness',
                        'Explosive drive through floor',
                        'Complete mental focus and commitment',
                    ]
                ),
                new ExerciseConfig(
                    exercise: Exercise::BenchPress->value,
                    sets: 3,
                    reps: '3',
                    weight: '90-95% 1RM',
                    rest_seconds: 240,
                    notes: 'Focus on bar speed and power',
                    day: 2
                ),
                new ExerciseConfig(
                    exercise: Exercise::Deadlift->value,
                    sets: 2,
                    reps: '1-3',
                    weight: '95-100% 1RM',
                    rest_seconds: 360,
                    notes: 'Maximal strength, perfect execution',
                    day: 3,
                    rampingPercentages: Exercise::Deadlift->rampingPercentages(2), // Copy defaults from enum
                ),
                new ExerciseConfig(
                    exercise: Exercise::HangingStretch->value,
                    sets: 2,
                    reps: '30-60 seconds',
                    weight: 'Bodyweight',
                    rest_seconds: 60,
                    notes: 'Spinal decompression and recovery',
                    day: 4
                ),
            ]
        );

        TrainingPhase::create([
            'training_plan_id' => $intelligentPlan->id,
            'name' => 'Peak Strength Phase',
            'description' => 'Maximal strength development. Low volume, high intensity to maximize neural efficiency and strength gains. Focus on main lifts.',
            'duration_weeks' => 3,
            'order' => 4,
            'progression_type' => ProgressionType::Static,
            'progression_rate' => 1.5,
            'settings' => $peakStrengthSettings,
        ]);
    }

    private function createPowerliftingPlan(): void
    {
        // Power Development Plan
        $powerPlan = TrainingPlan::create([
            'name' => 'Powerlifting',
            'description' => 'Explosive power training for athletic performance',
            'goal' => TrainingGoal::Power,
            'experience_level' => ExperienceLevel::Advanced,
            'default_progression_type' => ProgressionType::Static,
            'default_progression_rate' => 1.5,
            'easy_progression_rate' => 1.0,
            'medium_progression_rate' => 1.5,
            'hard_progression_rate' => 2.0,
        ]);

        $powerSettings = new TrainingPhaseSettings(
            exercises: [
                $this->createExerciseConfigWithDefaults(
                    Exercise::BarbellBackSquat->value,
                    5,
                    '3',
                    '80-85% 1RM',
                    240,
                    'Explosive concentric, controlled eccentric',
                    1
                ),
                $this->createExerciseConfigWithDefaults(
                    Exercise::BenchPress->value,
                    5,
                    '3',
                    '80-85% 1RM',
                    240,
                    'Focus on bar speed',
                    2
                ),
                $this->createExerciseConfigWithDefaults(
                    Exercise::Deadlift->value,
                    3,
                    '3',
                    '85-90% 1RM',
                    300,
                    'Explosive pull from floor',
                    3
                ),
            ]
        );

        TrainingPhase::create([
            'training_plan_id' => $powerPlan->id,
            'name' => 'Power Phase',
            'description' => 'Explosive movements and power development',
            'duration_weeks' => 8,
            'order' => 0,
            'progression_type' => ProgressionType::Static,
            'progression_rate' => 1.5,
            'settings' => $powerSettings,
        ]);
    }

    /**
     * Helper method to create ExerciseConfig with ramping percentages copied from enum defaults
     * This protects training plans from future changes to enum defaults
     */
    private function createExerciseConfigWithDefaults(
        string $exercise,
        int $sets,
        int $reps,
        float $weight = 0.0,
        int $rest_seconds = 120,
        ?string $notes = null,
        int $day = 1,
        ?array $customRampingPercentages = null,
        ?array $cues = null,
        WeightType $weight_type = WeightType::Static
    ): ExerciseConfig {
        $exerciseEnum = Exercise::from($exercise);

        // Use custom ramping if provided, otherwise copy from enum defaults
        $rampingPercentages = $customRampingPercentages ?? $exerciseEnum->rampingPercentages($sets);

        // Use provided cues or fallback to enum defaults
        $effectiveCues = $cues ?? $exerciseEnum->cues();

        return new ExerciseConfig(
            exercise: $exercise,
            sets: $sets,
            reps: $reps,
            weight: $weight,
            rest_seconds: $rest_seconds,
            notes: $notes,
            day: $day,
            rampingPercentages: $rampingPercentages,
            cues: $effectiveCues,
            weight_type: $weight_type,
        );
    }
}
