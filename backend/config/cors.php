<?php

$configured = array_values(array_filter(array_map(trim(...), explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')))));
$production = env('APP_ENV', 'production') === 'production';
$origins = array_values(array_filter($configured, static function (string $origin) use ($production): bool {
    $scheme = parse_url($origin, PHP_URL_SCHEME);

    return filter_var($origin, FILTER_VALIDATE_URL) !== false
        && in_array($scheme, $production ? ['https'] : ['http', 'https'], true)
        && ! str_contains($origin, '*')
        && array_diff(array_keys(parse_url($origin) ?: []), ['scheme', 'host', 'port']) === [];
}));

return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $origins,
    'invalid_config' => $origins !== $configured,
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
