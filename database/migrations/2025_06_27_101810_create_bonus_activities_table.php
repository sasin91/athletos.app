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

        Schema::create('bonus_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('athlete_id')->constrained();
            $table->string('exercise');
            $table->date('scheduled_at');
            $table->foreignId('scheduled_by')->constrained('users');
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->index(['athlete_id', 'exercise', 'scheduled_at']);
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bonus_activities');
    }
};
