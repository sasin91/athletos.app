<?php

namespace App\Policies;

use App\Models\ChatSession;
use App\Models\User;

class ChatSessionPolicy
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
     * Determine whether the user can view any chat sessions.
     */
    public function viewAny(User $user): bool
    {
        return $this->hasAccess($user);
    }

    /**
     * Determine whether the user can view the chat session.
     */
    public function view(User $user, ChatSession $chatSession): bool
    {
        return $this->hasAccess($user) && $user->athlete->id === $chatSession->athlete_id;
    }

    /**
     * Determine whether the user can create chat sessions.
     */
    public function create(User $user): bool
    {
        return $this->hasAccess($user);
    }

    /**
     * Determine whether the user can update the chat session.
     */
    public function update(User $user, ChatSession $chatSession): bool
    {
        return $this->hasAccess($user) && $user->athlete->id === $chatSession->athlete_id;
    }

    /**
     * Determine whether the user can delete the chat session.
     */
    public function delete(User $user, ChatSession $chatSession): bool
    {
        return $this->hasAccess($user) && $user->athlete->id === $chatSession->athlete_id;
    }

    /**
     * Determine whether the user can restore the chat session.
     */
    public function restore(User $user, ChatSession $chatSession): bool
    {
        return $this->hasAccess($user) && $user->athlete->id === $chatSession->athlete_id;
    }

    /**
     * Determine whether the user can permanently delete the chat session.
     */
    public function forceDelete(User $user, ChatSession $chatSession): bool
    {
        return $this->hasAccess($user) && $user->athlete->id === $chatSession->athlete_id;
    }
}