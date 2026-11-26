<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Space;
use App\Models\SpacePhoto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SpacePhotoOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_complete_reorder_updates_the_cover_and_positions(): void
    {
        [$space, $first, $second, $token] = $this->gallery();

        $response = $this->withToken($token)->putJson("/api/admin/spaces/{$space->id}/photos/order", [
            'ids' => [$second->id, $first->id],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.photos.0.id', $second->id)
            ->assertJsonPath('data.photos.1.id', $first->id)
            ->assertJsonPath('data.cover_url', route('photos.show', $second));
        $this->assertDatabaseHas('space_photos', ['id' => $second->id, 'position' => 0]);
        $this->assertDatabaseHas('space_photos', ['id' => $first->id, 'position' => 1]);
    }

    public static function invalidOrders(): array
    {
        return [
            'partial list' => ['partial', 'ids'],
            'foreign photo' => ['foreign', 'ids'],
            'duplicate id' => ['duplicate', 'ids.0'],
        ];
    }

    #[DataProvider('invalidOrders')]
    public function test_invalid_reorder_returns_422_and_preserves_positions(string $variant, string $field): void
    {
        [$space, $first, $second, $token] = $this->gallery();
        $ids = match ($variant) {
            'partial' => [$second->id],
            'foreign' => [$second->id, $this->photo(Space::factory()->create(), 0)->id],
            'duplicate' => [$second->id, $second->id],
        };

        $response = $this->withToken($token)->putJson("/api/admin/spaces/{$space->id}/photos/order", [
            'ids' => $ids,
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors($field);
        $this->assertDatabaseHas('space_photos', ['id' => $first->id, 'position' => 0]);
        $this->assertDatabaseHas('space_photos', ['id' => $second->id, 'position' => 1]);
    }

    /** @return array{Space, SpacePhoto, SpacePhoto, string} */
    private function gallery(): array
    {
        $owner = User::factory()->create();
        $space = Space::factory()->for($owner)->create();

        return [$space, $this->photo($space, 0), $this->photo($space, 1), $owner->createApiToken('test')];
    }

    private function photo(Space $space, int $position): SpacePhoto
    {
        return $space->photos()->create([
            'path' => "spaces/{$space->id}/{$position}.png",
            'original_name' => "{$position}.png",
            'position' => $position,
        ]);
    }
}
