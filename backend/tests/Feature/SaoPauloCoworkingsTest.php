<?php

namespace Tests\Feature;

use App\Models\Space;
use App\Models\User;
use Database\Seeders\SaoPauloCoworkings2026Seeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SaoPauloCoworkingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_populates_sao_paulo_2026_coworkings_idempotently_with_coordinates(): void
    {
        $admin = User::factory()->create();
        $admin->forceFill(['role' => User::ROLE_ADMIN])->save();

        $this->seed(SaoPauloCoworkings2026Seeder::class);
        $expectedCount = count(SaoPauloCoworkings2026Seeder::COMPANIES);

        $this->assertSame($expectedCount, Space::where('city', 'São Paulo')->where('state', 'SP')->count());

        // Editar e desativar um espaço não deve ser sobrescrito ao rodar o seeder novamente
        $wework = Space::where('name', 'WeWork Paulista 1374')->firstOrFail();
        $wework->update(['hourly_price' => 99.00, 'is_active' => false]);

        $this->seed(SaoPauloCoworkings2026Seeder::class);
        $this->assertSame($expectedCount, Space::where('city', 'São Paulo')->where('state', 'SP')->count());

        $wework->refresh();
        $this->assertSame(99.0, (float) $wework->hourly_price);
        $this->assertFalse($wework->is_active);
        $this->assertNotNull($wework->latitude);
        $this->assertNotNull($wework->longitude);

        $wework->update(['is_active' => true]);

        $response = $this->getJson("/api/spaces/{$wework->id}");
        $response->assertOk()
            ->assertJsonPath('data.name', 'WeWork Paulista 1374')
            ->assertJsonPath('data.city', 'São Paulo')
            ->assertJsonPath('data.state', 'SP')
            ->assertJsonPath('data.latitude', -23.5629)
            ->assertJsonPath('data.longitude', -46.6544);
    }

    public function test_updating_address_without_new_coordinates_clears_stale_gps(): void
    {
        $admin = User::factory()->create();
        $admin->forceFill(['role' => User::ROLE_ADMIN])->save();
        $token = $admin->createApiToken('admin-test');

        $this->seed(SaoPauloCoworkings2026Seeder::class);
        $space = Space::where('name', 'WeWork Paulista 1374')->firstOrFail();

        $basePayload = [
            'name' => $space->name,
            'description' => $space->description,
            'capacity' => $space->capacity,
            'zip_code' => $space->zip_code,
            'street' => $space->street,
            'number' => $space->number,
            'complement' => $space->complement,
            'neighborhood' => $space->neighborhood,
            'city' => $space->city,
            'state' => $space->state,
            'latitude' => $space->latitude,
            'longitude' => $space->longitude,
            'hourly_price' => 60.00,
            'daily_price' => $space->daily_price,
            'monthly_price' => $space->monthly_price,
            'is_free' => false,
            'is_active' => true,
            'amenities' => $space->amenities,
            'opening_hours' => $space->opening_hours,
            'availability' => $space->availability,
        ];

        // Alterar apenas preço ou CEP mantém as coordenadas existentes
        $this->withToken($token)
            ->putJson("/api/admin/spaces/{$space->id}", [
                ...$basePayload,
                'zip_code' => '01310-916',
            ])
            ->assertOk()
            ->assertJsonPath('data.latitude', -23.5629)
            ->assertJsonPath('data.longitude', -46.6544);

        // Alterar endereço mantendo coordenadas antigas invalida o GPS obsoleto
        $this->withToken($token)
            ->putJson("/api/admin/spaces/{$space->id}", [
                ...$basePayload,
                'street' => 'Avenida Rebouças',
                'number' => '3970',
            ])
            ->assertOk()
            ->assertJsonPath('data.latitude', null)
            ->assertJsonPath('data.longitude', null);
    }

    public function test_public_search_sorts_all_pages_by_distance_before_paginating(): void
    {
        $admin = User::factory()->create();
        $admin->forceFill(['role' => User::ROLE_ADMIN])->save();

        $this->seed(SaoPauloCoworkings2026Seeder::class);

        // WeWork Paulista 1374 tem o menor ID (ficaria na página 2 na ordenação padrão latest('id') com 20 registros)
        $response = $this->getJson('/api/spaces?sort=distance&lat=-23.5629&lng=-46.6544');
        $response->assertOk()
            ->assertJsonPath('data.0.name', 'WeWork Paulista 1374');
    }
}
