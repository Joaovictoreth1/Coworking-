import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../auth/context'
import { isBookingConflict, useBookingPreviewQuery, useCreateBookingMutation } from '../hooks/useBookings'
import { ApiError } from '../lib/api'
import { navigate } from '../lib/route'
import { formatBRL, type Space } from '../lib/spaces'
import { inputClass, primaryButton } from '../lib/ui'

interface BookingWidgetProps {
    space: Space
}

function scheduleDateTime(timestamp: number, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en', {
        timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(timestamp)
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((value) => value.type === type)?.value
    return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}`
}

export function BookingWidget({ space }: BookingWidgetProps) {
    const { user } = useAuth()

    const [nowMs, setNowMs] = useState(() => Date.now())
    const nowInSchedule = useMemo(() => scheduleDateTime(nowMs, space.timezone), [nowMs, space.timezone])
    const todayDate = nowInSchedule.split('T')[0]
    const [date, setDate] = useState(() => {
        const tomorrow = new Date(`${todayDate}T00:00:00Z`)
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
        return tomorrow.toISOString().split('T')[0]
    })
    const [startTime, setStartTime] = useState<string>('09:00')
    const [endTime, setEndTime] = useState<string>('13:00')
    const [notes, setNotes] = useState<string>('')

    useEffect(() => {
        const timer = window.setInterval(() => setNowMs(Date.now()), 30_000)
        return () => window.clearInterval(timer)
    }, [])

    // A API interpreta horários sem offset no fuso do espaço.
    const startIso = useMemo(() => {
        if (!date || !startTime) return ''
        return `${date}T${startTime}:00`
    }, [date, startTime])

    const endIso = useMemo(() => {
        if (!date || !endTime) return ''
        return `${date}T${endTime}:00`
    }, [date, endTime])

    const hasCompleteInputs = Boolean(date && startTime && endTime && startIso && endIso)
    const isInvalidOrder = Boolean(startTime && endTime && startTime >= endTime)
    const isPastDateTime = Boolean(startIso && startIso < nowInSchedule)

    const canPreview = space.is_active && hasCompleteInputs && !isInvalidOrder && !isPastDateTime

    // Consulta prévia e validação em tempo real de conflitos
    const {
        data: preview,
        isFetching: isChecking,
        error: previewError,
        refetch: refetchPreview,
    } = useBookingPreviewQuery(space.id, startIso, endIso, canPreview)

    const createBooking = useCreateBookingMutation(space.id)
    const createConflict = isBookingConflict(createBooking.error)
        && createBooking.variables?.start_time === startIso
        && createBooking.variables?.end_time === endIso
        ? createBooking.error
        : null

    const localValidationError = !space.is_active
        ? 'Este espaço está temporariamente inativo para novas reservas.'
        : isInvalidOrder
          ? 'O horário de saída deve ser posterior ao horário de entrada.'
          : isPastDateTime
            ? 'O horário de início não pode ser no passado.'
            : null

    const isNetworkOrServerError =
        previewError instanceof ApiError && (previewError.status === 0 || previewError.status >= 500)

    const apiErrorMessage =
        preview?.available === false
            ? preview.message || 'Este espaço já possui uma reserva no horário selecionado.'
            : previewError
              ? previewError instanceof ApiError
                  ? previewError.message
                  : 'Não foi possível verificar a disponibilidade do horário.'
              : null

    const errorMessage = localValidationError ?? createConflict?.message ?? apiErrorMessage
    const isBlocked = Boolean(
        !space.is_active ||
            !hasCompleteInputs ||
            isInvalidOrder ||
            isPastDateTime ||
            isChecking ||
            createBooking.isPending ||
            preview?.available !== true ||
            createConflict ||
            previewError,
    )

    async function handleBook(e: React.FormEvent) {
        e.preventDefault()

        if (!space.is_active) return

        if (!user) {
            navigate('login')
            return
        }

        if (isBlocked) {
            return
        }

        try {
            await createBooking.mutateAsync({
                start_time: startIso,
                end_time: endIso,
                notes: notes.trim() || undefined,
            })
            navigate('my-bookings')
        } catch {
            // Tratado pelo onError do hook
        }
    }

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
                {space.is_active ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Espaço Ativo
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        Indisponível
                    </div>
                )}
            </div>

            <form onSubmit={handleBook} className="mt-5 space-y-4">
                {/* Data da Reserva */}
                <div>
                    <label htmlFor="booking-date" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Data
                    </label>
                    <input
                        id="booking-date"
                        type="date"
                        value={date}
                        min={todayDate}
                        onChange={(e) => setDate(e.target.value)}
                        className={inputClass(isPastDateTime, 'py-2')}
                        required
                    />
                </div>

                {/* Intervalo de Horário */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="booking-start-time" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                            Entrada
                        </label>
                        <input
                            id="booking-start-time"
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className={inputClass(isInvalidOrder || isPastDateTime, 'py-2')}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="booking-end-time" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                            Saída
                        </label>
                        <input
                            id="booking-end-time"
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className={inputClass(isInvalidOrder, 'py-2')}
                            required
                        />
                    </div>
                </div>

                {/* Observações Opcionais */}
                <div>
                    <label htmlFor="booking-notes" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Observações (opcional)
                    </label>
                    <textarea
                        id="booking-notes"
                        rows={2}
                        maxLength={1000}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ex: Reunião para 6 pessoas com projetor"
                        className={inputClass(false, 'text-sm resize-none py-2')}
                    />
                </div>

                {space.is_active && !hasCompleteInputs && (
                    <p className="text-xs text-slate-600">Selecione a data e os horários da reserva.</p>
                )}

                {/* Estado de Carregamento da Prévia */}
                {canPreview && isChecking && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-600 text-xs font-medium"
                    >
                        <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>Verificando disponibilidade e valor...</span>
                    </div>
                )}

                {/* Feedback em Tempo Real de Validação / Conflito / Erro */}
                {!isChecking && errorMessage && (
                    <div
                        role="alert"
                        className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium space-y-1.5"
                    >
                        <div className="flex items-center gap-2 font-bold text-rose-800">
                            <span>
                                {isNetworkOrServerError
                                    ? 'Erro ao verificar disponibilidade'
                                    : localValidationError
                                      ? 'Verifique o período selecionado'
                                      : 'Horário Indisponível'}
                            </span>
                        </div>
                        <p>{errorMessage}</p>
                        {isNetworkOrServerError && (
                            <button
                                type="button"
                                onClick={() => refetchPreview()}
                                className="mt-1 inline-flex items-center text-xs font-semibold text-rose-800 underline hover:text-rose-900 cursor-pointer"
                            >
                                Tentar novamente
                            </button>
                        )}
                    </div>
                )}

                {/* Resumo do Valor Calculado */}
                {canPreview && !isChecking && !errorMessage && preview?.available && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-600">
                            <span>Duração estimada:</span>
                            <span className="font-semibold text-slate-900">
                                {preview.duration_hours} {preview.duration_hours === 1 ? 'hora' : 'horas'}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200/80">
                            <span>Total estimado:</span>
                            <span className="text-base text-emerald-600">
                                {preview.total_price === 0 ? 'Gratuito' : formatBRL(preview.total_price)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Botão de Ação */}
                <button
                    type="submit"
                    disabled={user ? isBlocked : !space.is_active}
                    className={`${primaryButton} w-full py-3.5 text-base font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {createBooking.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Confirmando...
                        </span>
                    ) : !user ? (
                        'Entrar para Reservar'
                    ) : isChecking ? (
                        'Verificando...'
                    ) : errorMessage ? (
                        'Horário Indisponível'
                    ) : (
                        'Confirmar Reserva'
                    )}
                </button>
            </form>
        </aside>
    )
}
