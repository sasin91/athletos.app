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

        Schema::create('trainings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('athlete_id')->constrained();
            $table->foreignId('training_plan_id')->constrained();
            $table->foreignId('training_phase_id')->nullable()->constrained();
            $table->timestamp('scheduled_at');
            $table->boolean('postponed')->default(false);
            $table->text('reschedule_reason')->nullable();
            $table->string('mood')->nullable();
            $table->integer('energy_level')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->index(['athlete_id', 'training_plan_id', 'scheduled_at']);
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
        Schema::dropIfExists('trainings');
    }
};
