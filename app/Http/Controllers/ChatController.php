<?php

namespace App\Http\Controllers;

use App\Actions\AddChatMessage;
use App\Actions\CreateChatSession;
use App\Actions\GenerateChatResponse;
use App\Models\ChatSession;
use App\Models\TrainingPlan;
use App\Models\User;
use App\Services\PrismFactory;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Response as IlluminateResponse;
use Inertia\Response;
use Prism\Prism\Enums\ChunkType;
use Prism\Prism\Exceptions\PrismException;

class ChatController extends Controller
{
    /**
     * Display the chat interface
     */
    public function index(
        #[CurrentUser] User $user
    ): Response {
        Gate::authorize('isAthlete');

        $session = $user->athlete->chatSessions()->latest()->firstOr(function () use ($user) {
            // Create a new session if none exists
            return app(CreateChatSession::class)->execute($user->athlete->id);
        });

        $messages = $session->messages()->latest()->get();

        $sessions = $user->athlete->chatSessions()->latest()->get();

        return inertia('chat', [
            'session' => $session,
            'messages' => $messages,
            'basePlan' => $user->athlete->currentPlan,
            'sessions' => $sessions,
            'streamUrl' => route('chat.stream'),
        ]);
    }

    public function show(
        ChatSession $session,
        #[CurrentUser] User $user
    ): Response {
        Gate::authorize('isAthlete');

        // Load messages for the session
        $messages = $session->messages()->latest()->get();
        $sessions = $user->athlete->chatSessions()->latest()->get();

        return inertia('chat', [
            'session' => $session,
            'messages' => $messages,
            'basePlan' => null, // No base plan in this context
            'sessions' => $sessions,
            'streamUrl' => route('chat.stream'),
        ]);
    }

    /**
     * Handle chat streaming using Laravel's SSE
     */
    public function stream(Request $request, #[CurrentUser] User $user)
    {
        Gate::authorize('isAthlete');

        $request->validate([
            'prompt' => 'required|string|min:3|max:1000',
            'session_id' => 'nullable|exists:chat_sessions,id',
            'base_plan_id' => 'nullable|exists:training_plans,id',
        ]);

        $sessionId = $request->get('session_id');
        $basePlanId = $request->get('base_plan_id');

        if ($sessionId) {
            $session = ChatSession::findOrFail($sessionId);
        } else {
            $basePlan = $basePlanId ? TrainingPlan::find($basePlanId) : null;
            $session = app(CreateChatSession::class)->execute(
                $user->athlete->id,
                $basePlan
            );
        }

        // Add user message to session
        app(AddChatMessage::class)->addUserMessage($session, $request->get('prompt'));

        return IlluminateResponse::eventStream(function () use ($session, $request) {
            try {
                $chatRequest = app(GenerateChatResponse::class)->execute($session, $request->get('prompt'));
                $fullAnswer = '';

                foreach ($chatRequest->asStream() as $textChunk) {
                    if ($textChunk->finishReason !== null) {
                        // Save the complete response to database
                        app(AddChatMessage::class)->addAssistantMessage($session, $fullAnswer);

                        yield [
                            'type' => 'finished',
                            'reason' => $textChunk->finishReason->name,
                            'session_id' => $session->id
                        ];
                        break;
                    }

                    switch ($textChunk->chunkType) {
                        case ChunkType::Text:
                            $fullAnswer .= $textChunk->text;
                            yield [
                                'type' => 'text',
                                'content' => $textChunk->text
                            ];
                            break;

                        case ChunkType::Thinking:
                            yield [
                                'type' => 'thinking'
                            ];
                            break;

                        case ChunkType::ToolCall:
                            foreach ($textChunk->toolCalls as $toolCall) {
                                yield [
                                    'type' => 'tool_call',
                                    'tool_name' => $toolCall->name
                                ];
                            }
                            break;

                        case ChunkType::ToolResult:
                            foreach ($textChunk->toolResults as $toolResult) {
                                yield [
                                    'type' => 'tool_result',
                                    'tool_name' => $toolResult->toolName
                                ];
                            }
                            break;

                        case ChunkType::Meta:
                            yield [
                                'type' => 'meta',
                                'model' => $textChunk->meta->model,
                                'id' => $textChunk->meta->id
                            ];
                            break;
                    }
                }
            } catch (PrismException $e) {
                yield [
                    'type' => 'error',
                    'message' => 'Connection Error: ' . $e->getMessage()
                ];
                report($e);
            } catch (\Exception $e) {
                yield [
                    'type' => 'error',
                    'message' => 'Reply Error: ' . $e->getMessage()
                ];
                report($e);
            }
        });
    }

}
