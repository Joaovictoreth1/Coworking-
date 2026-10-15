import { useState } from 'react'
import { useAuth } from './auth/context'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
    const { user, loading } = useAuth()
    const [screen, setScreen] = useState<'login' | 'register'>('login')

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400">
                Carregando...
            </main>
        )
    }

    if (user) return <Home />

    return screen === 'login' ? (
        <Login onGoRegister={() => setScreen('register')} />
    ) : (
        <Register onGoLogin={() => setScreen('login')} />
    )
}

export default App
