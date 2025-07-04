<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, update existing data to match new enum values
        DB::table('athletes')->update([
            'difficulty_preference' => DB::raw("CASE 
                WHEN difficulty_preference = 'medium' THEN 'moderate'
                WHEN difficulty_preference = 'hard' THEN 'challenging'
                ELSE difficulty_preference
            END")
        ]);

        DB::table('athletes')->update([
            'preferred_time' => DB::raw("CASE 
                WHEN preferred_time = 'midday' THEN 'afternoon'
                WHEN preferred_time = 'flexible' THEN 'afternoon'
                ELSE preferred_time
            END")
        ]);

        DB::table('athletes')->update([
            'primary_goal' => DB::raw("CASE 
                WHEN primary_goal = 'muscle' THEN 'hypertrophy'
                WHEN primary_goal = 'fat_loss' THEN 'weight_loss'
                WHEN primary_goal = 'powerlifting' THEN 'strength'
                ELSE primary_goal
            END")
        ]);

        Schema::table('athletes', function (Blueprint $table) {
            // Update experience_level to use enum values
            $table->string('experience_level')->default('beginner')->change();
            
            // Update primary_goal to use enum values
            $table->string('primary_goal')->default('general_fitness')->change();
            
            // Update preferred_time to use enum values
            $table->string('preferred_time')->default('afternoon')->change();
            
            // Update difficulty_preference to use enum values
            $table->string('difficulty_preference')->default('moderate')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert data changes
        DB::table('athletes')->update([
            'difficulty_preference' => DB::raw("CASE 
                WHEN difficulty_preference = 'moderate' THEN 'medium'
                WHEN difficulty_preference = 'challenging' THEN 'hard'
                ELSE difficulty_preference
            END")
        ]);

        DB::table('athletes')->update([
            'preferred_time' => DB::raw("CASE 
                WHEN preferred_time = 'afternoon' THEN 'flexible'
                ELSE preferred_time
            END")
        ]);

        DB::table('athletes')->update([
            'primary_goal' => DB::raw("CASE 
                WHEN primary_goal = 'hypertrophy' THEN 'muscle'
                WHEN primary_goal = 'weight_loss' THEN 'fat_loss'
                WHEN primary_goal = 'strength' THEN 'powerlifting'
                ELSE primary_goal
            END")
        ]);

        Schema::table('athletes', function (Blueprint $table) {
            // Revert to original defaults
            $table->string('preferred_time')->default('flexible')->change();
            $table->string('difficulty_preference')->default('moderate')->change();
        });
    }
};
