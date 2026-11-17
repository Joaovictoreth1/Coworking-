import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from './auth/context'
import { ToastContainer } from './components/Toast'
import { navigate, useRoute, useRouteId, type Route } from './lib/route'
import SpaceForm from './pages/admin/SpaceForm'
import SpacesList from './pages/admin/SpacesList'
import AdminDashboard from './pages/admin/AdminDashboard'
import Favorites from './pages/Favorites'
import Home from './pages/Home'
import Login from './pages/Login'
import MyBookings from './pages/MyBookings'
import Register from './pages/Register'
import SpaceDetail from './pages/SpaceDetail'

const ADMIN_ROUTES: Route[] = ['spaces', 'space-new', 'space-edit', 'admin-dashboard']

function AppContent() {
    const { user, loading } = useAuth()
    const route = useRoute()
    const routeId = useRouteId()

    const isAuthRoute = route === 'login' || route === 'register'
    const isAdminRoute = ADMIN_ROUTES.includes(route)
    const isPrivateRoute = isAdminRoute || route === 'favorites' || route === 'my-bookings'

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
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
                <div className="flex items-center gap-3">
                    <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span>Carregando aplicação...</span>
                </div>
            </main>
        )
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
        if (route === 'space-new') return <SpaceForm key="new" id={null} />
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
            <AppContent />
            <ToastContainer />
        </QueryClientProvider>
    )
}
