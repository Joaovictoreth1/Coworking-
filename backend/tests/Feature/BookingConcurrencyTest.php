<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Space;
use App\Models\User;
use App\Services\BookingService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Concurrency;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class BookingConcurrencyTest extends TestCase
{
    use DatabaseMigrations;

    public function test_only_one_concurrent_booking_is_created_for_an_empty_slot(): void
    {
        if (! in_array(config('database.default'), ['mysql', 'mariadb', 'pgsql'], true)) {
            $this->markTestSkipped('Requer um banco compartilhado entre processos (MySQL/Postgres).');
        }

        $spaceId = Space::factory()->create(['opening_hours' => null])->id;
        $start = CarbonImmutable::now('UTC')->addDays(2)->setTime(10, 0);
        $data = ['start_time' => $start->toIso8601String(), 'end_time' => $start->addHours(2)->toIso8601String()];

        $tasks = [];
        foreach (User::factory()->count(6)->create()->pluck('id') as $userId) {
            $tasks[] = function () use ($userId, $spaceId, $data) {
                try {
                    app(BookingService::class)->createBooking(
                        User::findOrFail($userId),
                        Space::findOrFail($spaceId),
                        $data,
                    );

                    return 'created';
                } catch (ValidationException $exception) {
                    if (! isset($exception->errors()['booking_conflict'])) {
                        throw $exception;
                    }

                    return 'conflict';
                }
            };
        }

        $results = Concurrency::driver('process')->run($tasks);

        $this->assertSame(['conflict' => 5, 'created' => 1], collect($results)->countBy()->sortKeys()->all());
        $this->assertDatabaseCount(Booking::class, 1);
    }
}
