// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { BookingWidget } from './BookingWidget'
import type { Space } from '../lib/spaces'
import { navigate } from '../lib/route'

vi.mock('../auth/context', () => ({ useAuth: () => ({ user: { id: 1 } }) }))
vi.mock('../lib/route', () => ({ navigate: vi.fn() }))

const space: Space = {
    id: 42, name: 'Estúdio', description: null, capacity: 8, zip_code: null,
    street: 'Rua Central', number: null, complement: null, neighborhood: null,
    city: 'São Paulo', state: 'SP', hourly_price: 50, daily_price: null,
    monthly_price: null, is_free: false, rating_avg: null, reviews_count: 0,
    is_favorite: false, owner_id: 2, opening_hours: [], availability: [],
    amenities: [], is_active: true, photos: [], cover_url: null, created_at: '', updated_at: '',
}

function mount() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><BookingWidget space={space} /></QueryClientProvider>)
}

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
})

test('does not submit a booking when the preview rejects the slot', async () => {
    const fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(Response.json({ message: 'Horário já reservado.' }, { status: 422 })))
    vi.stubGlobal('fetch', fetch)
    mount()

    expect(await screen.findByText('Horário já reservado.')).toBeVisible()
    const submit = screen.getByRole('button', { name: 'Horário Indisponível' })
    expect(submit).toBeDisabled()
    fireEvent.click(submit)
    expect(fetch).toHaveBeenCalledTimes(1)
})

test('shows the quoted price and submits the selected slot', async () => {
    const fetch = vi.fn()
        .mockImplementationOnce(() => Promise.resolve(Response.json({ available: true, duration_hours: 4, total_price: 200 })))
        .mockImplementationOnce(() => Promise.resolve(Response.json({ data: { id: 8 } }, { status: 201 })))
    vi.stubGlobal('fetch', fetch)
    mount()

    expect(await screen.findByText('4 horas')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Reserva' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('my-bookings'))
    expect(fetch).toHaveBeenLastCalledWith(
        expect.stringMatching(/\/spaces\/42\/bookings$/),
        expect.objectContaining({ method: 'POST', body: expect.stringMatching(/"start_time":".*T09:00:00"/) }),
    )
})
