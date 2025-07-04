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
        Schema::create('exercises', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_id')->constrained()->onDelete('cascade');
            $table->string('exercise_enum'); // Store the enum value
            $table->integer('set_number');
            $table->integer('reps')->nullable();
            $table->decimal('weight', 8, 2)->nullable();
            $table->decimal('rpe', 3, 1)->nullable(); // Rate of Perceived Exertion
            $table->text('notes')->nullable();
            $table->boolean('skipped')->default(false);
            $table->text('skip_reason')->nullable();
            $table->string('swapped_from')->nullable(); // Original exercise if swapped
            $table->text('swap_reason')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            // Indexes for common queries
            $table->index(['training_id', 'exercise_enum']);
            $table->index(['training_id', 'set_number']);
            $table->index('completed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exercises');
    }
};
