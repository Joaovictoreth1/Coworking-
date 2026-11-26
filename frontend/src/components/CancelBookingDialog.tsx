import { useId, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../lib/api'
import {
    bookingName,
    bookingSchedule,
    CANCEL_REASON_LIMIT,
    CANCEL_REASONS,
    validateCancelReason,
} from '../lib/bookingHistory'
import type { Booking } from '../lib/spaces'
import { inputClass, secondaryButton } from '../lib/ui'
import BookingHistoryDialog from './BookingHistoryDialog'

interface CancelBookingDialogProps {
    booking: Booking
    busy: boolean
    error: Error | null
    onDismiss: () => void
    onConfirm: (bookingId: number, reason: string) => void
}

export default function CancelBookingDialog({
    booking,
    busy,
    error,
    onDismiss,
    onConfirm,
}: CancelBookingDialogProps) {
    const [choice, setChoice] = useState('')
    const [details, setDetails] = useState('')
    const [validate, setValidate] = useState(false)
    const [showServerError, setShowServerError] = useState(false)
    const reasonId = useId()
    const detailsId = useId()
    const messageId = useId()
    const countId = useId()
    const select = useRef<HTMLSelectElement>(null)
    const textarea = useRef<HTMLTextAreaElement>(null)
    const reason = validateCancelReason(choice, details)
    const localError = validate && !reason.valid ? reason.message : null
    const apiReasonError = showServerError && error instanceof ApiError ? error.errors.reason?.[0] : undefined
    const fieldError = localError || apiReasonError
    const schedule = bookingSchedule(booking.start_time, booking.end_time)

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (busy) return
        if (!reason.valid) {
            setValidate(true)
            setShowServerError(false)
            const field = choice === 'other' ? textarea.current : select.current
            field?.focus()
            return
        }
        setShowServerError(true)
        onConfirm(booking.id, reason.reason)
    }

    return (
        <BookingHistoryDialog
            title="Cancelar reserva?"
            description="O horário será liberado para outros usuários. Esta ação não pode ser desfeita."
            busy={busy}
            onDismiss={onDismiss}
        >
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-semibold">{bookingName(booking)}</p>
                {schedule && <p className="text-slate-600">{schedule}</p>}
            </div>
            <form noValidate aria-busy={busy} onSubmit={submit} className="space-y-4">
                <fieldset disabled={busy} className="space-y-4">
                    <div className="space-y-1">
                        <label htmlFor={reasonId} className="block text-sm font-medium">
                            Motivo do cancelamento
                        </label>
                        <select
                            id={reasonId}
                            ref={select}
                            required
                            value={choice}
                            aria-invalid={choice !== 'other' && Boolean(fieldError)}
                            aria-describedby={choice !== 'other' && fieldError ? messageId : undefined}
                            onChange={(event) => {
                                setChoice(event.target.value)
                                setValidate(false)
                                setShowServerError(false)
                            }}
                            className={inputClass(choice !== 'other' && Boolean(fieldError), 'min-h-11')}
                        >
                            <option value="">Selecione um motivo</option>
                            {Object.entries(CANCEL_REASONS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>
                    {choice === 'other' && (
                        <div className="space-y-1">
                            <label htmlFor={detailsId} className="block text-sm font-medium">
                                Descreva o motivo
                            </label>
                            <textarea
                                id={detailsId}
                                ref={textarea}
                                required
                                rows={3}
                                value={details}
                                aria-invalid={Boolean(fieldError)}
                                aria-describedby={fieldError ? `${countId} ${messageId}` : countId}
                                onChange={(event) => {
                                    setDetails(event.target.value)
                                    setShowServerError(false)
                                }}
                                className={inputClass(Boolean(fieldError), 'py-2')}
                            />
                            <p id={countId} className="text-xs text-slate-600">
                                {Array.from(details.trim()).length} de {CANCEL_REASON_LIMIT} caracteres
                            </p>
                        </div>
                    )}
                    {fieldError && (
                        <p id={messageId} role="alert" className="text-sm text-rose-700">{fieldError}</p>
                    )}
                </fieldset>
                {showServerError && error && !apiReasonError && (
                    <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                        {error instanceof ApiError ? error.message : 'Não foi possível cancelar. Tente novamente.'}
                    </p>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={onDismiss} className={secondaryButton} disabled={busy}>
                        Manter reserva
                    </button>
                    <button
                        type="submit"
                        disabled={busy}
                        className="min-h-11 rounded-md bg-rose-700 px-5 font-medium text-white hover:bg-rose-800 disabled:opacity-60"
                    >
                        {busy ? 'Cancelando…' : 'Confirmar cancelamento'}
                    </button>
                </div>
            </form>
        </BookingHistoryDialog>
    )
}
