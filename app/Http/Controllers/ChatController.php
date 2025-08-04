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
use Illuminate\Http\RedirectResponse;
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
            'sessions' => $sessions
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

    public function create(
        #[CurrentUser] User $user
    ): RedirectResponse {
        Gate::authorize('isAthlete');

        // Create a new chat session
        $session = app(CreateChatSession::class)->execute($user->athlete->id);

        return redirect()->route('chat.show', ['session' => $session]);
    }
}
