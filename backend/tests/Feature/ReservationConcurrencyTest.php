<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Exceptions\ReservationException;
use App\Models\Reservation;
use App\Models\Space;
use App\Models\User;
use App\Services\ReservationService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Concurrency;
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
}
