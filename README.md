# 🏢 Coworking Platform — Sistema Completo de Gestão e Reservas

[![CI — Continuous Integration](https://github.com/Joaovictoreth1/Coworking-/actions/workflows/ci.yml/badge.svg)](https://github.com/Joaovictoreth1/Coworking-/actions/workflows/ci.yml)
[![Backend Tests](https://img.shields.io/badge/Backend%20Tests-36%20passed%20%2F%20148%20assertions-emerald?style=flat-square&logo=php)](backend/)
[![Frontend Build](https://img.shields.io/badge/Frontend-Vite%20%2B%20React%2019%20Build%20OK-blue?style=flat-square&logo=react)](frontend/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Type%20Safe-blue?style=flat-square&logo=typescript)](frontend/)
[![Laravel](https://img.shields.io/badge/Laravel-13.x%20(PHP%208.4)-red?style=flat-square&logo=laravel)](backend/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat-square&logo=tailwindcss)](frontend/)

Uma plataforma moderna e escalável para **descoberta, agendamento e gerenciamento de espaços de coworking, salas de reunião, escritórios privativos e auditórios**. 

A solução integra **Backend robusto em Laravel 13**, **Frontend web em React 19 com TypeScript**, **Mobile em Flutter** e banco de dados relacional com validação estrita contra **conflitos de horário (Double-Booking)**.

---

## 📐 Arquitetura do Sistema

```
                  ┌────────────────────────────────────────┐
                  │          React 19 + TypeScript         │
                  │   Vite, TailwindCSS, TanStack Query,   │
                  │             Zustand Stores             │
                  └───────────────────┬────────────────────┘
                                      │ HTTP / JSON (Bearer Token)
                                      ▼
                  ┌────────────────────────────────────────┐
                  │            Laravel 13 API              │
                  │      PHP 8.4, Service Layer, ORM       │
                  ├────────────────────────────────────────┤
                  │  • SpaceSchedule (trava por espaço)    │
                  │  • AuthenticateApiToken & EnsureAdmin  │
                  │  • FormRequests & API Resources        │
                  └───────────────────┬────────────────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
        ┌─────────────────────┐               ┌─────────────────────┐
        │     MySQL 8.0       │               │   SQLite In-Memory  │
        │   (Docker Prod/Dev) │               │   (Testes Rápidos)  │
        └─────────────────────┘               └─────────────────────┘
```

---

## ⚡ Regras de Negócio Críticas

1. **Blindagem contra Double-Booking (Conflito de Horário):**
   - O `SpaceSchedule` consulta as duas tabelas: uma reserva sobrepõe outra se `[start_time < new_end]` e `[end_time > new_start]`.
   - `BookingService` e `ReservationService` serializam gravações no mesmo espaço com `SELECT … FOR UPDATE` em MySQL.
   - Conflitos retornam **422** no contrato `bookings` e **409** no contrato `reservations`.
2. **Cálculo Automático de Tarifação:**
   - Calcula a duração em horas (`ceil(diffInMinutes / 60)`).
   - Aplica tarifas por hora (`hourly_price`), pacotes de diárias (`daily_price`) ou modalidade gratuita (`is_free`).
3. **Controle de Acesso Baseado em Papéis (RBAC):**
   - `admin`: Gerenciamento completo de todos os espaços (CRUD), aprovação/rejeição de reservas e acesso a KPIs consolidados.
   - `cliente` / `user`: Descoberta pública de espaços, simulação de preços em tempo real, criação e cancelamento de suas próprias reservas. Proprietários também gerenciam somente os seus espaços existentes.
4. **Ciclo de Vida das Reservas:**
   - Estados: `pending` ➔ `confirmed` ➔ `completed` ou `cancelled`.

---

## 🔑 Credenciais de Teste (Populadas via Seeder)

O banco de dados já conta com seeders realistas contendo dezenas de espaços, fotos, comodidades, avaliações e reservas pré-configuradas:

| Perfil | E-mail | Senha | Papel |
|---|---|---|---|
| **Administrador** | `admin@teste.com` | `12345678` | Administrador geral do sistema |
| **Cliente 1** | `ana@teste.com` | `12345678` | Usuário comum / Locatário |
| **Cliente 2** | `bruno@teste.com` | `12345678` | Usuário comum / Locatário |
| **Cliente 3** | `carla@teste.com` | `12345678` | Usuário comum / Locatário |

---

## 🚀 Como Executar o Projeto Localmente

### Opção 1: Via Docker Compose (Recomendado)

Todo o ecossistema (Backend, Frontend, MySQL e PhpMyAdmin) sobe com um único comando:

```bash
# Na raiz do projeto:
docker compose up -d
```

| Serviço | URL Local | Descrição |
|---|---|---|
| **Frontend Web** | [http://localhost:5173](http://localhost:5173) | Interface React com Hot Reload |
| **Backend API** | [http://localhost:8000](http://localhost:8000) | Servidor Laravel 13 |
| **PhpMyAdmin** | [http://localhost:8081](http://localhost:8081) | Gerenciador do banco MySQL |
| **MySQL Database** | `localhost:3306` | Banco de dados relacional |

---

### Opção 2: Execução Nativa Separada

#### 1. Backend (Laravel)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force
php artisan storage:link
php artisan serve --port=8000
```

#### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Bateria de Testes Automatizados e Qualidade

### Testes do Backend (PHPUnit / Feature Tests)
A suíte de testes de integração roda em ambiente SQLite isolado em memória:

```bash
# Via container:
docker exec coworking-backend php artisan test

# Ou localmente:
cd backend && php artisan test
```

Use PHP 8.4 com PCOV ou Xdebug (modo `coverage`), Composer, Node 22 e Flutter 3.50.1:

```bash
make setup
make quality      # Pint, Larastan, cobertura, web, Flutter e auditorias
make prod-build   # valida o Compose e compila as duas imagens
```

O gate de cobertura exige **90% de linhas em `backend/app/Services`**. A CI também roda a
suíte com MySQL 8; SQLite não executa os dois testes de processo concorrente. Para rodar
esses testes em um banco **exclusivo para testes** (o PHPUnit recria o esquema):

```bash
cd backend
DB_CONNECTION=mysql DB_HOST=127.0.0.1 DB_PORT=3306 DB_DATABASE=coworking_test \
  DB_USERNAME=coworking php artisan test
```

Forneça `DB_PASSWORD` no ambiente, não no comando. O fluxo de autenticação usa tokens
Bearer da aplicação, não sessão de navegador.

### Validação do Frontend (TypeScript + ESLint + Build)
```bash
# Via container:
docker exec coworking-frontend npm run lint
docker exec coworking-frontend npm run build

# Ou localmente:
cd frontend && npm run lint && npm run typecheck && npm test && npm run build
```

## Variáveis de ambiente e deploy

| Variáveis | Uso |
|---|---|
| `APP_ENV`, `APP_DEBUG`, `APP_URL`, `APP_KEY` | Em produção: `production`, `false`, URL HTTPS e chave persistente gerada pelo Artisan. |
| `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `DB_ROOT_PASSWORD` | SQLite no desenvolvimento nativo; MySQL 8 no Compose de produção. O Compose fornece driver, host e porta; use senhas distintas para aplicação e root. |
| `CACHE_STORE`, `SESSION_DRIVER`, `QUEUE_CONNECTION`, `REDIS_CLIENT`, `REDIS_HOST`, `REDIS_PORT` | Cache/limitação em Redis no Compose; a API usa tokens para autenticação. |
| `COWORKING_TIMEZONE` | Fuso IANA dos horários de funcionamento; instantes são persistidos em UTC. |
| `CORS_ALLOWED_ORIGINS` | Origens exatas separadas por vírgula, sem caminhos ou barra final; apenas HTTPS em produção, vazio para mesma origem. |
| `TRUSTED_PROXIES`, `COWORKING_PROXY_SUBNET`, `COWORKING_PROXY_IP` | Confie somente no IP/CIDR do proxy real; ajuste os três juntos se a sub-rede padrão colidir com outra rede. |
| `RUN_MIGRATIONS`, `COWORKING_ENV_FILE` | Execução de migrations no boot (`true` ou `false`); caminho alternativo do arquivo de ambiente do Compose. |
| `SITE_ADDRESS`, `HTTP_PORT`, `HTTPS_PORT` | Domínio e portas públicas do Caddy. |
| `VITE_API_URL`, `API_URL` | URL da API no build web (padrão em produção: `/api`) e no build Flutter (`--dart-define=API_URL=…`). |

Veja os exemplos em [backend/.env.example](backend/.env.example),
[frontend/.env.example](frontend/.env.example) e [.env.production.example](.env.production.example).
Siga [DEPLOY.md](DEPLOY.md) para instalar, executar migrations e fazer backup. Antes de
atualizar, faça backup de MySQL e do volume de fotos, preserve a `APP_KEY` e substitua
configurações antigas de proxy/CORS com curingas. Esta atualização não adiciona migrations
nem corrige conflitos históricos: revise os dados antes de liberar reservas e não misture
réplicas com código antigo e novo durante a troca.

---

## 📡 Referência dos Principais Endpoints da API

### Autenticação (`/api/auth`)
| Método | Endpoint | Descrição | Acesso |
|---|---|---|---|
| `POST` | `/api/auth/register` | Cria uma nova conta de usuário | Público |
| `POST` | `/api/auth/login` | Autentica e gera Bearer Token | Público |
| `GET` | `/api/auth/me` | Retorna o perfil do usuário logado | Autenticado |
| `POST` | `/api/auth/logout` | Revoga o token da sessão | Autenticado |

### Espaços Públicos (`/api/spaces`)
| Método | Endpoint | Descrição | Acesso |
|---|---|---|---|
| `GET` | `/api/spaces` | Catálogo paginado com busca e filtros | Público / Opcional |
| `GET` | `/api/spaces/{id}` | Detalhes completos do local e fotos | Público |
| `POST` | `/api/spaces/{id}/bookings/preview` | Simulação em tempo real de preço e disponibilidade | Público |
| `GET` | `/api/spaces/{id}/reviews` | Avaliações do local com paginação | Público |

### Reservas do Cliente (`/api/bookings`)
| Método | Endpoint | Descrição | Acesso |
|---|---|---|---|
| `GET` | `/api/bookings` | Lista as reservas do usuário autenticado | Cliente |
| `POST` | `/api/spaces/{id}/bookings` | Cria uma nova reserva (com validação anti-conflito) | Cliente |
| `GET` | `/api/bookings/{id}` | Detalhes de uma reserva específica | Cliente / Admin |
| `POST` | `/api/bookings/{id}/cancel` | Cancela uma reserva ativa | Cliente / Admin |

### Painel Administrativo (`/api/admin`)
| Método | Endpoint | Descrição | Acesso |
|---|---|---|---|
| `GET` | `/api/admin/metrics` | KPIs (taxa de ocupação, receita estimada, reservas) | Admin |
| `GET` | `/api/admin/bookings` | Listagem geral de reservas com filtros | Admin |
| `PATCH`| `/api/admin/bookings/{id}/status` | Aprova, conclui ou cancela reservas | Admin |
| `POST` | `/api/admin/spaces` | Cadastra novo espaço com comodidades e horários | Admin |
| `PUT`  | `/api/admin/spaces/{id}` | Atualiza dados de um espaço existente | Proprietário / Admin |
| `DELETE`| `/api/admin/spaces/{id}` | Remove um espaço do sistema | Proprietário / Admin |

Os contratos `bookings` e `reservations` usam a mesma trava transacional por espaço e
tratam intervalos adjacentes como não conflitantes. `GET /api/spaces/{id}/availability?date=AAAA-MM-DD`
combina os intervalos ocupados dos dois contratos. Um conflito retorna 422 em `bookings`
e 409 em `reservations`; clientes devem lidar com uma rejeição na criação mesmo após um
preview bem-sucedido, pois o preview não bloqueia o horário.

```bash
API=http://localhost:8000/api
# Horários sem offset são interpretados em COWORKING_TIMEZONE; use uma data futura.
curl -sS "$API/spaces/1/bookings/preview" -H 'Content-Type: application/json' \
  -d '{"start_time":"2030-06-10T10:00:00","end_time":"2030-06-10T12:00:00"}'
curl -sS "$API/bookings?page=1&per_page=20&status=confirmed" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📄 Licença

Distribuído sob licença MIT. Desenvolvido com padrões de Engenharia de Software Sênior.
