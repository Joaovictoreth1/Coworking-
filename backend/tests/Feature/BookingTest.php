<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Space;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingTest extends TestCase
{
    use RefreshDatabase;

    public function test_booking_preview_quotes_free_and_daily_only_spaces(): void
    {
        $start = Carbon::now()->addDays(2)->startOfDay();
        $end = $start->copy()->addHours(26);
        $payload = ['start_time' => $start->toIso8601String(), 'end_time' => $end->toIso8601String()];
        $space = Space::factory()->create([
            'opening_hours' => null,
            'hourly_price' => null,
            'daily_price' => 80,
        ]);

        $this->postJson("/api/spaces/{$space->id}/bookings/preview", $payload)
            ->assertOk()
            ->assertJsonPath('total_price', 100);
        $payload['end_time'] = $start->copy()->addHours(2)->toIso8601String();
        $this->postJson("/api/spaces/{$space->id}/bookings/preview", $payload)
            ->assertOk()
            ->assertJsonPath('total_price', 80);
        $space->update(['is_free' => true]);
        $this->postJson("/api/spaces/{$space->id}/bookings/preview", $payload)
            ->assertOk()
            ->assertJsonPath('total_price', 0);
    }

    public function test_authenticated_user_can_create_booking_successfully(): void
    {
        $user = User::factory()->create();
        $token = $user->createApiToken('test');

        $space = Space::factory()->create([
            'is_active' => true,
            'hourly_price' => 50.00,
            'opening_hours' => null, // Sem restrição de horário
        ]);

        $startTime = Carbon::now()->addDays(2)->setHour(10)->setMinute(0)->setSecond(0);
        $endTime = (clone $startTime)->addHours(3); // 3 horas = R$ 150.00

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/spaces/{$space->id}/bookings", [
                'start_time' => $startTime->toIso8601String(),
                'end_time' => $endTime->toIso8601String(),
                'notes' => 'Reserva para workshop da equipe.',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'space_id',
                    'user_id',
                    'start_time',
                    'end_time',
                    'duration_hours',
                    'total_price',
                    'status',
                    'notes',
                ],
            ])
            ->assertJson([
                'data' => [
                    'space_id' => $space->id,
                    'user_id' => $user->id,
                    'duration_hours' => 3,
                    'total_price' => 150.00,
                    'status' => Booking::STATUS_CONFIRMED,
                ],
            ]);

        $this->assertDatabaseHas('bookings', [
            'space_id' => $space->id,
            'user_id' => $user->id,
            'status' => Booking::STATUS_CONFIRMED,
            'total_price' => 150.00,
        ]);
    }

    /**
     * TESTE OBRIGATÓRIO: Comprova erro 422 ao tentar reservar horário conflitante (Double-Booking).
     */
    public function test_booking_fails_with_422_when_time_overlaps_existing_booking(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $token2 = $user2->createApiToken('test2');

        $space = Space::factory()->create([
            'is_active' => true,
            'hourly_price' => 40.00,
            'opening_hours' => null,
        ]);

        $existingStart = Carbon::now()->addDays(3)->setHour(14)->setMinute(0)->setSecond(0);
        $existingEnd = (clone $existingStart)->addHours(4); // 14:00 até 18:00

        // Reserva existente já confirmada
        Booking::create([
            'user_id' => $user1->id,
            'space_id' => $space->id,
            'start_time' => $existingStart,
            'end_time' => $existingEnd,
            'total_price' => 160.00,
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        // Usuário 2 tenta reservar sobrepondo o intervalo: das 15:00 às 17:00
        $overlapStart = (clone $existingStart)->addHour(); // 15:00
        $overlapEnd = (clone $overlapStart)->addHours(2); // 17:00

        $response = $this->withHeader('Authorization', "Bearer {$token2}")
            ->postJson("/api/spaces/{$space->id}/bookings", [
                'start_time' => $overlapStart->toIso8601String(),
                'end_time' => $overlapEnd->toIso8601String(),
            ]);

        // Deve retornar 422 Unprocessable Entity
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['booking_conflict']);

        $this->assertStringContainsString(
            'já possui uma reserva',
            $response->json('errors.booking_conflict.0')
        );
    }

    public function test_cancelled_booking_does_not_block_new_booking(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $token2 = $user2->createApiToken('test2');

        $space = Space::factory()->create(['is_active' => true, 'opening_hours' => null]);

        $start = Carbon::now()->addDays(4)->setHour(10)->setMinute(0)->setSecond(0);
        $end = (clone $start)->addHours(2);

        // Reserva anterior CANCELADA
        Booking::create([
            'user_id' => $user1->id,
            'space_id' => $space->id,
            'start_time' => $start,
            'end_time' => $end,
            'total_price' => 80.00,
            'status' => Booking::STATUS_CANCELLED,
        ]);

        // Novo usuário tenta reservar o mesmo horário
        $response = $this->withHeader('Authorization', "Bearer {$token2}")
            ->postJson("/api/spaces/{$space->id}/bookings", [
                'start_time' => $start->toIso8601String(),
                'end_time' => $end->toIso8601String(),
            ]);

        $response->assertStatus(201);
    }

    public function test_booking_outside_space_working_hours_fails(): void
    {
        $user = User::factory()->create();
        $token = $user->createApiToken('test');

        // Espaço só abre de segunda a sexta das 08:00 às 18:00
        $space = Space::factory()->create([
            'is_active' => true,
            'opening_hours' => array_map(fn ($day) => [
                'day' => $day,
                'enabled' => $day >= 1 && $day <= 5,
                'from' => '08:00',
                'to' => '18:00',
            ], range(0, 6)),
        ]);

        // Próximo domingo
        $sunday = Carbon::now()->next(Carbon::SUNDAY)->setHour(10)->setMinute(0)->setSecond(0);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/spaces/{$space->id}/bookings", [
                'start_time' => $sunday->toIso8601String(),
                'end_time' => (clone $sunday)->addHours(2)->toIso8601String(),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['start_time']);
    }

    public function test_user_can_list_their_own_bookings(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $token1 = $user1->createApiToken('test1');

        $space = Space::factory()->create(['is_active' => true]);

        Booking::factory()->count(3)->create(['user_id' => $user1->id, 'space_id' => $space->id]);
        Booking::factory()->count(2)->create(['user_id' => $user2->id, 'space_id' => $space->id]);

        $response = $this->withHeader('Authorization', "Bearer {$token1}")
            ->getJson('/api/bookings');

        $response->assertStatus(200);
        $this->assertCount(3, $response->json('data'));
    }

    public function test_user_can_cancel_their_own_booking(): void
    {
        $user = User::factory()->create();
        $token = $user->createApiToken('test');

        $space = Space::factory()->create(['is_active' => true]);
        $booking = Booking::factory()->create([
            'user_id' => $user->id,
            'space_id' => $space->id,
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/bookings/{$booking->id}/cancel", [
                'reason' => 'Imprevisto de trabalho.',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Reserva cancelada com sucesso.',
                'booking' => [
                    'id' => $booking->id,
                    'status' => Booking::STATUS_CANCELLED,
                ],
            ]);

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => Booking::STATUS_CANCELLED,
        ]);
    }

    public function test_user_cannot_cancel_other_users_booking(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $token2 = $user2->createApiToken('test2');

        $space = Space::factory()->create(['is_active' => true]);
        $booking = Booking::factory()->create([
            'user_id' => $user1->id,
            'space_id' => $space->id,
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token2}")
            ->postJson("/api/bookings/{$booking->id}/cancel");

        $response->assertForbidden()
            ->assertJsonPath('message', 'Acesso não autorizado a esta reserva.');

        $this->withHeader('Authorization', "Bearer {$token2}")
            ->deleteJson("/api/bookings/{$booking->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => Booking::STATUS_CONFIRMED,
        ]);
    }

    public function test_admin_can_cancel_another_users_booking(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $booking = Booking::factory()->create(['status' => Booking::STATUS_CONFIRMED]);

        $this->withToken($admin->createApiToken('test'))
            ->postJson("/api/bookings/{$booking->id}/cancel")
            ->assertOk()
            ->assertJsonPath('booking.status', Booking::STATUS_CANCELLED);
    }

    public function test_owner_cannot_cancel_a_completed_booking(): void
    {
        $owner = User::factory()->create();
        $booking = Booking::factory()->create([
            'user_id' => $owner->id,
            'status' => Booking::STATUS_COMPLETED,
        ]);

        $this->withToken($owner->createApiToken('test'))
            ->postJson("/api/bookings/{$booking->id}/cancel")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('booking');
    }

    public function test_preview_endpoint_returns_pricing_and_availability(): void
    {
        $space = Space::factory()->create([
            'is_active' => true,
            'hourly_price' => 60.00,
            'opening_hours' => null,
        ]);

        $start = Carbon::now()->addDays(5)->setHour(9)->setMinute(0)->setSecond(0);
        $end = (clone $start)->addHours(4); // 4 * 60 = 240.00

        $response = $this->postJson("/api/spaces/{$space->id}/bookings/preview", [
            'start_time' => $start->toIso8601String(),
            'end_time' => $end->toIso8601String(),
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'available' => true,
                'total_price' => 240.00,
                'duration_hours' => 4,
            ]);
    }

    public function test_preview_and_creation_reject_an_inactive_space(): void
    {
        $space = Space::factory()->create(['is_active' => false]);
        $user = User::factory()->create();
        $url = "/api/spaces/{$space->id}/bookings";
        $period = ['start_time' => now()->addDay()->toIso8601String(), 'end_time' => now()->addDays(2)->toIso8601String()];

        $this->postJson("{$url}/preview", $period)->assertUnprocessable()
            ->assertJsonPath('available', false)
            ->assertJsonValidationErrors(['space_id']);
        $this->withToken($user->createApiToken('test'))->postJson($url, $period)
            ->assertUnprocessable()->assertJsonValidationErrors(['space_id']);
    }

    public function test_booking_filter_and_cancel_inputs_are_validated(): void
    {
        $user = User::factory()->create();
        $booking = Booking::factory()->for($user)->create();
        $this->withToken($user->createApiToken('test'));

        $this->getJson('/api/bookings?page=0&per_page=101&status=unknown&sort=unknown')
            ->assertUnprocessable()->assertJsonValidationErrors(['page', 'per_page', 'status', 'sort']);
        $this->postJson("/api/bookings/{$booking->id}/cancel", ['reason' => ['invalid']])
            ->assertUnprocessable()->assertJsonValidationErrors(['reason']);
        $this->assertSame(Booking::STATUS_CONFIRMED, $booking->refresh()->status);
    }

    public function test_offsetless_booking_uses_the_space_schedule_timezone(): void
    {
        $user = User::factory()->create();
        $space = Space::factory()->create(['opening_hours' => null]);
        $start = Carbon::now('America/Sao_Paulo')->addDays(5)->setTime(9, 0);

        $this->withToken($user->createApiToken('test'))
            ->postJson("/api/spaces/{$space->id}/bookings", [
                'start_time' => $start->format('Y-m-d\TH:i:s'),
                'end_time' => $start->copy()->addHour()->format('Y-m-d\TH:i:s'),
            ])
            ->assertCreated()
            ->assertJsonPath('data.start_time', $start->copy()->utc()->toIso8601String());
    }

    public function test_space_and_booking_responses_expose_the_configured_schedule_timezone(): void
    {
        config(['coworking.timezone' => 'Europe/Paris']);
        $user = User::factory()->create();
        $space = Space::factory()->create(['opening_hours' => null]);
        $start = Carbon::now('Europe/Paris')->addDays(5)->setTime(9, 0);
        $end = $start->copy()->addHours(4);
        $payload = [
            'start_time' => $start->format('Y-m-d\TH:i:s'),
            'end_time' => $end->format('Y-m-d\TH:i:s'),
        ];

        $this->getJson("/api/spaces/{$space->id}")->assertOk()
            ->assertJsonPath('data.timezone', 'Europe/Paris');
        $this->postJson("/api/spaces/{$space->id}/bookings/preview", $payload)->assertOk()
            ->assertJsonPath('duration_hours', 4);
        $this->withToken($user->createApiToken('test'))
            ->postJson("/api/spaces/{$space->id}/bookings", $payload)->assertCreated();
        $this->getJson('/api/bookings')->assertOk()
            ->assertJsonPath('data.0.timezone', 'Europe/Paris')
            ->assertJsonPath('data.0.start_time', $start->copy()->utc()->toIso8601String())
            ->assertJsonPath('data.0.end_time', $end->copy()->utc()->toIso8601String());
    }

    public function test_writes_across_both_booking_contracts_share_a_rate_limit(): void
    {
        $user = User::factory()->create();
        $space = Space::factory()->create();
        $this->withToken($user->createApiToken('test'));

        for ($i = 0; $i < 20; $i++) {
            $this->postJson("/api/spaces/{$space->id}/bookings", [])->assertUnprocessable();
        }

        $this->postJson("/api/spaces/{$space->id}/reservations", [])->assertTooManyRequests()
            ->assertJsonStructure(['message']);
    }

    public function test_admin_booking_filters_validate_dates_and_paginate_in_requested_order(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $date = now()->addWeek()->startOfDay();
        $early = Booking::factory()->create(['start_time' => $date, 'end_time' => $date->copy()->addHour()]);
        Booking::factory()->create(['start_time' => $date->copy()->addDay(), 'end_time' => $date->copy()->addDays(2)]);
        $this->withToken($admin->createApiToken('test'));

        $this->getJson('/api/admin/bookings?from_date=2026-11-20&to_date=2026-11-19&search%5B%5D=invalid')
            ->assertUnprocessable()->assertJsonValidationErrors(['to_date', 'search']);
        $this->getJson('/api/admin/bookings?sort=start_asc&per_page=1')
            ->assertOk()->assertJsonPath('data.0.id', $early->id)
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('meta.total', 2);
    }
}
