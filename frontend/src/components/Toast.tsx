import { useToastStore, type ToastType } from '../store/useToastStore'

function getToastStyles(type: ToastType): string {
    switch (type) {
        case 'success':
            return 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-900/20'
        case 'error':
            return 'bg-rose-600 text-white border-rose-700 shadow-rose-900/20'
        case 'warning':
            return 'bg-amber-500 text-slate-900 border-amber-600 shadow-amber-900/20'
        case 'info':
        default:
            return 'bg-slate-900 text-white border-slate-800 shadow-slate-900/30'
    }
}

export function ToastContainer() {
    const { toasts, removeToast } = useToastStore()

    if (toasts.length === 0) return null

    return (
        <aside
            aria-label="Notificações do sistema"
            className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        >
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    role={toast.type === 'error' ? 'alert' : 'status'}
                    aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
                    className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl border shadow-lg text-sm font-medium transition-all duration-300 animate-slide-up ${getToastStyles(
                        toast.type,
                    )}`}
                >
                    <p className="flex-1 pr-2 leading-snug">{toast.message}</p>
                    <button
                        type="button"
                        onClick={() => removeToast(toast.id)}
                        className="opacity-75 hover:opacity-100 transition-opacity p-1 text-lg leading-none cursor-pointer"
                        aria-label="Fechar notificação"
                    >
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
            ))}
        </aside>
    )
}
