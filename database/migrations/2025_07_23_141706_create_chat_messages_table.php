<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_session_id')->constrained()->cascadeOnDelete();
            $table->string('role'); // user, assistant, system
            $table->longText('content');
            $table->json('metadata')->nullable(); // Store additional data like tokens used, model, etc.
            $table->foreignId('training_plan_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('is_streaming')->default(false);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['chat_session_id', 'created_at']);
            $table->index('role');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_messages');
    }
};
