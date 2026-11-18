<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Booking */
class BookingResource extends JsonResource
{
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
            'start_time' => $this->start_time?->toIso8601String(),
            'end_time' => $this->end_time?->toIso8601String(),
            'duration_hours' => $this->start_time && $this->end_time
                ? (int) ceil($this->start_time->diffInMinutes($this->end_time) / 60)
                : 0,
            'total_price' => (float) $this->total_price,
            'status' => $this->status,
            'voucher_code' => $this->voucher_code,
            'notes' => $this->notes,
            'can_cancel' => $currentUser ? $this->canBeCancelledBy($currentUser) : false,
            'created_at' => $this->created_at?->toIso8601String(),
            'space' => $this->whenLoaded('space', function () {
                return [
                    'id' => $this->space->id,
                    'name' => $this->space->name,
                    'city' => $this->space->city,
                    'state' => $this->space->state,
                    'hourly_price' => $this->space->hourly_price ? (float) $this->space->hourly_price : null,
                    'daily_price' => $this->space->daily_price ? (float) $this->space->daily_price : null,
                    'is_free' => (bool) $this->space->is_free,
                ];
            }),
            'user' => $this->whenLoaded('user', function () {
                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                ];
            }),
        ];
    }
}
