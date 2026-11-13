<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CreateAdminCommand extends Command
{
    protected $signature = 'coworking:create-admin
        {email : E-mail do administrador}
        {--name=Administrador : Nome exibido}
        {--password= : Senha (se omitida, uma senha forte é gerada e exibida uma única vez)}';

    protected $description = 'Cria um administrador (ou promove um usuário existente) sem usar o seeder de desenvolvimento';

    public function handle(): int
    {
        $email = Str::lower(trim((string) $this->argument('email')));
        $password = $this->option('password');

        $validator = Validator::make(
            ['email' => $email, 'password' => $password],
            ['email' => ['required', 'email'], 'password' => ['nullable', 'string', 'min:12']],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $user = User::where('email', $email)->first();
        $generated = null;

        if (! $user) {
            $generated = $password ? null : Str::password(20, symbols: false);
            $user = User::create([
                'name' => $this->option('name'),
                'email' => $email,
                'password' => $password ?: $generated,
            ]);
        } elseif ($password) {
            $user->password = $password;
        }

        // role não é mass-assignable de propósito: só este comando e o painel interno promovem admins.
        $user->forceFill(['role' => User::ROLE_ADMIN])->save();

        $this->info("Administrador pronto: {$email}");

        if ($generated) {
            $this->warn("Senha gerada (anote agora, não será exibida de novo): {$generated}");
        }

        return self::SUCCESS;
    }
}
