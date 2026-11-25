import { useMemo, useState } from 'react'
import { useAuth } from '../auth/context'
import { useBookingPreviewQuery, useCreateBookingMutation } from '../hooks/useBookings'
import { ApiError, getErrorMessage } from '../lib/api'
import { navigate } from '../lib/route'
import { formatBRL, type Space } from '../lib/spaces'
import { inputClass, primaryButton } from '../lib/ui'

interface BookingWidgetProps {
    space: Space
}

export function BookingWidget({ space }: BookingWidgetProps) {
    const { user } = useAuth()

    // Data padrão: amanhã
    const defaultDate = useMemo(() => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        return d.toISOString().split('T')[0]
    }, [])

    const [date, setDate] = useState<string>(defaultDate)
    const [startTime, setStartTime] = useState<string>('09:00')
    const [endTime, setEndTime] = useState<string>('13:00')
    const [notes, setNotes] = useState<string>('')
    const [submitError, setSubmitError] = useState<string | null>(null)

    const startIso = useMemo(() => {
        if (!date || !startTime) return ''
        return `${date}T${startTime}:00`
    }, [date, startTime])

    const endIso = useMemo(() => {
        if (!date || !endTime) return ''
        return `${date}T${endTime}:00`
    }, [date, endTime])

    const rangeError = useMemo(() => {
        if (!date || !startTime || !endTime) return null
        if (startTime >= endTime) {
            return 'O horário de saída deve ser posterior ao horário de entrada.'
        }
        if (notes.length > 1000) {
            return 'As observações não podem exceder 1000 caracteres.'
        }
        return null
    }, [date, startTime, endTime, notes])

    const isValidRange = Boolean(startIso && endIso && !rangeError)

    const {
        data: preview,
        isFetching: isChecking,
        error: previewError,
    } = useBookingPreviewQuery(space.id, startIso, endIso, isValidRange)

    const createBooking = useCreateBookingMutation(space.id)

    async function handleBook(e: React.FormEvent) {
        e.preventDefault()
        setSubmitError(null)

        if (!user) {
            navigate('login')
            return
        }

        if (!isValidRange || preview?.available === false || Boolean(previewError)) {
            return
        }

        try {
            await createBooking.mutateAsync({
                start_time: startIso,
                end_time: endIso,
                notes: notes.trim() || undefined,
            })
            navigate('my-bookings')
        } catch (err) {
            setSubmitError(getErrorMessage(err, 'Não foi possível concluir a reserva.'))
        }
    }

    const isConflict =
        preview?.conflict === true ||
        (previewError instanceof ApiError && previewError.status === 409)

    const availabilityMessage =
        preview?.available === false
            ? preview.message || 'Este espaço já possui uma reserva no horário selecionado.'
            : previewError
              ? getErrorMessage(
                    previewError,
                    'Horário indisponível ou fora do período de funcionamento.',
                )
              : null

    return (
        <aside
            aria-label="Agendamento do espaço"
            className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xl shadow-slate-100 sticky top-24"
        >
            <div className="flex items-baseline justify-between pb-5 border-b border-slate-100">
                <div>
                    <span className="text-2xl font-bold text-slate-900 tracking-tight">
                        {space.is_free
                            ? 'Gratuito'
                            : space.hourly_price
                              ? formatBRL(space.hourly_price)
                              : space.daily_price
                                ? formatBRL(space.daily_price)
                                : 'Sob consulta'}
                    </span>
                    {!space.is_free && (
                        <span className="text-sm text-slate-500 ml-1">
                            {space.hourly_price ? '/hora' : space.daily_price ? '/dia' : ''}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Espaço Ativo
                </div>
            </div>

            <form onSubmit={handleBook} className="mt-5 space-y-4">
                <div>
                    <label
                        htmlFor="booking-date"
                        className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
                    >
                        Data
                    </label>
                    <input
                        id="booking-date"
                        type="date"
                        value={date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => {
                            setDate(e.target.value)
                            setSubmitError(null)
                        }}
                        className={inputClass(false, 'py-2')}
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label
                            htmlFor="booking-start-time"
                            className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
                        >
                            Entrada
                        </label>
                        <input
                            id="booking-start-time"
                            type="time"
                            value={startTime}
                            onChange={(e) => {
                                setStartTime(e.target.value)
                                setSubmitError(null)
                            }}
                            className={inputClass(Boolean(rangeError), 'py-2')}
                            required
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="booking-end-time"
                            className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
                        >
                            Saída
                        </label>
                        <input
                            id="booking-end-time"
                            type="time"
                            value={endTime}
                            onChange={(e) => {
                                setEndTime(e.target.value)
                                setSubmitError(null)
                            }}
                            className={inputClass(Boolean(rangeError), 'py-2')}
                            required
                        />
                    </div>
                </div>

                <div>
                    <label
                        htmlFor="booking-notes"
                        className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
                    >
                        Observações (opcional)
                    </label>
                    <textarea
                        id="booking-notes"
                        rows={2}
                        maxLength={1000}
                        value={notes}
                        onChange={(e) => {
                            setNotes(e.target.value)
                            setSubmitError(null)
                        }}
                        placeholder="Ex: Reunião para 6 pessoas com projetor"
                        className={inputClass(notes.length > 1000, 'text-sm resize-none py-2')}
                    />
                </div>

                {/* Validação inline de intervalo */}
                {rangeError && (
                    <div
                        role="alert"
                        className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium"
                    >
                        {rangeError}
                    </div>
                )}

                {/* Estado de carregamento da verificação de disponibilidade */}
                {isValidRange && isChecking && (
                    <div
                        className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-600 text-xs font-medium"
                        aria-busy="true"
                    >
                        <span className="w-3.5 h-3.5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                        <span>Verificando disponibilidade e valor...</span>
                    </div>
                )}

                {/* Feedback em tempo real de conflito ou indisponibilidade */}
                {!isChecking && isValidRange && availabilityMessage && (
                    <div
                        role="alert"
                        className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium space-y-1"
                    >
                        <div className="flex items-center gap-2 font-bold text-rose-800">
                            <span>{isConflict ? 'Horário já reservado' : 'Horário indisponível'}</span>
                        </div>
                        <p>{availabilityMessage}</p>
                    </div>
                )}

                {/* Erro ao enviar a reserva */}
                {submitError && (
                    <div
                        role="alert"
                        className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
                    >
                        {submitError}
                    </div>
                )}

                {/* Resumo do valor calculado */}
                {!isChecking && isValidRange && preview?.available && !previewError && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-600">
                            <span>Duração estimada:</span>
                            <span className="font-semibold text-slate-900">
                                {preview.duration_hours}{' '}
                                {preview.duration_hours === 1 ? 'hora' : 'horas'}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200/80">
                            <span>Total estimado:</span>
                            <span className="text-base text-emerald-600">
                                {preview.total_price === 0
                                    ? 'Gratuito'
                                    : formatBRL(preview.total_price)}
                            </span>
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={
                        !isValidRange ||
                        isChecking ||
                        createBooking.isPending ||
                        preview?.available === false ||
                        Boolean(previewError)
                    }
                    className={`${primaryButton} w-full py-3.5 text-base font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {createBooking.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Confirmando...
                        </span>
                    ) : !user ? (
                        'Entrar para Reservar'
                    ) : availabilityMessage ? (
                        'Horário Indisponível'
                    ) : (
                        'Confirmar Reserva'
                    )}
                </button>
            </form>
        </aside>
    )
}
