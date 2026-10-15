<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('spaces', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedInteger('capacity')->nullable();

            // Endereço
            $table->string('zip_code', 9)->nullable();
            $table->string('street');
            $table->string('number', 20)->nullable();
            $table->string('complement', 100)->nullable();
            $table->string('neighborhood', 100)->nullable();
            $table->string('city', 100);
            $table->string('state', 2);

            // Preços: o que estiver preenchido é a modalidade de locação aceita
            $table->decimal('hourly_price', 10, 2)->nullable();
            $table->decimal('daily_price', 10, 2)->nullable();

            // Listas de 7 dias: [{day: 0-6 (0 = domingo), enabled, from: "HH:MM", to: "HH:MM"}]
            $table->json('opening_hours')->nullable(); // horário de funcionamento
            $table->json('availability')->nullable();  // dias/horas disponíveis para locação

            $table->json('amenities')->nullable(); // ["wifi", "coffee", "Sala de descompressão", ...]
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('is_active');
        });

        Schema::create('space_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('space_id')->constrained()->cascadeOnDelete();
            $table->string('path'); // relativo ao disco "public"
            $table->string('original_name')->nullable();
            $table->unsignedSmallInteger('position')->default(0); // a primeira (menor) é a capa
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('space_photos');
        Schema::dropIfExists('spaces');
    }
};
