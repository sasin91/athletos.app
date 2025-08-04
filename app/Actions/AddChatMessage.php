<?php

namespace App\Actions;

use App\Models\ChatSession;
use App\Models\ChatMessage;
use App\Models\TrainingPlan;
use App\Enums\ChatMessageRole;

class AddChatMessage
{
    public function execute(ChatSession $session, ChatMessageRole $role, string $content, ?array $metadata = null, ?TrainingPlan $trainingPlan = null): ChatMessage
    {
        $message = $session->messages()->create([
            'role' => $role,
            'content' => $content,
            'metadata' => $metadata,
            'training_plan_id' => $trainingPlan?->id,
            'completed_at' => now(),
        ]);

        $session->updateActivity();

        return $message;
    }

    public function addSystemMessage(ChatSession $session, string $content): ChatMessage
    {
        return $this->execute($session, ChatMessageRole::System, $content);
    }

    public function addUserMessage(ChatSession $session, string $content): ChatMessage
    {
        return $this->execute($session, ChatMessageRole::User, $content);
    }

    public function addAssistantMessage(ChatSession $session, string $content, ?array $metadata = null, ?TrainingPlan $trainingPlan = null): ChatMessage
    {
        return $this->execute($session, ChatMessageRole::Assistant, $content, $metadata, $trainingPlan);
    }
}