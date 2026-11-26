<?php

use Symfony\Component\HttpFoundation\IpUtils;

$entries = array_values(array_filter(array_map(trim(...), explode(',', (string) env('TRUSTED_PROXIES', '')))));
$proxies = array_values(array_filter($entries, static function (string $entry): bool {
    $address = explode('/', $entry, 2)[0];

    return filter_var($address, FILTER_VALIDATE_IP) !== false
        && ! preg_match('~/0+$~', $entry)
        && IpUtils::checkIp($address, $entry);
}));

return [
    'proxies' => $proxies,
    'invalid_config' => $proxies !== $entries,
];
