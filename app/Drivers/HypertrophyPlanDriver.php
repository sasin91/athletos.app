<?php

namespace App\Drivers;

use App\Contracts\TrainingPlan;
use App\Enums\ExperienceLevel;
use App\Enums\Exercise;
use App\Enums\ProgressionType;
use App\Enums\TrainingGoal;
use App\Data\TrainingPhase;
use App\Settings\ExerciseConfig;
use App\Settings\TrainingPhaseSettings;

class HypertrophyPlanDriver implements TrainingPlan
{
    public function buildPlan(ExperienceLevel $level): array
    {
        return [
            'name' => $this->getName(),
            'description' => $this->getDescription(),
            'goal' => TrainingGoal::Hypertrophy,
            'experience_level' => $level,
            'default_progression_type' => ProgressionType::Percentage,
            'default_progression_rate' => 2.5,
            'easy_progression_rate' => 1.5,
            'medium_progression_rate' => 2.5,
            'hard_progression_rate' => 3.5,
            'phases' => $this->getPhases(),
        ];
    }

    public function getPhases(): array
    {
        return [
            $this->createPrimingPhase(),
            $this->createTechnicalHypertrophyPhase(),
            $this->createHeavyHypertrophyPhase(),
            $this->createStrengthBuildupPhase(),
            $this->createPeakStrengthPhase(),
        ];
    }

    public function supports(TrainingGoal $goal): bool
    {
        return $goal === TrainingGoal::Hypertrophy;
    }

    public function getName(): string
    {
        return 'Intelligent Periodization';
    }

    public function getDescription(): string
    {
        return 'Smart periodization alternating between hypertrophy and strength phases for optimal muscle growth and strength development';
    }

    public function getSupportedExperienceLevels(): array
    {
        return [
            ExperienceLevel::Beginner,
            ExperienceLevel::Intermediate,
            ExperienceLevel::Advanced,
        ];
    }

    private function createPrimingPhase(): TrainingPhase
    {
        $settings = new TrainingPhaseSettings(
            exercises: [
                // Day 1: Chest & Back
                new ExerciseConfig(
                    exercise: Exercise::InclineDumbbellPress->value,
                    sets: 4,
                    reps: 12,
                    weight: 70.0,
                    rest_seconds: 90,
                    notes: 'Focus on perfect form, feel the chest working',
                    day: 1,
                    cues: [
                        'Set bench to 45-degree angle',
                        'Focus on muscle-mind connection',
                        'Slow controlled movements',
                        'Feel the chest stretch and contraction',
                        'Light weight, perfect form',
                    ]
                ),
                new ExerciseConfig(
                    exercise: Exercise::CableChestFly->value,
                    sets: 3,
                    reps: 18,
                    weight: 65.0,
                    rest_seconds: 60,
                    notes: 'Low to mid cable position, feel chest stretch',
                    day: 1,
                    cues: [
                        'Start with arms wide, feel chest stretch',
                        'Focus on squeezing pecs together',
                        'Controlled movement, no swinging',
                        'Mind-muscle connection is key'
                    ]
                ),
                new ExerciseConfig(
                    exercise: Exercise::Deadlift->value,
                    sets: 3,
                    reps: 11,
                    weight: 72.5,
                    rest_seconds: 120,
                    notes: 'Perfect form, feel hamstrings and glutes',
                    day: 1
                ),
                new ExerciseConfig(
                    exercise: Exercise::LatPulldown->value,
                    sets: 3,
                    reps: 13,
                    weight: 72.5,
                    rest_seconds: 90,
                    notes: 'Focus on lat activation, controlled movement',
                    day: 1
                ),
                new ExerciseConfig(
                    exercise: Exercise::DumbbellCurls->value,
                    sets: 3,
                    reps: 13,
                    weight: 72.5,
                    rest_seconds: 60,
                    notes: 'Strict form, feel biceps working',
                    day: 1
                ),

                // Day 2: Legs
                new ExerciseConfig(
                    exercise: Exercise::BarbellBackSquat->value,
                    sets: 4,
                    reps: 13,
                    weight: 72.5,
                    rest_seconds: 120,
                    notes: 'Focus on perfect form, feel the muscle working',
                    day: 2,
                    cues: [
                        'Light weight focus - build movement pattern',
                        'Find focus point ahead, keep eyes there',
                        'Feel weight balanced across mid-foot',
                        'Slow descent, feel quads and glutes working',
                        'Drive through floor on way up',
                        'Perfect form over heavy weight',
                    ]
                ),
                new ExerciseConfig(
                    exercise: Exercise::RomanianDeadlift->value,
                    sets: 3,
                    reps: 13,
                    weight: 72.5,
                    rest_seconds: 90,
                    notes: 'Feel hamstrings stretch and contract',
                    day: 2
                ),
                new ExerciseConfig(
                    exercise: Exercise::LegExtensions->value,
                    sets: 3,
                    reps: 18,
                    weight: 65.0,
                    rest_seconds: 60,
                    notes: 'Quad isolation, feel the burn',
                    day: 2
                ),
                new ExerciseConfig(
                    exercise: Exercise::SeatedHamstringCurls->value,
                    sets: 3,
                    reps: 18,
                    weight: 65.0,
                    rest_seconds: 60,
                    notes: 'Hamstring isolation, controlled movement',
                    day: 2
                ),
            ]
        );

        return new TrainingPhase(
            name: 'Muscle Priming Phase',
            description: 'Prepare muscles and nervous system with bodybuilder-style splits. Focus on muscle-mind connection and proper activation patterns.',
            durationWeeks: 3,
            order: 0,
            progressionType: ProgressionType::Percentage,
            progressionRate: 2.0,
            settings: $settings,
        );
    }

    private function createTechnicalHypertrophyPhase(): TrainingPhase
    {
        $settings = new TrainingPhaseSettings(
            exercises: [
                // Day 1: Chest & Back
                new ExerciseConfig(
                    exercise: Exercise::InclineDumbbellPress->value,
                    sets: 5,
                    reps: 9,
                    weight: 77.5,
                    rest_seconds: 120,
                    notes: '2-1-2 tempo, feel chest activation',
                    day: 1
                ),
                new ExerciseConfig(
                    exercise: Exercise::CableChestFly->value,
                    sets: 4,
                    reps: 13,
                    weight: 72.5,
                    rest_seconds: 90,
                    notes: 'Controlled movement, feel chest stretch',
                    day: 1
                ),
                new ExerciseConfig(
                    exercise: Exercise::Deadlift->value,
                    sets: 4,
                    reps: 9,
                    weight: 77.5,
                    rest_seconds: 180,
                    notes: 'Perfect form, controlled descent',
                    day: 1
                ),
                new ExerciseConfig(
                    exercise: Exercise::LatPulldown->value,
                    sets: 4,
                    reps: 11,
                    weight: 77.5,
                    rest_seconds: 120,
                    notes: 'Focus on lat activation, controlled movement',
                    day: 1
                ),
                new ExerciseConfig(
                    exercise: Exercise::DumbbellCurls->value,
                    sets: 4,
                    reps: 11,
                    weight: 77.5,
                    rest_seconds: 90,
                    notes: 'Strict form, feel biceps working',
                    day: 1
                ),

                // Day 2: Legs
                new ExerciseConfig(
                    exercise: Exercise::BarbellBackSquat->value,
                    sets: 5,
                    reps: 9,
                    weight: 77.5,
                    rest_seconds: 150,
                    notes: '3-1-3 tempo: 3s down, 1s pause, 3s up',
                    day: 2,
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
                    reps: 11,
                    weight: 77.5,
                    rest_seconds: 120,
                    notes: 'Feel hamstrings stretch and contract',
                    day: 2
                ),
                new ExerciseConfig(
                    exercise: Exercise::LegExtensions->value,
                    sets: 4,
                    reps: 13,
                    weight: 72.5,
                    rest_seconds: 90,
                    notes: 'Quad isolation, feel the burn',
                    day: 2
                ),
                new ExerciseConfig(
                    exercise: Exercise::SeatedHamstringCurls->value,
                    sets: 4,
                    reps: 13,
                    weight: 72.5,
                    rest_seconds: 90,
                    notes: 'Hamstring isolation, controlled movement',
                    day: 2
                ),
            ]
        );

        return new TrainingPhase(
            name: 'Technical Hypertrophy Phase',
            description: 'Perfect execution with controlled tempo. Build muscle while ingraining proper movement patterns with bodybuilder-style splits.',
            durationWeeks: 3,
            order: 1,
            progressionType: ProgressionType::Percentage,
            progressionRate: 2.5,
            settings: $settings,
        );
    }

    private function createHeavyHypertrophyPhase(): TrainingPhase
    {
        $settings = new TrainingPhaseSettings(
            exercises: [
                // Day 1: Chest & Back
                new ExerciseConfig(
                    exercise: Exercise::InclineDumbbellPress->value,
                    sets: 4,
                    reps: 7,
                    weight: 82.5,
                    rest_seconds: 150,
                    notes: 'Heavy but controlled, maintain form',
                    day: 1
                ),
                new ExerciseConfig(
                    exercise: Exercise::CableChestFly->value,
                    sets: 3,
                    reps: 11,
                    weight: 77.5,
                    rest_seconds: 90,
                    notes: 'Controlled movement, feel chest stretch',
                    day: 1
                ),
                new ExerciseConfig(
                    exercise: Exercise::Deadlift->value,
                    sets: 3,
                    reps: 7,
                    weight: 82.5,
                    rest_seconds: 240,
                    notes: 'Heavy but perfect form',
                    day: 1
                ),
                new ExerciseConfig(
                    exercise: Exercise::LatPulldown->value,
                    sets: 3,
                    reps: 9,
                    weight: 82.5,
                    rest_seconds: 120,
                    notes: 'Focus on lat activation, controlled movement',
                    day: 1
                ),
                new ExerciseConfig(
                    exercise: Exercise::DumbbellCurls->value,
                    sets: 3,
                    reps: 9,
                    weight: 82.5,
                    rest_seconds: 90,
                    notes: 'Strict form, feel biceps working',
                    day: 1
                ),

                // Day 2: Legs
                new ExerciseConfig(
                    exercise: Exercise::BarbellBackSquat->value,
                    sets: 4,
                    reps: 7,
                    weight: 82.5,
                    rest_seconds: 180,
                    notes: 'Heavy but controlled, maintain form',
                    day: 2
                ),
                new ExerciseConfig(
                    exercise: Exercise::RomanianDeadlift->value,
                    sets: 3,
                    reps: 9,
                    weight: 82.5,
                    rest_seconds: 150,
                    notes: 'Feel hamstrings stretch and contract',
                    day: 2
                ),
                new ExerciseConfig(
                    exercise: Exercise::LegExtensions->value,
                    sets: 3,
                    reps: 11,
                    weight: 77.5,
                    rest_seconds: 90,
                    notes: 'Quad isolation, feel the burn',
                    day: 2
                ),
                new ExerciseConfig(
                    exercise: Exercise::SeatedHamstringCurls->value,
                    sets: 3,
                    reps: 11,
                    weight: 77.5,
                    rest_seconds: 90,
                    notes: 'Hamstring isolation, controlled movement',
                    day: 2
                ),
            ]
        );

        return new TrainingPhase(
            name: 'Heavy Hypertrophy Phase',
            description: 'Higher intensity training that bridges hypertrophy and strength. Build muscle while increasing neural efficiency with bodybuilder-style splits.',
            durationWeeks: 3,
            order: 2,
            progressionType: ProgressionType::Percentage,
            progressionRate: 3.0,
            settings: $settings,
        );
    }

    private function createStrengthBuildupPhase(): TrainingPhase
    {
        $settings = new TrainingPhaseSettings(
            exercises: [
                new ExerciseConfig(
                    exercise: Exercise::BarbellBackSquat->value,
                    sets: 5,
                    reps: 5,
                    weight: 87.5,
                    rest_seconds: 180,
                    notes: 'Focus on speed and power',
                    day: 1,
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
                    reps: 5,
                    weight: 87.5,
                    rest_seconds: 180,
                    notes: 'Explosive concentric, controlled eccentric',
                    day: 2
                ),
                new ExerciseConfig(
                    exercise: Exercise::Deadlift->value,
                    sets: 3,
                    reps: 4,
                    weight: 92.5,
                    rest_seconds: 300,
                    notes: 'Maximal effort, perfect form',
                    day: 3
                ),
                new ExerciseConfig(
                    exercise: Exercise::StandingCalfRaise->value,
                    sets: 4,
                    reps: 13,
                    weight: 0.0,
                    rest_seconds: 60,
                    notes: 'Recovery and mobility work',
                    day: 4
                ),
            ]
        );

        return new TrainingPhase(
            name: 'Strength Build-up Phase',
            description: 'Prepare nervous system for maximal strength. Higher intensity with lower volume to build neural efficiency. Focus on main lifts.',
            durationWeeks: 3,
            order: 3,
            progressionType: ProgressionType::Static,
            progressionRate: 2.5,
            settings: $settings,
        );
    }

    private function createPeakStrengthPhase(): TrainingPhase
    {
        $settings = new TrainingPhaseSettings(
            exercises: [
                new ExerciseConfig(
                    exercise: Exercise::BarbellBackSquat->value,
                    sets: 3,
                    reps: 3,
                    weight: 92.5,
                    rest_seconds: 240,
                    notes: 'Maximal effort, perfect form',
                    day: 1,
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
                    reps: 3,
                    weight: 92.5,
                    rest_seconds: 240,
                    notes: 'Focus on bar speed and power',
                    day: 2
                ),
                new ExerciseConfig(
                    exercise: Exercise::Deadlift->value,
                    sets: 2,
                    reps: 2,
                    weight: 97.5,
                    rest_seconds: 360,
                    notes: 'Maximal strength, perfect execution',
                    day: 3
                ),
                new ExerciseConfig(
                    exercise: Exercise::HangingStretch->value,
                    sets: 2,
                    reps: 45,
                    weight: 0.0,
                    rest_seconds: 60,
                    notes: 'Spinal decompression and recovery',
                    day: 4
                ),
            ]
        );

        return new TrainingPhase(
            name: 'Peak Strength Phase',
            description: 'Maximal strength development. Low volume, high intensity to maximize neural efficiency and strength gains. Focus on main lifts.',
            durationWeeks: 3,
            order: 4,
            progressionType: ProgressionType::Static,
            progressionRate: 1.5,
            settings: $settings,
        );
    }
}