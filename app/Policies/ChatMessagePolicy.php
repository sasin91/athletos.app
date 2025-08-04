<?php

namespace App\Policies;

use App\Models\ChatMessage;
use App\Models\User;

class ChatMessagePolicy
{
    /**
     * List of authorized emails for chat access
     */
    private const AUTHORIZED_EMAILS = [
        'jonas.kerwin.hansen@gmail.com',
    ];

    /**
     * Check if user has chat access
     */
    private function hasAccess(User $user): bool
    {
        return in_array($user->email, self::AUTHORIZED_EMAILS) && $user->isAthlete();
    }

    /**
     * Determine whether the user can view any chat messages.
     */
    public function viewAny(User $user): bool
    {
        return $this->hasAccess($user);
    }

    /**
     * Determine whether the user can view the chat message.
     */
    public function view(User $user, ChatMessage $chatMessage): bool
    {
        return $this->hasAccess($user) && $user->athlete->id === $chatMessage->chatSession->athlete_id;
    }

    /**
     * Determine whether the user can create chat messages.
     */
    public function create(User $user): bool
    {
        return $this->hasAccess($user);
    }

    /**
     * Determine whether the user can update the chat message.
     */
    public function update(User $user, ChatMessage $chatMessage): bool
    {
        return $this->hasAccess($user) && $user->athlete->id === $chatMessage->chatSession->athlete_id;
    }

    /**
     * Determine whether the user can delete the chat message.
     */
    public function delete(User $user, ChatMessage $chatMessage): bool
    {
        return $this->hasAccess($user) && $user->athlete->id === $chatMessage->chatSession->athlete_id;
    }

    /**
     * Determine whether the user can restore the chat message.
     */
    public function restore(User $user, ChatMessage $chatMessage): bool
    {
        return $this->hasAccess($user) && $user->athlete->id === $chatMessage->chatSession->athlete_id;
    }

    /**
     * Determine whether the user can permanently delete the chat message.
     */
    public function forceDelete(User $user, ChatMessage $chatMessage): bool
    {
        return $this->hasAccess($user) && $user->athlete->id === $chatMessage->chatSession->athlete_id;
    }
}