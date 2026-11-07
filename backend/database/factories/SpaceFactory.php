<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Space;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Space>
 */
class SpaceFactory extends Factory
{
    protected $model = Space::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->company() . ' Coworking',
            'description' => fake()->paragraph(),
            'capacity' => fake()->numberBetween(5, 50),
            'zip_code' => '01310-200',
            'street' => fake()->streetName(),
            'number' => (string) fake()->buildingNumber(),
            'complement' => 'Sala 101',
            'neighborhood' => 'Centro',
            'city' => 'São Paulo',
            'state' => 'SP',
            'hourly_price' => fake()->randomFloat(2, 20, 150),
            'daily_price' => fake()->randomFloat(2, 80, 500),
            'monthly_price' => fake()->randomFloat(2, 600, 3000),
            'is_free' => false,
            'is_active' => true,
            'amenities' => ['wifi', 'coffee', 'air_conditioning'],
            'opening_hours' => array_map(fn ($day) => [
                'day' => $day,
                'enabled' => $day >= 1 && $day <= 5,
                'from' => '08:00',
                'to' => '18:00',
            ], range(0, 6)),
            'availability' => array_map(fn ($day) => [
                'day' => $day,
                'enabled' => $day >= 1 && $day <= 5,
                'from' => '08:00',
                'to' => '18:00',
            ], range(0, 6)),
        ];
    }

    public function free(): static
    {
        return $this->state(fn () => [
            'is_free' => true,
            'hourly_price' => null,
            'daily_price' => null,
            'monthly_price' => null,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => [
            'is_active' => false,
        ]);
    }
}

