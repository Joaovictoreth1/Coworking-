<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Exceptions\ReservationException;
use App\Models\Booking;
use App\Models\Reservation;
use App\Models\Space;
use App\Models\User;
use App\Services\BookingService;
use App\Services\ReservationService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Concurrency;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * Corrida real: vários processos PHP tentam reservar o mesmo horário ao mesmo tempo.
 * Só faz sentido em MySQL/Postgres (SQLite em memória não é compartilhado entre processos
 * e ignora FOR UPDATE), então é pulado nos demais bancos. Rode com:
 *   DB_CONNECTION=mysql DB_HOST=... DB_DATABASE=... php artisan test --filter=ReservationConcurrencyTest
 */
class ReservationConcurrencyTest extends TestCase
{
    use DatabaseMigrations;

    public function test_only_one_of_many_simultaneous_requests_wins_the_slot(): void
    {
        if (! in_array(config('database.default'), ['mysql', 'mariadb', 'pgsql'], true)) {
            $this->markTestSkipped('Requer um banco compartilhado entre processos (MySQL/Postgres).');
        }

        $space = Space::factory()->create(['hourly_price' => 100]);
        $users = User::factory()->count(8)->create();

        // Próxima terça-feira, 10h-12h no fuso do coworking (o local abre de seg. a sex.).
        $tz = config('coworking.timezone');
        $start = CarbonImmutable::now($tz)->next('Tuesday')->setTime(10, 0)->addWeek();
        $startIso = $start->toIso8601String();
        $endIso = $start->addHours(2)->toIso8601String();
        $spaceId = $space->id;

        $tasks = [];
        foreach ($users->pluck('id') as $userId) {
            $tasks[] = function () use ($userId, $spaceId, $startIso, $endIso) {
                try {
                    app(ReservationService::class)->create(
                        Space::findOrFail($spaceId),
                        User::findOrFail($userId),
                        'hourly',
                        CarbonImmutable::parse($startIso),
                        CarbonImmutable::parse($endIso),
                    );

                    return 'ok';
                } catch (ReservationException) {
                    return 'rejected';
                }
            };
        }

        $results = collect(Concurrency::driver('process')->run($tasks));

        $this->assertSame(1, $results->filter(fn ($r) => $r === 'ok')->count(), 'Exatamente uma reserva deve vencer.');
        $this->assertSame(1, Reservation::count());
    }

    public function test_only_one_booking_or_reservation_wins_across_both_contracts(): void
    {
        if (! in_array(config('database.default'), ['mysql', 'mariadb', 'pgsql'], true)) {
            $this->markTestSkipped('Requer um banco compartilhado entre processos (MySQL/Postgres).');
        }

        $space = Space::factory()->create(['hourly_price' => 100, 'opening_hours' => null, 'availability' => null]);
        $spaceId = $space->id;
        $start = CarbonImmutable::now(config('coworking.timezone'))->next('Tuesday')->setTime(10, 0)->addWeek();
        $startIso = $start->toIso8601String();
        $endIso = $start->addHours(2)->toIso8601String();
        $tasks = [];

        foreach (User::factory()->count(8)->create() as $index => $user) {
            $userId = $user->id;
            $useBooking = $index % 2 === 0;
            $tasks[] = function () use ($userId, $spaceId, $startIso, $endIso, $useBooking) {
                $user = User::findOrFail($userId);
                $space = Space::findOrFail($spaceId);

                try {
                    if ($useBooking) {
                        app(BookingService::class)->createBooking($user, $space, [
                            'start_time' => $startIso,
                            'end_time' => $endIso,
                        ]);
                    } else {
                        app(ReservationService::class)->create(
                            $space,
                            $user,
                            'hourly',
                            CarbonImmutable::parse($startIso),
                            CarbonImmutable::parse($endIso),
                        );
                    }

                    return 'ok';
                } catch (ReservationException|ValidationException) {
                    return 'rejected';
                }
            };
        }

        $results = collect(Concurrency::driver('process')->run($tasks));

        $this->assertSame(1, $results->filter(fn ($result) => $result === 'ok')->count());
        $this->assertSame(7, $results->filter(fn ($result) => $result === 'rejected')->count());
        $this->assertSame(1, Booking::count() + Reservation::count());
    }
}
