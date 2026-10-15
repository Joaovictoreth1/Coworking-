import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, authApi, tokenStorage, type User } from '../lib/api'
import { AuthContext, type AuthContextValue, type RegisterData } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    // Restaura a sessão ao abrir o app
    useEffect(() => {
        const token = tokenStorage.get()
        if (!token) {
            setLoading(false)
            return
        }

        let cancelled = false
        authApi
            .me(token)
            .then(({ user }) => {
                if (!cancelled) setUser(user)
            })
            .catch((err) => {
                // Só descarta o token se o servidor disse que ele é inválido
                if (err instanceof ApiError && err.status === 401) tokenStorage.clear()
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [])

    const login = useCallback(async (email: string, password: string) => {
        const { user, token } = await authApi.login(email, password)
        tokenStorage.set(token)
        setUser(user)
    }, [])

    const register = useCallback(async (data: RegisterData) => {
        const { user, token } = await authApi.register(data)
        tokenStorage.set(token)
        setUser(user)
    }, [])

    const logout = useCallback(async () => {
        const token = tokenStorage.get()
        if (token) await authApi.logout(token).catch(() => {})
        tokenStorage.clear()
        setUser(null)
    }, [])

    const value = useMemo<AuthContextValue>(
        () => ({ user, loading, login, register, logout }),
        [user, loading, login, register, logout],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
