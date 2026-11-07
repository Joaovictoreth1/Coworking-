<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Space;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FavoriteTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_favorite_and_unfavorite_space(): void
    {
        $user = User::factory()->create();
        $token = $user->createApiToken('test');
        $space = Space::factory()->create(['is_active' => true]);

        // Favoritar
        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/spaces/{$space->id}/favorite");

        $response->assertStatus(200)
            ->assertJson(['favorited' => true]);

        $this->assertDatabaseHas('favorites', [
            'user_id' => $user->id,
            'space_id' => $space->id,
        ]);

        // Listar favoritos
        $listResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/favorites');

        $listResponse->assertStatus(200);
        $this->assertCount(1, $listResponse->json('data'));

        // Desfavoritar
        $deleteResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/spaces/{$space->id}/favorite");

        $deleteResponse->assertStatus(200)
            ->assertJson(['favorited' => false]);

        $this->assertDatabaseMissing('favorites', [
            'user_id' => $user->id,
            'space_id' => $space->id,
        ]);
    }

    public function test_unauthenticated_user_cannot_favorite(): void
    {
        $space = Space::factory()->create(['is_active' => true]);

        $response = $this->postJson("/api/spaces/{$space->id}/favorite");

        $response->assertStatus(401);
    }
}

