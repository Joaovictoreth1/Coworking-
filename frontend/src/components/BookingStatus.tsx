import type { Booking } from '../lib/spaces'

const statuses = {
    confirmed: {
        label: 'Confirmada',
        classes: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    },
    pending: {
        label: 'Pendente',
        classes: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    cancelled: {
        label: 'Cancelada',
        classes: 'border-rose-200 bg-rose-50 text-rose-800',
    },
    completed: {
        label: 'Concluída',
        classes: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    },
}

export default function BookingStatus({ status }: { status: Booking['status'] }) {
    const badge = statuses[status] ?? { label: 'Status indisponível', classes: 'border-slate-200' }
    return (
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badge.classes}`}>
            {badge.label}
        </span>
    )
}
