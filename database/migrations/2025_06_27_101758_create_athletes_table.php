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
        Schema::disableForeignKeyConstraints();

        Schema::create('athletes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained();
            $table->foreignId('current_plan_id')->nullable()->constrained('training_plans');
            $table->foreignId('training_plan_id')->nullable()->constrained('training_plans');
            $table->json('training_days')->nullable();
            $table->string('experience_level')->default('beginner');
            $table->string('primary_goal')->default('general_fitness');
            $table->text('bio')->nullable();
            $table->string('preferred_time')->default('flexible');
            $table->integer('session_duration')->default(60);
            $table->json('notification_preferences')->nullable();
            $table->string('difficulty_preference')->default('moderate');
            $table->unique(['user_id', 'current_plan_id']);
            $table->index('training_days');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('athletes');
    }
};
