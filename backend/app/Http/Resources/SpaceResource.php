<?php

namespace App\Http\Resources;

use App\Models\SpacePhoto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Space */
class SpaceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $photos = $this->relationLoaded('photos') ? $this->photos : collect();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'capacity' => $this->capacity,

            'zip_code' => $this->zip_code,
            'street' => $this->street,
            'number' => $this->number,
            'complement' => $this->complement,
            'neighborhood' => $this->neighborhood,
            'city' => $this->city,
            'state' => $this->state,

            'hourly_price' => $this->hourly_price !== null ? (float) $this->hourly_price : null,
            'daily_price' => $this->daily_price !== null ? (float) $this->daily_price : null,
            'monthly_price' => $this->monthly_price !== null ? (float) $this->monthly_price : null,
            'is_free' => (bool) $this->is_free,

            // Preenchidos por Space::withStats(); sem isso, ficam nulos/zerados.
            'rating_avg' => ($avg = $this->resource->getAttribute('reviews_avg_rating')) !== null ? round((float) $avg, 1) : null,
            'reviews_count' => (int) ($this->resource->getAttribute('reviews_count') ?? 0),
            'is_favorite' => (bool) $this->resource->getAttribute('is_favorite'),

            'opening_hours' => $this->opening_hours ?? [],
            'availability' => $this->availability ?? [],
            'amenities' => $this->amenities ?? [],
            'is_active' => $this->is_active,
            'owner_id' => $this->user_id,
            'owner' => $this->whenLoaded('user', fn () => ['id' => $this->user->id, 'name' => $this->user->name]),

            'photos' => $photos
                ->map(fn (SpacePhoto $photo) => [
                    'id' => $photo->id,
                    'url' => route('photos.show', $photo),
                ])
                ->values(),
            'cover_url' => $photos->isNotEmpty() ? route('photos.show', $photos->first()) : null,

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
