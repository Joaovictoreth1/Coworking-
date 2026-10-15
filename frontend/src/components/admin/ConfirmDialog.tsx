import { useEffect } from 'react'
import { secondaryButton } from '../../lib/ui'

export default function ConfirmDialog({
    title,
    message,
    confirmLabel = 'Excluir',
    busy = false,
    onConfirm,
    onCancel,
}: {
    title: string
    message: string
    confirmLabel?: string
    busy?: boolean
    onConfirm: () => void
    onCancel: () => void
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !busy) onCancel()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [busy, onCancel])

    return (
        <div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4"
            onPointerDown={(e) => {
                if (e.target === e.currentTarget && !busy) onCancel()
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 motion-safe:animate-pop"
            >
                <h2 id="confirm-title" className="font-display text-xl font-semibold text-slate-900">
                    {title}
                </h2>
                <p className="mt-2 text-sm text-slate-600">{message}</p>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        autoFocus
                        disabled={busy}
                        onClick={onCancel}
                        className={secondaryButton}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onConfirm}
                        className="inline-flex h-11 items-center justify-center rounded-md bg-red-600 px-5 font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
                    >
                        {busy ? 'Excluindo...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
