# 🗺️ ROADMAP Técnico — Evolução do Sistema Coworking

**Projeto:** Coworking Platform (Laravel + React)  
**Branch de Desenvolvimento:** `feat/full-system-evolution`  
**Data:** Novembro de 2026  
**Responsável:** Arquiteto de Software & Engenheiro Full-Stack Sênior

---

## 1. Diagnóstico e Auditoria do Estado Inicial

### 1.1 Backend (Laravel 13 + PHP 8.4)
- **Autenticação:** Sistema de Bearer Token funcional com tabela `api_tokens` e middleware `AuthenticateApiToken`.
- **Controle de Acesso:** Papéis definidos em `users.role` (`admin` e `user`/cliente), com middleware `EnsureAdmin`.
- **Domínio Espaços:** CRUD de espaços (`spaces`), fotos (`space_photos`), favoritos (`favorites`) e avaliações (`space_reviews`).
- **Gaps Críticos Identificados:**
  - ❌ Ausência do módulo de **Reservas (`bookings`)**: Não há modelo, migrations, controllers ou regras de negócio para agendamento.
  - ❌ Ausência de prevenção contra **Double-Booking**: Risco de reservas sobrepostas no mesmo espaço.
  - ❌ Ausência de cálculo automático de tarifação por duração/modalidade de reserva.
  - ❌ Ausência de testes de integração para o fluxo de reservas e validação de conflitos.
  - ❌ Ausência de métricas e endpoints administrativos consolidados (ocupação, faturamento, total de reservas).

### 1.2 Frontend (React 19 + TypeScript + Vite + TailwindCSS v4)
- **Estrutura Atual:** Catálogo público com filtros, detalhes do espaço, autenticação básica via Context API e painel admin de espaços.
- **Gaps Críticos Identificados:**
  - ❌ Ausência de bibliotecas de ecossistema moderno solicitadas: `axios`, `@tanstack/react-query`, `zustand`.
  - ❌ Falhas no ESLint:
    - Chamada síncrona de `setState` dentro de `useEffect` em `AuthProvider.tsx`.
    - Exportação de constantes em arquivos de componentes (`SpaceFilters.tsx`), quebrando Fast Refresh.
    - Dependência desnecessária no hook `useCallback` em `Reviews.tsx`.
  - ❌ Ausência de página e fluxo interativo de **Reserva** no detalhe do espaço (cálculo de preço em tempo real e bloqueio de conflitos).
  - ❌ Ausência do painel do cliente **"Minhas Reservas"** com histórico e cancelamento.
  - ❌ Ausência do **Dashboard Administrativo Geral** com KPIs (taxa de ocupação, faturamento, reservas para aprovação).

---

## 2. Plano de Execução por Sprints

### Sprint 1: Blindagem e Domínio de Reservas no Backend
- [x] Criar migration da tabela `bookings` (`id`, `user_id`, `space_id`, `start_time`, `end_time`, `total_price`, `status`, `notes`, `timestamps`).
- [x] Implementar model `Booking` com relacionamentos (`user`, `space`) e escopos úteis.
- [x] Implementar `BookingService` (Service Layer):
  - Algoritmo de validação de sobreposição de horários (**Double-Booking Prevention**).
  - Algoritmo de cálculo de preço automático baseado na duração e tarifas do espaço.
  - Validação de horário de funcionamento (`opening_hours`).
  - Máquina de estados da reserva (`pending`, `confirmed`, `cancelled`, `completed`).
- [x] Criar `BookingRequest` (FormRequest) e `BookingResource`.
- [x] Criar `BookingController` e `AdminBookingController`.
- [x] Criar endpoint de métricas administrativas (`/api/admin/metrics` ou `/api/admin/dashboard`).
- [x] Expandir `DatabaseSeeder` com reservas representativas.
- [x] Desenvolver suíte de testes `BookingTest` e `AdminSpaceTest`.

### Sprint 2: Modernização da Arquitetura Frontend
- [x] Instalar dependências: `axios`, `@tanstack/react-query`, `zustand`, `lucide-react`.
- [x] Configurar cliente Axios padronizado com interceptors e tratamento global de erros.
- [x] Configurar TanStack Query com cache inteligente e invalidações automáticas.
- [x] Implementar store global de autenticação com Zustand (`useAuthStore`).
- [x] Corrigir todos os erros de linting e tipagem (`AuthProvider.tsx`, `SpaceFilters.tsx`, `Reviews.tsx`).

### Sprint 3: Telas e Experiência do Usuário (UI/UX)
- [x] Seletor interativo de reserva em `SpaceDetail.tsx` com preview de preço e feedback de erro de conflito.
- [x] Criar página do cliente **"Minhas Reservas"** (`/my-bookings`) com filtros por status e cancelamento.
- [x] Criar **Dashboard Administrativo** (`/admin/dashboard`) com cards de métricas (ocupação, receita, reservas) e gerenciamento de status.
- [x] Atualizar navegação (`ComponentNavbar.tsx`) com links dinâmicos baseados no papel do usuário.

### Sprint 4: Qualidade, Homologação e Entrega
- [x] Executar bateria completa de testes no backend (`php artisan test`) atingindo 100% de sucesso.
- [x] Executar `npm run lint` garantindo zero warnings ou erros.
- [x] Executar `npm run build` gerando bundle de produção sem falhas.
- [x] Atualizar documentação técnica no `README.md`.
- [x] Realizar commits semânticos e push para `feat/full-system-evolution`.
