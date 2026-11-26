.PHONY: setup backend web mobile audit quality prod-build

setup:
	cd backend && composer install && if [ ! -f .env ]; then cp .env.example .env && php artisan key:generate; fi
	cd frontend && npm ci
	cd mobile && flutter pub get

backend:
	cd backend && vendor/bin/pint --test
	cd backend && vendor/bin/phpstan analyse --memory-limit=512M --no-progress
	cd backend && php artisan test --coverage --min=90

web:
	cd frontend && npm run lint && npm run typecheck && npm test && npm run build

mobile:
	cd mobile && flutter analyze && flutter test

audit:
	cd backend && composer audit --locked
	cd frontend && npm audit --audit-level=moderate

quality: backend web mobile audit

prod-build:
	COWORKING_ENV_FILE=.env.production.example docker compose --env-file .env.production.example -f docker-compose.prod.yml config -q
	COWORKING_ENV_FILE=.env.production.example docker compose --env-file .env.production.example -f docker-compose.prod.yml build
