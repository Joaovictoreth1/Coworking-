<?php

namespace App\Http\Resources;

use App\Models\Reservation;
use App\Models\Space;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Reservation */
class ReservationResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'space_id' => $this->space_id,
            'space' => $this->whenLoaded('space', fn (Space $space) => ['id' => $space->id, 'name' => $space->name]),
            'customer' => $this->whenLoaded('user', fn (User $user) => ['id' => $user->id, 'name' => $user->name]),
            'rate' => $this->rate,
            'status' => $this->status,
            'starts_at' => $this->starts_at->toIso8601String(),
            'ends_at' => $this->ends_at->toIso8601String(),
            'total_price' => $this->total_price,
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
