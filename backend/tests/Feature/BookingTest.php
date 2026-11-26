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

    public function test_authenticated_user_can_create_booking_successfully(): void
    {
        $user = User::factory()->create();
        $token = $user->createApiToken('test');

        $space = Space::factory()->create([
            'is_active' => true,
            'hourly_price' => 50.00,
            'opening_hours' => null,
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
                    'cancelled_at',
                    'cancellation_reason',
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

    public function test_booking_fails_with_409_when_time_overlaps_existing_booking(): void
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

        Booking::create([
            'user_id' => $user1->id,
            'space_id' => $space->id,
            'start_time' => $existingStart,
            'end_time' => $existingEnd,
            'total_price' => 160.00,
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        $overlapStart = (clone $existingStart)->addHour(); // 15:00
        $overlapEnd = (clone $overlapStart)->addHours(2); // 17:00

        $response = $this->withHeader('Authorization', "Bearer {$token2}")
            ->postJson("/api/spaces/{$space->id}/bookings", [
                'start_time' => $overlapStart->toIso8601String(),
                'end_time' => $overlapEnd->toIso8601String(),
            ]);

        $response->assertStatus(409)
            ->assertJsonPath('errors.booking_conflict.0', fn (string $msg) => str_contains($msg, 'já possui uma reserva'));
    }

    public function test_adjacent_bookings_do_not_conflict(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $token2 = $user2->createApiToken('test2');

        $space = Space::factory()->create(['is_active' => true, 'opening_hours' => null]);

        $firstStart = Carbon::now()->addDays(3)->setHour(10)->setMinute(0)->setSecond(0);
        $firstEnd = (clone $firstStart)->addHours(2); // 10:00 - 12:00

        Booking::create([
            'user_id' => $user1->id,
            'space_id' => $space->id,
            'start_time' => $firstStart,
            'end_time' => $firstEnd,
            'total_price' => 100.00,
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token2}")
            ->postJson("/api/spaces/{$space->id}/bookings", [
                'start_time' => $firstEnd->toIso8601String(),
                'end_time' => (clone $firstEnd)->addHours(2)->toIso8601String(),
            ]);

        $response->assertStatus(201);
    }

    public function test_cancelled_booking_does_not_block_new_booking(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $token2 = $user2->createApiToken('test2');

        $space = Space::factory()->create(['is_active' => true, 'opening_hours' => null]);

        $start = Carbon::now()->addDays(4)->setHour(10)->setMinute(0)->setSecond(0);
        $end = (clone $start)->addHours(2);

        Booking::create([
            'user_id' => $user1->id,
            'space_id' => $space->id,
            'start_time' => $start,
            'end_time' => $end,
            'total_price' => 80.00,
            'status' => Booking::STATUS_CANCELLED,
        ]);

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

        $space = Space::factory()->create([
            'is_active' => true,
            'opening_hours' => array_map(fn ($day) => [
                'day' => $day,
                'enabled' => $day >= 1 && $day <= 5,
                'from' => '08:00',
                'to' => '18:00',
            ], range(0, 6)),
        ]);

        $sunday = Carbon::now()->next(Carbon::SUNDAY)->setHour(10)->setMinute(0)->setSecond(0);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/spaces/{$space->id}/bookings", [
                'start_time' => $sunday->toIso8601String(),
                'end_time' => (clone $sunday)->addHours(2)->toIso8601String(),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['start_time']);
    }

    public function test_multiday_booking_crossing_closed_day_fails_with_422(): void
    {
        $user = User::factory()->create();
        $token = $user->createApiToken('test');

        $space = Space::factory()->create([
            'is_active' => true,
            'opening_hours' => array_map(fn ($day) => [
                'day' => $day,
                'enabled' => $day >= 1 && $day <= 5,
                'from' => '08:00',
                'to' => '18:00',
            ], range(0, 6)),
        ]);

        $friday = Carbon::now()->next(Carbon::FRIDAY)->setHour(10)->setMinute(0)->setSecond(0);
        $monday = (clone $friday)->addDays(3)->setHour(12)->setMinute(0)->setSecond(0);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/spaces/{$space->id}/bookings", [
                'start_time' => $friday->toIso8601String(),
                'end_time' => $monday->toIso8601String(),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['start_time']);
    }

    public function test_booking_invalid_payloads_return_422(): void
    {
        $user = User::factory()->create();
        $token = $user->createApiToken('test');
        $space = Space::factory()->create(['is_active' => true, 'opening_hours' => null]);

        // Campos obrigatórios ausentes
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/spaces/{$space->id}/bookings", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['start_time', 'end_time']);

        // Horário no passado e término anterior ao início
        $past = Carbon::now()->subHours(2);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/spaces/{$space->id}/bookings", [
                'start_time' => $past->toIso8601String(),
                'end_time' => (clone $past)->subHour()->toIso8601String(),
                'notes' => str_repeat('a', 1001),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['start_time', 'end_time', 'notes']);
    }

    public function test_booking_inactive_space_fails_with_422(): void
    {
        $user = User::factory()->create();
        $token = $user->createApiToken('test');
        $space = Space::factory()->create(['is_active' => false, 'opening_hours' => null]);

        $start = Carbon::now()->addDays(2)->setHour(10)->setMinute(0)->setSecond(0);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/spaces/{$space->id}/bookings", [
                'start_time' => $start->toIso8601String(),
                'end_time' => (clone $start)->addHours(2)->toIso8601String(),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['space_id']);
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
                    'cancellation_reason' => 'Imprevisto de trabalho.',
                ],
            ]);

        $this->assertNotNull($response->json('booking.cancelled_at'));

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => Booking::STATUS_CANCELLED,
            'cancellation_reason' => 'Imprevisto de trabalho.',
        ]);
    }

    public function test_cancelling_already_cancelled_or_completed_booking_returns_409(): void
    {
        $user = User::factory()->create();
        $token = $user->createApiToken('test');
        $space = Space::factory()->create(['is_active' => true]);

        $cancelled = Booking::factory()->create([
            'user_id' => $user->id,
            'space_id' => $space->id,
            'status' => Booking::STATUS_CANCELLED,
        ]);

        $completed = Booking::factory()->create([
            'user_id' => $user->id,
            'space_id' => $space->id,
            'status' => Booking::STATUS_COMPLETED,
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/bookings/{$cancelled->id}/cancel")
            ->assertStatus(409);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/bookings/{$completed->id}/cancel")
            ->assertStatus(409);
    }

    public function test_cancel_rejects_excessively_long_reason_with_422(): void
    {
        $user = User::factory()->create();
        $token = $user->createApiToken('test');
        $space = Space::factory()->create(['is_active' => true]);
        $booking = Booking::factory()->create([
            'user_id' => $user->id,
            'space_id' => $space->id,
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/bookings/{$booking->id}/cancel", [
                'reason' => str_repeat('x', 501),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);
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

        $response->assertStatus(403);
    }

    public function test_user_cannot_view_other_users_booking(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $token2 = $user2->createApiToken('test2');

        $space = Space::factory()->create(['is_active' => true]);
        $booking = Booking::factory()->create([
            'user_id' => $user1->id,
            'space_id' => $space->id,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token2}")
            ->getJson("/api/bookings/{$booking->id}");

        $response->assertStatus(403);
    }

    public function test_admin_can_view_and_cancel_other_users_booking(): void
    {
        $owner = User::factory()->create(['role' => User::ROLE_USER]);
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $adminToken = $admin->createApiToken('admin-test');

        $space = Space::factory()->create(['is_active' => true]);
        $booking = Booking::factory()->create([
            'user_id' => $owner->id,
            'space_id' => $space->id,
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->getJson("/api/bookings/{$booking->id}")
            ->assertStatus(200);

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/bookings/{$booking->id}/cancel", ['reason' => 'Cancelado pelo admin'])
            ->assertStatus(200)
            ->assertJson(['booking' => ['status' => Booking::STATUS_CANCELLED]]);
    }

    public function test_booking_in_the_past_is_rejected_on_store_and_preview(): void
    {
        $user = User::factory()->create();
        $token = $user->createApiToken('test');
        $space = Space::factory()->create(['is_active' => true, 'opening_hours' => null]);

        $pastStart = Carbon::now()->subHours(3);
        $pastEnd = Carbon::now()->subHour();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/spaces/{$space->id}/bookings", [
                'start_time' => $pastStart->toIso8601String(),
                'end_time' => $pastEnd->toIso8601String(),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['start_time']);

        $this->postJson("/api/spaces/{$space->id}/bookings/preview", [
            'start_time' => $pastStart->toIso8601String(),
            'end_time' => $pastEnd->toIso8601String(),
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['start_time']);
    }

    public function test_booking_with_end_time_before_or_equal_start_time_is_rejected(): void
    {
        $user = User::factory()->create();
        $token = $user->createApiToken('test');
        $space = Space::factory()->create(['is_active' => true, 'opening_hours' => null]);

        $start = Carbon::now()->addDays(2)->setHour(14)->setMinute(0)->setSecond(0);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/spaces/{$space->id}/bookings", [
                'start_time' => $start->toIso8601String(),
                'end_time' => $start->toIso8601String(),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['end_time']);

        $this->postJson("/api/spaces/{$space->id}/bookings/preview", [
            'start_time' => $start->toIso8601String(),
            'end_time' => (clone $start)->subHour()->toIso8601String(),
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['end_time']);
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
                'conflict' => false,
                'total_price' => 240.00,
                'duration_hours' => 4,
            ]);
    }

    public function test_preview_returns_409_on_overlap_and_422_on_inactive_space(): void
    {
        $user = User::factory()->create();
        $space = Space::factory()->create(['is_active' => true, 'opening_hours' => null]);
        $inactive = Space::factory()->create(['is_active' => false, 'opening_hours' => null]);

        $start = Carbon::now()->addDays(5)->setHour(10)->setMinute(0)->setSecond(0);
        $end = (clone $start)->addHours(2);

        Booking::create([
            'user_id' => $user->id,
            'space_id' => $space->id,
            'start_time' => $start,
            'end_time' => $end,
            'total_price' => 100.00,
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        $this->postJson("/api/spaces/{$space->id}/bookings/preview", [
            'start_time' => $start->toIso8601String(),
            'end_time' => $end->toIso8601String(),
        ])
            ->assertStatus(409)
            ->assertJson([
                'available' => false,
                'conflict' => true,
            ]);

        $this->postJson("/api/spaces/{$inactive->id}/bookings/preview", [
            'start_time' => $start->toIso8601String(),
            'end_time' => $end->toIso8601String(),
        ])
            ->assertStatus(422)
            ->assertJson([
                'available' => false,
                'conflict' => false,
            ]);
    }

    public function test_nonexistent_booking_returns_clean_404_json(): void
    {
        $user = User::factory()->create();
        $token = $user->createApiToken('test');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/bookings/999999')
            ->assertStatus(404)
            ->assertJson(['message' => 'Recurso não encontrado.']);
    }

    public function test_daily_availability_returns_window_and_only_active_bookings_without_pii(): void
    {
        $day = Carbon::now('America/Sao_Paulo')->addDays(2)->startOfDay();
        $space = Space::factory()->create([
            'is_active' => true,
            'opening_hours' => [
                ['day' => $day->dayOfWeek, 'enabled' => true, 'from' => '08:00', 'to' => '18:00'],
            ],
        ]);
        $user = User::factory()->create();

        Booking::factory()->create([
            'user_id' => $user->id,
            'space_id' => $space->id,
            'start_time' => $day->copy()->setTime(9, 0)->utc(),
            'end_time' => $day->copy()->setTime(11, 0)->utc(),
            'status' => Booking::STATUS_CONFIRMED,
            'notes' => 'Confidencial',
        ]);

        Booking::factory()->create([
            'user_id' => $user->id,
            'space_id' => $space->id,
            'start_time' => $day->copy()->setTime(14, 0)->utc(),
            'end_time' => $day->copy()->setTime(16, 0)->utc(),
            'status' => Booking::STATUS_CANCELLED,
        ]);

        $response = $this->getJson("/api/spaces/{$space->id}/bookings/availability?date={$day->format('Y-m-d')}");

        $response->assertOk()
            ->assertJson([
                'date' => $day->format('Y-m-d'),
                'open' => true,
                'window' => ['from' => '08:00', 'to' => '18:00'],
            ])
            ->assertJsonCount(1, 'busy');

        $busyItem = $response->json('busy.0');
        $this->assertArrayHasKey('start_time', $busyItem);
        $this->assertArrayHasKey('end_time', $busyItem);
        $this->assertArrayNotHasKey('user_id', $busyItem);
        $this->assertArrayNotHasKey('notes', $busyItem);
    }

    public function test_daily_availability_reports_closed_day_and_validates_date(): void
    {
        $day = Carbon::now('America/Sao_Paulo')->addDays(3)->startOfDay();
        $space = Space::factory()->create([
            'is_active' => true,
            'opening_hours' => [
                ['day' => $day->dayOfWeek, 'enabled' => false, 'from' => '08:00', 'to' => '18:00'],
            ],
        ]);
        $inactive = Space::factory()->create(['is_active' => false]);

        $this->getJson("/api/spaces/{$space->id}/bookings/availability?date={$day->format('Y-m-d')}")
            ->assertOk()
            ->assertJson([
                'open' => false,
                'window' => null,
                'busy' => [],
            ]);

        $this->getJson("/api/spaces/{$space->id}/bookings/availability?date=invalid-date")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['date']);

        $this->getJson("/api/spaces/{$inactive->id}/bookings/availability?date={$day->format('Y-m-d')}")
            ->assertStatus(404);
    }

    public function test_api_responses_include_security_headers_and_request_id(): void
    {
        $response = $this->withHeader('X-Request-ID', 'trace-abc-123')
            ->getJson('/api/spaces');

        $response->assertOk()
            ->assertHeader('X-Request-ID', 'trace-abc-123')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        $sanitized = $this->withHeader('X-Request-ID', 'invalid header with spaces!')
            ->getJson('/api/spaces');

        $sanitized->assertOk();
        $generatedId = $sanitized->headers->get('X-Request-ID');
        $this->assertNotNull($generatedId);
        $this->assertNotSame('invalid header with spaces!', $generatedId);
    }
}
