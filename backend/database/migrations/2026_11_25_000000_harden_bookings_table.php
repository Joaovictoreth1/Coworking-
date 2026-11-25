<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->timestamp('cancelled_at')->nullable()->after('notes');
            $table->string('cancellation_reason', 500)->nullable()->after('cancelled_at');
            $table->index(['space_id', 'status', 'start_time', 'end_time'], 'bookings_space_status_window_idx');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('bookings_space_status_window_idx');
            $table->dropColumn(['cancelled_at', 'cancellation_reason']);
        });
    }
};
