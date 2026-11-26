# 🏢 Coworking Platform — Sistema Completo de Gestão e Reservas

[![CI — Continuous Integration](https://github.com/Joaovictoreth1/Coworking-/actions/workflows/ci.yml/badge.svg)](https://github.com/Joaovictoreth1/Coworking-/actions/workflows/ci.yml)
[![Backend Tests](https://img.shields.io/badge/Backend%20Tests-59%20passed%20%2F%20216%20assertions-emerald?style=flat-square&logo=php)](backend/)
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
                  │  • BookingService (Double-Booking Lock)│
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
   - O `BookingService` executa validação matemática de sobreposição: uma reserva sobrepõe outra se `[start_time < new_end]` e `[end_time > new_start]`.
   - Utiliza **Lock Pessimista (`lockForUpdate`) na linha do espaço (`spaces`)** dentro de transações com retry automático (`DB::transaction(..., 3)`), serializando reservas simultâneas no mesmo espaço mesmo quando ainda não há reservas prévias.
   - Tentativas de sobreposição, cancelamento duplicado ou reativação administrativa conflitante retornam **`409 Conflict`**; erros de payload/horário de funcionamento retornam **`422 Unprocessable Entity`**; recursos inexistentes retornam **`404 Not Found`**; acesso não autorizado retorna **`403 Forbidden`**.
2. **Cálculo Automático de Tarifação:**
   - Calcula a duração em horas (`ceil(diffInMinutes / 60)`).
   - Aplica tarifas por hora (`hourly_price`), pacotes de diárias (`daily_price`) ou modalidade gratuita (`is_free`).
3. **Controle de Acesso Baseado em Papéis (RBAC):**
   - `admin`: Gerenciamento completo de todos os espaços (CRUD), aprovação/rejeição de reservas e acesso a KPIs consolidados.
   - `cliente` / `user`: Descoberta pública de espaços, simulação de preços em tempo real, criação e cancelamento de suas próprias reservas.
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

Principais variáveis de ambiente do backend (`backend/.env`):
- `APP_URL`: URL base do backend (ex.: `http://localhost:8000`)
- `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`: configuração do banco (`mysql` ou `sqlite`)
- `CORS_ALLOWED_ORIGINS`: origens permitidas para o frontend (ex.: `http://localhost:5173`)
- `TRUSTED_PROXIES`: proxies confiáveis (`*` atrás de reverse proxy como Caddy)

> Para recriar o banco local do zero com dados de desenvolvimento: `php artisan migrate:fresh --seed` (o `DatabaseSeeder` recusa execução em `APP_ENV=production`; em produção crie o admin via `php artisan coworking:create-admin`).

#### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
# Opcional: definir VITE_API_URL=http://localhost:8000/api em frontend/.env.local
npm run dev
```

Principais variáveis de ambiente do frontend (`frontend/.env.local`):
- `VITE_API_URL`: URL da API Laravel (padrão: `http://localhost:8000/api`)

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

**Resultado:** **59 testes passando (216 asserções, 1 skipped dependente de MySQL para concorrência real) com 100% de sucesso.**
- ✅ Fluxo de cadastro e autenticação Bearer Token
- ✅ Validação contra e-mails duplicados e senhas divergentes
- ✅ Criação de reserva (`201`), reservas adjacentes sem conflito e cálculo de preço
- ✅ **Bloqueio de sobreposição (`409 Conflict`) com `lockForUpdate` na linha do espaço, inclusive em reativação administrativa**
- ✅ Validação de horário de funcionamento (incluindo reservas multi-dia), espaço inativo e payloads inválidos (`422`)
- ✅ Listagem, cancelamento (`200`), bloqueio de cancelamento duplicado/concluído (`409`) e isolamento entre usuários (`403`)
- ✅ Proteção `admin` em `/api/admin/spaces`, `/api/admin/bookings`, `/api/admin/metrics` e `/api/admin/dashboard` (`403` para usuário comum)

### Validação do Frontend (Vitest + TypeScript + ESLint + Build)
```bash
# Via container:
docker exec coworking-frontend npm run lint
docker exec coworking-frontend npm test
docker exec coworking-frontend npm run build

# Ou localmente:
cd frontend && npm run lint && npm test && npm run build
```

**Resultado:** **11 testes Vitest passando, 0 erros no ESLint e compilação de produção sem falhas via Vite.**

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
| `GET` | `/api/spaces/{id}/bookings/availability?date=AAAA-MM-DD` | Janela de funcionamento e horários ocupados do dia (sem PII) | Público |
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
| `PUT`  | `/api/admin/spaces/{id}` | Atualiza dados de um espaço existente | Admin |
| `DELETE`| `/api/admin/spaces/{id}` | Remove um espaço do sistema | Admin |

---

## 📄 Licença

Distribuído sob licença MIT. Desenvolvido com padrões de Engenharia de Software Sênior.
