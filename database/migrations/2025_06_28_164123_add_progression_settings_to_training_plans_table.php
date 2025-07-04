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
        Schema::table('training_plans', function (Blueprint $table) {
            // Experience level for the training plan
            $table->string('experience_level')->nullable()->after('description');
            
            // Default progression settings (can be overridden by phases)
            $table->string('default_progression_type')->default('static')->after('experience_level');
            $table->decimal('default_progression_rate', 5, 2)->default(2.5)->after('default_progression_type');
            
            // Progression rates for different difficulty levels
            $table->decimal('easy_progression_rate', 5, 2)->nullable()->after('default_progression_rate');
            $table->decimal('medium_progression_rate', 5, 2)->nullable()->after('easy_progression_rate');
            $table->decimal('hard_progression_rate', 5, 2)->nullable()->after('medium_progression_rate');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('training_plans', function (Blueprint $table) {
            $table->dropColumn([
                'experience_level',
                'default_progression_type',
                'default_progression_rate',
                'easy_progression_rate',
                'medium_progression_rate',
                'hard_progression_rate',
            ]);
        });
    }
};
