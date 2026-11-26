import type { Booking } from './spaces.ts'
import { bookingLocation, bookingName } from './bookingHistory.ts'

const encoder = new TextEncoder()

function escapeText(value: string) {
    const clean = Array.from(value, (character) => {
        const code = character.charCodeAt(0)
        return (code < 32 && character !== '\r' && character !== '\n') || code === 127
            ? ''
            : character
    }).join('')

    return clean
        .replace(/\\/g, '\\\\')
        .replace(/\r\n|\r|\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
}

function foldLine(line: string) {
    let folded = ''
    let length = 0
    for (const character of line) {
        const width = encoder.encode(character).length
        if (length + width > 75) {
            folded += '\r\n '
            length = 1
        }
        folded += character
        length += width
    }
    return folded
}

function calendarDate(date: Date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

export function canExportBooking(booking: Booking, now = new Date()) {
    const start = new Date(booking.start_time)
    const end = new Date(booking.end_time)
    return booking.status === 'confirmed' && start < end && end > now
}

export function createBookingCalendar(booking: Booking, origin: string, now = new Date()) {
    if (!canExportBooking(booking, now)) return null
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Coworking//Minhas Reservas//PT-BR',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:booking-${booking.id}@${new URL(origin).host}`,
        `DTSTAMP:${calendarDate(now)}`,
        `DTSTART:${calendarDate(new Date(booking.start_time))}`,
        `DTEND:${calendarDate(new Date(booking.end_time))}`,
        `SUMMARY:${escapeText(bookingName(booking))}`,
        `LOCATION:${escapeText(bookingLocation(booking))}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
    ]
    return lines.map(foldLine).join('\r\n') + '\r\n'
}

export function downloadBookingCalendar(booking: Booking) {
    const calendar = createBookingCalendar(booking, window.location.origin)
    if (!calendar) return false

    const url = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `reserva-${booking.id}.ics`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    return true
}
