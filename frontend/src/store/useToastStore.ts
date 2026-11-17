import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
    id: string
    type: ToastType
    message: string
}

interface ToastState {
    toasts: ToastMessage[]
    addToast: (message: string, type?: ToastType) => void
    removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
    toasts: [],
    addToast: (message, type = 'info') => {
        const id = `${Date.now()}-${Math.random()}`
        set((state) => ({
            toasts: [...state.toasts, { id, type, message }],
        }))

        // Auto remove após 4 segundos
        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id),
            }))
        }, 4000)
    },
    removeToast: (id) =>
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        })),
}))

export const toast = {
    success: (msg: string) => useToastStore.getState().addToast(msg, 'success'),
    error: (msg: string) => useToastStore.getState().addToast(msg, 'error'),
    info: (msg: string) => useToastStore.getState().addToast(msg, 'info'),
    warning: (msg: string) => useToastStore.getState().addToast(msg, 'warning'),
}
