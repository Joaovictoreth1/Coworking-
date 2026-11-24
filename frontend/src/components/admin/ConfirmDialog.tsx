import { useId } from 'react'
import Modal from '../Modal'
import { secondaryButton } from '../../lib/ui'

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

    const confirmButtonBase =
        'inline-flex h-11 items-center justify-center rounded-md px-5 font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'
    const confirmButtonIntent =
        intent === 'danger'
            ? 'bg-red-600 hover:bg-red-500 focus:ring-red-600'
            : 'bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-600'

    return (
        <Modal onClose={onCancel} busy={busy} labelledBy={titleId} describedBy={descId}>
            <h2 id={titleId} className="font-display text-xl font-semibold text-slate-900">
                {title}
            </h2>
            <p id={descId} className="mt-2 text-sm text-slate-600">
                {message}
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                    type="button"
                    disabled={busy}
                    onClick={onCancel}
                    className={`w-full sm:w-auto ${secondaryButton}`}
                >
                    {cancelLabel}
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={onConfirm}
                    className={`${confirmButtonBase} ${confirmButtonIntent} w-full sm:w-auto`}
                >
                    {busy ? busyLabel : confirmLabel}
                </button>
            </div>
        </Modal>
    )
}
