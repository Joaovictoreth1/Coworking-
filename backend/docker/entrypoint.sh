#!/bin/sh
set -e

# O volume de storage pode vir vazio na primeira subida.
mkdir -p storage/app/public storage/framework/cache/data storage/framework/sessions \
    storage/framework/views storage/logs bootstrap/cache

php artisan coworking:validate-production --no-interaction

case "${RUN_MIGRATIONS:-true}" in
    true) php artisan migrate --force --no-interaction ;;
    false) ;;
    *) echo "RUN_MIGRATIONS deve ser true ou false." >&2; exit 1 ;;
esac

# Gera os caches de config/rotas/eventos/views com o ambiente real do container.
php artisan optimize --no-interaction

exec docker-php-entrypoint "$@"
