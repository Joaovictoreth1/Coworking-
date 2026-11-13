<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Reservation;
use App\Models\Space;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ReservationTest extends TestCase
{
    use RefreshDatabase;

    private Space $space;

    protected function setUp(): void
    {
        parent::setUp();

        // Segunda-feira, 12h UTC. O local abre de segunda a sexta, 08h às 18h (fuso de São Paulo).
        Carbon::setTestNow('2026-11-09 12:00:00');
        $this->space = Space::factory()->create(['hourly_price' => 100, 'daily_price' => 500]);
    }

    private function book(User $user, array $payload, ?Space $space = null)
    {
        $token = $user->createApiToken('test');

        return $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/spaces/'.($space ?? $this->space)->id.'/reservations', $payload);
    }

    private function hourly(string $from = '10:00', string $to = '12:00', string $day = '2026-11-10'): array
    {
        return [
            'rate' => 'hourly',
            'starts_at' => "{$day}T{$from}:00-03:00",
            'ends_at' => "{$day}T{$to}:00-03:00",
        ];
    }

    public function test_books_hourly_and_calculates_price(): void
    {
        $this->book(User::factory()->create(), $this->hourly('10:00', '11:30'))
            ->assertCreated()
            ->assertJsonPath('data.total_price', '150.00')
            ->assertJsonPath('data.status', 'confirmed');

        $this->assertDatabaseCount('reservations', 1);
    }

    public function test_rejects_overlapping_reservation_with_409(): void
    {
        $this->book(User::factory()->create(), $this->hourly('10:00', '12:00'))->assertCreated();

        $this->book(User::factory()->create(), $this->hourly('11:00', '13:00'))
            ->assertStatus(409);

        $this->assertDatabaseCount('reservations', 1);
    }

    public function test_adjacent_reservations_do_not_conflict(): void
    {
        $this->book(User::factory()->create(), $this->hourly('10:00', '12:00'))->assertCreated();
        $this->book(User::factory()->create(), $this->hourly('12:00', '13:00'))->assertCreated();
        $this->book(User::factory()->create(), $this->hourly('09:00', '10:00'))->assertCreated();
    }

    public function test_cancelled_slot_can_be_booked_again(): void
    {
        $owner = User::factory()->create();
        $id = $this->book($owner, $this->hourly())->json('data.id');

        $this->withHeader('Authorization', 'Bearer '.$owner->createApiToken('t'))
            ->deleteJson("/api/reservations/{$id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');

        $this->book(User::factory()->create(), $this->hourly())->assertCreated();
    }

    public function test_rejects_outside_availability_and_closed_days(): void
    {
        $user = User::factory()->create();

        $this->book($user, $this->hourly('07:00', '09:00'))->assertStatus(422);
        $this->book($user, $this->hourly('17:00', '19:00'))->assertStatus(422);
        // 2026-11-14 é sábado (fechado)
        $this->book($user, $this->hourly('10:00', '12:00', '2026-11-14'))->assertStatus(422);
    }

    public function test_rejects_past_invalid_slots_and_inverted_range(): void
    {
        $user = User::factory()->create();

        $this->book($user, $this->hourly('10:00', '12:00', '2026-11-02'))->assertStatus(422);
        $this->book($user, $this->hourly('10:10', '11:10'))->assertStatus(422);
        $this->book($user, $this->hourly('12:00', '10:00'))->assertStatus(422);
        $this->book($user, ['rate' => 'weekly'])->assertStatus(422)->assertJsonValidationErrors(['rate', 'starts_at', 'ends_at']);
    }

    public function test_daily_reservation_charges_per_day_and_blocks_hours(): void
    {
        $user = User::factory()->create();

        $this->book($user, ['rate' => 'daily', 'starts_at' => '2026-11-10', 'ends_at' => '2026-11-12'])
            ->assertCreated()
            ->assertJsonPath('data.total_price', '1500.00');

        $this->book(User::factory()->create(), $this->hourly('10:00', '11:00', '2026-11-11'))->assertStatus(409);
    }

    public function test_daily_range_over_closed_day_is_rejected(): void
    {
        // 2026-11-13 (sexta) a 2026-11-15 (domingo) inclui dias fechados
        $this->book(User::factory()->create(), ['rate' => 'daily', 'starts_at' => '2026-11-13', 'ends_at' => '2026-11-15'])
            ->assertStatus(422);
    }

    public function test_owner_cannot_book_own_space_and_inactive_space_is_hidden(): void
    {
        $this->book($this->space->user, $this->hourly())->assertStatus(403);

        $inactive = Space::factory()->inactive()->create();
        $this->book(User::factory()->create(), $this->hourly(), $inactive)->assertStatus(404);
    }

    public function test_requires_authentication(): void
    {
        $this->postJson("/api/spaces/{$this->space->id}/reservations", $this->hourly())->assertUnauthorized();
    }

    public function test_customer_cannot_cancel_close_to_start_but_manager_can(): void
    {
        $customer = User::factory()->create();
        // Começa em 1h (13h UTC = 10h em São Paulo de 2026-11-09), dentro da antecedência mínima.
        $reservation = Reservation::factory()->create([
            'space_id' => $this->space->id,
            'user_id' => $customer->id,
            'starts_at' => now()->addHour(),
            'ends_at' => now()->addHours(2),
        ]);

        $this->withHeader('Authorization', 'Bearer '.$customer->createApiToken('t'))
            ->deleteJson("/api/reservations/{$reservation->id}")
            ->assertStatus(422);

        $this->withHeader('Authorization', 'Bearer '.$this->space->user->createApiToken('t'))
            ->deleteJson("/api/reservations/{$reservation->id}")
            ->assertOk();
    }

    public function test_cancelling_is_idempotent_and_hidden_from_strangers(): void
    {
        $reservation = Reservation::factory()->create(['space_id' => $this->space->id]);
        $customer = $reservation->user;
        $stranger = User::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$stranger->createApiToken('t'))
            ->deleteJson("/api/reservations/{$reservation->id}")
            ->assertNotFound();

        $auth = ['Authorization' => 'Bearer '.$customer->createApiToken('t')];
        $this->withHeaders($auth)->deleteJson("/api/reservations/{$reservation->id}")->assertOk();
        $this->withHeaders($auth)->deleteJson("/api/reservations/{$reservation->id}")->assertOk();
    }

    public function test_lists_my_reservations_without_n_plus_one(): void
    {
        $user = User::factory()->create();
        Reservation::factory()->count(5)->sequence(
            fn ($s) => ['starts_at' => now()->addDays($s->index + 2), 'ends_at' => now()->addDays($s->index + 2)->addHour()]
        )->create(['user_id' => $user->id]);

        \DB::enableQueryLog();
        $this->withHeader('Authorization', 'Bearer '.$user->createApiToken('t'))
            ->getJson('/api/reservations?scope=upcoming')
            ->assertOk()
            ->assertJsonCount(5, 'data');

        // token + user + count + page + spaces (eager) = tamanho constante, independente do nº de reservas
        $this->assertLessThanOrEqual(8, count(\DB::getQueryLog()));
    }

    public function test_availability_shows_busy_ranges_and_window_publicly(): void
    {
        $this->book(User::factory()->create(), $this->hourly('10:00', '12:00'))->assertCreated();

        $this->getJson("/api/spaces/{$this->space->id}/availability?date=2026-11-10")
            ->assertOk()
            ->assertJsonPath('open', true)
            ->assertJsonPath('window.from', '08:00')
            ->assertJsonCount(1, 'busy')
            ->assertJsonMissingPath('busy.0.user_id');

        $this->getJson("/api/spaces/{$this->space->id}/availability?date=2026-11-14")
            ->assertOk()->assertJsonPath('open', false);
    }

    public function test_only_manager_lists_space_reservations(): void
    {
        $this->withHeader('Authorization', 'Bearer '.User::factory()->create()->createApiToken('t'))
            ->getJson("/api/admin/spaces/{$this->space->id}/reservations")
            ->assertNotFound();

        $this->withHeader('Authorization', 'Bearer '.$this->space->user->createApiToken('t'))
            ->getJson("/api/admin/spaces/{$this->space->id}/reservations")
            ->assertOk();
    }
}
