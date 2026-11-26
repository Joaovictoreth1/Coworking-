import assert from 'node:assert/strict'
import test from 'node:test'
import { canExportBooking, createBookingCalendar } from './bookingCalendar.ts'
import {
    bookingLocation,
    bookingName,
    bookingPageRange,
    bookingSchedule,
    searchBookingPage,
    validateCancelReason,
} from './bookingHistory.ts'

const booking = {
    id: 5,
    status: 'confirmed',
    start_time: '2030-06-09T10:00:00-03:00',
    end_time: '2030-06-09T12:00:00-03:00',
    voucher_code: 'CWK-20300609-00005',
    notes: 'Private internal note',
    user_email: 'private@example.test',
    space: { name: 'Estação Oásis', city: 'São Paulo', state: 'SP' },
}

const now = new Date('2030-06-01T12:00:00Z')
const origin = 'https://coworking.example.test'

test('search ignores accents, casing and extra spaces and matches across fields', () => {
    const other = { ...booking, id: 6, voucher_code: 'CWK-OTHER' }
    assert.deepEqual(
        searchBookingPage([booking, other], '  SAO   oasis    00005 '),
        [booking],
    )
    assert.deepEqual(searchBookingPage([booking], 'oasis rio'), [])
    assert.deepEqual(searchBookingPage([booking], '   '), [booking])
})

test('legacy or incomplete spaces still have a readable title and searchable location', () => {
    const legacy = { ...booking, space: undefined, space_name: 'Sala São Lucas' }
    assert.equal(bookingName(legacy), 'Sala São Lucas')
    assert.equal(bookingLocation(legacy), '')
    assert.deepEqual(searchBookingPage([legacy], 'sao lucas'), [legacy])
    assert.equal(bookingName({ ...legacy, space_name: '' }), 'Espaço de Coworking')
    assert.equal(bookingLocation({ ...booking, space: { city: 'São Paulo' } }), 'São Paulo')
})

test('page ranges handle a full page, a partial final page and an empty page', () => {
    assert.deepEqual(bookingPageRange({ current_page: 1, per_page: 15, total: 17 }, 15), {
        first: 1,
        last: 15,
    })
    assert.deepEqual(bookingPageRange({ current_page: 2, per_page: 15, total: 17 }, 2), {
        first: 16,
        last: 17,
    })
    assert.equal(bookingPageRange({ current_page: 3, per_page: 15, total: 17 }, 0), null)
})

test('same-day schedules show a single date; overnight schedules include both dates', () => {
    const start = new Date(2030, 5, 9, 22).toISOString()
    const sameDay = new Date(2030, 5, 9, 23).toISOString()
    const nextDay = new Date(2030, 5, 10, 2).toISOString()
    assert.match(bookingSchedule(start, sameDay), /09\/06\/2030.*22:00 às 23:00/)
    assert.match(bookingSchedule(start, nextDay), /09\/06\/2030.*22:00.*10\/06\/2030.*02:00/)
})

test('invalid, zero-length or reversed schedules are not rendered as dates', () => {
    assert.equal(bookingSchedule('invalid', booking.end_time), null)
    assert.equal(bookingSchedule(booking.start_time, booking.start_time), null)
    assert.equal(bookingSchedule(booking.end_time, booking.start_time), null)
})

test('cancellation rejects blank and unknown choices and submits the selected label', () => {
    assert.equal(validateCancelReason('', '').valid, false)
    assert.equal(validateCancelReason('constructor', '').valid, false)
    assert.deepEqual(validateCancelReason('plans', 'ignored detail'), {
        valid: true,
        reason: 'Mudança de planos ou data',
    })
})

test('custom cancellation reason is trimmed and bounded by Unicode code points', () => {
    const reason = '🗓'.repeat(500)
    assert.equal(validateCancelReason('other', ' \n ').valid, false)
    assert.deepEqual(validateCancelReason('other', '  ' + reason + '   '), { valid: true, reason })
    assert.equal(validateCancelReason('other', reason + 'a').valid, false)
})

test('calendar preserves UTC instants and excludes notes, email and voucher data', () => {
    const calendar = createBookingCalendar(booking, origin, now)
    for (const line of [
        'BEGIN:VCALENDAR',
        'UID:booking-5@coworking.example.test',
        'DTSTAMP:20300601T120000Z',
        'DTSTART:20300609T130000Z',
        'DTEND:20300609T150000Z',
        'SUMMARY:Estação Oásis',
        'LOCATION:São Paulo - SP',
        'END:VCALENDAR',
    ]) assert.ok(calendar.includes(line + '\r\n'), line)

    assert.doesNotMatch(calendar, /private|CWK-20300609/i)
    assert.doesNotMatch(calendar.replaceAll('\r\n', ''), /[\r\n]/)
})

test('calendar eligibility excludes nonconfirmed, ended and invalid bookings', () => {
    for (const status of ['cancelled', 'completed', 'pending']) {
        assert.equal(createBookingCalendar({ ...booking, status }, origin, now), null)
    }
    assert.equal(canExportBooking(booking, new Date(booking.end_time)), false)
    assert.equal(canExportBooking(booking, new Date(booking.start_time)), true)
    assert.equal(canExportBooking({ ...booking, start_time: 'invalid' }, now), false)
    assert.equal(canExportBooking({ ...booking, end_time: booking.start_time }, now), false)
})

test('calendar escapes punctuation and newlines and folds UTF-8 without splitting characters', () => {
    const name = 'Ó'.repeat(50) + ', sala; 1\\2\r\nATTENDEE:example.test'
    const calendar = createBookingCalendar({ ...booking, space: { ...booking.space, name } }, origin, now)
    const lines = calendar.split('\r\n')
    assert.ok(lines.some((line) => line.startsWith(' ')))
    assert.ok(lines.every((line) => new TextEncoder().encode(line).length <= 75))
    assert.ok(calendar.replaceAll('\r\n ', '').includes(
        'SUMMARY:' + 'Ó'.repeat(50) + '\\, sala\\; 1\\\\2\\nATTENDEE:example.test',
    ))
    assert.equal(lines.some((line) => line.startsWith('ATTENDEE:')), false)
})
