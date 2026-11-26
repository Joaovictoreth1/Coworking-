<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_with_valid_data(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Novo Usuário',
            'email' => 'novo@teste.com',
            'password' => '12345678',
            'password_confirmation' => '12345678',
            'device_name' => 'test-device',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email', 'role', 'is_admin'],
                'token',
            ])
            ->assertJson([
                'user' => [
                    'name' => 'Novo Usuário',
                    'email' => 'novo@teste.com',
                    'role' => 'user',
                    'is_admin' => false,
                ],
            ]);

        $this->assertDatabaseHas('users', ['email' => 'novo@teste.com']);
    }

    public function test_registration_fails_with_duplicate_email(): void
    {
        User::factory()->create(['email' => 'existente@teste.com']);

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Outro Usuário',
            'email' => 'existente@teste.com',
            'password' => '12345678',
            'password_confirmation' => '12345678',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_registration_fails_when_passwords_do_not_match(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Teste',
            'email' => 'teste@teste.com',
            'password' => '12345678',
            'password_confirmation' => '87654321',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_user_can_login_with_correct_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'login@teste.com',
            'password' => '12345678',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'login@teste.com',
            'password' => '12345678',
            'device_name' => 'test-device',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email', 'role', 'is_admin'],
                'token',
            ]);
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'login@teste.com',
            'password' => '12345678',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'login@teste.com',
            'password' => 'senha_errada',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_me_endpoint_returns_authenticated_user(): void
    {
        $user = User::factory()->create();
        $token = $user->createApiToken('test');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJson([
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                ],
            ]);
    }

    public function test_me_endpoint_rejects_unauthenticated_requests(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(401);
    }

    public function test_logout_revokes_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createApiToken('test');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/logout');

        $response->assertStatus(200);

        // O token deve estar inválido agora
        $meResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me');

        $meResponse->assertStatus(401);
    }
}
