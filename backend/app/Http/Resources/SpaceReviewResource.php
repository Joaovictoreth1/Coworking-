<?php

namespace App\Http\Resources;

use App\Models\SpaceReview;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/** @mixin SpaceReview */
class SpaceReviewResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $viewer = $request->user();

        return [
            'id' => $this->id,
            'rating' => $this->rating,
            'comment' => $this->comment,
            'author' => $this->whenLoaded('user', fn (User $user) => $this->abbreviatedName($user->name)),
            'is_mine' => $viewer !== null && $viewer->id === $this->user_id,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    /** "Ana Souza Lima" -> "Ana L." (não expõe o nome completo de quem avaliou). */
    private function abbreviatedName(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name)) ?: [];

        if (count($parts) < 2) {
            return $parts[0] ?? 'Usuário';
        }

        return $parts[0].' '.Str::upper(Str::substr(end($parts), 0, 1)).'.';
    }
}
