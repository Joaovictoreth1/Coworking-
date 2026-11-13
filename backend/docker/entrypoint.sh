#!/bin/sh
set -e

if [ -z "$APP_KEY" ]; then
    echo "ERRO: APP_KEY não definido. Gere com: docker run --rm <imagem> php artisan key:generate --show" >&2
    exit 1
fi

# O volume de storage pode vir vazio na primeira subida.
mkdir -p storage/app/public storage/framework/cache/data storage/framework/sessions \
    storage/framework/views storage/logs bootstrap/cache

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    php artisan migrate --force --no-interaction
fi

# Gera os caches de config/rotas/eventos/views com o ambiente real do container.
php artisan optimize --no-interaction

exec docker-php-entrypoint "$@"
