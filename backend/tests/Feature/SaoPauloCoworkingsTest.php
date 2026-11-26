<?php

namespace Tests\Feature;

use App\Models\Space;
use App\Models\User;
use Database\Seeders\SaoPauloCoworkings2026Seeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SaoPauloCoworkingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_populates_sao_paulo_2026_coworkings_idempotently_with_coordinates(): void
    {
        $admin = User::factory()->create();
        $admin->forceFill(['role' => User::ROLE_ADMIN])->save();

        $this->seed(SaoPauloCoworkings2026Seeder::class);
        $expectedCount = count(SaoPauloCoworkings2026Seeder::COMPANIES);

        $this->assertSame($expectedCount, Space::where('city', 'São Paulo')->where('state', 'SP')->count());

        // Rodar novamente não duplica registros
        $this->seed(SaoPauloCoworkings2026Seeder::class);
        $this->assertSame($expectedCount, Space::where('city', 'São Paulo')->where('state', 'SP')->count());

        $wework = Space::where('name', 'WeWork Paulista 1374')->firstOrFail();
        $this->assertNotNull($wework->latitude);
        $this->assertNotNull($wework->longitude);

        $response = $this->getJson("/api/spaces/{$wework->id}");
        $response->assertOk()
            ->assertJsonPath('data.name', 'WeWork Paulista 1374')
            ->assertJsonPath('data.city', 'São Paulo')
            ->assertJsonPath('data.state', 'SP')
            ->assertJsonPath('data.latitude', -23.5629)
            ->assertJsonPath('data.longitude', -46.6544);
    }
}
