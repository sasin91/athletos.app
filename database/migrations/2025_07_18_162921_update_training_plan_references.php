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
        // First add the plan column
        Schema::table('trainings', function (Blueprint $table) {
            $table->string('plan')->after('athlete_id')->nullable();
        });

        // Migrate existing data
        $this->migrateTrainingData();

        // Drop the old foreign key and column
        Schema::table('trainings', function (Blueprint $table) {
            $table->dropForeign(['training_plan_id']);
            $table->dropColumn('training_plan_id');
        });
    }

    /**
     * Migrate existing training data
     */
    private function migrateTrainingData(): void
    {
        // Map known training plan IDs to plan types
        $planMapping = [
            1 => 'hypertrophy',
            2 => 'powerlifting',
        ];

        foreach ($planMapping as $planId => $planType) {
            DB::table('trainings')
                ->where('training_plan_id', $planId)
                ->update(['plan' => $planType]);
        }

        // Handle any unmapped training plans - default to hypertrophy
        DB::table('trainings')
            ->whereNotNull('training_plan_id')
            ->whereNull('plan')
            ->update(['plan' => 'hypertrophy']);

        // For trainings without a training_plan_id, try to get it from athlete's current plan
        $this->migrateTrainingsFromAthletes();
    }

    /**
     * Migrate trainings that don't have plan from their athlete's current plan
     */
    private function migrateTrainingsFromAthletes(): void
    {
        // Get trainings without plan and update from athlete's current_plan
        DB::statement('
            UPDATE trainings t 
            JOIN athletes a ON t.athlete_id = a.id 
            SET t.plan = a.current_plan 
            WHERE t.plan IS NULL 
            AND a.current_plan IS NOT NULL
        ');

        // Default any remaining to hypertrophy
        DB::table('trainings')
            ->whereNull('plan')
            ->update(['plan' => 'hypertrophy']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('trainings', function (Blueprint $table) {
            $table->dropColumn('plan');
            $table->foreignId('training_plan_id')->after('athlete_id')->constrained();
        });
    }
};
