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

    public function test_global_booking_routes_require_administrator_role(): void
    {
        $booking = Booking::factory()->create(['status' => Booking::STATUS_PENDING]);
        $statusUrl = "/api/admin/bookings/{$booking->id}/status";
        $statusPayload = ['status' => Booking::STATUS_CANCELLED];
        $readUrls = ['/api/admin/bookings', '/api/admin/metrics', '/api/admin/dashboard'];

        foreach ($readUrls as $url) {
            $this->getJson($url)->assertUnauthorized();
        }
        $this->patchJson($statusUrl, $statusPayload)->assertUnauthorized();

        $customer = User::factory()->create(['role' => User::ROLE_USER]);
        $this->withToken($customer->createApiToken('customer-test'));
        foreach ($readUrls as $url) {
            $this->getJson($url)->assertForbidden();
        }
        $this->patchJson($statusUrl, $statusPayload)->assertForbidden();
        $this->assertSame(Booking::STATUS_PENDING, $booking->refresh()->status);

        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $this->withToken($admin->createApiToken('admin-test'));
        foreach ($readUrls as $url) {
            $this->getJson($url)->assertOk();
        }
        $this->patchJson($statusUrl, $statusPayload)->assertOk();
    }

    public function test_space_owner_access_is_not_restricted_to_administrators(): void
    {
        $owner = User::factory()->create(['role' => User::ROLE_USER]);
        $space = Space::factory()->for($owner)->create();
        $otherSpace = Space::factory()->create();

        $this->withToken($owner->createApiToken('owner-test'))
            ->getJson("/api/admin/spaces/{$space->id}")
            ->assertOk();
        $this->getJson("/api/admin/spaces/{$space->id}/reservations")->assertOk();
        $this->getJson("/api/admin/spaces/{$otherSpace->id}")->assertNotFound();

        $fields = $space->only(['street', 'city', 'state', 'hourly_price', 'opening_hours', 'availability', 'is_active']);
        $fields['name'] = 'Sala reformada';
        $this->putJson("/api/admin/spaces/{$space->id}", $fields)->assertOk();
        $this->assertSame('Sala reformada', $space->refresh()->name);
        $this->putJson("/api/admin/spaces/{$otherSpace->id}", $fields)->assertNotFound();
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
