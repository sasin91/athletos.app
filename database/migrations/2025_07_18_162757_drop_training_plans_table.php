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
        Schema::dropIfExists('training_plans');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('training_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('goal');
            $table->string('experience_level');
            $table->string('default_progression_type');
            $table->decimal('default_progression_rate', 5, 2);
            $table->decimal('easy_progression_rate', 5, 2);
            $table->decimal('medium_progression_rate', 5, 2);
            $table->decimal('hard_progression_rate', 5, 2);
            $table->timestamps();
            $table->softDeletes();
        });
    }
};
