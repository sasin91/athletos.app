<?php

namespace App\Livewire;

use App\Models\Athlete;
use App\Models\ChatSession;
use Illuminate\Support\Facades\Auth;
use Livewire\Attributes\Computed;
use Livewire\Component;
use Livewire\Attributes\On;

/**
 * @property-read Athlete $athlete
 */
class ChatDrawer extends Component
{
    public bool $isOpen = false;
    public ?ChatSession $activeSession = null;

    #[Computed]
    public function athlete(): Athlete
    {
        return Auth::user()->athlete;
    }

    #[Computed]
    public function recentSessions()
    {
        return $this->athlete->chatSessions()
            ->orderBy('last_activity_at', 'desc')
            ->limit(5)
            ->get();
    }

    public function mount()
    {
        $this->activeSession = $this->athlete->chatSessions()
            ->latest('last_activity_at')
            ->first();
    }

    #[On('open-chat')]
    public function openChat()
    {
        $this->loadOrCreateSession();
        $this->isOpen = true;
    }

    #[On('close-chat')]
    public function closeChat()
    {
        $this->isOpen = false;
    }

    public function toggleChat()
    {
        $this->isOpen = !$this->isOpen;

        if ($this->isOpen && !$this->activeSession) {
            $this->loadOrCreateSession();
        }
    }


    public function newSession()
    {
        $this->activeSession = null;
        $this->loadOrCreateSession();
    }

    private function loadOrCreateSession()
    {
        // Load the most recent session for today
        $this->activeSession = $this->athlete->chatSessions()
            ->latest('last_activity_at')
            ->firstOrCreate();
    }

    public function loadSession(ChatSession $session)
    {
        $this->activeSession = $session;
    }

    public function render()
    {
        return view('livewire.chat-drawer');
    }
}
