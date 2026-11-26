import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './auth/context'
import { ToastContainer } from './components/Toast'
import { navigate, useRoute, useRouteId, type Route } from './lib/route'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import AccessDenied from './pages/AccessDenied'

// Caminho crítico (Home/Login/Register) entra no bundle inicial.
// As demais rotas são carregadas sob demanda (code-splitting), aliviando o
// primeiro carregamento — sobretudo os painéis admin, que são grandes.
const SpaceDetail = lazy(() => import('./pages/SpaceDetail'))
const Favorites = lazy(() => import('./pages/Favorites'))
const MyBookings = lazy(() => import('./pages/MyBookings'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const SpacesList = lazy(() => import('./pages/admin/SpacesList'))
const SpaceForm = lazy(() => import('./pages/admin/SpaceForm'))

const ADMIN_ROUTES: Route[] = ['spaces', 'space-new', 'space-edit', 'admin-dashboard']

const ROUTE_TITLES: Record<Route, string> = {
    home: 'Coworking Brasil · Encontre e reserve espaços de trabalho',
    login: 'Entrar · Coworking Brasil',
    register: 'Criar conta · Coworking Brasil',
    'space-detail': 'Detalhes do espaço · Coworking Brasil',
    favorites: 'Meus favoritos · Coworking Brasil',
    'my-bookings': 'Minhas reservas · Coworking Brasil',
    'admin-dashboard': 'Painel administrativo · Coworking Brasil',
    spaces: 'Gerenciar locais · Coworking Brasil',
    'space-new': 'Novo espaço · Coworking Brasil',
    'space-edit': 'Editar espaço · Coworking Brasil',
}

function FullScreenLoader({ label }: { label: string }) {
    return (
        <main
            className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600"
            aria-busy="true"
        >
            <div className="flex items-center gap-3">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                <span>{label}</span>
            </div>
        </main>
    )
}

function AppContent() {
    const { user, loading } = useAuth()
    const queryClient = useQueryClient()
    const prevUserIdRef = useRef<number | null | undefined>(undefined)
    const route = useRoute()
    const routeId = useRouteId()

    const isAuthRoute = route === 'login' || route === 'register'
    const isAdminRoute = ADMIN_ROUTES.includes(route)
    const isPrivateRoute = isAdminRoute || route === 'favorites' || route === 'my-bookings'

    useEffect(() => {
        document.title = ROUTE_TITLES[route] ?? ROUTE_TITLES.home
    }, [route])

    // Limpa o cache do React Query ao sair ou trocar de conta para evitar vazamento entre sessões
    useEffect(() => {
        if (loading) return
        const currentUserId = user?.id ?? null
        if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== currentUserId) {
            queryClient.clear()
        }
        prevUserIdRef.current = currentUserId
    }, [user, loading, queryClient])

    useEffect(() => {
        if (loading) return
        // Logou/cadastrou? Sai das telas de autenticação e cai na home ou painel.
        if (user && isAuthRoute) navigate('home')
        // Rotas protegidas exigem login
        if (!user && isPrivateRoute) navigate('login')
        // Rotas exclusivas de admin bloqueiam usuários comuns
        if (user && !user.is_admin && route === 'admin-dashboard') navigate('home')
    }, [user, loading, isAuthRoute, isPrivateRoute, route])

    if (loading) {
        return <FullScreenLoader label="Carregando aplicação..." />
    }

    if (!user && route === 'login') return <Login onGoRegister={() => navigate('register')} />
    if (!user && route === 'register') return <Register onGoLogin={() => navigate('login')} />

    if (route === 'space-detail' && routeId !== null) return <SpaceDetail key={routeId} id={routeId} />

    if (route === 'favorites') return user ? <Favorites /> : null
    if (route === 'my-bookings') return user ? <MyBookings /> : null

    if (isAdminRoute) {
        if (!user) return null
        if (route === 'admin-dashboard') return user.is_admin ? <AdminDashboard /> : <Home />
        if (route === 'spaces') return <SpacesList />
        if (route === 'space-new') return user.is_admin ? <SpaceForm key="new" id={null} /> : <AccessDenied />
        if (route === 'space-edit' && routeId !== null) return <SpaceForm key={routeId} id={routeId} />
    }

    return <Home />
}

export default function App() {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 1000 * 60 * 2, // 2 minutos de cache
                        retry: 1,
                        refetchOnWindowFocus: false,
                    },
                },
            }),
    )

    return (
        <QueryClientProvider client={queryClient}>
            <Suspense fallback={<FullScreenLoader label="Carregando..." />}>
                <AppContent />
            </Suspense>
            <ToastContainer />
        </QueryClientProvider>
    )
}
