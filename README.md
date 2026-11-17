# 🏢 Coworking Platform — Sistema Completo de Gestão e Reservas

[![Backend Tests](https://img.shields.io/badge/Backend%20Tests-30%20passed%20%2F%20124%20assertions-emerald?style=flat-square&logo=php)](backend/)
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
   - Utiliza **Lock Pessimista (`lockForUpdate`)** e transações no banco de dados para eliminar qualquer risco de *Race Condition* sob concorrência simultânea.
   - Tentativas de sobreposição retornam status **`422 Unprocessable Entity`** com mensagem clara de erro.
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

**Resultado:** **30 testes passando (124 asserções) com 100% de sucesso.**
- ✅ Fluxo de cadastro e autenticação Sanctum/Bearer Token
- ✅ Validação contra e-mails duplicados e senhas divergentes
- ✅ Criação de reserva com sucesso e cálculo de preço
- ✅ **Teste obrigatório comprovando erro 422 ao tentar reservar horário conflitante (Double-Booking)**
- ✅ Validação de horário de funcionamento do espaço
- ✅ Listagem e cancelamento de reservas pelo cliente
- ✅ Bloqueio de usuário comum tentando criar espaços de administrador (403)
- ✅ Dashboard administrativo e métricas do sistema

### Validação do Frontend (TypeScript + ESLint + Build)
```bash
# Via container:
docker exec coworking-frontend npm run lint
docker exec coworking-frontend npm run build

# Ou localmente:
cd frontend && npm run lint && npm run build
```

**Resultado:** **0 erros e 0 warnings no ESLint e compilação de produção sem falhas via Vite.**

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
| `PUT`  | `/api/admin/spaces/{id}` | Atualiza dados de um espaço existente | Admin |
| `DELETE`| `/api/admin/spaces/{id}` | Remove um espaço do sistema | Admin |

---

## 📄 Licença

Distribuído sob licença MIT. Desenvolvido com padrões de Engenharia de Software Sênior.
