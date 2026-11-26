import { useState } from 'react'
import { canExportBooking, downloadBookingCalendar } from '../lib/bookingCalendar'
import { bookingLocation, bookingName, bookingSchedule } from '../lib/bookingHistory'
import { formatBRL, type Booking } from '../lib/spaces'
import { primaryButton, secondaryButton } from '../lib/ui'
import BookingHistoryDialog from './BookingHistoryDialog'
import BookingStatus from './BookingStatus'

export default function BookingVoucherDialog({
    booking,
    onDismiss,
}: {
    booking: Booking
    onDismiss: () => void
}) {
    const [message, setMessage] = useState('')
    const location = bookingLocation(booking)
    const voucher = booking.voucher_code
    const checkIn = booking.status === 'confirmed' && voucher

    async function copy() {
        if (!voucher) return
        try {
            await navigator.clipboard.writeText(voucher)
            setMessage('Código copiado.')
        } catch {
            setMessage('Não foi possível copiar. Selecione o código e copie manualmente.')
        }
    }

    function exportCalendar() {
        try {
            if (downloadBookingCalendar(booking)) {
                setMessage('Arquivo de calendário preparado para download.')
                return
            }
        } catch {
            setMessage('Não foi possível preparar o arquivo de calendário.')
            return
        }
        setMessage('O horário desta reserva não está disponível para exportação.')
    }

    return (
        <BookingHistoryDialog
            title="Comprovante de reserva"
            description={bookingName(booking)}
            printable
            onDismiss={onDismiss}
        >
            <BookingStatus status={booking.status} />
            <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <div>
                    <dt className="text-slate-600">Reserva</dt>
                    <dd className="font-semibold">#{booking.id}</dd>
                </div>
                <div>
                    <dt className="text-slate-600">Valor total</dt>
                    <dd className="font-semibold">
                        {booking.total_price === 0 ? 'Gratuito' : formatBRL(booking.total_price)}
                    </dd>
                </div>
                <div className="sm:col-span-2">
                    <dt className="text-slate-600">Horário local do navegador</dt>
                    <dd className="font-semibold">
                        {bookingSchedule(booking.start_time, booking.end_time) ?? 'Horário indisponível'}
                    </dd>
                </div>
                {location && (
                    <div className="sm:col-span-2">
                        <dt className="text-slate-600">Localização</dt>
                        <dd className="font-semibold">{location}</dd>
                    </div>
                )}
            </dl>
            {checkIn ? (
                <div className="space-y-2 rounded-xl border border-dashed border-slate-300 p-4">
                    <p className="text-sm text-slate-700">
                        Apresente este código na recepção ao chegar.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <code className="break-all font-semibold">{voucher}</code>
                        <button type="button" className={secondaryButton + ' print:hidden'} onClick={copy}>
                            Copiar código
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-slate-600">
                    Código de check-in indisponível para esta reserva.
                </p>
            )}
            <div role="status" className="text-sm text-slate-700 empty:hidden print:hidden">
                {message}
            </div>
            <div className="flex flex-wrap justify-end gap-2 print:hidden">
                {canExportBooking(booking) && (
                    <button type="button" className={secondaryButton} onClick={exportCalendar}>
                        Baixar calendário (.ics)
                    </button>
                )}
                <button type="button" className={secondaryButton} onClick={() => window.print()}>
                    Imprimir / Salvar PDF
                </button>
                <button type="button" className={primaryButton} onClick={onDismiss}>
                    Fechar
                </button>
            </div>
        </BookingHistoryDialog>
    )
}
