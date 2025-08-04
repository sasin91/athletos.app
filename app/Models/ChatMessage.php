<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Enums\ChatMessageRole;

class ChatMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'chat_session_id',
        'role',
        'content',
        'metadata',
        'training_plan_id',
        'is_streaming',
        'completed_at',
    ];

    protected $casts = [
        'role' => ChatMessageRole::class,
        'metadata' => 'array',
        'is_streaming' => 'boolean',
        'completed_at' => 'datetime',
    ];

    public function chatSession(): BelongsTo
    {
        return $this->belongsTo(ChatSession::class);
    }

    public function trainingPlan(): BelongsTo
    {
        return $this->belongsTo(TrainingPlan::class);
    }

    public function isUser(): bool
    {
        return $this->role === ChatMessageRole::User;
    }

    public function isAssistant(): bool
    {
        return $this->role === ChatMessageRole::Assistant;
    }

    public function isSystem(): bool
    {
        return $this->role === ChatMessageRole::System;
    }

    public function markCompleted(): void
    {
        $this->update([
            'is_streaming' => false,
            'completed_at' => now(),
        ]);
    }
}
