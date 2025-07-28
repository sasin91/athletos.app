<?php

namespace App\Http\Controllers;

use App\Actions\AddChatMessage;
use App\Actions\CreateChatSession;
use App\Actions\GenerateChatResponse;
use App\Actions\GenerateRunPodChatResponse;
use App\Models\ChatSession;
use App\Models\TrainingPlan;
use App\Models\User;
use App\Services\PrismFactory;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Prism\Prism\Enums\ChunkType;
use Prism\Prism\Exceptions\PrismException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Support\Facades\Broadcast;

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
        ]);
    }

    /**
     * Start a chat stream
     */
    public function startStream(Request $request, #[CurrentUser] User $user): JsonResponse
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

        // Generate a unique stream ID
        $streamId = Str::uuid();

        // Store the stream data in cache for the streaming endpoint
        cache()->put("chat_stream_{$streamId}", [
            'session_id' => $session->id,
            'prompt' => $request->get('prompt'),
            'user_id' => $user->id,
        ], now()->addMinutes(10));

        return response()->json([
            'stream_url' => route('chat.stream', ['streamId' => $streamId]),
            'session_id' => $session->id,
        ]);
    }

    /**
     * Handle the actual streaming
     */
    public function stream(string $streamId): StreamedResponse
    {
        $streamData = cache()->get("chat_stream_{$streamId}");

        if (!$streamData) {
            abort(404, 'Stream not found');
        }

        $session = ChatSession::findOrFail($streamData['session_id']);
        $prompt = $streamData['prompt'];

        return response()->stream(function () use ($session, $prompt, $streamId) {
            try {
                // Check if we're using RunPod
                if (config('ai.default_provider') === 'runpod') {
                    $responseGenerator = app(GenerateRunPodChatResponse::class)->execute($session, $prompt);
                    $fullAnswer = '';

                    foreach ($responseGenerator as $chunk) {
                        if ($chunk['type'] === 'text') {
                            $fullAnswer .= $chunk['content'];
                        }

                        echo "data: " . json_encode($chunk) . "\n\n";

                        if ($chunk['type'] === 'finished') {
                            // Save the complete response to database
                            app(AddChatMessage::class)->addAssistantMessage($session, $fullAnswer);
                            break;
                        }

                        if (ob_get_level()) {
                            ob_flush();
                        }
                        flush();
                    }
                } else {
                    // Use original Prism-based approach
                    $request = app(GenerateChatResponse::class)->execute($session, $prompt);
                    $fullAnswer = '';

                    foreach ($request->asStream() as $textChunk) {
                        if ($textChunk->finishReason !== null) {
                            // Save the complete response to database
                            app(AddChatMessage::class)->addAssistantMessage($session, $fullAnswer);

                            echo "data: " . json_encode([
                                'type' => 'finished',
                                'reason' => $textChunk->finishReason->name
                            ]) . "\n\n";
                            break;
                        }

                        switch ($textChunk->chunkType) {
                            case ChunkType::Text:
                                $fullAnswer .= $textChunk->text;
                                echo "data: " . json_encode([
                                    'type' => 'text',
                                    'content' => $textChunk->text
                                ]) . "\n\n";
                                break;

                            case ChunkType::Thinking:
                                echo "data: " . json_encode([
                                    'type' => 'thinking'
                                ]) . "\n\n";
                                break;

                            case ChunkType::ToolCall:
                                foreach ($textChunk->toolCalls as $toolCall) {
                                    echo "data: " . json_encode([
                                        'type' => 'tool_call',
                                        'tool_name' => $toolCall->name
                                    ]) . "\n\n";
                                }
                                break;

                            case ChunkType::ToolResult:
                                foreach ($textChunk->toolResults as $toolResult) {
                                    echo "data: " . json_encode([
                                        'type' => 'tool_result',
                                        'tool_name' => $toolResult->toolName
                                    ]) . "\n\n";
                                }
                                break;

                            case ChunkType::Meta:
                                echo "data: " . json_encode([
                                    'type' => 'meta',
                                    'model' => $textChunk->meta->model,
                                    'id' => $textChunk->meta->id
                                ]) . "\n\n";
                                break;
                        }

                        if (ob_get_level()) {
                            ob_flush();
                        }
                        flush();
                    }
                }
            } catch (PrismException $e) {
                echo "data: " . json_encode([
                    'type' => 'error',
                    'message' => 'Connection Error: ' . $e->getMessage()
                ]) . "\n\n";

                report($e);
            } catch (\Exception $e) {
                echo "data: " . json_encode([
                    'type' => 'error',
                    'message' => 'Reply Error: ' . $e->getMessage()
                ]) . "\n\n";

                report($e);
            } finally {
                // Clean up the stream data
                cache()->forget("chat_stream_{$streamId}");
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no', // Disable Nginx buffering
        ]);
    }

    /**
     * Handle WebSocket-based chat requests
     */
    public function websocket(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        Gate::authorize('isAthlete');

        $request->validate([
            'prompt' => 'required|string|min:3|max:1000',
            'session_id' => 'nullable|exists:chat_sessions,id',
            'base_plan_id' => 'nullable|exists:training_plans,id',
            'channel' => 'required|string',
        ]);

        $sessionId = $request->get('session_id');
        $basePlanId = $request->get('base_plan_id');
        $channel = $request->get('channel');

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

        // Process chat response in background job to avoid blocking
        dispatch(function () use ($session, $request, $channel) {
            try {
                $prompt = $request->get('prompt');
                
                // Check if we're using RunPod
                if (config('ai.default_provider') === 'runpod') {
                    $responseGenerator = app(GenerateRunPodChatResponse::class)->execute($session, $prompt);
                    $fullAnswer = '';

                    foreach ($responseGenerator as $chunk) {
                        if ($chunk['type'] === 'text') {
                            $fullAnswer .= $chunk['content'];
                        }

                        // Broadcast chunk to WebSocket channel
                        Broadcast::channel($channel)->send([
                            'event' => 'ChatResponseChunk',
                            'data' => $chunk
                        ]);

                        if ($chunk['type'] === 'finished') {
                            // Save the complete response to database
                            app(AddChatMessage::class)->addAssistantMessage($session, $fullAnswer);
                            break;
                        }
                    }
                } else {
                    // Use original Prism-based approach
                    $request = app(GenerateChatResponse::class)->execute($session, $prompt);
                    $fullAnswer = '';

                    foreach ($request->asStream() as $textChunk) {
                        if ($textChunk->finishReason !== null) {
                            // Save the complete response to database
                            app(AddChatMessage::class)->addAssistantMessage($session, $fullAnswer);

                            // Broadcast finished event
                            Broadcast::channel($channel)->send([
                                'event' => 'ChatResponseChunk',
                                'data' => [
                                    'type' => 'finished',
                                    'reason' => $textChunk->finishReason->name
                                ]
                            ]);
                            break;
                        }

                        switch ($textChunk->chunkType) {
                            case ChunkType::Text:
                                $fullAnswer .= $textChunk->text;
                                Broadcast::channel($channel)->send([
                                    'event' => 'ChatResponseChunk',
                                    'data' => [
                                        'type' => 'text',
                                        'content' => $textChunk->text
                                    ]
                                ]);
                                break;

                            case ChunkType::Thinking:
                                Broadcast::channel($channel)->send([
                                    'event' => 'ChatResponseChunk',
                                    'data' => ['type' => 'thinking']
                                ]);
                                break;

                            case ChunkType::ToolCall:
                                foreach ($textChunk->toolCalls as $toolCall) {
                                    Broadcast::channel($channel)->send([
                                        'event' => 'ChatResponseChunk',
                                        'data' => [
                                            'type' => 'tool_call',
                                            'tool_name' => $toolCall->name
                                        ]
                                    ]);
                                }
                                break;

                            case ChunkType::ToolResult:
                                foreach ($textChunk->toolResults as $toolResult) {
                                    Broadcast::channel($channel)->send([
                                        'event' => 'ChatResponseChunk',
                                        'data' => [
                                            'type' => 'tool_result',
                                            'tool_name' => $toolResult->toolName
                                        ]
                                    ]);
                                }
                                break;

                            case ChunkType::Meta:
                                Broadcast::channel($channel)->send([
                                    'event' => 'ChatResponseChunk',
                                    'data' => [
                                        'type' => 'meta',
                                        'model' => $textChunk->meta->model,
                                        'id' => $textChunk->meta->id
                                    ]
                                ]);
                                break;
                        }
                    }
                }
            } catch (PrismException $e) {
                Broadcast::channel($channel)->send([
                    'event' => 'ChatResponseChunk',
                    'data' => [
                        'type' => 'error',
                        'message' => 'Connection Error: ' . $e->getMessage()
                    ]
                ]);
                report($e);
            } catch (\Exception $e) {
                Broadcast::channel($channel)->send([
                    'event' => 'ChatResponseChunk',
                    'data' => [
                        'type' => 'error',
                        'message' => 'Reply Error: ' . $e->getMessage()
                    ]
                ]);
                report($e);
            }
        });

        return response()->json([
            'session_id' => $session->id,
            'channel' => $channel,
            'status' => 'processing'
        ]);
    }
}
