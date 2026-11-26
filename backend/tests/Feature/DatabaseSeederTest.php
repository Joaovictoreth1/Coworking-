<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_requires_an_explicit_demo_password(): void
    {
        config(['coworking.demo_password' => null]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('COWORKING_DEMO_PASSWORD');
        $this->seed(DatabaseSeeder::class);
    }

    public function test_seeder_refuses_to_run_in_staging(): void
    {
        $this->app->instance('env', 'staging');
        config(['coworking.demo_password' => bin2hex(random_bytes(16))]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('apenas para desenvolvimento');
        $this->seed(DatabaseSeeder::class);
    }

    public function test_seeder_hashes_the_explicit_password_for_the_demo_admin(): void
    {
        $password = bin2hex(random_bytes(16));
        config(['coworking.demo_password' => $password]);

        $this->seed(DatabaseSeeder::class);

        $admin = User::query()->where('email', DatabaseSeeder::ADMIN_EMAIL)->sole();
        $this->assertTrue($admin->isAdmin());
        $this->assertTrue(Hash::check($password, $admin->password));
    }
}
