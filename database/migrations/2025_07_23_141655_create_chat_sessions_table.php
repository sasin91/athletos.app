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
        Schema::create('chat_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('athlete_id')->constrained()->cascadeOnDelete();
            $table->string('title')->nullable();
            $table->string('subject')->nullable();
            $table->foreignId('training_plan_id')->nullable()->constrained()->nullOnDelete();
            $table->json('context')->nullable(); // Store session context/metadata
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamps();

            $table->index('athlete_id');
            $table->index('last_activity_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_sessions');
    }
};
