<?php

namespace App\Enums;

enum ExerciseTag: string
{
    // Muscle Groups - delegated to MuscleGroup enum
    case Chest = 'chest';
    case Back = 'back';
    case Shoulders = 'shoulders';
    case Arms = 'arms';
    case Triceps = 'triceps';
    case Biceps = 'biceps';
    case Legs = 'legs';
    case Quads = 'quads';
    case Hamstrings = 'hamstrings';
    case Glutes = 'glutes';
    case Calves = 'calves';
    case Core = 'core';
    case Abs = 'abs';
    case Obliques = 'obliques';
    case HipFlexors = 'hip-flexors';
    case Lats = 'lats';
    case Delts = 'delts';
    case Spine = 'spine';
    case LowBack = 'low-back';
    case TSpine = 't-spine';
    case Ankles = 'ankles';
    case Hips = 'hips';
    case ITBand = 'it-band';

    // Equipment Types
    case Bodyweight = 'bodyweight';
    case Barbell = 'barbell';
    case Dumbbell = 'dumbbell';
    case KettleBell = 'kettlebell';
    case Bands = 'bands';
    case Cable = 'cable';
    case Machine = 'machine';
    case Bench = 'bench';
    case PullUpBar = 'pull-up-bar';
    case Mat = 'mat';
    case Foam = 'foam-roller';
    case Ball = 'exercise-ball';

    // Exercise Qualities
    case Compound = 'compound';
    case Isolation = 'isolation';
    case Strength = 'strength';
    case Activation = 'activation';
    case Mobility = 'mobility';
    case Restorative = 'restorative';
    case Gentle = 'gentle';
    case Challenging = 'challenging';
    case Technical = 'technical';
    case Calming = 'calming';
    case Stability = 'stability';
    case Balance = 'balance';

    // Training Context
    case WarmUp = 'warm-up';
    case Cooldown = 'cooldown';
    case PostDeadlift = 'post-deadlift';
    case PostSquat = 'post-squat';
    case PreActivateGlutes = 'pre-activate-glutes';

    public function isMuscleGroup(): bool
    {
        return in_array($this, [
            self::Chest, self::Back, self::Shoulders, self::Arms, self::Triceps, self::Biceps,
            self::Legs, self::Quads, self::Hamstrings, self::Glutes, self::Calves,
            self::Core, self::Abs, self::Obliques, self::HipFlexors, self::Lats, self::Delts,
            self::Spine, self::LowBack, self::TSpine, self::Ankles, self::Hips, self::ITBand,
        ]);
    }

    public function isEquipment(): bool
    {
        return in_array($this, [
            self::Bodyweight, self::Barbell, self::Dumbbell, self::KettleBell, self::Bands,
            self::Cable, self::Machine, self::Bench, self::PullUpBar, self::Mat, self::Foam, self::Ball,
        ]);
    }

    public function label(): string
    {
        return match($this) {
            self::HipFlexors => 'Hip Flexors',
            self::LowBack => 'Lower Back',
            self::TSpine => 'Thoracic Spine',
            self::ITBand => 'IT Band',
            self::KettleBell => 'Kettlebell',
            self::PullUpBar => 'Pull-up Bar',
            self::WarmUp => 'Warm-up',
            self::PostDeadlift => 'Post Deadlift',
            self::PostSquat => 'Post Squat',
            self::PreActivateGlutes => 'Pre-activate Glutes',
            default => ucwords(str_replace('-', ' ', $this->value)),
        };
    }
} 