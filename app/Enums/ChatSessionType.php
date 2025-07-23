<?php

namespace App\Enums;

enum ChatSessionType: string
{
    case TrainingPlan = 'training_plan';
    case GeneralChat = 'general_chat';
    case PlanAdjustment = 'plan_adjustment';
    case ExerciseAdvice = 'exercise_advice';
    case NutritionGuidance = 'nutrition_guidance';

    public function label(): string
    {
        return match ($this) {
            self::TrainingPlan => 'Training Plan Creation',
            self::GeneralChat => 'General Chat',
            self::PlanAdjustment => 'Plan Adjustment',
            self::ExerciseAdvice => 'Exercise Advice',
            self::NutritionGuidance => 'Nutrition Guidance',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::TrainingPlan => 'Create new training plans from scratch',
            self::GeneralChat => 'General fitness and training questions',
            self::PlanAdjustment => 'Modify existing training plans',
            self::ExerciseAdvice => 'Exercise form, technique, and selection',
            self::NutritionGuidance => 'Nutrition and dietary advice',
        };
    }

    public function icon(): string
    {
        return match ($this) {
            self::TrainingPlan => 'document-plus',
            self::GeneralChat => 'chat-bubble-left-right',
            self::PlanAdjustment => 'pencil-square',
            self::ExerciseAdvice => 'academic-cap',
            self::NutritionGuidance => 'heart',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::TrainingPlan => 'blue',
            self::GeneralChat => 'gray',
            self::PlanAdjustment => 'orange',
            self::ExerciseAdvice => 'green',
            self::NutritionGuidance => 'red',
        };
    }

    public function isTrainingRelated(): bool
    {
        return in_array($this, [
            self::TrainingPlan,
            self::PlanAdjustment,
            self::ExerciseAdvice,
        ]);
    }
}
