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
        Schema::create('training_phases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_plan_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('duration_weeks');
            $table->integer('order')->default(0);
            
            // Progression settings (can override training plan defaults)
            $table->string('progression_type')->nullable();
            $table->decimal('progression_rate', 5, 2)->nullable();
            
            // Exercise-specific progression rates
            $table->json('exercise_progression_rates')->nullable();
            
            // Phase-specific settings
            $table->json('settings')->nullable(); // For any additional phase-specific settings
            
            $table->timestamps();
            $table->softDeletes();
            
            // Ensure phases are ordered within a training plan
            $table->index(['training_plan_id', 'order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_phases');
    }
};
