<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Enums\ChatSessionType;

class ChatSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'type',
        'training_plan_id',
        'context',
        'last_activity_at',
    ];

    protected $casts = [
        'type' => ChatSessionType::class,
        'context' => 'array',
        'last_activity_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class)->orderBy('created_at');
    }

    public function trainingPlan(): BelongsTo
    {
        return $this->belongsTo(TrainingPlan::class);
    }

    public function updateActivity(): void
    {
        $this->update(['last_activity_at' => now()]);
    }

    public function generateTitle(): string
    {
        $firstUserMessage = $this->messages()
            ->where('role', 'user')
            ->first();

        if (!$firstUserMessage) {
            return 'New Chat Session';
        }

        // Generate a title from the first user message (max 50 chars)
        return str($firstUserMessage->content)
            ->limit(50)
            ->toString();
    }
}
