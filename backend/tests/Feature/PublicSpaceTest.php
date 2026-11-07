<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Space;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicSpaceTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_active_spaces(): void
    {
        Space::factory()->count(3)->create(['is_active' => true]);
        Space::factory()->count(2)->inactive()->create();

        $response = $this->getJson('/api/spaces');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'street', 'city', 'state', 'is_active'],
                ],
            ]);

        $data = $response->json('data');
        $this->assertCount(3, $data);
    }

    public function test_can_search_spaces_by_name_or_city(): void
    {
        Space::factory()->create([
            'name' => 'Hub Faria Lima',
            'city' => 'São Paulo',
            'is_active' => true,
        ]);

        Space::factory()->create([
            'name' => 'Espaço Ipanema',
            'city' => 'Rio de Janeiro',
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/spaces?q=Faria');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertSame('Hub Faria Lima', $data[0]['name']);
    }

    public function test_can_filter_free_spaces(): void
    {
        Space::factory()->create(['is_free' => false, 'is_active' => true]);
        Space::factory()->free()->create(['name' => 'Biblioteca Aberta', 'is_active' => true]);

        $response = $this->getJson('/api/spaces?price_type=free');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertSame('Biblioteca Aberta', $data[0]['name']);
    }

    public function test_can_sort_spaces_by_price_asc(): void
    {
        Space::factory()->create(['hourly_price' => 100, 'daily_price' => null, 'monthly_price' => null, 'is_active' => true]);
        Space::factory()->free()->create(['is_active' => true]);
        Space::factory()->create(['hourly_price' => 30, 'daily_price' => null, 'monthly_price' => null, 'is_active' => true]);

        $response = $this->getJson('/api/spaces?sort=price_asc');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(3, $data);
        $this->assertTrue($data[0]['is_free']);
    }

    public function test_can_show_active_space_details(): void
    {
        $space = Space::factory()->create(['is_active' => true]);

        $response = $this->getJson("/api/spaces/{$space->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $space->id,
                    'name' => $space->name,
                ],
            ]);
    }

    public function test_cannot_show_inactive_space(): void
    {
        $space = Space::factory()->inactive()->create();

        $response = $this->getJson("/api/spaces/{$space->id}");

        $response->assertStatus(404);
    }
}
