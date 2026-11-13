# Deploy em produção

Stack: **Caddy** (HTTPS automático + frontend estático + proxy da API) → **FrankenPHP/Laravel** → **MySQL 8** + **Redis** (cache/throttle).
Só o Caddy expõe portas (80/443); banco, Redis e a API ficam numa rede interna.

## Requisitos
- Servidor Linux com Docker + Compose v2.
- Um domínio apontando (registro A/AAAA) para o IP do servidor e as portas 80/443 liberadas.

## Primeira subida
```bash
cp .env.production.example .env.production
```
Edite `.env.production`: `SITE_ADDRESS`, `APP_URL`, `CORS_ALLOWED_ORIGINS`, senhas do banco.

```bash
# 1. Build das imagens
docker compose --env-file .env.production -f docker-compose.prod.yml build

# 2. Gere a APP_KEY e cole em .env.production
docker run --rm --entrypoint php coworking-prod-app artisan key:generate --show

# 3. Suba tudo (as migrations rodam sozinhas no start do app)
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

# 4. Crie o primeiro administrador (sem usar o seeder de dev, que é bloqueado em produção)
docker compose --env-file .env.production -f docker-compose.prod.yml exec app \
  php artisan coworking:create-admin voce@empresa.com --name="Seu Nome"
```
A senha gerada aparece uma única vez. Use `--password` (mín. 12 caracteres) para definir a sua.

Para testar sem domínio: `SITE_ADDRESS=:80`, `APP_URL=http://localhost` e `CORS_ALLOWED_ORIGINS=http://localhost`.

## Atualizar
```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```
As migrations rodam no start do container `app`. Ao escalar o `app` para mais de uma réplica, defina `RUN_MIGRATIONS=false`
nas extras para não migrar em paralelo.

## Backup (faça agendado, ex.: cron diário)
```bash
# Banco
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db \
  sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction "$MYSQL_DATABASE"' | gzip > backup-$(date +%F).sql.gz
# Fotos enviadas: volume coworking-prod_app_storage
```

## Observações
- Logs vão para stderr: `docker compose ... logs -f app`.
- Health check: `GET /up`.
- O front usa `/api` na mesma origem; para outro domínio de API, builde com `--build-arg VITE_API_URL=https://api.exemplo.com/api`
  e inclua o domínio do front em `CORS_ALLOWED_ORIGINS`.
- App mobile: aponte a URL base da API para `https://SEU-DOMINIO/api`.
- Desenvolvimento continua com `docker compose up` (arquivo `docker-compose.yml`).
