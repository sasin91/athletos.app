<?php

namespace App\Actions;

use App\Models\ChatSession;
use App\Models\TrainingPlan;

class CreateChatSession
{
    public function execute(int $athleteId, ?TrainingPlan $basePlan = null): ChatSession
    {
        $session = ChatSession::create([
            'athlete_id' => $athleteId,
            'training_plan_id' => $basePlan?->id,
            'context' => [
                'base_plan' => $basePlan
                    ? [
                        'id' => $basePlan->id,
                        'name' => $basePlan->name,
                        'goal' => $basePlan->goal->value,
                        'experience_level' => $basePlan->experience_level->value,
                        'phases_count' => $basePlan->phases->count(),
                    ]
                    : null,
            ],
            'last_activity_at' => now(),
        ]);

        // Add initial system message
        app(AddChatMessage::class)->addSystemMessage($session, $this->getInitialSystemMessage($basePlan));

        return $session;
    }

    private function getInitialSystemMessage(?TrainingPlan $basePlan = null): string
    {
        if ($basePlan) {
            return "I'm ready to help you adjust the training plan '{$basePlan->name}'. I can modify exercises, adjust sets and reps, change the progression, or help with any other aspects of your program. What changes would you like to make?";
        }

        return "I'm ready to help you create a personalized training plan! I'll need to understand your goals, experience level, available time, and any preferences or limitations you have. What kind of training are you looking to do?";
    }
}