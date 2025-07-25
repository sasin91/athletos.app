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
        $this->activeSession = $this->athlete->chatSessions()->create([
            'last_activity_at' => now(),
        ]);
    }

    private function loadOrCreateSession()
    {
        if (!$this->activeSession) {
            // Load the most recent session or create a new one
            $this->activeSession = $this->athlete->chatSessions()
                ->latest('last_activity_at')
                ->first();
                
            if (!$this->activeSession) {
                $this->activeSession = $this->athlete->chatSessions()->create([
                    'last_activity_at' => now(),
                ]);
            }
        }
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
