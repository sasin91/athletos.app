<?php

namespace App\Actions;

use App\Models\ChatSession;
use App\Services\RunPodService;
use Prism\Prism\ValueObjects\Messages\UserMessage;
use Prism\Prism\ValueObjects\Messages\AssistantMessage;
use Prism\Prism\ValueObjects\Messages\SystemMessage;

class GenerateRunPodChatResponse
{
    public function execute(ChatSession $session, string $userPrompt): \Generator
    {
        $systemMessage = app(BuildSystemMessage::class)->execute($session->athlete->currentPlan);
        $conversationHistory = app(BuildConversationHistory::class)->execute($session);

        // Convert conversation history to Prism messages format
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

        // Convert to RunPod format
        $runPodMessages = RunPodService::formatMessages($prismMessages);

        // Use RunPod service for streaming
        $runPodService = new RunPodService();
        
        $options = [
            'model' => config('ai.providers.runpod.chat_model'),
            'temperature' => config('ai.providers.runpod.temperature'),
            'max_tokens' => config('ai.providers.runpod.max_tokens'),
        ];

        yield from $runPodService->streamChatCompletion($runPodMessages, $options);
    }
}