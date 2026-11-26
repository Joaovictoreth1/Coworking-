<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Booking;
use App\Models\Reservation;
use App\Models\Space;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class SpaceSchedule
{
    /**
     * @template T
     *
     * @param  Closure(Space): T  $action
     * @return T
     */
    public function withinLock(int $spaceId, Closure $action): mixed
    {
        return DB::transaction(function () use ($spaceId, $action) {
            $space = Space::query()->lockForUpdate()->findOrFail($spaceId);

            return $action($space);
        }, 3);
    }

    public function hasConflict(Space $space, CarbonInterface $start, CarbonInterface $end, ?int $excludeBookingId = null): bool
    {
        return $this->bookings($space, $start, $end, $excludeBookingId)->exists()
            || $this->reservations($space, $start, $end)->exists();
    }

    /**
     * @return list<array{starts_at: string, ends_at: string}>
     */
    public function busyOn(Space $space, CarbonImmutable $day): array
    {
        $start = $day->startOfDay();
        $end = $start->addDay();
        $busy = [];

        foreach ($this->reservations($space, $start, $end)->get(['starts_at', 'ends_at']) as $reservation) {
            $busy[] = [
                'starts_at' => $reservation->starts_at->toIso8601String(),
                'ends_at' => $reservation->ends_at->toIso8601String(),
            ];
        }

        foreach ($this->bookings($space, $start, $end)->get(['start_time', 'end_time']) as $booking) {
            $busy[] = [
                'starts_at' => $booking->start_time->toIso8601String(),
                'ends_at' => $booking->end_time->toIso8601String(),
            ];
        }

        usort($busy, fn (array $left, array $right): int => $left['starts_at'] <=> $right['starts_at']);

        return $busy;
    }

    /** @return Builder<Booking> */
    private function bookings(Space $space, CarbonInterface $start, CarbonInterface $end, ?int $excludeBookingId = null): Builder
    {
        return Booking::query()->where('space_id', $space->id)->overlapping(
            CarbonImmutable::instance($start)->utc(),
            CarbonImmutable::instance($end)->utc(),
            $excludeBookingId,
        );
    }

    /** @return Builder<Reservation> */
    private function reservations(Space $space, CarbonInterface $start, CarbonInterface $end): Builder
    {
        return Reservation::query()->where('space_id', $space->id)->overlapping(
            CarbonImmutable::instance($start)->utc(),
            CarbonImmutable::instance($end)->utc(),
        );
    }
}
