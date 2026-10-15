<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('spaces', function (Blueprint $table) {
            // Pacote mensal (além de hora e dia). Nulo = o local não oferece essa modalidade.
            $table->decimal('monthly_price', 10, 2)->nullable()->after('daily_price');

            // Espaço 100% gratuito (bibliotecas públicas, centros culturais...). Nesse caso os preços ficam nulos.
            $table->boolean('is_free')->default(false)->after('monthly_price');
            $table->index('is_free');
        });
    }

    public function down(): void
    {
        Schema::table('spaces', function (Blueprint $table) {
            $table->dropIndex(['is_free']);
            $table->dropColumn(['monthly_price', 'is_free']);
        });
    }
};
