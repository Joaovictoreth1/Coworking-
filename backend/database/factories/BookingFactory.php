<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Booking;
use App\Models\Space;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Booking>
 */
class BookingFactory extends Factory
{
    protected $model = Booking::class;

    public function definition(): array
    {
        $startTime = Carbon::now()->addDays(fake()->numberBetween(1, 10))->setHour(10)->setMinute(0)->setSecond(0);
        $endTime = (clone $startTime)->addHours(fake()->numberBetween(1, 4));

        return [
            'user_id' => User::factory(),
            'space_id' => Space::factory(),
            'start_time' => $startTime,
            'end_time' => $endTime,
            'total_price' => fake()->randomFloat(2, 50, 400),
            'status' => Booking::STATUS_CONFIRMED,
            'notes' => fake()->sentence(),
        ];
    }
}
