<?php

namespace App\Actions;

use App\Models\ChatSession;
use App\Enums\ChatMessageRole;

class BuildConversationHistory
{
    public function execute(ChatSession $session, int $limit = 10): array
    {
        return $session
            ->messages()
            ->where('role', '!=', ChatMessageRole::System)
            ->latest()
            ->limit($limit)
            ->get()
            ->reverse()
            ->map(
                fn($message) => [
                    'role' => $message->role->value,
                    'content' => $message->content,
                ],
            )
            ->toArray();
    }
}