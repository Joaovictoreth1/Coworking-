<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Space;
use App\Models\User;
use Database\Seeders\CoworkingCompaniesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class CoworkingCompaniesSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalogue_is_repeatable_in_production_without_creating_accounts(): void
    {
        $this->app['env'] = 'production';
        $admin = User::factory()->create()->forceFill(['role' => User::ROLE_ADMIN]);
        $admin->save();

        $this->artisan('db:seed', ['--class' => CoworkingCompaniesSeeder::class, '--force' => true])->assertSuccessful();
        $space = $admin->spaces()->where('name', 'WeWork Paulista 1374')->firstOrFail();
        $space->update(['daily_price' => 1]);
        $this->artisan('db:seed', ['--class' => CoworkingCompaniesSeeder::class, '--force' => true])->assertSuccessful();

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('spaces', 11);
        $this->assertEquals(214, $space->fresh()->daily_price);

        $this->getJson('/api/spaces?price_type=free&q=Teia')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['name' => 'Teia Centro']);

        $day = now()->addWeek()->next('Monday');
        $this->getJson("/api/spaces/{$space->id}/availability?date={$day->toDateString()}")
            ->assertOk()
            ->assertJsonPath('open', false);
        $this->postJson("/api/spaces/{$space->id}/bookings/preview", [
            'start_time' => $day->setHour(10)->toIso8601String(),
            'end_time' => $day->setHour(11)->toIso8601String(),
        ])->assertUnprocessable();
    }

    public function test_catalogue_does_not_replace_a_manually_managed_space_with_the_same_name(): void
    {
        $admin = User::factory()->create()->forceFill(['role' => User::ROLE_ADMIN]);
        $admin->save();
        $space = Space::factory()->for($admin, 'user')->create([
            'name' => 'WeWork Paulista 1374',
            'description' => 'Cadastro manual',
            'daily_price' => 180,
        ])->refresh();

        $this->seed(CoworkingCompaniesSeeder::class);

        $this->assertSame(1, $admin->spaces()->where('name', $space->name)->count());
        $current = $space->fresh();
        $this->assertSame('Cadastro manual', $current->description);
        $this->assertEquals(180, $current->daily_price);
        $this->assertSame($space->opening_hours, $current->opening_hours);
        $this->assertSame($space->availability, $current->availability);
    }

    public function test_catalogue_requires_an_existing_administrator(): void
    {
        User::factory()->create();

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Crie um administrador');
        $this->seed(CoworkingCompaniesSeeder::class);
    }
}
