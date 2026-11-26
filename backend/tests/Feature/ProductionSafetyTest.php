<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductionSafetyTest extends TestCase
{
    use RefreshDatabase;

    public function test_dev_seeder_refuses_to_run_in_production(): void
    {
        $this->app['env'] = 'production';

        $this->expectException(\RuntimeException::class);
        $this->app->make(DatabaseSeeder::class)->run();
    }

    public function test_production_config_check_rejects_unsafe_values_before_migration(): void
    {
        $this->app['env'] = 'production';
        config([
            'app.debug' => true,
            'app.key' => '',
            'app.url' => 'http://coworking.example.com',
            'trustedproxy.proxies' => ['0.0.0.0/0'],
        ]);

        $this->artisan('coworking:validate-production')
            ->expectsOutputToContain('APP_DEBUG')
            ->expectsOutputToContain('APP_KEY')
            ->expectsOutputToContain('APP_URL')
            ->expectsOutputToContain('TRUSTED_PROXIES')
            ->assertFailed();
    }

    public function test_create_admin_generates_password_and_promotes(): void
    {
        $this->artisan('coworking:create-admin', ['email' => 'Dono@Empresa.com', '--name' => 'Dono'])
            ->expectsOutputToContain('Administrador pronto: dono@empresa.com')
            ->assertSuccessful();

        $this->assertTrue(User::where('email', 'dono@empresa.com')->firstOrFail()->isAdmin());
    }

    public function test_create_admin_promotes_existing_user_and_rejects_weak_password(): void
    {
        $user = User::factory()->create(['email' => 'ana@empresa.com']);

        $this->artisan('coworking:create-admin', ['email' => 'ana@empresa.com', '--password' => 'curta'])->assertFailed();
        $this->assertFalse($user->fresh()->isAdmin());

        $this->artisan('coworking:create-admin', ['email' => 'ana@empresa.com'])->assertSuccessful();
        $this->assertTrue($user->fresh()->isAdmin());
    }
}
