<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Space;
use App\Models\SpaceReview;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_anyone_can_list_reviews_and_summary_for_active_space(): void
    {
        $owner = User::factory()->create();
        $space = Space::factory()->create(['user_id' => $owner->id, 'is_active' => true]);
        $u1 = User::factory()->create();
        $u2 = User::factory()->create();

        SpaceReview::create(['space_id' => $space->id, 'user_id' => $u1->id, 'rating' => 5, 'comment' => 'Excelente!']);
        SpaceReview::create(['space_id' => $space->id, 'user_id' => $u2->id, 'rating' => 3, 'comment' => 'Bom.']);

        $this->getJson("/api/spaces/{$space->id}/reviews")
            ->assertStatus(200)
            ->assertJsonPath('summary.average', 4)
            ->assertJsonPath('summary.count', 2)
            ->assertJsonPath('summary.distribution.5', 1)
            ->assertJsonPath('summary.distribution.3', 1)
            ->assertJsonCount(2, 'data');
    }

    public function test_inactive_space_reviews_return_404(): void
    {
        $space = Space::factory()->create(['is_active' => false]);

        $this->getJson("/api/spaces/{$space->id}/reviews")
            ->assertStatus(404);
    }

    public function test_user_can_create_and_update_review_and_rejects_invalid_rating(): void
    {
        $owner = User::factory()->create();
        $space = Space::factory()->create(['user_id' => $owner->id, 'is_active' => true]);
        $user = User::factory()->create();
        $token = $user->createApiToken('review-test');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/spaces/{$space->id}/reviews", ['rating' => 6])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['rating']);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/spaces/{$space->id}/reviews", [
                'rating' => 4,
                'comment' => 'Ótima estrutura.',
            ])
            ->assertStatus(201)
            ->assertJsonPath('summary.average', 4)
            ->assertJsonPath('summary.count', 1);

        // Atualizar a própria avaliação retorna 200 sem duplicar registro
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/spaces/{$space->id}/reviews", [
                'rating' => 5,
                'comment' => 'Voltei e foi ainda melhor.',
            ])
            ->assertStatus(200)
            ->assertJsonPath('summary.average', 5)
            ->assertJsonPath('summary.count', 1);

        $this->assertSame(1, SpaceReview::where('space_id', $space->id)->where('user_id', $user->id)->count());
    }

    public function test_space_owner_cannot_review_own_space(): void
    {
        $owner = User::factory()->create();
        $space = Space::factory()->create(['user_id' => $owner->id, 'is_active' => true]);
        $token = $owner->createApiToken('owner-test');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/spaces/{$space->id}/reviews", ['rating' => 5])
            ->assertStatus(403);
    }

    public function test_review_deletion_allows_author_and_admin_but_blocks_strangers(): void
    {
        $owner = User::factory()->create();
        $space = Space::factory()->create(['user_id' => $owner->id, 'is_active' => true]);
        $author = User::factory()->create();
        $stranger = User::factory()->create();
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $review1 = SpaceReview::create(['space_id' => $space->id, 'user_id' => $author->id, 'rating' => 5]);
        $review2 = SpaceReview::create(['space_id' => $space->id, 'user_id' => $stranger->id, 'rating' => 2]);

        // Terceiro não pode remover avaliação alheia
        $this->withHeader('Authorization', 'Bearer '.$stranger->createApiToken('stranger'))
            ->deleteJson("/api/spaces/{$space->id}/reviews/{$review1->id}")
            ->assertStatus(404);

        // Autor pode remover a própria avaliação
        $this->withHeader('Authorization', 'Bearer '.$author->createApiToken('author'))
            ->deleteJson("/api/spaces/{$space->id}/reviews/{$review1->id}")
            ->assertStatus(200)
            ->assertJsonPath('summary.count', 1);

        // Admin pode moderar/remover avaliação de outro usuário
        $this->withHeader('Authorization', 'Bearer '.$admin->createApiToken('admin'))
            ->deleteJson("/api/spaces/{$space->id}/reviews/{$review2->id}")
            ->assertStatus(200)
            ->assertJsonPath('summary.count', 0)
            ->assertJsonPath('summary.average', null);
    }
}
