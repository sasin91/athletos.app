<?php

namespace App\Livewire;

use Livewire\Component;

class Notification extends Component
{
    public bool $visible = false;
    public string $type = 'success';
    public string $title = '';
    public string $message = '';
    public int $timeout = 3500;

    protected $listeners = ['notify' => 'showNotification'];

    public function showNotification(string $type, string $title, string $message)
    {
        $this->type = $type;
        $this->title = $title;
        $this->message = $message;
        $this->visible = true;
        $this->dispatch('notification-shown');
        $this->dispatch('notification-visible', true);
        $this->resetTimer();
    }

    public function close()
    {
        $this->visible = false;
        $this->dispatch('notification-visible', false);
    }

    public function resetTimer()
    {
        $this->dispatch('start-notification-timer');
    }

    public function render()
    {
        return view('livewire.notification');
    }
}
