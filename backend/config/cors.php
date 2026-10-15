<?php

// Autenticação por Bearer token (sem cookies), então não precisa de credenciais.
// Em produção, troque '*' pelo domínio do frontend.
return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['*'],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
