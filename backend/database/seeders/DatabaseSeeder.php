<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public const DEFAULT_EMAIL = 'admin@teste.com';
    public const DEFAULT_PASSWORD = '12345678';

    /**
     * Pode rodar várias vezes: cria o usuário padrão se não existir e,
     * se já existir, redefine nome e senha para os valores padrão.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => self::DEFAULT_EMAIL],
            ['name' => 'Admin', 'password' => self::DEFAULT_PASSWORD],
        );

        $this->command?->info('Usuário padrão: '.self::DEFAULT_EMAIL.' / senha: '.self::DEFAULT_PASSWORD);
    }
}
