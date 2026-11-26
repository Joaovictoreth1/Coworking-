<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Booking;
use App\Models\Space;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Booking */
class BookingResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $currentUser = $request->user();

        return [
            'id' => $this->id,
            'space_id' => $this->space_id,
            'space_name' => $this->space?->name,
            'user_id' => $this->user_id,
            'user_name' => $this->user?->name,
            'user_email' => $this->user?->email,
            'start_time' => $this->start_time->toIso8601String(),
            'end_time' => $this->end_time->toIso8601String(),
            'timezone' => config('coworking.timezone'),
            'duration_hours' => (int) ceil($this->start_time->diffInMinutes($this->end_time) / 60),
            'total_price' => (float) $this->total_price,
            'status' => $this->status,
            'voucher_code' => $this->voucher_code,
            'notes' => $this->notes,
            'can_cancel' => $currentUser ? $this->canBeCancelledBy($currentUser) : false,
            'created_at' => $this->created_at?->toIso8601String(),
            'space' => $this->whenLoaded('space', function (Space $space) {
                return [
                    'id' => $space->id,
                    'name' => $space->name,
                    'city' => $space->city,
                    'state' => $space->state,
                    'hourly_price' => $space->hourly_price ? (float) $space->hourly_price : null,
                    'daily_price' => $space->daily_price ? (float) $space->daily_price : null,
                    'is_free' => (bool) $space->is_free,
                ];
            }),
            'user' => $this->whenLoaded('user', function (User $user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ];
            }),
        ];
    }
}
