<?php

namespace App\Enums;

enum ChatMessageRole: string
{
    case User = 'user';
    case Assistant = 'assistant';
    case System = 'system';

    public function label(): string
    {
        return match ($this) {
            self::User => 'You',
            self::Assistant => 'AI Coach',
            self::System => 'System',
        };
    }

    public function icon(): string
    {
        return match ($this) {
            self::User => 'user-circle',
            self::Assistant => 'cpu-chip',
            self::System => 'information-circle',
        };
    }

    public function cssClass(): string
    {
        return match ($this) {
            self::User => 'bg-blue-500 text-white',
            self::Assistant => 'bg-gray-50 text-gray-800',
            self::System => 'bg-gray-100 text-gray-800',
        };
    }

    public function isUser(): bool
    {
        return $this === self::User;
    }

    public function isAssistant(): bool
    {
        return $this === self::Assistant;
    }

    public function isSystem(): bool
    {
        return $this === self::System;
    }
}
