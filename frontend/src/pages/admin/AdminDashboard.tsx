import { useState } from 'react'
import ComponentBody from '../../components/ComponentBody'
import { Skeleton } from '../../components/Skeleton'
import {
    useAdminBookingsQuery,
    useAdminMetricsQuery,
    useAdminUpdateBookingStatusMutation,
} from '../../hooks/useBookings'
import { getErrorMessage } from '../../lib/api'
import { href } from '../../lib/route'
import { formatBRL, type Booking } from '../../lib/spaces'
import { primaryButton, secondaryButton } from '../../lib/ui'
import { useUiStore } from '../../store/useUiStore'

function getBadge(status: Booking['status']) {
    switch (status) {
        case 'confirmed':
            return (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Confirmada
                </span>
            )
        case 'pending':
            return (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    Pendente
                </span>
            )
        case 'cancelled':
            return (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    Cancelada
                </span>
            )
        case 'completed':
            return (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Concluída
                </span>
            )
    }
}

export default function AdminDashboard() {
    const statusFilter = useUiStore((s) => s.adminBookingStatus)
    const setStatusFilter = useUiStore((s) => s.setAdminBookingStatus)
    const search = useUiStore((s) => s.adminBookingSearch)
    const setSearch = useUiStore((s) => s.setAdminBookingSearch)
    const [page, setPage] = useState<number>(1)
    const [updatingBookingId, setUpdatingBookingId] = useState<number | null>(null)

    const {
        data: metrics,
        isLoading: loadingMetrics,
        error: metricsError,
        refetch: refetchMetrics,
    } = useAdminMetricsQuery()
    const {
        data: bookingsData,
        isLoading: loadingBookings,
        error: bookingsError,
        refetch: refetchBookings,
    } = useAdminBookingsQuery({
        status: statusFilter || undefined,
        search: search.trim() || undefined,
        page,
    })

    const updateStatus = useAdminUpdateBookingStatusMutation()

    function handleStatusFilterChange(next: string) {
        setStatusFilter(next)
        setPage(1)
    }

    function handleSearchChange(next: string) {
        setSearch(next)
        setPage(1)
    }

    async function handleStatusChange(bookingId: number, status: string) {
        setUpdatingBookingId(bookingId)
        try {
            await updateStatus.mutateAsync({ bookingId, status })
        } catch {
            // Tratado no onError do hook
        } finally {
            setUpdatingBookingId(null)
        }
    }

    const bookings = bookingsData?.data ?? []
    const pagination = bookingsData?.meta

    const totalB = metrics?.total_bookings ?? 0
    const confirmedPct = totalB > 0 ? Math.round(((metrics?.confirmed_bookings ?? 0) / totalB) * 100) : 0
    const completedPct = totalB > 0 ? Math.round(((metrics?.completed_bookings ?? 0) / totalB) * 100) : 0
    const cancelledPct = totalB > 0 ? Math.round(((metrics?.cancelled_bookings ?? 0) / totalB) * 100) : 0
    const pendingPct =
        totalB === 0
            ? 0
            : metrics?.pending_bookings !== undefined
              ? Math.round((metrics.pending_bookings / totalB) * 100)
              : Math.max(0, 100 - confirmedPct - completedPct - cancelledPct)

    return (
        <ComponentBody>
            <div className="max-w-7xl mx-auto py-4 space-y-8">
                {/* Header do Dashboard */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                                Painel Geral
                            </span>
                            <span className="text-xs text-slate-500">Métricas em tempo real</span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                            Dashboard Administrativo
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <a href={href('admin_spaces')} className={secondaryButton}>
                            Gerenciar Espaços
                        </a>
                        <a href={href('admin_space_new')} className={primaryButton}>
                            + Novo Espaço
                        </a>
                    </div>
                </div>

                {/* Erro ao carregar métricas */}
                {metricsError && (
                    <div
                        role="alert"
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700"
                    >
                        <span>
                            {getErrorMessage(metricsError, 'Não foi possível carregar as métricas.')}
                        </span>
                        <button
                            type="button"
                            onClick={() => void refetchMetrics()}
                            className="shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition cursor-pointer"
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}

                {/* Métricas e KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Faturamento Estimado */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Faturamento Estimado
                        </span>
                        {loadingMetrics ? (
                            <Skeleton className="h-8 w-3/4 mt-2" />
                        ) : (
                            <div className="mt-2">
                                <span className="text-3xl font-black text-slate-900">
                                    {formatBRL(metrics?.total_revenue ?? 0)}
                                </span>
                                <span className="block text-xs text-slate-500 mt-1">
                                    Reservas confirmadas e concluídas
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Taxa de Ocupação */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Taxa de Ocupação Hoje
                        </span>
                        {loadingMetrics ? (
                            <Skeleton className="h-8 w-3/4 mt-2" />
                        ) : (
                            <div className="mt-2">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-indigo-600">
                                        {metrics?.occupancy_rate ?? 0}%
                                    </span>
                                    <span className="text-xs text-slate-500">dos locais ativos</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                                    <div
                                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(100, metrics?.occupancy_rate ?? 0)}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Total de Reservas */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Total de Reservas
                        </span>
                        {loadingMetrics ? (
                            <Skeleton className="h-8 w-3/4 mt-2" />
                        ) : (
                            <div className="mt-2">
                                <span className="text-3xl font-black text-slate-900">
                                    {metrics?.total_bookings ?? 0}
                                </span>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                    <span className="text-emerald-600 font-semibold">
                                        {metrics?.confirmed_bookings ?? 0} ativas
                                    </span>
                                    <span>·</span>
                                    <span className="text-amber-600 font-semibold">
                                        {metrics?.cancelled_bookings ?? 0} canceladas
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Espaços Cadastrados */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Espaços Ativos
                        </span>
                        {loadingMetrics ? (
                            <Skeleton className="h-8 w-3/4 mt-2" />
                        ) : (
                            <div className="mt-2">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-emerald-600">
                                        {metrics?.active_spaces ?? 0}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        de {metrics?.total_spaces ?? 0} cadastrados
                                    </span>
                                </div>
                                <span className="block text-xs text-slate-500 mt-1">
                                    Disponíveis para agendamento
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Barra Visual de Distribuição de Status */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">
                                Distribuição Geral de Reservas
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Proporção visual dos agendamentos por status atual no sistema
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                            <button
                                type="button"
                                onClick={() => handleStatusFilterChange(statusFilter === 'confirmed' ? '' : 'confirmed')}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                                    statusFilter === 'confirmed'
                                        ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-800'
                                        : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                Confirmadas ({confirmedPct}%)
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStatusFilterChange(statusFilter === 'pending' ? '' : 'pending')}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                                    statusFilter === 'pending'
                                        ? 'bg-amber-50 border-amber-300 font-bold text-amber-800'
                                        : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                Pendentes ({pendingPct}%)
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStatusFilterChange(statusFilter === 'completed' ? '' : 'completed')}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                                    statusFilter === 'completed'
                                        ? 'bg-indigo-50 border-indigo-300 font-bold text-indigo-800'
                                        : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                Concluídas ({completedPct}%)
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStatusFilterChange(statusFilter === 'cancelled' ? '' : 'cancelled')}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                                    statusFilter === 'cancelled'
                                        ? 'bg-rose-50 border-rose-300 font-bold text-rose-800'
                                        : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-rose-400" />
                                Canceladas ({cancelledPct}%)
                            </button>
                        </div>
                    </div>
                    {/* Barra Empilhada Multicor */}
                    <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden shadow-inner">
                        <div
                            style={{ width: `${confirmedPct}%` }}
                            className="bg-emerald-500 transition-all duration-500"
                            title={`Confirmadas: ${confirmedPct}%`}
                        />
                        <div
                            style={{ width: `${pendingPct}%` }}
                            className="bg-amber-500 transition-all duration-500"
                            title={`Pendentes: ${pendingPct}%`}
                        />
                        <div
                            style={{ width: `${completedPct}%` }}
                            className="bg-indigo-500 transition-all duration-500"
                            title={`Concluídas: ${completedPct}%`}
                        />
                        <div
                            style={{ width: `${cancelledPct}%` }}
                            className="bg-rose-400 transition-all duration-500"
                            title={`Canceladas: ${cancelledPct}%`}
                        />
                    </div>
                </div>

                {/* Gestão de Reservas */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                Gestão Geral de Reservas
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Visualize, aprove ou cancele agendamentos de todos os clientes.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <input
                                type="text"
                                placeholder="Buscar por cliente ou espaço..."
                                value={search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs w-56 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                            <select
                                value={statusFilter}
                                onChange={(e) => handleStatusFilterChange(e.target.value)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Todos os status</option>
                                <option value="pending">Pendentes</option>
                                <option value="confirmed">Confirmadas</option>
                                <option value="completed">Concluídas</option>
                                <option value="cancelled">Canceladas</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-600">
                            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-800 font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="py-3 px-5">ID</th>
                                    <th className="py-3 px-5">Espaço</th>
                                    <th className="py-3 px-5">Cliente</th>
                                    <th className="py-3 px-5">Data & Horário</th>
                                    <th className="py-3 px-5">Total</th>
                                    <th className="py-3 px-5">Status</th>
                                    <th className="py-3 px-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loadingBookings ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-400">
                                            Carregando reservas...
                                        </td>
                                    </tr>
                                ) : bookingsError ? (
                                    <tr>
                                        <td colSpan={7} className="py-10 text-center space-y-3">
                                            <p className="text-rose-700 font-semibold">
                                                {getErrorMessage(
                                                    bookingsError,
                                                    'Não foi possível carregar as reservas.',
                                                )}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => void refetchBookings()}
                                                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition cursor-pointer"
                                            >
                                                Tentar novamente
                                            </button>
                                        </td>
                                    </tr>
                                ) : bookings.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-500">
                                            Nenhuma reserva encontrada para os filtros aplicados.
                                        </td>
                                    </tr>
                                ) : (
                                    bookings.map((b) => (
                                        <tr key={b.id} className="hover:bg-slate-50/50 transition">
                                            <td className="py-3.5 px-5 font-mono text-slate-400">
                                                #{b.id}
                                            </td>
                                            <td className="py-3.5 px-5 font-semibold text-slate-900">
                                                {b.space_name || b.space?.name || 'Espaço'}
                                            </td>
                                            <td className="py-3.5 px-5">
                                                <div className="font-medium text-slate-800">
                                                    {b.user_name || 'Usuário'}
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    {b.user_email}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-5 whitespace-nowrap">
                                                <div>
                                                    {new Date(b.start_time).toLocaleDateString('pt-BR')}
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    {new Date(b.start_time).toLocaleTimeString('pt-BR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}{' '}
                                                    às{' '}
                                                    {new Date(b.end_time).toLocaleTimeString('pt-BR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}{' '}
                                                    ({b.duration_hours}h)
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-5 font-bold text-slate-900">
                                                {b.total_price === 0
                                                    ? 'Gratuito'
                                                    : formatBRL(b.total_price)}
                                            </td>
                                            <td className="py-3.5 px-5">{getBadge(b.status)}</td>
                                            <td className="py-3.5 px-5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {b.status === 'pending' && (
                                                        <button
                                                            type="button"
                                                            disabled={updateStatus.isPending}
                                                            onClick={() => handleStatusChange(b.id, 'confirmed')}
                                                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {updatingBookingId === b.id ? 'Salvando...' : 'Aprovar'}
                                                        </button>
                                                    )}
                                                    {b.status === 'confirmed' && (
                                                        <button
                                                            type="button"
                                                            disabled={updateStatus.isPending}
                                                            onClick={() => handleStatusChange(b.id, 'completed')}
                                                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {updatingBookingId === b.id ? 'Salvando...' : 'Concluir'}
                                                        </button>
                                                    )}
                                                    {b.status !== 'cancelled' && b.status !== 'completed' && (
                                                        <button
                                                            type="button"
                                                            disabled={updateStatus.isPending}
                                                            onClick={() => handleStatusChange(b.id, 'cancelled')}
                                                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {pagination && pagination.last_page > 1 && (
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                            <span>
                                Página {pagination.current_page} de {pagination.last_page} ({pagination.total}{' '}
                                {pagination.total === 1 ? 'reserva' : 'reservas'})
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={pagination.current_page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Anterior
                                </button>
                                <button
                                    type="button"
                                    disabled={pagination.current_page >= pagination.last_page}
                                    onClick={() => setPage((p) => p + 1)}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ComponentBody>
    )
}
