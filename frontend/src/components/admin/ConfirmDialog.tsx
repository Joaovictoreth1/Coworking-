import { useEffect, useId } from 'react'
import { secondaryButton } from '../../lib/ui'

// --- Tipos e Interfaces ---
export interface ConfirmDialogProps {
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    busyLabel?: string
    intent?: 'danger' | 'primary' // Permite usar o modal para ações positivas também
    busy?: boolean
    onConfirm: () => void
    onCancel: () => void
}

// --- Componente Principal ---
export default function ConfirmDialog({
    title,
    message,
    confirmLabel = 'Excluir',
    cancelLabel = 'Cancelar',
    busyLabel = 'Processando...',
    intent = 'danger',
    busy = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const titleId = useId()
    const descId = useId()

    // Efeito unificado: Lida com a tecla "Escape" e bloqueia o scroll do body
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !busy) {
                onCancel()
            }
        }

        // Bloqueia a rolagem da página de fundo enquanto o modal está aberto
        const originalOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        
        document.addEventListener('keydown', handleKeyDown)
        
        return () => {
            document.body.style.overflow = originalOverflow
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [busy, onCancel])

    // Estilização dinâmica com base na intenção (Ação destrutiva vs Ação primária)
    const confirmButtonBase = 'inline-flex h-11 items-center justify-center rounded-md px-5 font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'
    const confirmButtonIntent = intent === 'danger'
        ? 'bg-red-600 hover:bg-red-500 focus:ring-red-600'
        : 'bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-600'

    return (
        <div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm transition-opacity"
            onPointerDown={(e) => {
                // Fecha ao clicar na área externa (backdrop)
                if (e.target === e.currentTarget && !busy) {
                    onCancel()
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descId}
                className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-xl motion-safe:animate-pop"
            >
                <h2 id={titleId} className="font-display text-xl font-semibold text-slate-900">
                    {title}
                </h2>
                <p id={descId} className="mt-2 text-sm text-slate-600">
                    {message}
                </p>
                
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        autoFocus
                        disabled={busy}
                        onClick={onCancel}
                        className={`sm:w-auto w-full ${secondaryButton}`}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onConfirm}
                        className={`${confirmButtonBase} ${confirmButtonIntent} sm:w-auto w-full`}
                    >
                        {busy ? busyLabel : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
