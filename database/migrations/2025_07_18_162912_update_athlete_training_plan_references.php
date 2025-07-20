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
        // First add the current_plan column
        Schema::table('athletes', function (Blueprint $table) {
            $table->string('current_plan')->after('current_plan_id')->nullable();
        });

        // Migrate existing data
        $this->migrateAthleteData();

        // Drop the old foreign key and column
        Schema::table('athletes', function (Blueprint $table) {
            if (Schema::hasColumn('athletes', 'training_plan_id')) {
                $table->dropForeign(['training_plan_id']);
                $table->dropColumn('training_plan_id');
            }
        });
    }

    /**
     * Migrate existing athlete data
     */
    private function migrateAthleteData(): void
    {
        // Map known training plan IDs to plan types
        $planMapping = [
            1 => 'hypertrophy',
            2 => 'powerlifting',
        ];

        foreach ($planMapping as $planId => $planType) {
            // Update current_plan based on current_plan_id
            DB::table('athletes')
                ->where('current_plan_id', $planId)
                ->update(['current_plan' => $planType]);

            // Also handle training_plan_id if it exists
            if (Schema::hasColumn('athletes', 'training_plan_id')) {
                DB::table('athletes')
                    ->where('training_plan_id', $planId)
                    ->whereNull('current_plan')
                    ->update(['current_plan' => $planType]);
            }
        }

        // Handle any unmapped plans - default to hypertrophy if they have a plan assigned
        DB::table('athletes')
            ->whereNotNull('current_plan_id')
            ->whereNull('current_plan')
            ->update(['current_plan' => 'hypertrophy']);

        if (Schema::hasColumn('athletes', 'training_plan_id')) {
            DB::table('athletes')
                ->whereNotNull('training_plan_id')
                ->whereNull('current_plan')
                ->update(['current_plan' => 'hypertrophy']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('athletes', function (Blueprint $table) {
            $table->dropColumn('current_plan');
            $table->foreignId('training_plan_id')->nullable()->constrained('training_plans');
        });
    }
};
