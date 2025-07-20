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

class PowerliftingPlanDriver implements TrainingPlan
{
    public function buildPlan(ExperienceLevel $level): array
    {
        return [
            'name' => $this->getName(),
            'description' => $this->getDescription(),
            'goal' => TrainingGoal::Power,
            'experience_level' => $level,
            'default_progression_type' => ProgressionType::Static,
            'default_progression_rate' => 1.5,
            'easy_progression_rate' => 1.0,
            'medium_progression_rate' => 1.5,
            'hard_progression_rate' => 2.0,
            'phases' => $this->getPhases(),
        ];
    }

    public function getPhases(): array
    {
        return [
            $this->createPowerPhase(),
        ];
    }

    public function supports(TrainingGoal $goal): bool
    {
        return $goal === TrainingGoal::Power;
    }

    public function getName(): string
    {
        return 'Powerlifting';
    }

    public function getDescription(): string
    {
        return 'Explosive power training for athletic performance focused on the three main lifts';
    }

    public function getSupportedExperienceLevels(): array
    {
        return [
            ExperienceLevel::Intermediate,
            ExperienceLevel::Advanced,
        ];
    }

    private function createPowerPhase(): TrainingPhase
    {
        $settings = new TrainingPhaseSettings(
            exercises: [
                new ExerciseConfig(
                    exercise: Exercise::BarbellBackSquat->value,
                    sets: 5,
                    reps: 3,
                    weight: 82.5,
                    rest_seconds: 240,
                    notes: 'Explosive concentric, controlled eccentric',
                    day: 1,
                    cues: [
                        'Focus on explosive power from bottom position',
                        'Controlled descent, maximum force ascent',
                        'Drive through floor with full foot contact',
                        'Maintain tight core throughout movement',
                        'Complete rest between sets for power output',
                    ]
                ),
                new ExerciseConfig(
                    exercise: Exercise::BenchPress->value,
                    sets: 5,
                    reps: 3,
                    weight: 82.5,
                    rest_seconds: 240,
                    notes: 'Focus on bar speed and explosiveness',
                    day: 2,
                    cues: [
                        'Explosive press from chest',
                        'Controlled descent, pause at chest',
                        'Drive bar up with maximum speed',
                        'Keep shoulders retracted throughout',
                        'Focus on acceleration through sticking point',
                    ]
                ),
                new ExerciseConfig(
                    exercise: Exercise::Deadlift->value,
                    sets: 3,
                    reps: 3,
                    weight: 87.5,
                    rest_seconds: 300,
                    notes: 'Explosive pull from floor, perfect form',
                    day: 3,
                    cues: [
                        'Explosive drive from floor',
                        'Maintain neutral spine throughout',
                        'Bar stays close to body',
                        'Drive through heels and engage glutes',
                        'Complete hip extension at top',
                    ]
                ),
                new ExerciseConfig(
                    exercise: Exercise::StandingCalfRaise->value,
                    sets: 3,
                    reps: 15,
                    weight: 0.0,
                    rest_seconds: 60,
                    notes: 'Light accessory work for recovery',
                    day: 4,
                    cues: [
                        'Full range of motion',
                        'Controlled movement',
                        'Feel calf activation',
                        'Recovery focused',
                    ]
                ),
            ]
        );

        return new TrainingPhase(
            name: 'Power Phase',
            description: 'Explosive movements and power development focused on the three main powerlifting movements with maximum intensity.',
            durationWeeks: 8,
            order: 0,
            progressionType: ProgressionType::Static,
            progressionRate: 1.5,
            settings: $settings,
        );
    }
}