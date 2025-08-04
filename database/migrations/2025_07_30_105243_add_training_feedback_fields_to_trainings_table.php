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
        Schema::table('trainings', function (Blueprint $table) {
            $table->integer('overall_rating')->nullable()->after('energy_level');
            $table->string('difficulty')->nullable()->after('overall_rating');
            $table->integer('difficulty_level')->nullable()->after('difficulty');
            $table->json('exercise_sets')->nullable()->after('difficulty_level');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('trainings', function (Blueprint $table) {
            $table->dropColumn([
                'overall_rating',
                'difficulty',
                'difficulty_level',
                'exercise_sets'
            ]);
        });
    }
};
