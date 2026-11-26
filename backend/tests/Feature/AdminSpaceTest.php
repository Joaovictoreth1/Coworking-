<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Space;
use App\Models\SpacePhoto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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

    public function test_space_owner_can_update_own_space_while_stranger_gets_404(): void
    {
        $owner = User::factory()->create(['role' => User::ROLE_USER]);
        $stranger = User::factory()->create(['role' => User::ROLE_USER]);
        $space = Space::factory()->create(['user_id' => $owner->id, 'name' => 'Sala Original']);

        $schedule = $this->validSchedule();
        $payload = [
            'name' => 'Sala Atualizada',
            'street' => 'Av. Paulista',
            'city' => 'São Paulo',
            'state' => 'SP',
            'hourly_price' => 50.0,
            'is_active' => true,
            'opening_hours' => $schedule,
            'availability' => $schedule,
        ];

        $this->withHeader('Authorization', 'Bearer '.$stranger->createApiToken('stranger'))
            ->putJson("/api/admin/spaces/{$space->id}", $payload)
            ->assertStatus(404);

        $this->withHeader('Authorization', 'Bearer '.$owner->createApiToken('owner'))
            ->putJson("/api/admin/spaces/{$space->id}", $payload)
            ->assertStatus(200)
            ->assertJsonPath('data.name', 'Sala Atualizada');
    }

    public function test_availability_outside_opening_hours_is_rejected(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $token = $admin->createApiToken('admin-test');

        $opening = $this->validSchedule('09:00', '18:00');
        $availability = $this->validSchedule('08:00', '19:00');
        // Também marca domingo (fechado em opening_hours) como disponível
        $availability[0] = ['day' => 0, 'enabled' => true, 'from' => '10:00', 'to' => '12:00'];

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/admin/spaces', [
                'name' => 'Sala Horário Inválido',
                'street' => 'Av. Paulista',
                'city' => 'São Paulo',
                'state' => 'SP',
                'hourly_price' => 60.0,
                'is_active' => true,
                'opening_hours' => $opening,
                'availability' => $availability,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'availability.0.from',
                'availability.1.from',
                'availability.1.to',
            ]);
    }

    public function test_cannot_delete_space_with_active_future_bookings_but_can_delete_otherwise(): void
    {
        Storage::fake('public');

        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $token = $admin->createApiToken('admin-test');
        $space = Space::factory()->create(['user_id' => $admin->id]);

        Storage::disk('public')->put("spaces/{$space->id}/photo.jpg", 'fake-image');
        $photo = SpacePhoto::create([
            'space_id' => $space->id,
            'path' => "spaces/{$space->id}/photo.jpg",
            'original_name' => 'photo.jpg',
            'position' => 0,
        ]);

        $booking = Booking::factory()->create([
            'space_id' => $space->id,
            'start_time' => now()->addDays(2),
            'end_time' => now()->addDays(2)->addHours(2),
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/admin/spaces/{$space->id}")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['space']);

        $this->assertDatabaseHas('spaces', ['id' => $space->id]);
        Storage::disk('public')->assertExists($photo->path);

        // Após cancelar a reserva futura, a exclusão é permitida e remove o arquivo do disco
        $booking->update(['status' => Booking::STATUS_CANCELLED]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/admin/spaces/{$space->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('spaces', ['id' => $space->id]);
        Storage::disk('public')->assertMissing($photo->path);
    }

    public function test_photo_upload_reorder_validation_and_delete(): void
    {
        Storage::fake('public');

        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $token = $admin->createApiToken('admin-test');
        $space = Space::factory()->create(['user_id' => $admin->id]);
        $otherSpace = Space::factory()->create(['user_id' => $admin->id]);

        $foreignPhoto = SpacePhoto::create([
            'space_id' => $otherSpace->id,
            'path' => "spaces/{$otherSpace->id}/other.jpg",
            'original_name' => 'other.jpg',
            'position' => 0,
        ]);

        // PNG 1x1 válido sem depender da extensão GD no ambiente de testes
        $pngBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', true);

        $upload = $this->withHeader('Authorization', "Bearer {$token}")
            ->post("/api/admin/spaces/{$space->id}/photos", [
                'photos' => [
                    UploadedFile::fake()->createWithContent('a.png', $pngBytes),
                    UploadedFile::fake()->createWithContent('b.png', $pngBytes),
                ],
            ]);

        $upload->assertStatus(201);
        $ids = collect($upload->json('data.photos'))->pluck('id')->all();
        $this->assertCount(2, $ids);

        // IDs duplicados -> 422
        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/admin/spaces/{$space->id}/photos/order", [
                'ids' => [$ids[0], $ids[0]],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['ids.1']);

        // ID de outro espaço -> 422
        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/admin/spaces/{$space->id}/photos/order", [
                'ids' => [$ids[1], $foreignPhoto->id],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['ids']);

        // Reordenação válida altera a capa
        $reordered = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/admin/spaces/{$space->id}/photos/order", [
                'ids' => [$ids[1], $ids[0]],
            ]);

        $reordered->assertStatus(200);
        $this->assertSame([$ids[1], $ids[0]], collect($reordered->json('data.photos'))->pluck('id')->all());

        // Remoção apaga arquivo e compacta posição da foto restante
        $removedPath = SpacePhoto::findOrFail($ids[1])->path;
        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/admin/spaces/{$space->id}/photos/{$ids[1]}")
            ->assertStatus(200);

        Storage::disk('public')->assertMissing($removedPath);
        $this->assertSame(0, SpacePhoto::findOrFail($ids[0])->position);
    }

    private function validSchedule(string $from = '08:00', string $to = '18:00'): array
    {
        return array_map(fn ($day) => [
            'day' => $day,
            'enabled' => $day >= 1 && $day <= 5,
            'from' => $from,
            'to' => $to,
        ], range(0, 6));
    }
}
