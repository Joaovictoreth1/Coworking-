<?php

declare(strict_types=1);

namespace App\Console\Commands;

use DateTimeZone;
use Illuminate\Console\Command;
use Illuminate\Encryption\Encrypter;

class ValidateProductionCommand extends Command
{
    protected $signature = 'coworking:validate-production';

    protected $description = 'Valida a configuração de produção antes de iniciar o serviço';

    public function handle(): int
    {
        $key = (string) config('app.key');
        if (str_starts_with($key, 'base64:')) {
            $key = base64_decode(substr($key, 7), true);
        }

        $url = (string) config('app.url');
        $database = config('database.connections.mysql');
        $password = $database['password'] ?? null;
        $proxies = config('trustedproxy.proxies', []);

        $checks = [
            'APP_ENV' => $this->laravel->isProduction(),
            'APP_DEBUG' => config('app.debug') === false,
            'APP_KEY' => is_string($key) && Encrypter::supported($key, (string) config('app.cipher')),
            'APP_URL' => filter_var($url, FILTER_VALIDATE_URL) !== false && parse_url($url, PHP_URL_SCHEME) === 'https',
            'DB_CONNECTION' => config('database.default') === 'mysql',
            'DB_HOST' => ! empty($database['host']),
            'DB_DATABASE' => ! empty($database['database']),
            'DB_USERNAME' => ! empty($database['username']),
            'DB_PASSWORD' => is_string($password) && $password !== '' && $password !== 'troque-esta-senha',
            'COWORKING_TIMEZONE' => in_array(config('coworking.timezone'), DateTimeZone::listIdentifiers(), true),
            'CORS_ALLOWED_ORIGINS' => config('cors.invalid_config') === false,
            'TRUSTED_PROXIES' => config('trustedproxy.invalid_config') === false
                && ! array_intersect($proxies, ['*', '**', '0.0.0.0/0', '::/0', 'REMOTE_ADDR']),
        ];

        $invalid = array_keys(array_filter($checks, static fn (bool $ok): bool => ! $ok));
        if ($invalid !== []) {
            foreach ($invalid as $variable) {
                $this->error("Configuração de produção inválida: {$variable}");
            }

            return self::FAILURE;
        }

        $this->info('Configuração de produção validada.');

        return self::SUCCESS;
    }
}
