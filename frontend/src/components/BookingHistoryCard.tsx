import { useId } from 'react'
import { bookingLocation, bookingName, bookingSchedule } from '../lib/bookingHistory'
import { href } from '../lib/route'
import { formatBRL, type Booking } from '../lib/spaces'
import { secondaryButton } from '../lib/ui'
import BookingStatus from './BookingStatus'

export default function BookingHistoryCard({
    booking,
    onVoucher,
    onCancel,
}: {
    booking: Booking
    onVoucher: () => void
    onCancel: () => void
}) {
    const titleId = useId()
    const name = bookingName(booking)
    const location = bookingLocation(booking)
    const schedule = bookingSchedule(booking.start_time, booking.end_time)

    return (
        <article
            aria-labelledby={titleId}
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id={titleId} className="break-words text-lg font-bold text-slate-900">
                    {booking.space ? (
                        <a className="hover:underline" href={href('space', { id: booking.space.id })}>
                            {name}
                        </a>
                    ) : name}
                </h3>
                <BookingStatus status={booking.status} />
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                    <dt className="font-semibold text-slate-900">Horário local</dt>
                    <dd>{schedule ?? 'Horário indisponível'}</dd>
                </div>
                <div>
                    <dt className="font-semibold text-slate-900">Valor total</dt>
                    <dd>{booking.total_price === 0 ? 'Gratuito' : formatBRL(booking.total_price)}</dd>
                </div>
                {location && (
                    <div>
                        <dt className="font-semibold text-slate-900">Localização</dt>
                        <dd>{location}</dd>
                    </div>
                )}
                {booking.duration_hours > 0 && (
                    <div>
                        <dt className="font-semibold text-slate-900">Duração</dt>
                        <dd>{booking.duration_hours} h</dd>
                    </div>
                )}
                {booking.notes && (
                    <div className="sm:col-span-2">
                        <dt className="font-semibold text-slate-900">Nota</dt>
                        <dd className="break-words whitespace-pre-wrap">{booking.notes}</dd>
                    </div>
                )}
            </dl>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <button
                    type="button"
                    className={secondaryButton}
                    aria-label={`Comprovante da reserva ${booking.id}: ${name}`}
                    onClick={onVoucher}
                >
                    Comprovante
                </button>
                {booking.can_cancel && (
                    <button
                        type="button"
                        className="min-h-11 rounded-md px-4 font-medium text-rose-700 hover:bg-rose-50"
                        aria-label={`Cancelar reserva ${booking.id}: ${name}`}
                        onClick={onCancel}
                    >
                        Cancelar
                    </button>
                )}
            </div>
        </article>
    )
}
