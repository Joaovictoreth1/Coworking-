import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/context'
import {
    useBookingAvailabilityQuery,
    useBookingPreviewQuery,
    useCreateBookingMutation,
} from '../hooks/useBookings'
import { ApiError, getErrorMessage } from '../lib/api'
import { navigate } from '../lib/route'
import { formatBRL, type Space } from '../lib/spaces'
import { inputClass, primaryButton } from '../lib/ui'

interface BookingWidgetProps {
    space: Space
}

function formatLocalDate(d: Date): string {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function toLocalIsoWithOffset(date: string, time: string): string {
    const local = new Date(`${date}T${time}:00`)
    if (Number.isNaN(local.getTime())) return ''

    const offsetMinutes = -local.getTimezoneOffset()
    const sign = offsetMinutes >= 0 ? '+' : '-'
    const abs = Math.abs(offsetMinutes)
    const hh = String(Math.floor(abs / 60)).padStart(2, '0')
    const mm = String(abs % 60).padStart(2, '0')
    return `${date}T${time}:00${sign}${hh}:${mm}`
}

function formatTimeRange(startIso: string, endIso: string, timeZone?: string): string {
    const start = new Date(startIso)
    const end = new Date(endIso)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return ''
    const fmt = (d: Date) =>
        d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone })
    return `${fmt(start)} – ${fmt(end)}`
}

export function BookingWidget({ space }: BookingWidgetProps) {
    const { user } = useAuth()

    const todayDate = useMemo(() => formatLocalDate(new Date()), [])

    // Data padrão: amanhã (no fuso local do usuário)
    const defaultDate = useMemo(() => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        return formatLocalDate(d)
    }, [])

    const [date, setDate] = useState<string>(defaultDate)
    const [startTime, setStartTime] = useState<string>('09:00')
    const [endTime, setEndTime] = useState<string>('13:00')
    const [notes, setNotes] = useState<string>('')
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [nowMs, setNowMs] = useState<number>(() => Date.now())

    useEffect(() => {
        const timer = window.setInterval(() => setNowMs(Date.now()), 30_000)
        return () => window.clearInterval(timer)
    }, [])

    // Monta ISO string com fuso local para a API validar corretamente horário e passado
    const startIso = useMemo(() => {
        if (!date || !startTime) return ''
        return toLocalIsoWithOffset(date, startTime)
    }, [date, startTime])

    const endIso = useMemo(() => {
        if (!date || !endTime) return ''
        return toLocalIsoWithOffset(date, endTime)
    }, [date, endTime])

    const hasCompleteInputs = Boolean(date && startTime && endTime && startIso && endIso)
    const isInvalidOrder = Boolean(startTime && endTime && startTime >= endTime)
    const isNotesTooLong = notes.length > 1000
    const isPastDateTime = useMemo(() => {
        if (!startIso) return false
        return new Date(startIso).getTime() < nowMs
    }, [startIso, nowMs])

    const canPreview =
        space.is_active && hasCompleteInputs && !isInvalidOrder && !isPastDateTime && !isNotesTooLong

    const { data: availability, isFetching: isLoadingAvailability } = useBookingAvailabilityQuery(
        space.id,
        date,
        space.is_active && Boolean(date),
    )

    const {
        data: preview,
        isFetching: isChecking,
        error: previewError,
        refetch: refetchPreview,
    } = useBookingPreviewQuery(space.id, startIso, endIso, canPreview)

    const createBooking = useCreateBookingMutation(space.id)

    const localValidationError = !space.is_active
        ? 'Este espaço está temporariamente inativo para novas reservas.'
        : isInvalidOrder
          ? 'O horário de saída deve ser posterior ao horário de entrada.'
          : isPastDateTime
            ? 'O horário de início não pode ser no passado.'
            : isNotesTooLong
              ? 'As observações não podem exceder 1000 caracteres.'
              : null

    const isNetworkOrServerError =
        previewError instanceof ApiError && (previewError.status === 0 || previewError.status >= 500)

    const isConflict =
        preview?.conflict === true ||
        (previewError instanceof ApiError && previewError.status === 409)

    const apiErrorMessage =
        preview?.available === false
            ? preview.message || 'Este espaço já possui uma reserva no horário selecionado.'
            : previewError
              ? getErrorMessage(
                    previewError,
                    'Não foi possível verificar a disponibilidade do horário.',
                )
              : null

    const errorMessage = localValidationError ?? apiErrorMessage
    const isBlocked = Boolean(
        !space.is_active ||
            !hasCompleteInputs ||
            isInvalidOrder ||
            isPastDateTime ||
            isNotesTooLong ||
            isChecking ||
            createBooking.isPending ||
            preview?.available === false ||
            previewError,
    )

    async function handleBook(e: React.FormEvent) {
        e.preventDefault()
        setSubmitError(null)

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
        } catch (err) {
            setSubmitError(getErrorMessage(err, 'Não foi possível concluir a reserva.'))
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
                        min={todayDate}
                        onChange={(e) => {
                            setDate(e.target.value)
                            setSubmitError(null)
                        }}
                        className={inputClass(isPastDateTime, 'py-2')}
                        required
                    />
                </div>

                {space.is_active && (availability || isLoadingAvailability) && (
                    <div
                        aria-label="Disponibilidade do dia"
                        className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-xs space-y-1.5"
                    >
                        {isLoadingAvailability && !availability ? (
                            <p className="text-slate-500">Carregando agenda do dia…</p>
                        ) : availability && !availability.open ? (
                            <p className="font-medium text-amber-800">
                                Este espaço não funciona na data selecionada.
                            </p>
                        ) : availability ? (
                            <>
                                {availability.window && (
                                    <p className="text-slate-600">
                                        Funcionamento:{' '}
                                        <span className="font-semibold text-slate-800">
                                            {availability.window.from} às {availability.window.to}
                                        </span>
                                    </p>
                                )}
                                {availability.busy.length > 0 ? (
                                    <div className="space-y-1">
                                        <p className="text-slate-500 font-medium">
                                            Horários já ocupados:
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {availability.busy.map((slot) => (
                                                <span
                                                    key={`${slot.start_time}-${slot.end_time}`}
                                                    className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 font-medium text-rose-700 ring-1 ring-inset ring-rose-200"
                                                >
                                                    {formatTimeRange(
                                                        slot.start_time,
                                                        slot.end_time,
                                                        availability.timezone,
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-emerald-700 font-medium">
                                        Nenhum horário ocupado nesta data.
                                    </p>
                                )}
                            </>
                        ) : null}
                    </div>
                )}

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
                            className={inputClass(isInvalidOrder || isPastDateTime, 'py-2')}
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
                            className={inputClass(isInvalidOrder, 'py-2')}
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

                {/* Estado de Carregamento da Prévia */}
                {canPreview && isChecking && (
                    <div
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
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
                                      : isConflict
                                        ? 'Horário já reservado'
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

                {/* Erro ao enviar a reserva */}
                {submitError && (
                    <div
                        role="alert"
                        className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
                    >
                        {submitError}
                    </div>
                )}

                {/* Resumo do Valor Calculado */}
                {canPreview && !isChecking && !errorMessage && preview?.available && (
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
                                {preview.total_price === 0 ? 'Gratuito' : formatBRL(preview.total_price)}
                            </span>
                        </div>
                    </div>
                )}

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
