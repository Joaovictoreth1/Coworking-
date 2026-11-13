<?php

// Autenticação por Bearer token (sem cookies), então não precisa de credenciais.
// Em produção, troque '*' pelo domínio do frontend.
return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    // Lista separada por vírgula em CORS_ALLOWED_ORIGINS. Padrão "*" só para desenvolvimento.
    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', '*'))))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
