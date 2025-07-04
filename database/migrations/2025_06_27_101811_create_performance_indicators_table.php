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

        Schema::create('performance_indicators', function (Blueprint $table) {
            $table->id();
            $table->foreignId('athlete_id')->constrained();
            $table->string('exercise');
            $table->string('label');
            $table->string('value');
            $table->string('unit')->nullable();
            $table->string('type');
            $table->index(['athlete_id', 'exercise']);
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('performance_indicators');
    }
};
