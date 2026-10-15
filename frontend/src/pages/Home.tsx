import { useAuth } from '../auth/context'

export default function Home() {
    const { user, logout } = useAuth()

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">
            <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-8 text-center shadow-xl">
                <h1 className="text-2xl font-bold text-blue-500">Olá, {user?.name}!</h1>
                <p className="mt-2 text-gray-400">{user?.email}</p>
                <button
                    onClick={logout}
                    className="mt-6 rounded-lg bg-blue-600 px-5 py-2 font-medium transition hover:bg-blue-700"
                >
                    Sair
                </button>
            </div>
        </main>
    )
}
