<?php

namespace App\Actions;

use App\Models\ChatSession;
use App\Models\TrainingPlan;
use App\Services\PrismFactory;
use Prism\Prism\ValueObjects\Messages\UserMessage;
use Prism\Prism\ValueObjects\Messages\AssistantMessage;
use Prism\Prism\ValueObjects\Messages\SystemMessage;

class GenerateChatResponse
{
    public function execute(ChatSession $session, string $userPrompt)
    {
        $systemMessage = app(BuildSystemMessage::class)->execute($session->athlete->currentPlan);
        $conversationHistory = app(BuildConversationHistory::class)->execute($session);

        // Convert conversation history to Prism messages
        $prismMessages = [
            new SystemMessage($systemMessage)
        ];
        foreach ($conversationHistory as $message) {
            if ($message['role'] === 'user') {
                $prismMessages[] = new UserMessage($message['content']);
            } elseif ($message['role'] === 'assistant') {
                $prismMessages[] = new AssistantMessage($message['content']);
            }
        }

        // Add the current user message
        $prismMessages[] = new UserMessage($userPrompt);

        // Use Prism for response generation
        return PrismFactory::chat()->withMessages($prismMessages);
    }
}
