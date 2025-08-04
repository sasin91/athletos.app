<?php

namespace App\Http\Controllers;

use App\Actions\AddChatMessage;
use App\Actions\GenerateChatResponse;
use App\Enums\ChatMessageRole;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Response;
use Prism\Prism\Enums\ChunkType;
use Prism\Prism\Text\Chunk;
use Symfony\Component\HttpFoundation\EventStreamResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ChatMessageController
{
    public function store(
        ChatSession $session,
        Request $request
    ) {
        Gate::authorize('isAthlete');

        $request->validate([
            'message' => 'required|string|max:5000',
        ]);

        $message = $request->string('message');

        $chatMessage = app(AddChatMessage::class)->execute(
            $session,
            ChatMessageRole::User,
            $message
        );

        return Response::json([
            'answerUrl' => route('chat.answer', $chatMessage),
        ]);
    }

    public function answer(
        ChatMessage $chatMessage
    ): StreamedResponse
    {
        Gate::authorize('isAthlete');

        return Response::eventStream(function () use ($chatMessage) {
            $chatRequest = app(GenerateChatResponse::class)->execute(
                $chatMessage->chatSession,
                $chatMessage->content,
            );

            $fullAnswer = '';

            /** @var Chunk $textChunk */
            foreach ($chatRequest->asStream() as $textChunk) {
                if ($textChunk->chunkType === ChunkType::Text) {
                    $fullAnswer .= $textChunk->text;
                }

                yield $textChunk;
            }

            // Save the complete response to a database
            app(AddChatMessage::class)->addAssistantMessage(
                $chatMessage->chatSession,
                $fullAnswer
            );
        });
    }
}
