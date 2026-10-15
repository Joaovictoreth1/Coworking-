import { useEffect } from 'react'
import { useAuth } from './auth/context'
import { navigate, useRoute, useRouteId, type Route } from './lib/route'
import SpaceForm from './pages/admin/SpaceForm'
import SpacesList from './pages/admin/SpacesList'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import SpaceDetail from './pages/SpaceDetail'

const ADMIN_ROUTES: Route[] = ['spaces', 'space-new', 'space-edit']

function App() {
    const { user, loading } = useAuth()
    const route = useRoute()
    const routeId = useRouteId()

    const isAuthRoute = route === 'login' || route === 'register'
    const isAdminRoute = ADMIN_ROUTES.includes(route)

    useEffect(() => {
        if (loading) return
        // Logou/cadastrou? Sai das telas de autenticação e cai direto no painel de locais.
        if (user && isAuthRoute) navigate('spaces')
        // Área administrativa exige login.
        if (!user && isAdminRoute) navigate('login')
    }, [user, loading, isAuthRoute, isAdminRoute])

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
                Carregando...
            </main>
        )
    }

    if (!user && route === 'login') return <Login onGoRegister={() => navigate('register')} />
    if (!user && route === 'register') return <Register onGoLogin={() => navigate('login')} />

    if (route === 'space-detail' && routeId !== null) return <SpaceDetail key={routeId} id={routeId} />

    if (isAdminRoute) {
        if (!user) return null // redirecionando para o login
        if (route === 'spaces') return <SpacesList />
        if (route === 'space-new') return <SpaceForm key="new" id={null} />
        if (route === 'space-edit' && routeId !== null) return <SpaceForm key={routeId} id={routeId} />
    }

    return <Home />
}

export default App
