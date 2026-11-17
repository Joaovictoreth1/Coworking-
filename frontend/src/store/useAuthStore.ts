import { create } from 'zustand'
import { authApi, tokenStorage, type User } from '../lib/api'
import type { RegisterData } from '../auth/context'

interface AuthState {
    user: User | null
    token: string | null
    isLoading: boolean
    setUser: (user: User | null) => void
    login: (email: string, password: string) => Promise<void>
    register: (data: RegisterData) => Promise<void>
    logout: () => Promise<void>
    checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: tokenStorage.get(),
    isLoading: Boolean(tokenStorage.get()),

    setUser: (user) => set({ user }),

    login: async (email, password) => {
        const { user, token } = await authApi.login(email, password)
        tokenStorage.set(token)
        set({ user, token, isLoading: false })
    },

    register: async (data) => {
        const { user, token } = await authApi.register(data)
        tokenStorage.set(token)
        set({ user, token, isLoading: false })
    },

    logout: async () => {
        const token = get().token
        if (token) {
            await authApi.logout(token).catch(() => {})
        }
        tokenStorage.clear()
        set({ user: null, token: null, isLoading: false })
    },

    checkAuth: async () => {
        const token = tokenStorage.get()
        if (!token) {
            set({ user: null, token: null, isLoading: false })
            return
        }

        try {
            const { user } = await authApi.me(token)
            set({ user, token, isLoading: false })
        } catch {
            tokenStorage.clear()
            set({ user: null, token: null, isLoading: false })
        }
    },
}))
