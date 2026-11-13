<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('space_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Intervalo semiaberto [starts_at, ends_at), sempre em UTC.
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');

            $table->string('rate', 10);                  // hourly | daily
            $table->string('status', 15)->default('confirmed'); // confirmed | cancelled
            $table->decimal('total_price', 10, 2)->default(0);
            $table->dateTime('cancelled_at')->nullable();
            $table->timestamps();

            // Cobre a checagem de conflito (espaço + status + intervalo).
            $table->index(['space_id', 'status', 'starts_at', 'ends_at'], 'reservations_conflict_idx');
            $table->index(['user_id', 'starts_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};
