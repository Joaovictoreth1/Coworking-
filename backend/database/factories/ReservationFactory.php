<?php

namespace Database\Factories;

use App\Models\Reservation;
use App\Models\Space;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Reservation> */
class ReservationFactory extends Factory
{
    protected $model = Reservation::class;

    public function definition(): array
    {
        $start = now()->addDays(2)->startOfHour();

        return [
            'space_id' => Space::factory(),
            'user_id' => User::factory(),
            'starts_at' => $start,
            'ends_at' => $start->copy()->addHour(),
            'rate' => Reservation::RATE_HOURLY,
            'status' => Reservation::STATUS_CONFIRMED,
            'total_price' => 50,
        ];
    }
}
