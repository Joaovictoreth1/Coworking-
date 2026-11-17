import { useState } from 'react'
import ComponentBody from '../components/ComponentBody'
import { BookingCardSkeleton } from '../components/Skeleton'
import { useCancelBookingMutation, useUserBookingsQuery } from '../hooks/useBookings'
import { href } from '../lib/route'
import type { Booking } from '../lib/spaces'
import { formatCurrency, primaryButton, secondaryButton } from '../lib/ui'

type StatusFilter = '' | 'confirmed' | 'pending' | 'completed' | 'cancelled'

const TABS: { label: string; value: StatusFilter }[] = [
    { label: 'Todas', value: '' },
    { label: 'Confirmadas', value: 'confirmed' },
    { label: 'Pendentes', value: 'pending' },
    { label: 'Concluídas', value: 'completed' },
    { label: 'Canceladas', value: 'cancelled' },
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
    const [selectedTab, setSelectedTab] = useState<StatusFilter>('')
    const [cancellingId, setCancellingId] = useState<number | null>(null)

    const { data: bookings, isLoading, error } = useUserBookingsQuery(selectedTab || undefined)
    const cancelMutation = useCancelBookingMutation()

    async function handleConfirmCancel(bookingId: number) {
        try {
            await cancelMutation.mutateAsync({ bookingId })
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
                            Acompanhe seu histórico, horários agendados e status de aprovação.
                        </p>
                    </div>
                    <a href={href('home')} className={secondaryButton}>
                        Explorar Mais Espaços
                    </a>
                </div>

                {/* Abas de Filtro */}
                <div className="flex gap-2 overflow-x-auto py-5 border-b border-slate-100 no-scrollbar">
                    {TABS.map((tab) => {
                        const active = selectedTab === tab.value
                        return (
                            <button
                                key={tab.value}
                                type="button"
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

                {/* Conteúdo Principal */}
                <div className="mt-6 space-y-4">
                    {isLoading ? (
                        <>
                            <BookingCardSkeleton />
                            <BookingCardSkeleton />
                            <BookingCardSkeleton />
                        </>
                    ) : error ? (
                        <div className="text-center py-12 bg-rose-50 rounded-3xl border border-rose-200 p-6">
                            <p className="text-rose-700 font-semibold">
                                Não foi possível carregar suas reservas.
                            </p>
                            <p className="text-xs text-rose-500 mt-1">Tente novamente mais tarde.</p>
                        </div>
                    ) : !bookings || bookings.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-2xl mb-4">
                                📅
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">
                                {selectedTab
                                    ? 'Nenhuma reserva encontrada com este filtro.'
                                    : 'Você ainda não possui nenhuma reserva.'}
                            </h2>
                            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                                Encontre salas privativas, estações de coworking ou auditórios ideais
                                para o seu trabalho.
                            </p>
                            <a href={href('home')} className={`${primaryButton} mt-6 inline-block`}>
                                Ver Espaços Disponíveis
                            </a>
                        </div>
                    ) : (
                        bookings.map((booking) => (
                            <div
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
                                                : formatCurrency(booking.total_price)}
                                        </span>
                                    </div>

                                    {booking.can_cancel && (
                                        <button
                                            type="button"
                                            onClick={() => setCancellingId(booking.id)}
                                            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                                        >
                                            Cancelar Reserva
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal de Confirmação de Cancelamento */}
            {cancellingId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4">
                        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xl">
                            ⚠️
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Cancelar Reserva?</h2>
                            <p className="text-sm text-slate-500 mt-1">
                                O horário selecionado será liberado para outros usuários. Esta ação não
                                pode ser desfeita.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
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
                                {cancelMutation.isPending ? 'Cancelando...' : 'Sim, Cancelar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ComponentBody>
    )
}
