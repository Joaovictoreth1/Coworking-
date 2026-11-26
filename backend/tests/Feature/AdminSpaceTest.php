<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Space;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSpaceTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_user_can_create_new_space(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $token = $admin->createApiToken('admin-test');

        $schedule = array_map(fn ($day) => [
            'day' => $day,
            'enabled' => $day >= 1 && $day <= 5,
            'from' => '08:00',
            'to' => '18:00',
        ], range(0, 6));

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/admin/spaces', [
                'name' => 'Sala Premium Paulista',
                'description' => 'Espaço corporativo com infraestrutura completa.',
                'capacity' => 15,
                'zip_code' => '01310-200',
                'street' => 'Av. Paulista',
                'number' => '1000',
                'city' => 'São Paulo',
                'state' => 'SP',
                'hourly_price' => 75.00,
                'daily_price' => 350.00,
                'is_active' => true,
                'amenities' => ['wifi', 'coffee', 'projector'],
                'opening_hours' => $schedule,
                'availability' => $schedule,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'name' => 'Sala Premium Paulista',
                    'capacity' => 15,
                ],
            ]);

        $this->assertDatabaseHas('spaces', ['name' => 'Sala Premium Paulista']);
    }

    public function test_regular_user_cannot_create_space(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_USER]);
        $token = $user->createApiToken('user-test');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/admin/spaces', [
                'name' => 'Tentativa de Criar Sala',
                'description' => 'Tentativa não autorizada.',
                'capacity' => 10,
                'zip_code' => '01310-200',
                'street' => 'Rua Teste',
                'number' => '10',
                'city' => 'São Paulo',
                'state' => 'SP',
            ]);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('spaces', ['name' => 'Tentativa de Criar Sala']);
    }

    public function test_admin_can_access_metrics(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $token = $admin->createApiToken('admin-test');

        Space::factory()->count(3)->create(['is_active' => true]);
        Booking::factory()->count(2)->create(['status' => Booking::STATUS_CONFIRMED]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/metrics');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'total_bookings',
                'confirmed_bookings',
                'total_revenue',
                'active_spaces',
                'occupancy_rate',
            ]);
    }

    public function test_admin_can_update_booking_status(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $token = $admin->createApiToken('admin-test');

        $booking = Booking::factory()->create(['status' => Booking::STATUS_PENDING]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/admin/bookings/{$booking->id}/status", [
                'status' => Booking::STATUS_CONFIRMED,
                'notes' => 'Aprovado pelo administrador.',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'booking' => [
                    'id' => $booking->id,
                    'status' => Booking::STATUS_CONFIRMED,
                ],
            ]);

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => Booking::STATUS_CONFIRMED,
        ]);
    }

    public function test_regular_user_cannot_access_admin_bookings_or_metrics(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_USER]);
        $token = $user->createApiToken('user-test');
        $booking = Booking::factory()->create(['status' => Booking::STATUS_PENDING]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/bookings')
            ->assertStatus(403);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/admin/bookings/{$booking->id}/status", [
                'status' => Booking::STATUS_CONFIRMED,
            ])
            ->assertStatus(403);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/metrics')
            ->assertStatus(403);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/dashboard')
            ->assertStatus(403);
    }

    public function test_admin_cannot_reactivate_cancelled_booking_when_slot_is_taken(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $token = $admin->createApiToken('admin-test');

        $space = Space::factory()->create(['is_active' => true, 'opening_hours' => null]);
        $start = now()->addDays(4)->setHour(10)->setMinute(0)->setSecond(0);
        $end = (clone $start)->addHours(2);

        $cancelled = Booking::factory()->create([
            'space_id' => $space->id,
            'start_time' => $start,
            'end_time' => $end,
            'status' => Booking::STATUS_CANCELLED,
        ]);

        Booking::factory()->create([
            'space_id' => $space->id,
            'start_time' => $start,
            'end_time' => $end,
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/admin/bookings/{$cancelled->id}/status", [
                'status' => Booking::STATUS_CONFIRMED,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['booking_conflict']);
    }
}
