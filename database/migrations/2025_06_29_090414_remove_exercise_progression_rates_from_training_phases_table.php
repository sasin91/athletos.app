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
        Schema::table('training_phases', function (Blueprint $table) {
            $table->dropColumn('exercise_progression_rates');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('training_phases', function (Blueprint $table) {
            $table->json('exercise_progression_rates')->nullable();
        });
    }
};
