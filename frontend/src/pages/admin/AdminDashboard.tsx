import { useState } from 'react'
import ComponentBody from '../../components/ComponentBody'
import { Skeleton } from '../../components/Skeleton'
import {
    useAdminBookingsQuery,
    useAdminMetricsQuery,
    useAdminUpdateBookingStatusMutation,
} from '../../hooks/useBookings'
import { formatBookingDate, formatBookingTime } from '../../lib/bookingTime'
import { href } from '../../lib/route'
import { formatBRL, type Booking } from '../../lib/spaces'
import { primaryButton, secondaryButton } from '../../lib/ui'

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
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [search, setSearch] = useState<string>('')

    const { data: metrics, isLoading: loadingMetrics } = useAdminMetricsQuery()
    const { data: bookingsData, isLoading: loadingBookings } = useAdminBookingsQuery({
        status: statusFilter || undefined,
        search: search.trim() || undefined,
    })

    const updateStatus = useAdminUpdateBookingStatusMutation()

    async function handleStatusChange(bookingId: number, status: string) {
        await updateStatus.mutateAsync({ bookingId, status })
    }

    const bookings = bookingsData?.data ?? []

    const totalB = metrics?.total_bookings ?? 0
    const confirmedPct = totalB > 0 ? Math.round(((metrics?.confirmed_bookings ?? 0) / totalB) * 100) : 0
    const completedPct = totalB > 0 ? Math.round(((metrics?.completed_bookings ?? 0) / totalB) * 100) : 0
    const cancelledPct = totalB > 0 ? Math.round(((metrics?.cancelled_bookings ?? 0) / totalB) * 100) : 0
    const pendingPct = Math.max(0, 100 - confirmedPct - completedPct - cancelledPct)

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
                                onClick={() => setStatusFilter(statusFilter === 'confirmed' ? '' : 'confirmed')}
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
                                onClick={() => setStatusFilter(statusFilter === 'pending' ? '' : 'pending')}
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
                                onClick={() => setStatusFilter(statusFilter === 'completed' ? '' : 'completed')}
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
                                onClick={() => setStatusFilter(statusFilter === 'cancelled' ? '' : 'cancelled')}
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
                                onChange={(e) => setSearch(e.target.value)}
                                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs w-56 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
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
                                                    {formatBookingDate(b.start_time, b.timezone)}
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    {formatBookingTime(b.start_time, b.timezone)} às{' '}
                                                    {formatBookingTime(b.end_time, b.timezone)}{' '}
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
                                                            onClick={() => handleStatusChange(b.id, 'confirmed')}
                                                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                                                        >
                                                            Aprovar
                                                        </button>
                                                    )}
                                                    {b.status === 'confirmed' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStatusChange(b.id, 'completed')}
                                                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
                                                        >
                                                            Concluir
                                                        </button>
                                                    )}
                                                    {b.status !== 'cancelled' && b.status !== 'completed' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStatusChange(b.id, 'cancelled')}
                                                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
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
                </div>
            </div>
        </ComponentBody>
    )
}
