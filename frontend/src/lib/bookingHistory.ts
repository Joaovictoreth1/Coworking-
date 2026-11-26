import type { Booking } from './spaces.ts'

export const CANCEL_REASON_LIMIT = 500

export const CANCEL_REASONS = {
    plans: 'Mudança de planos ou data',
    location: 'Encontrei outro horário ou local',
    unforeseen: 'Imprevisto profissional ou pessoal',
    mistake: 'Erro no agendamento do horário',
    other: 'Outro motivo',
} as const

export type CancelReason = keyof typeof CANCEL_REASONS

export type ValidatedReason =
    | { valid: true; reason: string }
    | { valid: false; message: string }

export function validateCancelReason(choice: string, details: string): ValidatedReason {
    if (!Object.hasOwn(CANCEL_REASONS, choice)) {
        return { valid: false, message: 'Selecione um motivo para o cancelamento.' }
    }
    if (choice !== 'other') {
        return { valid: true, reason: CANCEL_REASONS[choice as CancelReason] }
    }

    const reason = details.trim()
    if (!reason) return { valid: false, message: 'Descreva o motivo do cancelamento.' }
    if (Array.from(reason).length > CANCEL_REASON_LIMIT) {
        return { valid: false, message: 'O motivo deve conter até 500 caracteres.' }
    }
    return { valid: true, reason }
}

const foldSearch = (value: string) =>
    value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR')

export function bookingName(booking: Booking) {
    return booking.space?.name || booking.space_name || 'Espaço de Coworking'
}

export function bookingLocation(booking: Booking) {
    return [booking.space?.city, booking.space?.state].filter(Boolean).join(' - ')
}

export function searchBookingPage(bookings: Booking[], query: string) {
    const terms = foldSearch(query).trim().split(/\s+/).filter(Boolean)
    if (!terms.length) return bookings

    return bookings.filter((booking) => {
        const searchable = foldSearch([
            bookingName(booking),
            bookingLocation(booking),
            booking.voucher_code,
        ].join(' '))
        return terms.every((term) => searchable.includes(term))
    })
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })
const timeFormat = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' })
const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
})

export function bookingSchedule(startTime: string, endTime: string) {
    const start = new Date(startTime)
    const end = new Date(endTime)
    if (!(start < end)) return null

    const day = dateFormat.format(start)
    if (day !== dateFormat.format(end)) {
        return `${dateTimeFormat.format(start)} a ${dateTimeFormat.format(end)}`
    }
    return `${day}, ${timeFormat.format(start)} às ${timeFormat.format(end)}`
}

export function bookingPageRange(
    meta: { current_page: number; total: number; per_page: number },
    count: number,
) {
    if (count === 0) return null
    const offset = (meta.current_page - 1) * meta.per_page
    return { first: offset + 1, last: Math.min(offset + count, meta.total) }
}
