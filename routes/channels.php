<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Chat channels for WebSocket communication
Broadcast::channel('chat.{sessionId}', function ($user, $sessionId) {
    // Allow access if user owns the chat session or if it's a new chat
    if ($sessionId === 'new') {
        return $user->athlete !== null;
    }
    
    return $user->athlete && $user->athlete->chatSessions()->where('id', $sessionId)->exists();
});
