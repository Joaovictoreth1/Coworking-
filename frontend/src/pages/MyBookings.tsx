import { useEffect, useMemo, useState } from 'react'
import ComponentBody from '../components/ComponentBody'
import { SearchIcon } from '../components/icons'
import { BookingCardSkeleton } from '../components/Skeleton'
import { useCancelBookingMutation, useUserBookingsQuery } from '../hooks/useBookings'
import { getErrorMessage } from '../lib/api'
import { href } from '../lib/route'
import { formatBRL, type Booking } from '../lib/spaces'
import { inputClass, primaryButton, secondaryButton } from '../lib/ui'
import { useToastStore } from '../store/useToastStore'
import { useUiStore, type BookingStatusTab } from '../store/useUiStore'

const TABS: { label: string; value: BookingStatusTab }[] = [
    { label: 'Todas', value: '' },
    { label: 'Confirmadas', value: 'confirmed' },
    { label: 'Pendentes', value: 'pending' },
    { label: 'Concluídas', value: 'completed' },
    { label: 'Canceladas', value: 'cancelled' },
]

const CANCEL_REASONS = [
    'Mudança de planos ou data',
    'Encontrei outro horário ou local',
    'Imprevisto profissional ou pessoal',
    'Erro no agendamento do horário',
    'Outro motivo',
]

function getStatusBadge(status: Booking['status']) {
    switch (status) {
        case 'confirmed':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Confirmada
                </span>
            )
        case 'pending':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Pendente
                </span>
            )
        case 'cancelled':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Cancelada
                </span>
            )
        case 'completed':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    Concluída
                </span>
            )
    }
}

function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
}

function formatTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    })
}

export default function MyBookings() {
    const selectedTab = useUiStore((s) => s.bookingsTab)
    const setSelectedTab = useUiStore((s) => s.setBookingsTab)
    const [searchQuery, setSearchQuery] = useState('')
    const [cancellingId, setCancellingId] = useState<number | null>(null)
    const [cancelReason, setCancelReason] = useState<string>(CANCEL_REASONS[0])
    const [selectedVoucher, setSelectedVoucher] = useState<Booking | null>(null)
    const [copiedCode, setCopiedCode] = useState<string | null>(null)
    const addToast = useToastStore((s) => s.addToast)

    const {
        data: bookings,
        isLoading,
        error,
        refetch,
        isFetching,
    } = useUserBookingsQuery(selectedTab || undefined)
    const cancelMutation = useCancelBookingMutation()

    // Fecha modais abertos ao pressionar Escape
    useEffect(() => {
        if (!selectedVoucher && cancellingId === null) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return
            if (selectedVoucher) setSelectedVoucher(null)
            else if (cancellingId !== null && !cancelMutation.isPending) setCancellingId(null)
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [selectedVoucher, cancellingId, cancelMutation.isPending])

    const filteredBookings = useMemo(() => {
        if (!bookings) return []
        const term = searchQuery.trim().toLowerCase()
        if (!term) return bookings
        return bookings.filter((b) => {
            const spaceName = (b.space?.name || b.space_name || '').toLowerCase()
            const city = (b.space?.city || '').toLowerCase()
            const voucher = (b.voucher_code || '').toLowerCase()
            return spaceName.includes(term) || city.includes(term) || voucher.includes(term)
        })
    }, [bookings, searchQuery])

    async function handleCopyVoucher(code: string) {
        try {
            await navigator.clipboard.writeText(code)
            setCopiedCode(code)
            addToast(`Código ${code} copiado.`, 'success')
            window.setTimeout(() => {
                setCopiedCode((current) => (current === code ? null : current))
            }, 2000)
        } catch {
            addToast('Não foi possível copiar o código.', 'error')
        }
    }

    async function handleConfirmCancel(bookingId: number) {
        try {
            await cancelMutation.mutateAsync({ bookingId, reason: cancelReason })
            setCancellingId(null)
        } catch {
            // Tratado no onError do hook
        }
    }

    return (
        <ComponentBody>
            <div className="max-w-4xl mx-auto py-4">
                {/* Cabeçalho da Página */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                            Minhas Reservas
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Acompanhe seu histórico, horários agendados e comprovantes digitais.
                        </p>
                    </div>
                    <a href={href('home')} className={secondaryButton}>
                        Explorar Mais Espaços
                    </a>
                </div>

                {/* Abas de Filtro e Busca */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-5 border-b border-slate-100">
                    <div
                        role="group"
                        aria-label="Filtrar reservas por status"
                        className="flex gap-2 overflow-x-auto no-scrollbar"
                    >
                        {TABS.map((tab) => {
                            const active = selectedTab === tab.value
                            return (
                                <button
                                    key={tab.value}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => setSelectedTab(tab.value)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer whitespace-nowrap ${
                                        active
                                            ? 'bg-slate-900 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>

                    <div className="relative sm:w-64 shrink-0">
                        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar espaço ou voucher..."
                            aria-label="Buscar reservas por espaço, cidade ou voucher"
                            className={`h-10 pl-9 text-sm ${inputClass(false)}`}
                        />
                    </div>
                </div>

                {/* Conteúdo Principal */}
                <div className="mt-6 space-y-4">
                    {isLoading ? (
                        <>
                            <BookingCardSkeleton />
                            <BookingCardSkeleton />
                            <BookingCardSkeleton />
                        </>
                    ) : error ? (
                        <div
                            role="alert"
                            className="text-center py-12 bg-rose-50 rounded-3xl border border-rose-200 p-6 space-y-3"
                        >
                            <p className="text-rose-700 font-semibold">
                                {getErrorMessage(error, 'Não foi possível carregar suas reservas.')}
                            </p>
                            <button
                                type="button"
                                onClick={() => void refetch()}
                                disabled={isFetching}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
                            >
                                {isFetching ? 'Recarregando...' : 'Tentar novamente'}
                            </button>
                        </div>
                    ) : filteredBookings.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
                            <div
                                aria-hidden="true"
                                className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-2xl mb-4"
                            >
                                📅
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">
                                {selectedTab || searchQuery.trim()
                                    ? 'Nenhuma reserva encontrada com este filtro.'
                                    : 'Você ainda não possui nenhuma reserva.'}
                            </h2>
                            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                                {searchQuery.trim()
                                    ? 'Tente outro termo ou limpe a busca para ver suas reservas.'
                                    : 'Encontre salas privativas, estações de coworking ou auditórios ideais para o seu trabalho.'}
                            </p>
                            {searchQuery.trim() ? (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className={`${secondaryButton} mt-6`}
                                >
                                    Limpar busca
                                </button>
                            ) : (
                                <a href={href('home')} className={`${primaryButton} mt-6 inline-block`}>
                                    Ver Espaços Disponíveis
                                </a>
                            )}
                        </div>
                    ) : (
                        filteredBookings.map((booking) => (
                            <article
                                key={booking.id}
                                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col md:flex-row md:items-center justify-between gap-6"
                            >
                                <div className="space-y-3 flex-1">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h2 className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition">
                                            {booking.space ? (
                                                <a href={href('space', { id: booking.space.id })}>
                                                    {booking.space.name}
                                                </a>
                                            ) : (
                                                booking.space_name || 'Espaço de Coworking'
                                            )}
                                        </h2>
                                        {getStatusBadge(booking.status)}
                                        {booking.voucher_code && (
                                            <button
                                                type="button"
                                                onClick={() => handleCopyVoucher(booking.voucher_code!)}
                                                title="Copiar código do voucher"
                                                className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition cursor-pointer"
                                            >
                                                {copiedCode === booking.voucher_code
                                                    ? 'Copiado!'
                                                    : booking.voucher_code}
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-800">Data:</span>
                                            <span>{formatDate(booking.start_time)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-800">Horário:</span>
                                            <span>
                                                {formatTime(booking.start_time)} às {formatTime(booking.end_time)} (
                                                {booking.duration_hours}h)
                                            </span>
                                        </div>
                                        {booking.space && (
                                            <div className="flex items-center gap-2 col-span-full">
                                                <span className="font-semibold text-slate-800">Localização:</span>
                                                <span>
                                                    {booking.space.city} - {booking.space.state}
                                                </span>
                                            </div>
                                        )}
                                        {booking.notes && (
                                            <div className="flex items-start gap-2 col-span-full italic text-slate-500">
                                                <span className="font-semibold text-slate-700 not-italic">
                                                    Nota:
                                                </span>
                                                <span>{booking.notes}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100 gap-3">
                                    <div className="text-right">
                                        <span className="block text-xs text-slate-500">Valor Total</span>
                                        <span className="text-xl font-bold text-slate-900">
                                            {booking.total_price === 0
                                                ? 'Gratuito'
                                                : formatBRL(booking.total_price)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedVoucher(booking)}
                                            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer flex items-center gap-1.5"
                                        >
                                            <span aria-hidden="true">📄</span> Comprovante
                                        </button>

                                        {booking.can_cancel && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCancellingId(booking.id)
                                                    setCancelReason(CANCEL_REASONS[0])
                                                }}
                                                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </div>

            {/* Modal de Comprovante de Reserva */}
            {selectedVoucher && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn"
                    onPointerDown={(e) => {
                        if (e.target === e.currentTarget) setSelectedVoucher(null)
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="voucher-modal-title"
                        className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-6"
                    >
                        {/* Header do Comprovante */}
                        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                                    Comprovante de Reserva
                                </span>
                                <h2 id="voucher-modal-title" className="text-xl font-extrabold text-slate-900 mt-0.5">
                                    {selectedVoucher.space?.name || selectedVoucher.space_name || 'Espaço de Coworking'}
                                </h2>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="font-mono text-xs text-slate-500">
                                        Código: {selectedVoucher.voucher_code || `CWK-${selectedVoucher.id.toString().padStart(6, '0')}`}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleCopyVoucher(
                                                selectedVoucher.voucher_code ||
                                                    `CWK-${selectedVoucher.id.toString().padStart(6, '0')}`,
                                            )
                                        }
                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                                    >
                                        {copiedCode ===
                                        (selectedVoucher.voucher_code ||
                                            `CWK-${selectedVoucher.id.toString().padStart(6, '0')}`)
                                            ? 'Copiado!'
                                            : 'Copiar'}
                                    </button>
                                </div>
                            </div>
                            <div>{getStatusBadge(selectedVoucher.status)}</div>
                        </div>

                        {/* Dados Detalhados */}
                        <div className="space-y-3 text-sm bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-medium">Data Agendada:</span>
                                <span className="font-bold text-slate-800">{formatDate(selectedVoucher.start_time)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-medium">Horário / Período:</span>
                                <span className="font-bold text-slate-800">
                                    {formatTime(selectedVoucher.start_time)} às {formatTime(selectedVoucher.end_time)} ({selectedVoucher.duration_hours}h)
                                </span>
                            </div>
                            {selectedVoucher.space && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-medium">Cidade / Estado:</span>
                                    <span className="font-semibold text-slate-700">
                                        {selectedVoucher.space.city} - {selectedVoucher.space.state}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200/60">
                                <span className="text-slate-600 font-bold">Valor Total Pago/Previsto:</span>
                                <span className="text-base font-extrabold text-slate-900">
                                    {selectedVoucher.total_price === 0
                                        ? 'Gratuito'
                                        : formatBRL(selectedVoucher.total_price)}
                                </span>
                            </div>
                        </div>

                        {/* QR Code / Validação de Check-in */}
                        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                            <div className="w-24 h-24 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xs font-mono p-2 select-none shadow-sm">
                                [ QR CHECK-IN ]
                            </div>
                            <p className="text-xs text-slate-500">
                                Apresente este código na recepção ao chegar para liberar o seu acesso.
                            </p>
                        </div>

                        {/* Ações do Modal */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setSelectedVoucher(null)}
                                className={secondaryButton}
                            >
                                Fechar
                            </button>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className={primaryButton}
                            >
                                <span aria-hidden="true">🖨️</span> Imprimir / Salvar PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Cancelamento com Motivo */}
            {cancellingId !== null && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fadeIn"
                    onPointerDown={(e) => {
                        if (e.target === e.currentTarget && !cancelMutation.isPending) {
                            setCancellingId(null)
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="cancel-booking-modal-title"
                        className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-4"
                    >
                        <div
                            aria-hidden="true"
                            className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xl"
                        >
                            ⚠️
                        </div>
                        <div>
                            <h2 id="cancel-booking-modal-title" className="text-lg font-bold text-slate-900">
                                Cancelar Reserva?
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                O horário selecionado será liberado para outros usuários. Esta ação não
                                pode ser desfeita.
                            </p>
                        </div>

                        {/* Motivo do Cancelamento */}
                        <div className="space-y-2 pt-2">
                            <label htmlFor="cancel-reason" className="block text-xs font-bold text-slate-700">
                                Selecione o motivo do cancelamento:
                            </label>
                            <select
                                id="cancel-reason"
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            >
                                {CANCEL_REASONS.map((reason) => (
                                    <option key={reason} value={reason}>
                                        {reason}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-2 pt-3">
                            <button
                                type="button"
                                onClick={() => setCancellingId(null)}
                                className={secondaryButton}
                                disabled={cancelMutation.isPending}
                            >
                                Manter Reserva
                            </button>
                            <button
                                type="button"
                                onClick={() => handleConfirmCancel(cancellingId)}
                                disabled={cancelMutation.isPending}
                                className="px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
                            >
                                {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ComponentBody>
    )
}
